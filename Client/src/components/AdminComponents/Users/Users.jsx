// src/components/AdminComponents/Users/Users.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import API from '../../../api/axios';
import './Users.css';

const asArray = (res) => {
  const d = res?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  return [];
};

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await API.get('/users');
      setUsers(asArray(res));
    } catch (err) {
      console.error('Failed to load users:', err);
      showToast('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (statusFilter === 'active' && (u.isBlocked || !u.isActive)) return false;
      if (statusFilter === 'blocked' && !u.isBlocked) return false;
      if (statusFilter === 'inactive' && u.isActive) return false;
      if (search) {
        const q = search.toLowerCase();
        const fullName = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
        if (
          !fullName.includes(q) &&
          !(u.email || '').toLowerCase().includes(q) &&
          !(u.username || '').toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [users, search, roleFilter, statusFilter]);

  const toggleBlock = async (u) => {
    const id = u.userId || u._id;
    if (!window.confirm(`${u.isBlocked ? 'Unblock' : 'Block'} this user?`)) return;
    try {
      await API.put(`/users/${id}`, { isBlocked: !u.isBlocked });
      showToast(`User ${u.isBlocked ? 'unblocked' : 'blocked'} successfully`);
      fetchUsers();
    } catch (err) {
      showToast('Failed to update user', 'error');
    }
  };

  const toggleActive = async (u) => {
    const id = u.userId || u._id;
    try {
      await API.put(`/users/${id}`, { isActive: !u.isActive });
      showToast(`User ${u.isActive ? 'deactivated' : 'activated'}`);
      fetchUsers();
    } catch (err) {
      showToast('Failed to update user', 'error');
    }
  };

  const deleteUser = async (u) => {
    const id = u.userId || u._id;
    if (!window.confirm(`Permanently delete user ${u.email}? This cannot be undone.`)) return;
    try {
      await API.delete(`/users/${id}`);
      showToast('User deleted');
      setSelectedUser(null);
      fetchUsers();
    } catch (err) {
      showToast('Failed to delete user', 'error');
    }
  };

  if (loading) {
    return (
      <div className="adm-loading">
        <div className="adm-spinner" />
        <p>Loading users...</p>
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
          <h1>👥 Manage Users</h1>
          <p>View, edit, block or delete platform users.</p>
        </div>
        <div className="adm-stats-inline">
          <span><strong>{users.length}</strong> Total</span>
          <span><strong>{users.filter(u => u.role === 'freelancer').length}</strong> Freelancers</span>
          <span><strong>{users.filter(u => u.role === 'client').length}</strong> Clients</span>
          <span><strong>{users.filter(u => u.isBlocked).length}</strong> Blocked</span>
        </div>
      </div>

      <div className="adm-toolbar">
        <input
          type="text"
          className="adm-search"
          placeholder="🔍 Search by name, email, or username..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="adm-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="all">All Roles</option>
          <option value="freelancer">Freelancer</option>
          <option value="client">Client</option>
          <option value="admin">Admin</option>
        </select>
        <select className="adm-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="blocked">Blocked</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="adm-count">Showing <strong>{filtered.length}</strong> of <strong>{users.length}</strong></div>

      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="6" className="adm-empty">No users found.</td></tr>
            ) : (
              filtered.map((u) => {
                const id = u.userId || u._id;
                return (
                  <tr key={id}>
                    <td>
                      <div className="adm-user-cell">
                        <div className="adm-avatar">
                          {u.profileImage ? (
                            <img src={u.profileImage} alt="" />
                          ) : (
                            (u.firstName || u.username || u.email || 'U').charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <strong>{u.firstName} {u.lastName}</strong>
                          <span>@{u.username || '—'}</span>
                        </div>
                      </div>
                    </td>
                    <td>{u.email}</td>
                    <td><span className={`adm-role-badge role-${u.role}`}>{u.role}</span></td>
                    <td>
                      {u.isBlocked ? (
                        <span className="adm-status blocked">🚫 Blocked</span>
                      ) : u.isActive ? (
                        <span className="adm-status active">✓ Active</span>
                      ) : (
                        <span className="adm-status inactive">⏸ Inactive</span>
                      )}
                    </td>
                    <td>{new Date(u.createdAt || Date.now()).toLocaleDateString()}</td>
                    <td>
                      <div className="adm-actions">
                        <button className="adm-btn-sm" onClick={() => setSelectedUser(u)}>View</button>
                        <button className="adm-btn-sm warn" onClick={() => toggleBlock(u)}>
                          {u.isBlocked ? 'Unblock' : 'Block'}
                        </button>
                        <button className="adm-btn-sm danger" onClick={() => deleteUser(u)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* USER DETAILS MODAL */}
      {selectedUser && (
        <div className="adm-modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="adm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="adm-modal-head">
              <h2>User Details</h2>
              <button onClick={() => setSelectedUser(null)}>×</button>
            </div>
            <div className="adm-modal-body">
              <div className="adm-detail-header">
                <div className="adm-avatar-large">
                  {selectedUser.profileImage ? (
                    <img src={selectedUser.profileImage} alt="" />
                  ) : (
                    (selectedUser.firstName || 'U').charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <h3>{selectedUser.firstName} {selectedUser.lastName}</h3>
                  <p>@{selectedUser.username}</p>
                  <span className={`adm-role-badge role-${selectedUser.role}`}>{selectedUser.role}</span>
                </div>
              </div>

              <div className="adm-detail-grid">
                <div><label>Email</label><p>{selectedUser.email}</p></div>
                <div><label>Phone</label><p>{selectedUser.phone || '—'}</p></div>
                <div><label>Location</label><p>{selectedUser.location || '—'}</p></div>
                <div><label>Email Verified</label><p>{selectedUser.isEmailVerified ? '✓ Yes' : '✗ No'}</p></div>
                <div><label>Last Login</label><p>{selectedUser.lastLoginAt ? new Date(selectedUser.lastLoginAt).toLocaleString() : '—'}</p></div>
                <div><label>Joined</label><p>{new Date(selectedUser.createdAt).toLocaleDateString()}</p></div>
              </div>

              {selectedUser.bio && (
                <div className="adm-bio">
                  <label>Bio</label>
                  <p>{selectedUser.bio}</p>
                </div>
              )}

              <div className="adm-modal-actions">
                <button className="adm-btn warn" onClick={() => { toggleActive(selectedUser); setSelectedUser(null); }}>
                  {selectedUser.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <button className="adm-btn warn" onClick={() => { toggleBlock(selectedUser); setSelectedUser(null); }}>
                  {selectedUser.isBlocked ? 'Unblock User' : 'Block User'}
                </button>
                <button className="adm-btn danger" onClick={() => deleteUser(selectedUser)}>Delete User</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}