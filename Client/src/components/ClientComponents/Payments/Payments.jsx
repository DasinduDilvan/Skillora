// src/components/ClientComponents/Payments/Payments.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
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

const getRawId = (v) => {
  if (!v) return null;
  if (typeof v === 'string') return v;
  if (typeof v === 'object') {
    return (
      v.paymentId ||
      v.clientId ||
      v.freelancerId ||
      v.projectId ||
      v.userId ||
      v._id ||
      v.id ||
      null
    );
  }
  return String(v);
};

const eqId = (a, b) => {
  const x = getRawId(a);
  const y = getRawId(b);
  return x && y && String(x) === String(y);
};

const formatCurrency = (val, currency = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    maximumFractionDigits: 2,
  }).format(val || 0);

const formatLKR = (val) =>
  new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    maximumFractionDigits: 0,
  }).format((val || 0) * 300);

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
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return formatDate(date);
};

const getMonthName = (m) =>
  ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m];

const StatusPill = ({ status }) => {
  const map = {
    completed:  { label: 'Paid',       cls: 'cpay-pill-green',  icon: '✓' },
    pending:    { label: 'Pending',    cls: 'cpay-pill-amber',  icon: '⏳' },
    processing: { label: 'Processing', cls: 'cpay-pill-blue',   icon: '🔄' },
    failed:     { label: 'Failed',     cls: 'cpay-pill-red',    icon: '✕' },
    refunded:   { label: 'Refunded',   cls: 'cpay-pill-purple', icon: '↩' },
  };
  const b = map[status?.toLowerCase()] || {
    label: status || 'Unknown',
    cls: 'cpay-pill-gray',
    icon: '•',
  };
  return (
    <span className={`cpay-pill ${b.cls}`}>
      <span className="cpay-pill-icon">{b.icon}</span>
      {b.label}
    </span>
  );
};

const TABS = [
  { id: 'all',       label: 'All Payments', icon: '💳' },
  { id: 'completed', label: 'Successful',   icon: '✅' },
  { id: 'pending',   label: 'Pending',      icon: '⏳' },
  { id: 'refunded',  label: 'Refunded',     icon: '↩' },
  { id: 'failed',    label: 'Failed',       icon: '❌' },
];

/* ============================================================
   MAIN COMPONENT
============================================================ */
export default function Payments() {
  const { user } = useAuth();

  const [payments, setPayments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [freelancers, setFreelancers] = useState([]);
  const [users, setUsers] = useState([]);
  const [client, setClient] = useState(null);

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

      const [clientsRes, paymentsRes, projectsRes, freelancersRes, usersRes] =
        await Promise.all([
          API.get('/clients').catch(() => ({ data: [] })),
          API.get('/payments').catch(() => ({ data: [] })),
          API.get('/projects').catch(() => ({ data: [] })),
          API.get('/freelancers').catch(() => ({ data: [] })),
          API.get('/users').catch(() => ({ data: [] })),
        ]);

      const allClients = asArray(clientsRes);
      const allPayments = asArray(paymentsRes);
      const allProjects = asArray(projectsRes);
      const allFreelancers = asArray(freelancersRes);
      const allUsers = asArray(usersRes);

      const myClient = allClients.find((c) => eqId(c.userId, currentUserId));
      const clientId = myClient?.clientId || myClient?._id;

      if (!clientId) {
        setError('Client profile not found. Please setup your profile.');
        setLoading(false);
        return;
      }

      setClient(myClient);

      // Find projects owned by this client to also match payments without explicit clientId
      const myProjectIds = allProjects
        .filter((p) => eqId(p.clientId, clientId))
        .map((p) => getRawId(p.projectId || p._id));

      // Filter payments that belong to this client
      const myPayments = allPayments.filter((pay) => {
        if (eqId(pay.clientId, clientId)) return true;
        const pid = getRawId(pay.projectId);
        return pid && myProjectIds.includes(pid);
      });

      setPayments(myPayments);
      setProjects(allProjects);
      setFreelancers(allFreelancers);
      setUsers(allUsers);
    } catch (err) {
      console.error('❌ Failed to load client billing:', err);
      setError('Failed to load your payments. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ---------- In-Memory Lookup Maps ---------- */
  const projectMap = useMemo(() => {
    const map = new Map();
    projects.forEach((p) => {
      const id = p.projectId || p._id;
      if (id) map.set(String(id), p);
    });
    return map;
  }, [projects]);

  const freelancerDetailsMap = useMemo(() => {
    const map = new Map();
    freelancers.forEach((f) => {
      const fid = f.freelancerId || f._id;
      if (!fid) return;
      const fUser = users.find((u) => eqId(u, f.userId));
      const fullName = fUser
        ? `${fUser.firstName || ''} ${fUser.lastName || ''}`.trim() || fUser.username
        : 'Freelancer';
      map.set(String(fid), {
        name: fullName,
        email: fUser?.email || '',
        profileImage: fUser?.profileImage || f.profileImage || '',
        headline: f.headline || 'Professional Freelancer',
      });
    });
    return map;
  }, [freelancers, users]);

  /* ---------- Enriched Payments ---------- */
  const enrichedPayments = useMemo(() => {
    return payments.map((p) => {
      const pid = p.paymentId || p._id;
      const projectId = getRawId(p.projectId);
      const freelancerId = getRawId(p.freelancerId);
      const project = projectId ? projectMap.get(String(projectId)) : null;
      const flDetails = freelancerId
        ? freelancerDetailsMap.get(String(freelancerId))
        : { name: 'Freelancer', profileImage: '', headline: '' };

      return {
        ...p,
        paymentId: pid,
        projectTitle: project?.title || p.description || 'Project Milestone',
        projectBudget: project?.budget || p.amount || 0,
        freelancer: flDetails,
      };
    });
  }, [payments, projectMap, freelancerDetailsMap]);

  /* ---------- Financial Statistics ---------- */
  const stats = useMemo(() => {
    const completed = enrichedPayments.filter((p) => (p.status || '').toLowerCase() === 'completed');
    const pending = enrichedPayments.filter((p) => (p.status || '').toLowerCase() === 'pending');
    const failed = enrichedPayments.filter((p) => (p.status || '').toLowerCase() === 'failed');
    const refunded = enrichedPayments.filter((p) => (p.status || '').toLowerCase() === 'refunded');

    const totalSpent = completed.reduce((s, p) => s + (p.amount || 0), 0);
    const pendingAmount = pending.reduce((s, p) => s + (p.amount || 0), 0);

    const now = new Date();
    const thisMonthSpent = completed
      .filter((p) => {
        const d = new Date(p.paidAt || p.createdAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((s, p) => s + (p.amount || 0), 0);

    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
    const lastMonthSpent = completed
      .filter((p) => {
        const d = new Date(p.paidAt || p.createdAt);
        return d.getMonth() === lastMonth.getMonth() && d.getFullYear() === lastMonth.getFullYear();
      })
      .reduce((s, p) => s + (p.amount || 0), 0);

    const monthChange =
      lastMonthSpent > 0
        ? ((thisMonthSpent - lastMonthSpent) / lastMonthSpent) * 100
        : thisMonthSpent > 0
        ? 100
        : 0;

    const avgPayment = completed.length > 0 ? totalSpent / completed.length : 0;

    return {
      totalCount: enrichedPayments.length,
      totalSpent,
      pendingAmount,
      thisMonthSpent,
      lastMonthSpent,
      monthChange,
      avgPayment,
      completedCount: completed.length,
      pendingCount: pending.length,
      failedCount: failed.length,
      refundedCount: refunded.length,
    };
  }, [enrichedPayments]);

  const tabCounts = useMemo(
    () => ({
      all:       stats.totalCount,
      completed: stats.completedCount,
      pending:   stats.pendingCount,
      refunded:  stats.refundedCount,
      failed:    stats.failedCount,
    }),
    [stats]
  );

  /* ---------- Monthly Trend Chart Data ---------- */
  const monthlyData = useMemo(() => {
    const months = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const spent = enrichedPayments
        .filter((p) => {
          if ((p.status || '').toLowerCase() !== 'completed') return false;
          const pd = new Date(p.paidAt || p.createdAt);
          return pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear();
        })
        .reduce((s, p) => s + (p.amount || 0), 0);

      months.push({
        label: getMonthName(d.getMonth()),
        year: d.getFullYear(),
        amount: spent,
      });
    }

    const max = Math.max(...months.map((m) => m.amount), 1);
    return months.map((m) => ({ ...m, percent: (m.amount / max) * 100 }));
  }, [enrichedPayments]);

  /* ---------- Filtered List ---------- */
  const filtered = useMemo(() => {
    let list = enrichedPayments.filter((p) => {
      if (activeTab !== 'all' && (p.status || '').toLowerCase() !== activeTab) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !(p.projectTitle || '').toLowerCase().includes(q) &&
          !(p.freelancer?.name || '').toLowerCase().includes(q) &&
          !(p.transactionId || '').toLowerCase().includes(q) &&
          !(p.paymentMethod || '').toLowerCase().includes(q) &&
          !(p.description || '').toLowerCase().includes(q)
        )
          return false;
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

  if (loading) {
    return (
      <div className="cpay-loading">
        <div className="cpay-spinner" />
        <p>Loading your payments & invoices...</p>
      </div>
    );
  }

  const clientName = client?.companyName || user?.firstName || user?.username || 'Client';

  return (
    <div className="cpay-page">
      {/* ============ HERO ============ */}
      <div className="cpay-hero">
        <div className="cpay-hero-inner">
          <div className="cpay-hero-text">
            <span className="cpay-hero-badge">💼 Billing & Transactions</span>
            <h1>Client Payments</h1>
            <p>Review project payments, invoice receipts, and transaction history.</p>
          </div>
          <Link to="/client/my-projects" className="cpay-hero-btn">
            📂 View My Projects
          </Link>
        </div>
      </div>

      {/* ============ TOTAL SPENT BANNER ============ */}
      <div className="cpay-balance-wrap">
        <div className="cpay-balance-card">
          <div className="cpay-balance-main">
            <div className="cpay-balance-label">
              <span className="cpay-balance-icon">💳</span>
              Total Investment & Paid Out
            </div>
            <div className="cpay-balance-amount">
              {formatCurrency(stats.totalSpent)}
            </div>
            <div className="cpay-balance-sub">
              Approx. {formatLKR(stats.totalSpent)} LKR funded across {stats.completedCount} completed milestones
            </div>
          </div>

          <div className="cpay-balance-side">
            <div className="cpay-side-item">
              <span className="cpay-side-label">Pending Invoices</span>
              <span className="cpay-side-value">{formatCurrency(stats.pendingAmount)}</span>
            </div>
            <div className="cpay-side-divider" />
            <div className="cpay-side-item">
              <span className="cpay-side-label">Spent This Month</span>
              <span className="cpay-side-value">{formatCurrency(stats.thisMonthSpent)}</span>
              {stats.monthChange !== 0 && (
                <span className={`cpay-growth ${stats.monthChange > 0 ? 'up' : 'down'}`}>
                  {stats.monthChange > 0 ? '↑' : '↓'} {Math.abs(stats.monthChange).toFixed(1)}% vs last mo.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ============ STATS STRIP ============ */}
      <div className="cpay-stats-strip">
        <div className="cpay-stat blue">
          <div className="cpay-stat-icon">📄</div>
          <div>
            <span className="cpay-stat-num">{stats.completedCount}</span>
            <span className="cpay-stat-lbl">Invoices Paid</span>
          </div>
        </div>
        <div className="cpay-stat green">
          <div className="cpay-stat-icon">💰</div>
          <div>
            <span className="cpay-stat-num">{formatCurrency(stats.totalSpent)}</span>
            <span className="cpay-stat-lbl">Total Completed</span>
          </div>
        </div>
        <div className="cpay-stat amber">
          <div className="cpay-stat-icon">⏳</div>
          <div>
            <span className="cpay-stat-num">{stats.pendingCount}</span>
            <span className="cpay-stat-lbl">Pending Approval</span>
          </div>
        </div>
        <div className="cpay-stat purple">
          <div className="cpay-stat-icon">📊</div>
          <div>
            <span className="cpay-stat-num">{formatCurrency(stats.avgPayment)}</span>
            <span className="cpay-stat-lbl">Avg Invoice Size</span>
          </div>
        </div>
      </div>

      {/* ============ SPENDING ANALYTICS & INSIGHTS ============ */}
      <div className="cpay-container">
        <div className="cpay-insights">
          <div className="cpay-chart-card">
            <div className="cpay-chart-head">
              <div>
                <h3>Monthly Expenditure</h3>
                <p>Track payments over the last 6 months</p>
              </div>
              <div className="cpay-chart-legend">
                <span className="cpay-dot" />
                Completed Disbursals
              </div>
            </div>

            <div className="cpay-chart">
              {monthlyData.map((m, i) => (
                <div key={i} className="cpay-bar-wrap">
                  <div className="cpay-bar-value">
                    {m.amount > 0 ? formatCurrency(m.amount) : ''}
                  </div>
                  <div
                    className="cpay-bar"
                    style={{ height: `${Math.max(m.percent, m.amount > 0 ? 8 : 0)}%` }}
                    title={formatCurrency(m.amount)}
                  />
                  <div className="cpay-bar-label">{m.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="cpay-quick-card">
            <h3>🛡️ Billing Overview</h3>
            <div className="cpay-insight">
              <span className="cpay-insight-icon">🏢</span>
              <div>
                <strong>Client Account</strong>
                <p>{clientName}</p>
              </div>
            </div>
            <div className="cpay-insight">
              <span className="cpay-insight-icon">💳</span>
              <div>
                <strong>Primary Gateway</strong>
                <p>PayHere Visa / Mastercard</p>
              </div>
            </div>
            <div className="cpay-insight">
              <span className="cpay-insight-icon">🔒</span>
              <div>
                <strong>Security</strong>
                <p>256-Bit Encrypted</p>
              </div>
            </div>
            <div className="cpay-insight">
              <span className="cpay-insight-icon">📅</span>
              <div>
                <strong>Last Month Spent</strong>
                <p>{formatCurrency(stats.lastMonthSpent)}</p>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="cpay-alert">
            <span>⚠️</span>
            <p>{error}</p>
            <button onClick={() => setError('')}>×</button>
          </div>
        )}

        {/* ============ TABS ============ */}
        <div className="cpay-tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`cpay-tab ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              <span className="cpay-tab-icon">{t.icon}</span>
              {t.label}
              <span className="cpay-tab-count">{tabCounts[t.id] ?? 0}</span>
            </button>
          ))}
        </div>

        {/* ============ TOOLBAR ============ */}
        <div className="cpay-toolbar">
          <div className="cpay-search">
            <span className="cpay-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by project, freelancer, transaction ID, or note..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="cpay-search-clear" onClick={() => setSearch('')}>
                ×
              </button>
            )}
          </div>

          <select
            className="cpay-sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="amount-high">Amount: High to Low</option>
            <option value="amount-low">Amount: Low to High</option>
          </select>
        </div>

        <div className="cpay-count">
          Showing <strong>{filtered.length}</strong> of <strong>{enrichedPayments.length}</strong> transactions
        </div>

        {/* ============ PAYMENTS LIST ============ */}
        {filtered.length === 0 ? (
          <div className="cpay-empty">
            <div className="cpay-empty-icon">
              {enrichedPayments.length === 0 ? '💳' : '🔍'}
            </div>
            <h3>
              {enrichedPayments.length === 0
                ? 'No payment transactions found'
                : 'No payments match your filter'}
            </h3>
            <p>
              {enrichedPayments.length === 0
                ? 'When you approve milestones and complete projects, your invoice and billing receipts will appear here.'
                : 'Try adjusting your search criteria or switching between the status tabs.'}
            </p>
            {enrichedPayments.length > 0 ? (
              <button
                className="cpay-btn cpay-btn-outline"
                onClick={() => {
                  setSearch('');
                  setActiveTab('all');
                }}
              >
                Reset Filters
              </button>
            ) : (
              <Link to="/client/my-projects" className="cpay-btn cpay-btn-primary">
                Go to My Projects
              </Link>
            )}
          </div>
        ) : (
          <div className="cpay-list">
            {filtered.map((p) => (
              <div
                key={p.paymentId}
                className={`cpay-card status-${(p.status || 'pending').toLowerCase()}`}
                onClick={() => setSelectedPayment(p)}
              >
                <div className="cpay-card-left">
                  <div className={`cpay-icon-badge status-${(p.status || 'pending').toLowerCase()}`}>
                    {p.status === 'completed' ? '✓'
                      : p.status === 'failed' ? '✕'
                      : p.status === 'refunded' ? '↩'
                      : '⏳'}
                  </div>

                  <div className="cpay-card-info">
                    <div className="cpay-card-title">{p.projectTitle}</div>
                    <div className="cpay-card-meta">
                      <span className="cpay-fl-tag">
                        👤 Paid to: <strong>{p.freelancer?.name || 'Freelancer'}</strong>
                      </span>
                      <span>•</span>
                      <span>{p.paymentMethod || 'PayHere Gateway'}</span>
                      <span>•</span>
                      <span>{timeAgo(p.paidAt || p.createdAt)}</span>
                    </div>

                    {p.transactionId && (
                      <div className="cpay-txn-row">
                        TXN: <code>{p.transactionId}</code>
                      </div>
                    )}
                  </div>
                </div>

                <div className="cpay-card-right">
                  <div className="cpay-amount">
                    {formatCurrency(p.amount, p.currency)}
                  </div>
                  <div className="cpay-lkr-sub">
                    {formatLKR(p.amount)}
                  </div>
                  <StatusPill status={p.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ============ INVOICE / RECEIPT MODAL ============ */}
      {selectedPayment && (
        <div className="cpay-modal-overlay" onClick={() => setSelectedPayment(null)}>
          <div className="cpay-modal" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="cpay-modal-head">
              <div className="cpay-receipt-brand">
                <span className="cpay-receipt-logo">⚡ Skillora Billing</span>
                <span className="cpay-receipt-badge">Official Receipt</span>
              </div>
              <button
                className="cpay-modal-close"
                onClick={() => setSelectedPayment(null)}
              >
                ×
              </button>
            </div>

            {/* Printable Body */}
            <div className="cpay-modal-body" id="printable-receipt">
              <div className="cpay-receipt-top">
                <div className="cpay-receipt-amount-box">
                  <span className="cpay-ra-label">Total Amount Paid</span>
                  <div className="cpay-ra-val">
                    {formatCurrency(selectedPayment.amount, selectedPayment.currency)}
                  </div>
                  <span className="cpay-ra-lkr">
                    Equiv. {formatLKR(selectedPayment.amount)}
                  </span>
                  <div className="cpay-ra-status">
                    <StatusPill status={selectedPayment.status} />
                  </div>
                </div>
              </div>

              {/* Billed From & To Grid */}
              <div className="cpay-invoice-parties">
                <div className="cpay-party">
                  <label>Billed To (Client)</label>
                  <strong>{clientName}</strong>
                  <span>{user?.email || 'client@example.com'}</span>
                  <span>{user?.location || 'Sri Lanka'}</span>
                </div>
                <div className="cpay-party">
                  <label>Paid To (Freelancer)</label>
                  <strong>{selectedPayment.freelancer?.name || 'Freelancer'}</strong>
                  <span>{selectedPayment.freelancer?.email || 'freelancer@skillora.com'}</span>
                  <span>{selectedPayment.freelancer?.headline || 'Freelance Specialist'}</span>
                </div>
              </div>

              {/* Project Reference */}
              <div className="cpay-receipt-project">
                <label>Project / Milestone Item</label>
                <strong>{selectedPayment.projectTitle}</strong>
              </div>

              {/* Transaction Metadata Grid */}
              <div className="cpay-detail-grid">
                <div className="cpay-detail">
                  <label>Transaction Reference</label>
                  <p><code>{selectedPayment.transactionId || 'TXN-DIRECT'}</code></p>
                </div>
                <div className="cpay-detail">
                  <label>Payment Record ID</label>
                  <p><code>{selectedPayment.paymentId}</code></p>
                </div>
                <div className="cpay-detail">
                  <label>Payment Gateway / Method</label>
                  <p>{selectedPayment.paymentMethod || 'PayHere Sandbox'}</p>
                </div>
                <div className="cpay-detail">
                  <label>Disbursal Type</label>
                  <p className="cpay-type-badge">{selectedPayment.paymentType || 'Milestone'}</p>
                </div>
                <div className="cpay-detail">
                  <label>Date & Time</label>
                  <p>{formatDateTime(selectedPayment.paidAt || selectedPayment.createdAt)}</p>
                </div>
                <div className="cpay-detail">
                  <label>Currency</label>
                  <p>{selectedPayment.currency || 'USD'}</p>
                </div>
              </div>

              {selectedPayment.description && (
                <div className="cpay-desc-box">
                  <label>Notes & Deliverable Description</label>
                  <p>{selectedPayment.description}</p>
                </div>
              )}

              <div className="cpay-receipt-footer-note">
                <p>
                  🛡️ This payment was securely authenticated through the PayHere gateway.
                  Skillora escrow safeguards freelancer releases upon milestone acceptance.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="cpay-modal-actions">
                <button
                  type="button"
                  className="cpay-btn cpay-btn-outline"
                  onClick={() => setSelectedPayment(null)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="cpay-btn cpay-btn-primary"
                  onClick={() => window.print()}
                >
                  🖨️ Print Invoice Receipt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}