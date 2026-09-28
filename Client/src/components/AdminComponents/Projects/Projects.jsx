// src/components/AdminComponents/Projects/Projects.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import API from '../../../api/axios';
import '../Users/Users.css';
import './Projects.css';

const asArray = (res) => {
  const d = res?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  return [];
};

const rid = (v) => {
  if (!v) return null;
  if (typeof v === 'string') return v;
  return v.projectId || v.clientId || v.freelancerId || v.userId || v.categoryId || v._id || v.id;
};

const formatCurrency = (v) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v || 0);

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [freelancers, setFreelancers] = useState([]);
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [p, c, f, u, cat] = await Promise.all([
        API.get('/projects'),
        API.get('/clients'),
        API.get('/freelancers'),
        API.get('/users'),
        API.get('/categories'),
      ]);
      setProjects(asArray(p));
      setClients(asArray(c));
      setFreelancers(asArray(f));
      setUsers(asArray(u));
      setCategories(asArray(cat));
    } catch (err) {
      console.error(err);
      showToast('Failed to load projects', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const getClientName = (cid) => {
    const client = clients.find((c) => String(rid(c)) === String(rid(cid)));
    if (!client) return 'Unknown';
    const clientUser = users.find((u) => String(rid(u)) === String(rid(client.userId)));
    return client.companyName || (clientUser ? `${clientUser.firstName || ''} ${clientUser.lastName || ''}`.trim() : 'Client');
  };

  const getFreelancerName = (fid) => {
    if (!fid) return '— Not assigned';
    const f = freelancers.find((x) => String(rid(x)) === String(rid(fid)));
    if (!f) return 'Unknown';
    const fu = users.find((u) => String(rid(u)) === String(rid(f.userId)));
    return fu ? `${fu.firstName || ''} ${fu.lastName || ''}`.trim() : 'Freelancer';
  };

  const getCategoryName = (cid) => {
    const c = categories.find((x) => String(rid(x)) === String(rid(cid)));
    return c?.name || 'General';
  };

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!(p.title || '').toLowerCase().includes(q) && !(p.description || '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [projects, search, statusFilter]);

  const updateStatus = async (p, newStatus) => {
    const id = rid(p);
    try {
      await API.put(`/projects/${id}`, { status: newStatus });
      showToast(`Project status updated to ${newStatus}`);
      fetchAll();
      setSelected(null);
    } catch (err) {
      showToast('Failed to update project', 'error');
    }
  };

  const deleteProject = async (p) => {
    const id = rid(p);
    if (!window.confirm(`Delete project "${p.title}"? This cannot be undone.`)) return;
    try {
      await API.delete(`/projects/${id}`);
      showToast('Project deleted');
      setSelected(null);
      fetchAll();
    } catch (err) {
      showToast('Failed to delete project', 'error');
    }
  };

  if (loading) {
    return (
      <div className="adm-loading">
        <div className="adm-spinner" />
        <p>Loading projects...</p>
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
          <h1>📁 Manage Projects</h1>
          <p>Monitor and moderate all projects on the platform.</p>
        </div>
        <div className="adm-stats-inline">
          <span><strong>{projects.length}</strong> Total</span>
          <span><strong>{projects.filter(p => ['active', 'in-progress'].includes(p.status)).length}</strong> Active</span>
          <span><strong>{projects.filter(p => p.status === 'completed').length}</strong> Completed</span>
          <span><strong>{projects.filter(p => p.status === 'cancelled').length}</strong> Cancelled</span>
        </div>
      </div>

      <div className="adm-toolbar">
        <input
          type="text"
          className="adm-search"
          placeholder="🔍 Search projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="adm-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="open">Open</option>
          <option value="active">Active</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="adm-count">Showing <strong>{filtered.length}</strong> of <strong>{projects.length}</strong></div>

      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Category</th>
              <th>Client</th>
              <th>Freelancer</th>
              <th>Budget</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="7" className="adm-empty">No projects found.</td></tr>
            ) : (
              filtered.map((p) => (
                <tr key={rid(p)}>
                  <td><strong>{p.title || 'Untitled'}</strong></td>
                  <td>{getCategoryName(p.categoryId)}</td>
                  <td>{getClientName(p.clientId)}</td>
                  <td>{getFreelancerName(p.freelancerId)}</td>
                  <td><strong>{formatCurrency(p.budget)}</strong></td>
                  <td><span className={`adm-status status-${p.status || 'draft'}`}>{p.status || 'draft'}</span></td>
                  <td>
                    <div className="adm-actions">
                      <button className="adm-btn-sm" onClick={() => setSelected(p)}>View</button>
                      <button className="adm-btn-sm danger" onClick={() => deleteProject(p)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* PROJECT DETAIL MODAL */}
      {selected && (
        <div className="adm-modal-overlay" onClick={() => setSelected(null)}>
          <div className="adm-modal adm-modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="adm-modal-head">
              <h2>Project Details</h2>
              <button onClick={() => setSelected(null)}>×</button>
            </div>
            <div className="adm-modal-body">
              <div className="adm-project-head">
                <span className="adm-cat-tag">{getCategoryName(selected.categoryId)}</span>
                <span className={`adm-status status-${selected.status || 'draft'}`}>{selected.status || 'draft'}</span>
              </div>
              <h3 className="adm-proj-title">{selected.title}</h3>
              <p className="adm-proj-desc">{selected.description || 'No description provided.'}</p>

              <div className="adm-detail-grid">
                <div><label>Client</label><p>{getClientName(selected.clientId)}</p></div>
                <div><label>Freelancer</label><p>{getFreelancerName(selected.freelancerId)}</p></div>
                <div><label>Budget</label><p>{formatCurrency(selected.budget)}</p></div>
                <div><label>Progress</label><p>{selected.progress || 0}%</p></div>
                <div><label>Start Date</label><p>{selected.startDate ? new Date(selected.startDate).toLocaleDateString() : '—'}</p></div>
                <div><label>Deadline</label><p>{selected.deadline ? new Date(selected.deadline).toLocaleDateString() : '—'}</p></div>
                <div><label>Total Tasks</label><p>{(selected.tasks || []).length}</p></div>
                <div><label>Created</label><p>{new Date(selected.createdAt).toLocaleDateString()}</p></div>
              </div>

              <div className="adm-modal-actions">
                <label style={{ fontWeight: 600, fontSize: 13 }}>Change Status:</label>
                <select
                  className="adm-select"
                  value={selected.status}
                  onChange={(e) => updateStatus(selected, e.target.value)}
                >
                  <option value="draft">Draft</option>
                  <option value="open">Open</option>
                  <option value="active">Active</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <button className="adm-btn danger" onClick={() => deleteProject(selected)}>Delete Project</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}