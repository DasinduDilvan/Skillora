// src/components/FreelancerComponents/Payments/Payments.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import API from '../../../api/axios';
import './Payments.css';

/* ============================================================
   HELPERS
============================================================ */
const asArray = (res) => {
  const d = res?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.results)) return d.results;
  return [];
};

const rid = (v) => {
  if (!v) return null;
  if (typeof v === 'string') return v;
  if (typeof v === 'object') {
    return (
      v.paymentId ||
      v.freelancerId ||
      v.projectId ||
      v.clientId ||
      v.userId ||
      v._id ||
      v.id ||
      null
    );
  }
  return String(v);
};

const eqId = (a, b) => {
  const x = rid(a), y = rid(b);
  return x && y && String(x) === String(y);
};

const formatCurrency = (val, currency = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    maximumFractionDigits: 2,
  }).format(val || 0);

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatDateTime = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const timeAgo = (date) => {
  if (!date) return '—';
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return formatDate(date);
};

const getMonthName = (m) =>
  ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m];

const StatusPill = ({ status }) => {
  const map = {
    pending:   { label: 'Pending',   cls: 'fpay-pill-amber', icon: '⏳' },
    processing:{ label: 'Processing',cls: 'fpay-pill-blue',  icon: '🔄' },
    completed: { label: 'Completed', cls: 'fpay-pill-green', icon: '✓' },
    failed:    { label: 'Failed',    cls: 'fpay-pill-red',   icon: '✕' },
    refunded:  { label: 'Refunded',  cls: 'fpay-pill-purple',icon: '↩' },
    cancelled: { label: 'Cancelled', cls: 'fpay-pill-gray',  icon: '🚫' },
  };
  const b = map[status?.toLowerCase()] || { label: status || 'Unknown', cls: 'fpay-pill-gray', icon: '•' };
  return (
    <span className={`fpay-pill ${b.cls}`}>
      <span className="fpay-pill-icon">{b.icon}</span>
      {b.label}
    </span>
  );
};

const TABS = [
  { id: 'all',       label: 'All Payments', icon: '💰' },
  { id: 'completed', label: 'Received',     icon: '✅' },
  { id: 'pending',   label: 'Pending',      icon: '⏳' },
  { id: 'processing',label: 'Processing',   icon: '🔄' },
  { id: 'failed',    label: 'Failed',       icon: '❌' },
];

/* ============================================================
   MAIN COMPONENT
============================================================ */
export default function Payments() {
  const { user } = useAuth();

  const [payments, setPayments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [freelancer, setFreelancer] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedPayment, setSelectedPayment] = useState(null);

  const currentUserId = user?.userId || user?._id || user?.id;

  /* ---------- Fetch Data ---------- */
  const fetchData = useCallback(async () => {
    if (!currentUserId) return;

    try {
      setLoading(true);
      setError('');

      const [freelancersRes, paymentsRes, projectsRes, clientsRes, usersRes] =
        await Promise.all([
          API.get('/freelancers').catch(() => ({ data: [] })),
          API.get('/payments').catch(() => ({ data: [] })),
          API.get('/projects').catch(() => ({ data: [] })),
          API.get('/clients').catch(() => ({ data: [] })),
          API.get('/users').catch(() => ({ data: [] })),
        ]);

      const allFreelancers = asArray(freelancersRes);
      const allPayments = asArray(paymentsRes);
      const allProjects = asArray(projectsRes);
      const allClients = asArray(clientsRes);
      const allUsers = asArray(usersRes);

      // Find this user's freelancer profile
      const myFreelancer = allFreelancers.find((f) => eqId(f.userId, currentUserId));
      const freelancerId = myFreelancer?.freelancerId || myFreelancer?._id;

      if (!freelancerId) {
        setError('Freelancer profile not found. Please complete your profile setup.');
        setLoading(false);
        return;
      }

      setFreelancer(myFreelancer);

      // Filter payments where this freelancer is the recipient
      const myPayments = allPayments.filter((p) => eqId(p.freelancerId, freelancerId));

      setPayments(myPayments);
      setProjects(allProjects);
      setClients(allClients);
      setUsers(allUsers);
    } catch (err) {
      console.error('Failed to load payments:', err);
      setError('Failed to load your payments. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ---------- Lookup Maps ---------- */
  const projectMap = useMemo(() => {
    const map = new Map();
    projects.forEach((p) => {
      const id = p.projectId || p._id;
      if (id) map.set(String(id), p);
    });
    return map;
  }, [projects]);

  const clientNameMap = useMemo(() => {
    const map = new Map();
    clients.forEach((c) => {
      const cid = c.clientId || c._id;
      if (!cid) return;
      const cUser = users.find((u) => eqId(u, c.userId));
      const fullName = cUser
        ? `${cUser.firstName || ''} ${cUser.lastName || ''}`.trim()
        : '';
      map.set(
        String(cid),
        c.companyName || fullName || cUser?.username || 'Client'
      );
    });
    return map;
  }, [clients, users]);

  /* ---------- Enriched Payments ---------- */
  const enrichedPayments = useMemo(() => {
    return payments.map((p) => {
      const pid = p.paymentId || p._id;
      const projectId = rid(p.projectId);
      const clientId = rid(p.clientId);
      const project = projectId ? projectMap.get(String(projectId)) : null;
      const clientName = clientId ? clientNameMap.get(String(clientId)) : 'Client';

      return {
        ...p,
        paymentId: pid,
        projectTitle: project?.title || 'Unknown Project',
        clientName: clientName || 'Client',
      };
    });
  }, [payments, projectMap, clientNameMap]);

  /* ---------- STATS & BALANCE ---------- */
  const stats = useMemo(() => {
    const completed = enrichedPayments.filter((p) => p.status === 'completed');
    const pending = enrichedPayments.filter((p) => p.status === 'pending');
    const processing = enrichedPayments.filter((p) => p.status === 'processing');
    const failed = enrichedPayments.filter((p) => p.status === 'failed');

    const totalEarnings = completed.reduce((s, p) => s + (p.amount || 0), 0);
    const pendingAmount = [...pending, ...processing].reduce((s, p) => s + (p.amount || 0), 0);

    // This month earnings
    const now = new Date();
    const thisMonthEarnings = completed
      .filter((p) => {
        const d = new Date(p.paidAt || p.createdAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((s, p) => s + (p.amount || 0), 0);

    // Last month earnings
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
    const lastMonthEarnings = completed
      .filter((p) => {
        const d = new Date(p.paidAt || p.createdAt);
        return d.getMonth() === lastMonth.getMonth() && d.getFullYear() === lastMonth.getFullYear();
      })
      .reduce((s, p) => s + (p.amount || 0), 0);

    // Growth %
    const monthGrowth = lastMonthEarnings > 0
      ? ((thisMonthEarnings - lastMonthEarnings) / lastMonthEarnings) * 100
      : (thisMonthEarnings > 0 ? 100 : 0);

    // Available balance: completed + not withdrawn (simulated: 85% of earnings available)
    const availableBalance = totalEarnings;

    const avgPayment = completed.length > 0 ? totalEarnings / completed.length : 0;

    return {
      total: enrichedPayments.length,
      totalEarnings,
      availableBalance,
      pendingAmount,
      thisMonthEarnings,
      lastMonthEarnings,
      monthGrowth,
      avgPayment,
      completedCount: completed.length,
      pendingCount: pending.length,
      processingCount: processing.length,
      failedCount: failed.length,
    };
  }, [enrichedPayments]);

  /* ---------- Tab Counts ---------- */
  const tabCounts = useMemo(() => ({
    all:        stats.total,
    completed:  stats.completedCount,
    pending:    stats.pendingCount,
    processing: stats.processingCount,
    failed:     stats.failedCount,
  }), [stats]);

  /* ---------- Filtered List ---------- */
  const filtered = useMemo(() => {
    let list = enrichedPayments.filter((p) => {
      if (activeTab !== 'all' && (p.status || '').toLowerCase() !== activeTab) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !(p.projectTitle || '').toLowerCase().includes(q) &&
          !(p.clientName || '').toLowerCase().includes(q) &&
          !(p.transactionId || '').toLowerCase().includes(q) &&
          !(p.description || '').toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });

    list.sort((a, b) => {
      const dateA = new Date(a.paidAt || a.createdAt);
      const dateB = new Date(b.paidAt || b.createdAt);
      if (sortBy === 'newest')      return dateB - dateA;
      if (sortBy === 'oldest')      return dateA - dateB;
      if (sortBy === 'amount-high') return (b.amount || 0) - (a.amount || 0);
      if (sortBy === 'amount-low')  return (a.amount || 0) - (b.amount || 0);
      return 0;
    });

    return list;
  }, [enrichedPayments, activeTab, search, sortBy]);

  /* ---------- Monthly Chart Data (last 6 months) ---------- */
  const monthlyData = useMemo(() => {
    const months = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const earnings = enrichedPayments
        .filter((p) => {
          if (p.status !== 'completed') return false;
          const pd = new Date(p.paidAt || p.createdAt);
          return pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear();
        })
        .reduce((s, p) => s + (p.amount || 0), 0);

      months.push({
        label: getMonthName(d.getMonth()),
        year: d.getFullYear(),
        amount: earnings,
      });
    }

    const max = Math.max(...months.map((m) => m.amount), 1);
    return months.map((m) => ({ ...m, percent: (m.amount / max) * 100 }));
  }, [enrichedPayments]);

  /* ---------- Loading ---------- */
  if (loading) {
    return (
      <div className="fpay-loading">
        <div className="fpay-spinner" />
        <p>Loading your payments...</p>
      </div>
    );
  }

  const freelancerName = user?.firstName || user?.username || 'Freelancer';

  return (
    <div className="fpay-page">
      {/* ======== HERO ======== */}
      <div className="fpay-hero">
        <div className="fpay-hero-inner">
          <div className="fpay-hero-text">
            <span className="fpay-hero-badge">💳 Earnings & Payments</span>
            <h1>Payments Dashboard</h1>
            <p>Track your earnings, balance, and transaction history.</p>
          </div>
        </div>
      </div>

      {/* ======== BALANCE CARD ======== */}
      <div className="fpay-balance-wrap">
        <div className="fpay-balance-card">
          <div className="fpay-balance-main">
            <div className="fpay-balance-label">
              <span className="fpay-balance-icon">💎</span>
              Current Available Balance
            </div>
            <div className="fpay-balance-amount">
              {formatCurrency(stats.availableBalance)}
            </div>
            <div className="fpay-balance-sub">
              Hi {freelancerName}, here's your earnings overview
            </div>
          </div>

          <div className="fpay-balance-side">
            <div className="fpay-side-item">
              <span className="fpay-side-label">Pending</span>
              <span className="fpay-side-value">{formatCurrency(stats.pendingAmount)}</span>
            </div>
            <div className="fpay-side-divider" />
            <div className="fpay-side-item">
              <span className="fpay-side-label">This Month</span>
              <span className="fpay-side-value">{formatCurrency(stats.thisMonthEarnings)}</span>
              {stats.monthGrowth !== 0 && (
                <span className={`fpay-growth ${stats.monthGrowth > 0 ? 'up' : 'down'}`}>
                  {stats.monthGrowth > 0 ? '↑' : '↓'} {Math.abs(stats.monthGrowth).toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ======== STATS GRID ======== */}
      <div className="fpay-stats-strip">
        <div className="fpay-stat green">
          <div className="fpay-stat-icon">💰</div>
          <div>
            <span className="fpay-stat-num">{formatCurrency(stats.totalEarnings)}</span>
            <span className="fpay-stat-lbl">Total Earnings</span>
          </div>
        </div>
        <div className="fpay-stat blue">
          <div className="fpay-stat-icon">📥</div>
          <div>
            <span className="fpay-stat-num">{stats.completedCount}</span>
            <span className="fpay-stat-lbl">Payments Received</span>
          </div>
        </div>
        <div className="fpay-stat amber">
          <div className="fpay-stat-icon">⏳</div>
          <div>
            <span className="fpay-stat-num">{stats.pendingCount + stats.processingCount}</span>
            <span className="fpay-stat-lbl">Pending Payments</span>
          </div>
        </div>
        <div className="fpay-stat purple">
          <div className="fpay-stat-icon">📊</div>
          <div>
            <span className="fpay-stat-num">{formatCurrency(stats.avgPayment)}</span>
            <span className="fpay-stat-lbl">Avg Per Payment</span>
          </div>
        </div>
      </div>

      {/* ======== CHART & QUICK INFO ======== */}
      <div className="fpay-container">
        <div className="fpay-insights">
          <div className="fpay-chart-card">
            <div className="fpay-chart-head">
              <div>
                <h3>Earnings Trend</h3>
                <p>Last 6 months performance</p>
              </div>
              <div className="fpay-chart-legend">
                <span className="fpay-dot"></span>
                Completed Payments
              </div>
            </div>

            <div className="fpay-chart">
              {monthlyData.map((m, i) => (
                <div key={i} className="fpay-bar-wrap">
                  <div className="fpay-bar-value">
                    {m.amount > 0 ? formatCurrency(m.amount) : ''}
                  </div>
                  <div
                    className="fpay-bar"
                    style={{ height: `${Math.max(m.percent, m.amount > 0 ? 6 : 0)}%` }}
                    title={formatCurrency(m.amount)}
                  />
                  <div className="fpay-bar-label">{m.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="fpay-quick-card">
            <h3>💡 Quick Insights</h3>
            <div className="fpay-insight">
              <span className="fpay-insight-icon">📅</span>
              <div>
                <strong>Last Month</strong>
                <p>{formatCurrency(stats.lastMonthEarnings)}</p>
              </div>
            </div>
            <div className="fpay-insight">
              <span className="fpay-insight-icon">🎯</span>
              <div>
                <strong>Success Rate</strong>
                <p>
                  {stats.total > 0
                    ? `${((stats.completedCount / stats.total) * 100).toFixed(0)}%`
                    : '—'}
                </p>
              </div>
            </div>
            <div className="fpay-insight">
              <span className="fpay-insight-icon">💼</span>
              <div>
                <strong>Projects Completed</strong>
                <p>{freelancer?.projectsCompleted || stats.completedCount}</p>
              </div>
            </div>
            <div className="fpay-insight">
              <span className="fpay-insight-icon">⚡</span>
              <div>
                <strong>Hourly Rate</strong>
                <p>{formatCurrency(freelancer?.hourlyRate || 0)}/hr</p>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="fpay-alert">
            <span>⚠️</span>
            <p>{error}</p>
            <button onClick={() => setError('')}>×</button>
          </div>
        )}

        {/* ======== TABS ======== */}
        <div className="fpay-tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`fpay-tab ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              <span className="fpay-tab-icon">{t.icon}</span>
              {t.label}
              <span className="fpay-tab-count">{tabCounts[t.id] ?? 0}</span>
            </button>
          ))}
        </div>

        {/* ======== TOOLBAR ======== */}
        <div className="fpay-toolbar">
          <div className="fpay-search">
            <span className="fpay-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by project, client, transaction ID or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="fpay-search-clear" onClick={() => setSearch('')}>×</button>
            )}
          </div>

          <select
            className="fpay-sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="amount-high">Amount: High to Low</option>
            <option value="amount-low">Amount: Low to High</option>
          </select>
        </div>

        <div className="fpay-count">
          Showing <strong>{filtered.length}</strong> of <strong>{enrichedPayments.length}</strong> transactions
        </div>

        {/* ======== PAYMENTS LIST ======== */}
        {filtered.length === 0 ? (
          <div className="fpay-empty">
            <div className="fpay-empty-icon">{enrichedPayments.length === 0 ? '💸' : '🔍'}</div>
            <h3>
              {enrichedPayments.length === 0
                ? 'No payments yet'
                : 'No payments match your filters'}
            </h3>
            <p>
              {enrichedPayments.length === 0
                ? 'Once you complete projects, your payments will appear here. Keep up the great work!'
                : 'Try switching tabs, adjusting your search, or resetting filters.'}
            </p>
            {enrichedPayments.length > 0 && (
              <button
                className="fpay-btn fpay-btn-outline"
                onClick={() => { setSearch(''); setActiveTab('all'); }}
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="fpay-list">
            {filtered.map((p) => (
              <div
                key={p.paymentId}
                className={`fpay-card status-${p.status || 'pending'}`}
                onClick={() => setSelectedPayment(p)}
              >
                <div className="fpay-card-left">
                  <div className={`fpay-type-icon status-${p.status || 'pending'}`}>
                    {p.status === 'completed' ? '✓'
                      : p.status === 'failed' ? '✕'
                      : p.status === 'refunded' ? '↩'
                      : '⏳'}
                  </div>
                  <div className="fpay-card-info">
                    <div className="fpay-card-title">{p.projectTitle}</div>
                    <div className="fpay-card-meta">
                      <span>👤 {p.clientName}</span>
                      <span>•</span>
                      <span>{p.paymentMethod || 'Bank Transfer'}</span>
                      <span>•</span>
                      <span>{timeAgo(p.paidAt || p.createdAt)}</span>
                    </div>
                    {p.transactionId && (
                      <div className="fpay-txn-id">
                        TXN: <code>{p.transactionId}</code>
                      </div>
                    )}
                  </div>
                </div>

                <div className="fpay-card-right">
                  <div className={`fpay-amount ${p.status === 'completed' ? 'earned' : ''}`}>
                    {p.status === 'completed' ? '+' : ''}{formatCurrency(p.amount, p.currency)}
                  </div>
                  <StatusPill status={p.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ======== DETAIL MODAL ======== */}
      {selectedPayment && (
        <div className="fpay-modal-overlay" onClick={() => setSelectedPayment(null)}>
          <div className="fpay-modal" onClick={(e) => e.stopPropagation()}>
            <div className="fpay-modal-head">
              <h2>Payment Details</h2>
              <button onClick={() => setSelectedPayment(null)}>×</button>
            </div>

            <div className="fpay-modal-body">
              <div className="fpay-modal-amount">
                <div className={`fpay-amount-big status-${selectedPayment.status}`}>
                  {formatCurrency(selectedPayment.amount, selectedPayment.currency)}
                </div>
                <StatusPill status={selectedPayment.status} />
              </div>

              <div className="fpay-modal-project">
                <span className="fpay-mp-label">For Project</span>
                <strong>{selectedPayment.projectTitle}</strong>
              </div>

              <div className="fpay-detail-grid">
                <div className="fpay-detail">
                  <label>Transaction ID</label>
                  <p><code>{selectedPayment.transactionId || '—'}</code></p>
                </div>
                <div className="fpay-detail">
                  <label>Payment ID</label>
                  <p><code>{selectedPayment.paymentId}</code></p>
                </div>
                <div className="fpay-detail">
                  <label>From Client</label>
                  <p>{selectedPayment.clientName}</p>
                </div>
                <div className="fpay-detail">
                  <label>Payment Method</label>
                  <p>{selectedPayment.paymentMethod || 'Bank Transfer'}</p>
                </div>
                <div className="fpay-detail">
                  <label>Payment Type</label>
                  <p className="fpay-type-badge">{selectedPayment.paymentType || 'Project Payment'}</p>
                </div>
                <div className="fpay-detail">
                  <label>Currency</label>
                  <p>{selectedPayment.currency || 'USD'}</p>
                </div>
                <div className="fpay-detail">
                  <label>Paid At</label>
                  <p>{formatDateTime(selectedPayment.paidAt)}</p>
                </div>
                <div className="fpay-detail">
                  <label>Created At</label>
                  <p>{formatDateTime(selectedPayment.createdAt)}</p>
                </div>
              </div>

              {selectedPayment.description && (
                <div className="fpay-description">
                  <label>Description / Notes</label>
                  <p>{selectedPayment.description}</p>
                </div>
              )}

              <div className="fpay-modal-footer">
                <button className="fpay-btn fpay-btn-outline" onClick={() => setSelectedPayment(null)}>
                  Close
                </button>
                <button
                  className="fpay-btn fpay-btn-primary"
                  onClick={() => window.print()}
                >
                  📄 Print Receipt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}