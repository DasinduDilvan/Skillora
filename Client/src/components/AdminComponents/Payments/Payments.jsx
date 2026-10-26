// src/components/AdminComponents/Payments/Payments.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import API from '../../../api/axios';
import '../Users/Users.css';
import './Payments.css';

const asArray = (res) => {
  const d = res?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  return [];
};

const rid = (v) => {
  if (!v) return null;
  if (typeof v === 'string') return v;
  return v.paymentId || v.projectId || v.userId || v.clientId || v.freelancerId || v._id || v.id;
};

/* Get the UNIQUE payment ID (not projectId or anything else) */
const paymentKey = (p) => p?._id || p?.paymentId || p?.id;

/* Remove duplicate payments by unique ID */
const deduplicate = (arr) => {
  const seen = new Set();
  return arr.filter((item) => {
    const id = paymentKey(item);
    if (!id || seen.has(String(id))) return false;
    seen.add(String(id));
    return true;
  });
};

const formatCurrency = (v) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v || 0);

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [p, pr] = await Promise.all([
        API.get('/payments'),
        API.get('/projects'),
      ]);
      setPayments(deduplicate(asArray(p)));
      setProjects(asArray(pr));
    } catch (err) {
      console.error(err);
      showToast('Failed to load payments', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const getProjectTitle = (pid) => {
    const p = projects.find((x) => String(rid(x)) === String(rid(pid)));
    return p?.title || '—';
  };

  const filtered = useMemo(() => {
    return payments.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !(p.transactionId || '').toLowerCase().includes(q) &&
          !(p.description || '').toLowerCase().includes(q) &&
          !getProjectTitle(p.projectId).toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [payments, statusFilter, search, projects]);

  const stats = useMemo(() => {
    const total = payments.reduce((s, p) => s + (p.amount || 0), 0);
    const completed = payments.filter((p) => p.status === 'completed');
    const totalCompleted = completed.reduce((s, p) => s + (p.amount || 0), 0);
    const pending = payments.filter((p) => p.status === 'pending').length;
    const failed = payments.filter((p) => p.status === 'failed').length;
    return { total, totalCompleted, pending, failed };
  }, [payments]);

  const updateStatus = async (p, newStatus) => {
    try {
      await API.put(`/payments/${paymentKey(p)}`, { status: newStatus });
      showToast(`Payment marked as ${newStatus}`);
      fetchAll();
      setSelected(null);
    } catch (err) {
      showToast('Failed to update payment', 'error');
    }
  };

  const deletePayment = async (p) => {
    if (!window.confirm('Delete this payment record?')) return;
    try {
      await API.delete(`/payments/${paymentKey(p)}`);
      showToast('Payment deleted');
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
        <p>Loading payments...</p>
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
          <h1>💳 Payment Transactions</h1>
          <p>Track and manage all platform payments.</p>
        </div>
      </div>

      <div className="pay-stats">
        <div className="pay-stat">
          <span className="pay-stat-lbl">Total Volume</span>
          <span className="pay-stat-num">{formatCurrency(stats.total)}</span>
        </div>
        <div className="pay-stat green">
          <span className="pay-stat-lbl">Completed</span>
          <span className="pay-stat-num">{formatCurrency(stats.totalCompleted)}</span>
        </div>
        <div className="pay-stat amber">
          <span className="pay-stat-lbl">Pending</span>
          <span className="pay-stat-num">{stats.pending}</span>
        </div>
        <div className="pay-stat red">
          <span className="pay-stat-lbl">Failed</span>
          <span className="pay-stat-num">{stats.failed}</span>
        </div>
      </div>

      <div className="adm-toolbar">
        <input
          type="text"
          className="adm-search"
          placeholder="🔍 Search by transaction ID, project or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="adm-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      <div className="adm-count">Showing <strong>{filtered.length}</strong> of <strong>{payments.length}</strong></div>

      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>Transaction ID</th>
              <th>Project</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Type</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="8" className="adm-empty">No payments found.</td></tr>
            ) : (
              filtered.map((p) => (
                <tr key={paymentKey(p)}>
                  <td><code className="pay-txn">{p.transactionId || paymentKey(p)?.slice(0, 12) || '—'}</code></td>
                  <td>{getProjectTitle(p.projectId)}</td>
                  <td><strong>{formatCurrency(p.amount)}</strong></td>
                  <td>{p.paymentMethod || '—'}</td>
                  <td><span className="pay-type">{p.paymentType || '—'}</span></td>
                  <td><span className={`adm-status pay-status-${p.status}`}>{p.status}</span></td>
                  <td>{new Date(p.paidAt || p.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="adm-actions">
                      <button className="adm-btn-sm" onClick={() => setSelected(p)}>View</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="adm-modal-overlay" onClick={() => setSelected(null)}>
          <div className="adm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="adm-modal-head">
              <h2>Payment Details</h2>
              <button onClick={() => setSelected(null)}>×</button>
            </div>
            <div className="adm-modal-body">
              <div className="pay-amount-big">{formatCurrency(selected.amount)}</div>
              <div className="pay-status-center">
                <span className={`adm-status pay-status-${selected.status}`}>{selected.status}</span>
              </div>

              <div className="adm-detail-grid">
                <div><label>Transaction ID</label><p><code>{selected.transactionId || '—'}</code></p></div>
                <div><label>Payment Method</label><p>{selected.paymentMethod || '—'}</p></div>
                <div><label>Payment Type</label><p>{selected.paymentType || '—'}</p></div>
                <div><label>Currency</label><p>{selected.currency || 'USD'}</p></div>
                <div><label>Project</label><p>{getProjectTitle(selected.projectId)}</p></div>
                <div><label>Paid At</label><p>{selected.paidAt ? new Date(selected.paidAt).toLocaleString() : '—'}</p></div>
                <div><label>Created</label><p>{new Date(selected.createdAt).toLocaleString()}</p></div>
                <div><label>Updated</label><p>{new Date(selected.updatedAt).toLocaleString()}</p></div>
              </div>

              {selected.description && (
                <div className="adm-bio">
                  <label>Description</label>
                  <p>{selected.description}</p>
                </div>
              )}

              <div className="adm-modal-actions">
                {selected.status !== 'completed' && (
                  <button className="adm-btn primary" onClick={() => updateStatus(selected, 'completed')}>
                    Mark Completed
                  </button>
                )}
                {selected.status !== 'refunded' && (
                  <button className="adm-btn warn" onClick={() => updateStatus(selected, 'refunded')}>
                    Refund
                  </button>
                )}
                <button className="adm-btn danger" onClick={() => deletePayment(selected)}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}