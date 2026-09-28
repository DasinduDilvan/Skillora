// src/components/AdminComponents/Reports/Reports.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import API from '../../../api/axios';
import '../Users/Users.css';
import './Reports.css';

const asArray = (res) => {
  const d = res?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  return [];
};

const rid = (v) => {
  if (!v) return null;
  if (typeof v === 'string') return v;
  return v.reportId || v.userId || v.projectId || v._id || v.id;
};

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [adminNote, setAdminNote] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [r, u, p] = await Promise.all([
        API.get('/reports'),
        API.get('/users'),
        API.get('/projects'),
      ]);
      setReports(asArray(r));
      setUsers(asArray(u));
      setProjects(asArray(p));
    } catch (err) {
      console.error(err);
      showToast('Failed to load reports', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const getUserName = (uid) => {
    const u = users.find((x) => String(rid(x)) === String(rid(uid)));
    if (!u) return '—';
    return `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || u.username;
  };

  const getProjectTitle = (pid) => {
    const p = projects.find((x) => String(rid(x)) === String(rid(pid)));
    return p?.title || '—';
  };

  const filtered = useMemo(() => {
    return reports.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      return true;
    });
  }, [reports, statusFilter]);

  const stats = useMemo(() => ({
    total: reports.length,
    pending: reports.filter((r) => r.status === 'pending').length,
    reviewing: reports.filter((r) => r.status === 'reviewing').length,
    resolved: reports.filter((r) => r.status === 'resolved').length,
    dismissed: reports.filter((r) => r.status === 'dismissed').length,
  }), [reports]);

  const openReport = (r) => {
    setSelected(r);
    setAdminNote(r.adminNote || '');
  };

  const resolveReport = async (status) => {
    if (!selected) return;
    try {
      await API.put(`/reports/${rid(selected)}`, {
        status,
        adminNote,
        resolvedAt: (status === 'resolved' || status === 'dismissed') ? new Date().toISOString() : null,
      });
      showToast(`Report marked as ${status}`);
      setSelected(null);
      fetchAll();
    } catch (err) {
      showToast('Failed to update report', 'error');
    }
  };

  const deleteReport = async (r) => {
    if (!window.confirm('Delete this report?')) return;
    try {
      await API.delete(`/reports/${rid(r)}`);
      showToast('Report deleted');
      setSelected(null);
      fetchAll();
    } catch (err) {
      showToast('Failed to delete', 'error');
    }
  };

  if (loading) {
    return (
      <div className="adm-loading">
        <div className="adm-spinner" />
        <p>Loading reports...</p>
      </div>
    );
  }

  return (
    <div className="adm-page">
      {toast && (
        <div className={`adm-toast adm-toast-${toast.type}`}>
          {toast.type === 'success' ? '✅' : '⚠️'} {toast.msg}
        </div>
      )}

      <div className="adm-header">
        <div>
          <h1>⚠️ Reports & Complaints</h1>
          <p>Review and take action on user reports.</p>
        </div>
      </div>

      <div className="rep-stats">
        <div className="rep-stat"><strong>{stats.total}</strong><span>Total</span></div>
        <div className="rep-stat amber"><strong>{stats.pending}</strong><span>Pending</span></div>
        <div className="rep-stat blue"><strong>{stats.reviewing}</strong><span>Reviewing</span></div>
        <div className="rep-stat green"><strong>{stats.resolved}</strong><span>Resolved</span></div>
        <div className="rep-stat gray"><strong>{stats.dismissed}</strong><span>Dismissed</span></div>
      </div>

      <div className="adm-toolbar">
        <select className="adm-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="reviewing">Reviewing</option>
          <option value="resolved">Resolved</option>
          <option value="dismissed">Dismissed</option>
        </select>
      </div>

      <div className="rep-list">
        {filtered.length === 0 ? (
          <div className="rep-empty">
            <p>🎉 No reports to review!</p>
          </div>
        ) : (
          filtered.map((r) => (
            <div key={rid(r)} className={`rep-card status-${r.status}`}>
              <div className="rep-card-head">
                <div>
                  <span className="rep-reason">{r.reason || 'No reason'}</span>
                  <span className={`adm-status rep-status-${r.status}`}>{r.status}</span>
                </div>
                <span className="rep-date">{new Date(r.createdAt).toLocaleDateString()}</span>
              </div>

              <p className="rep-desc">{r.description || 'No description provided.'}</p>

              <div className="rep-meta">
                <div>
                  <label>Reported By</label>
                  <p>{getUserName(r.reportedBy)}</p>
                </div>
                {r.reportedUserId && (
                  <div>
                    <label>Against User</label>
                    <p>{getUserName(r.reportedUserId)}</p>
                  </div>
                )}
                {r.reportedProjectId && (
                  <div>
                    <label>Related Project</label>
                    <p>{getProjectTitle(r.reportedProjectId)}</p>
                  </div>
                )}
              </div>

              <div className="rep-actions">
                <button className="adm-btn-sm" onClick={() => openReport(r)}>Review</button>
                <button className="adm-btn-sm danger" onClick={() => deleteReport(r)}>Delete</button>
              </div>
            </div>
          ))
        )}
      </div>

      {selected && (
        <div className="adm-modal-overlay" onClick={() => setSelected(null)}>
          <div className="adm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="adm-modal-head">
              <h2>Review Report</h2>
              <button onClick={() => setSelected(null)}>×</button>
            </div>
            <div className="adm-modal-body">
              <div className="rep-card-head">
                <span className="rep-reason">{selected.reason}</span>
                <span className={`adm-status rep-status-${selected.status}`}>{selected.status}</span>
              </div>

              <p className="rep-desc" style={{ marginTop: 12 }}>{selected.description}</p>

              <div className="adm-detail-grid">
                <div><label>Reported By</label><p>{getUserName(selected.reportedBy)}</p></div>
                {selected.reportedUserId && (
                  <div><label>Against User</label><p>{getUserName(selected.reportedUserId)}</p></div>
                )}
                {selected.reportedProjectId && (
                  <div><label>Project</label><p>{getProjectTitle(selected.reportedProjectId)}</p></div>
                )}
                <div><label>Created</label><p>{new Date(selected.createdAt).toLocaleString()}</p></div>
              </div>

              <div className="adm-field">
                <label>Admin Notes</label>
                <textarea
                  className="adm-input"
                  rows="4"
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Add your notes about this report..."
                />
              </div>

              <div className="adm-modal-actions">
                <button className="adm-btn" onClick={() => resolveReport('reviewing')}>Mark Reviewing</button>
                <button className="adm-btn warn" onClick={() => resolveReport('dismissed')}>Dismiss</button>
                <button className="adm-btn primary" onClick={() => resolveReport('resolved')}>Resolve</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}