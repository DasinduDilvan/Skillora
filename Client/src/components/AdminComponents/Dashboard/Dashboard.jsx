// src/components/AdminComponents/Dashboard/Dashboard.jsx
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import API from '../../../api/axios';
import './Dashboard.css';

const asArray = (res) => {
  const d = res?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.results)) return d.results;
  return [];
};

const formatCurrency = (val) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(val || 0);

const timeAgo = (date) => {
  if (!date) return '—';
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
};

export default function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    users: [],
    projects: [],
    payments: [],
    reports: [],
    freelancers: [],
    clients: [],
    categories: [],
  });

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [u, p, pay, r, f, c, cat] = await Promise.all([
        API.get('/users').catch(() => ({ data: [] })),
        API.get('/projects').catch(() => ({ data: [] })),
        API.get('/payments').catch(() => ({ data: [] })),
        API.get('/reports').catch(() => ({ data: [] })),
        API.get('/freelancers').catch(() => ({ data: [] })),
        API.get('/clients').catch(() => ({ data: [] })),
        API.get('/categories').catch(() => ({ data: [] })),
      ]);
      setData({
        users: asArray(u),
        projects: asArray(p),
        payments: asArray(pay),
        reports: asArray(r),
        freelancers: asArray(f),
        clients: asArray(c),
        categories: asArray(cat),
      });
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const activeProjects = data.projects.filter(
    (p) => ['active', 'in-progress', 'in_progress'].includes((p.status || '').toLowerCase())
  ).length;

  const pendingReports = data.reports.filter(
    (r) => (r.status || '').toLowerCase() === 'pending'
  ).length;

  const monthlyRevenue = data.payments
    .filter((p) => {
      if ((p.status || '').toLowerCase() !== 'completed') return false;
      const d = new Date(p.paidAt || p.createdAt);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s, p) => s + (p.amount || 0), 0);

  const stats = [
    { label: 'Total Users', value: data.users.length, icon: '👥', color: '#3b82f6' },
    { label: 'Active Projects', value: activeProjects, icon: '📁', color: '#10b981' },
    { label: 'Pending Reports', value: pendingReports, icon: '⚠️', color: '#f59e0b' },
    { label: 'Revenue (This Month)', value: formatCurrency(monthlyRevenue), icon: '💰', color: '#8b5cf6' },
  ];

  const recentActivity = [
    ...data.users.slice(-5).map((u) => ({
      text: `New user registered: ${u.firstName || u.username || u.email}`,
      time: u.createdAt,
      type: 'user',
    })),
    ...data.reports.slice(-3).map((r) => ({
      text: `Report filed: ${r.reason || 'No reason'}`,
      time: r.createdAt,
      type: 'report',
    })),
    ...data.payments.slice(-3).map((p) => ({
      text: `Payment ${p.status}: ${formatCurrency(p.amount)}`,
      time: p.createdAt,
      type: 'payment',
    })),
  ]
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .slice(0, 8);

  if (loading) {
    return (
      <div className="adm-loading">
        <div className="adm-spinner" />
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1>Admin Overview 🛡️</h1>
        <p>Welcome, {user?.firstName || user?.name || 'Admin'}. Here's your platform summary.</p>
      </div>

      <div className="stats-grid">
        {stats.map((s, i) => (
          <div key={i} className="stat-card" style={{ borderTopColor: s.color }}>
            <div className="stat-icon" style={{ background: `${s.color}20` }}>{s.icon}</div>
            <div className="stat-info">
              <h3>{s.value}</h3>
              <p>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mini-stats">
        <div className="mini-stat">
          <span className="mini-num">{data.freelancers.length}</span>
          <span className="mini-lbl">Freelancers</span>
        </div>
        <div className="mini-stat">
          <span className="mini-num">{data.clients.length}</span>
          <span className="mini-lbl">Clients</span>
        </div>
        <div className="mini-stat">
          <span className="mini-num">{data.categories.length}</span>
          <span className="mini-lbl">Categories</span>
        </div>
        <div className="mini-stat">
          <span className="mini-num">{data.payments.length}</span>
          <span className="mini-lbl">Transactions</span>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h2>Recent Platform Activity</h2>
          {recentActivity.length === 0 ? (
            <p className="empty-msg">No recent activity.</p>
          ) : (
            <ul className="activity-list">
              {recentActivity.map((a, i) => (
                <li key={i}>
                  <span className={`dot dot-${a.type}`}></span>
                  <div>
                    <p>{a.text}</p>
                    <span className="time">{timeAgo(a.time)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="dashboard-card">
          <h2>Quick Actions</h2>
          <div className="quick-actions">
            <a href="/admin/users" className="action-btn">👥 Manage Users</a>
            <a href="/admin/projects" className="action-btn">📁 Review Projects</a>
            <a href="/admin/reports" className="action-btn">⚠️ Handle Reports</a>
            <a href="/admin/payments" className="action-btn">💳 View Payments</a>
            <a href="/admin/categories" className="action-btn">🏷️ Categories</a>
          </div>
        </div>
      </div>
    </div>
  );
}