// src/components/FreelancerComponents/Notifications/Notifications.jsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import API from '../../../api/axios';
import './Notifications.css';

/* ── Helpers ── */
const asArray = (res) => {
  const d = res?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.results)) return d.results;
  return [];
};

const getRawId = (v) => {
  if (!v) return null;
  if (typeof v === 'string') return v;
  if (typeof v === 'object') {
    return (
      v.notificationId ||
      v.userId ||
      v.projectId ||
      v.applicationId ||
      v._id ||
      v.id ||
      null
    );
  }
  return String(v);
};

const eqId = (a, b) => {
  const x = getRawId(a), y = getRawId(b);
  return x && y && String(x) === String(y);
};

/* ── Time formatting ── */
const timeAgo = (dateStr) => {
  if (!dateStr) return '—';
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
};

const formatFullDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/* ── Notification type meta ── */
const TYPE_META = {
  project_assigned: { icon: '📌', color: 'blue', label: 'Project' },
  project_update: { icon: '🔄', color: 'blue', label: 'Project' },
  project_completed: { icon: '✅', color: 'green', label: 'Project' },
  project_cancelled: { icon: '🚫', color: 'red', label: 'Project' },
  application_accepted: { icon: '🎉', color: 'green', label: 'Application' },
  application_rejected: { icon: '❌', color: 'red', label: 'Application' },
  application_pending: { icon: '⏳', color: 'amber', label: 'Application' },
  new_message: { icon: '💬', color: 'purple', label: 'Message' },
  payment_received: { icon: '💰', color: 'green', label: 'Payment' },
  payment_pending: { icon: '💳', color: 'amber', label: 'Payment' },
  payment_failed: { icon: '⚠️', color: 'red', label: 'Payment' },
  review_received: { icon: '⭐', color: 'amber', label: 'Review' },
  task_assigned: { icon: '📋', color: 'blue', label: 'Task' },
  task_completed: { icon: '✔️', color: 'green', label: 'Task' },
  deadline_approaching: { icon: '⏰', color: 'amber', label: 'Deadline' },
  system: { icon: '🔔', color: 'gray', label: 'System' },
  default: { icon: '🔔', color: 'gray', label: 'General' },
};

const getTypeMeta = (type) => {
  if (!type) return TYPE_META.default;
  const normalized = String(type).toLowerCase().replace(/[-\s]/g, '_');
  return TYPE_META[normalized] || TYPE_META.default;
};

/* ── Filter tabs ── */
const TABS = [
  { id: 'all', label: 'All', icon: '📬' },
  { id: 'unread', label: 'Unread', icon: '🔵' },
  { id: 'project', label: 'Projects', icon: '📁' },
  { id: 'application', label: 'Applications', icon: '📝' },
  { id: 'payment', label: 'Payments', icon: '💰' },
  { id: 'review', label: 'Reviews', icon: '⭐' },
];

/* ============================================================
   MAIN COMPONENT
============================================================ */
export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const currentUserId = user?.userId || user?._id || user?.id;

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [toast, setToast] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  /* ── Fetch notifications ── */
  const fetchNotifications = useCallback(async () => {
    if (!currentUserId) return;
    try {
      setLoading(true);
      const res = await API.get('/notifications').catch(() => ({ data: [] }));
      const all = asArray(res);

      // Filter for current user
      const mine = all.filter((n) => eqId(n.userId, currentUserId));

      // Sort by date DESC
      mine.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

      setNotifications(mine);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      showToast('Failed to load notifications.', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  /* ── Stats ── */
  const stats = useMemo(() => {
    const unread = notifications.filter((n) => !n.isRead).length;
    const today = notifications.filter((n) => {
      if (!n.createdAt) return false;
      const d = new Date(n.createdAt);
      const now = new Date();
      return d.toDateString() === now.toDateString();
    }).length;
    const thisWeek = notifications.filter((n) => {
      if (!n.createdAt) return false;
      const d = new Date(n.createdAt);
      const now = new Date();
      const diff = (now - d) / (1000 * 60 * 60 * 24);
      return diff <= 7;
    }).length;
    return {
      total: notifications.length,
      unread,
      today,
      thisWeek,
    };
  }, [notifications]);

  const tabCounts = useMemo(() => {
    const counts = {
      all: notifications.length,
      unread: notifications.filter((n) => !n.isRead).length,
      project: 0,
      application: 0,
      payment: 0,
      review: 0,
    };
    notifications.forEach((n) => {
      const t = String(n.type || '').toLowerCase();
      if (t.includes('project') || t.includes('task') || t.includes('deadline')) counts.project++;
      if (t.includes('application')) counts.application++;
      if (t.includes('payment')) counts.payment++;
      if (t.includes('review')) counts.review++;
    });
    return counts;
  }, [notifications]);

  /* ── Filtered list ── */
  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      const t = String(n.type || '').toLowerCase();

      if (activeTab === 'unread' && n.isRead) return false;
      if (activeTab === 'project' && !(t.includes('project') || t.includes('task') || t.includes('deadline'))) return false;
      if (activeTab === 'application' && !t.includes('application')) return false;
      if (activeTab === 'payment' && !t.includes('payment')) return false;
      if (activeTab === 'review' && !t.includes('review')) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          String(n.title || '').toLowerCase().includes(q) ||
          String(n.message || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [notifications, activeTab, search]);

  /* ── Group by date ── */
  const grouped = useMemo(() => {
    const groups = {};
    filtered.forEach((n) => {
      const d = new Date(n.createdAt || Date.now());
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);

      let label;
      if (d.toDateString() === today.toDateString()) label = 'Today';
      else if (d.toDateString() === yesterday.toDateString()) label = 'Yesterday';
      else {
        const diff = (today - d) / (1000 * 60 * 60 * 24);
        if (diff <= 7) label = 'This Week';
        else if (diff <= 30) label = 'This Month';
        else label = 'Earlier';
      }

      if (!groups[label]) groups[label] = [];
      groups[label].push(n);
    });
    return groups;
  }, [filtered]);

  const groupOrder = ['Today', 'Yesterday', 'This Week', 'This Month', 'Earlier'];

  /* ── Action: Mark as read ── */
  const markAsRead = async (notif) => {
    if (notif.isRead) return;
    const nid = notif.notificationId || notif._id;
    if (!nid) return;

    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (eqId(n, nid) ? { ...n, isRead: true } : n))
    );

    try {
      await API.put(`/notifications/${nid}`, { isRead: true });
    } catch (err) {
      console.error('Failed to mark as read:', err);
      // Revert on failure
      setNotifications((prev) =>
        prev.map((n) => (eqId(n, nid) ? { ...n, isRead: false } : n))
      );
      showToast('Failed to mark as read.', 'error');
    }
  };

  /* ── Action: Mark as unread ── */
  const markAsUnread = async (notif) => {
    if (!notif.isRead) return;
    const nid = notif.notificationId || notif._id;
    if (!nid) return;

    setNotifications((prev) =>
      prev.map((n) => (eqId(n, nid) ? { ...n, isRead: false } : n))
    );

    try {
      await API.put(`/notifications/${nid}`, { isRead: false });
    } catch (err) {
      console.error('Failed to mark as unread:', err);
      setNotifications((prev) =>
        prev.map((n) => (eqId(n, nid) ? { ...n, isRead: true } : n))
      );
      showToast('Failed to update.', 'error');
    }
  };

  /* ── Action: Mark all as read ── */
  const markAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.isRead);
    if (unread.length === 0) {
      showToast('No unread notifications.', 'error');
      return;
    }

    setActionLoading(true);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));

    try {
      await Promise.all(
        unread.map((n) => {
          const nid = n.notificationId || n._id;
          return API.put(`/notifications/${nid}`, { isRead: true }).catch(() => null);
        })
      );
      showToast(`Marked ${unread.length} notification${unread.length > 1 ? 's' : ''} as read.`);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
      showToast('Some notifications failed to update.', 'error');
      fetchNotifications();
    } finally {
      setActionLoading(false);
    }
  };

  /* ── Action: Delete single ── */
  const deleteNotification = async (notif, e) => {
    if (e) e.stopPropagation();
    const nid = notif.notificationId || notif._id;
    if (!nid) return;

    if (!window.confirm('Delete this notification?')) return;

    const backup = notifications;
    setNotifications((prev) => prev.filter((n) => !eqId(n, nid)));

    try {
      await API.delete(`/notifications/${nid}`);
      showToast('Notification deleted.');
    } catch (err) {
      console.error('Failed to delete:', err);
      setNotifications(backup);
      showToast('Failed to delete notification.', 'error');
    }
  };

  /* ── Action: Delete selected ── */
  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedIds.size} notification${selectedIds.size > 1 ? 's' : ''}?`)) return;

    setActionLoading(true);
    const idsToDelete = Array.from(selectedIds);
    const backup = notifications;
    setNotifications((prev) => prev.filter((n) => !selectedIds.has(getRawId(n))));

    try {
      await Promise.all(
        idsToDelete.map((id) => API.delete(`/notifications/${id}`).catch(() => null))
      );
      showToast(`Deleted ${idsToDelete.length} notification${idsToDelete.length > 1 ? 's' : ''}.`);
      setSelectedIds(new Set());
    } catch (err) {
      console.error('Failed to delete selected:', err);
      setNotifications(backup);
      showToast('Some deletions failed.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  /* ── Action: Clear all ── */
  const clearAll = async () => {
    if (notifications.length === 0) return;
    if (!window.confirm(`Delete ALL ${notifications.length} notifications? This cannot be undone.`)) return;

    setActionLoading(true);
    const backup = notifications;
    setNotifications([]);

    try {
      await Promise.all(
        backup.map((n) => {
          const nid = n.notificationId || n._id;
          return API.delete(`/notifications/${nid}`).catch(() => null);
        })
      );
      showToast('All notifications cleared.');
      setSelectedIds(new Set());
    } catch (err) {
      console.error('Failed to clear all:', err);
      setNotifications(backup);
      showToast('Failed to clear notifications.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  /* ── Toggle selection ── */
  const toggleSelect = (notif, e) => {
    if (e) e.stopPropagation();
    const id = getRawId(notif);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((n) => getRawId(n))));
    }
  };

  /* ── Handle click on notification ── */
  const handleNotifClick = (notif) => {
    markAsRead(notif);

    // Navigate based on type
    if (notif.projectId) {
      navigate('/freelancer/my-projects');
    } else if (notif.applicationId) {
      navigate('/freelancer/browse-projects');
    } else if (notif.paymentId) {
      navigate('/freelancer/dashboard');
    } else if (notif.reviewId) {
      navigate('/freelancer/profile');
    }
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="fnot-loading">
        <div className="fnot-spinner" />
        <p>Loading your notifications...</p>
      </div>
    );
  }

  return (
    <div className="fnot-page">
      {/* TOAST */}
      {toast && (
        <div className={`fnot-toast ${toast.type}`}>
          <span className="fnot-toast-icon">
            {toast.type === 'success' ? '✅' : '❌'}
          </span>
          <span>{toast.message}</span>
          <button className="fnot-toast-close" onClick={() => setToast(null)}>×</button>
        </div>
      )}

      {/* HERO */}
      <div className="fnot-hero">
        <div className="fnot-hero-inner">
          <div className="fnot-hero-text">
            <span className="fnot-hero-badge">🔔 Notification Center</span>
            <h1>Notifications</h1>
            <p>Stay updated with your projects, applications, payments and more.</p>
          </div>
          {stats.unread > 0 && (
            <div className="fnot-hero-unread">
              <span className="fnot-hero-unread-num">{stats.unread}</span>
              <span className="fnot-hero-unread-lbl">Unread</span>
            </div>
          )}
        </div>
      </div>

      {/* STATS */}
      <div className="fnot-stats-strip">
        <div className="fnot-stat blue">
          <div className="fnot-stat-icon">📬</div>
          <div>
            <span className="fnot-stat-num">{stats.total}</span>
            <span className="fnot-stat-lbl">Total</span>
          </div>
        </div>
        <div className="fnot-stat amber">
          <div className="fnot-stat-icon">🔵</div>
          <div>
            <span className="fnot-stat-num">{stats.unread}</span>
            <span className="fnot-stat-lbl">Unread</span>
          </div>
        </div>
        <div className="fnot-stat green">
          <div className="fnot-stat-icon">📅</div>
          <div>
            <span className="fnot-stat-num">{stats.today}</span>
            <span className="fnot-stat-lbl">Today</span>
          </div>
        </div>
        <div className="fnot-stat purple">
          <div className="fnot-stat-icon">📈</div>
          <div>
            <span className="fnot-stat-num">{stats.thisWeek}</span>
            <span className="fnot-stat-lbl">This Week</span>
          </div>
        </div>
      </div>

      <div className="fnot-container">
        {/* TABS */}
        <div className="fnot-tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`fnot-tab ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => {
                setActiveTab(t.id);
                setSelectedIds(new Set());
              }}
            >
              <span className="fnot-tab-icon">{t.icon}</span>
              {t.label}
              <span className="fnot-tab-count">{tabCounts[t.id] ?? 0}</span>
            </button>
          ))}
        </div>

        {/* TOOLBAR */}
        <div className="fnot-toolbar">
          <div className="fnot-search">
            <span className="fnot-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search notifications..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="fnot-search-clear" onClick={() => setSearch('')}>
                ×
              </button>
            )}
          </div>

          <div className="fnot-toolbar-actions">
            {selectedIds.size > 0 ? (
              <>
                <span className="fnot-selected-count">
                  {selectedIds.size} selected
                </span>
                <button
                  className="fnot-btn fnot-btn-danger"
                  onClick={deleteSelected}
                  disabled={actionLoading}
                >
                  🗑️ Delete Selected
                </button>
                <button
                  className="fnot-btn fnot-btn-ghost"
                  onClick={() => setSelectedIds(new Set())}
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  className="fnot-btn fnot-btn-outline"
                  onClick={markAllAsRead}
                  disabled={actionLoading || stats.unread === 0}
                >
                  ✓ Mark All Read
                </button>
                <button
                  className="fnot-btn fnot-btn-outline-danger"
                  onClick={clearAll}
                  disabled={actionLoading || notifications.length === 0}
                >
                  🗑️ Clear All
                </button>
              </>
            )}
          </div>
        </div>

        {filtered.length > 0 && (
          <div className="fnot-select-bar">
            <label className="fnot-checkbox-wrap">
              <input
                type="checkbox"
                checked={selectedIds.size === filtered.length && filtered.length > 0}
                onChange={selectAllVisible}
              />
              <span className="fnot-checkbox" />
              <span>
                {selectedIds.size === filtered.length
                  ? 'Deselect All'
                  : `Select All (${filtered.length})`}
              </span>
            </label>
            <span className="fnot-count-info">
              Showing <strong>{filtered.length}</strong> of <strong>{notifications.length}</strong>
            </span>
          </div>
        )}

        {/* NOTIFICATIONS LIST */}
        {filtered.length === 0 ? (
          <div className="fnot-empty">
            <div className="fnot-empty-icon">
              {notifications.length === 0 ? '🎉' : '🔍'}
            </div>
            <h3>
              {notifications.length === 0
                ? "You're all caught up!"
                : 'No matching notifications'}
            </h3>
            <p>
              {notifications.length === 0
                ? "You don't have any notifications yet. We'll notify you when there's activity on your projects."
                : 'Try changing your filter or search terms.'}
            </p>
            {notifications.length > 0 && (
              <button
                className="fnot-btn fnot-btn-outline"
                onClick={() => {
                  setSearch('');
                  setActiveTab('all');
                }}
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="fnot-list">
            {groupOrder.map((groupLabel) => {
              const items = grouped[groupLabel];
              if (!items || items.length === 0) return null;

              return (
                <div key={groupLabel} className="fnot-group">
                  <div className="fnot-group-header">
                    <h3>{groupLabel}</h3>
                    <span>{items.length}</span>
                  </div>

                  <div className="fnot-group-items">
                    {items.map((notif) => {
                      const nid = getRawId(notif);
                      const meta = getTypeMeta(notif.type);
                      const isSelected = selectedIds.has(nid);

                      return (
                        <div
                          key={nid}
                          className={`fnot-item ${!notif.isRead ? 'unread' : ''} ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleNotifClick(notif)}
                        >
                          <label
                            className="fnot-item-check"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => toggleSelect(notif, e)}
                            />
                            <span className="fnot-checkbox" />
                          </label>

                          <div className={`fnot-item-icon ${meta.color}`}>
                            {meta.icon}
                          </div>

                          <div className="fnot-item-body">
                            <div className="fnot-item-head">
                              <div className="fnot-item-title-wrap">
                                {!notif.isRead && <span className="fnot-dot" />}
                                <h4 className="fnot-item-title">
                                  {notif.title || 'Notification'}
                                </h4>
                                <span className={`fnot-type-pill ${meta.color}`}>
                                  {meta.label}
                                </span>
                              </div>
                              <span className="fnot-item-time" title={formatFullDate(notif.createdAt)}>
                                {timeAgo(notif.createdAt)}
                              </span>
                            </div>

                            {notif.message && (
                              <p className="fnot-item-msg">{notif.message}</p>
                            )}

                            <div className="fnot-item-actions">
                              {!notif.isRead ? (
                                <button
                                  className="fnot-mini-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markAsRead(notif);
                                  }}
                                >
                                  ✓ Mark as read
                                </button>
                              ) : (
                                <button
                                  className="fnot-mini-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markAsUnread(notif);
                                  }}
                                >
                                  ⟲ Mark as unread
                                </button>
                              )}
                              <button
                                className="fnot-mini-btn danger"
                                onClick={(e) => deleteNotification(notif, e)}
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}