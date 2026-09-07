// src/components/ClientComponents/MyProjects/MyProjects.jsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import API from '../../../api/axios';
import './MyProjects.css';

/* ============================================================
   HELPERS
============================================================ */
const formatCurrency = (val) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(val || 0);

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatFullDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatTimestamp = (d) => {
  if (!d) return '—';
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `${days}d ago`;
  if (hrs > 0) return `${hrs}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return 'Just now';
};

const daysLeft = (deadline) => {
  if (!deadline) return null;
  return Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));
};

/* ---------- Bulk-fetch safe extractor ---------- */
const asArray = (res) => {
  const data = res?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};

/* ---------- Custom-schema-aware ID extraction ---------- */
const getRawId = (v) => {
  if (!v) return null;
  if (typeof v === 'string') return v;
  if (typeof v === 'object') {
    return (
      v.freelancerId ||
      v.projectId ||
      v.clientId ||
      v.userId ||
      v.categoryId ||
      v.applicationId ||
      v._id ||
      v.id ||
      null
    );
  }
  return String(v);
};

const eqId = (a, b) => {
  const idA = getRawId(a);
  const idB = getRawId(b);
  if (!idA || !idB) return false;
  return String(idA) === String(idB);
};

const StatusPill = ({ status }) => {
  const map = {
    draft: { label: 'Draft', cls: 'mp-pill-gray' },
    open: { label: 'Open', cls: 'mp-pill-green' },
    active: { label: 'In Progress', cls: 'mp-pill-blue' },
    'in-progress': { label: 'In Progress', cls: 'mp-pill-blue' },
    in_progress: { label: 'In Progress', cls: 'mp-pill-blue' },
    review: { label: 'In Review', cls: 'mp-pill-amber' },
    completed: { label: 'Completed', cls: 'mp-pill-purple' },
    cancelled: { label: 'Cancelled', cls: 'mp-pill-red' },
    pending: { label: 'Pending', cls: 'mp-pill-amber' },
    accepted: { label: 'Accepted', cls: 'mp-pill-green' },
    rejected: { label: 'Rejected', cls: 'mp-pill-red' },
  };
  const b = map[status] || { label: status || 'Unknown', cls: 'mp-pill-gray' };
  return <span className={`mp-pill ${b.cls}`}>{b.label}</span>;
};

const TABS = [
  { id: 'all', label: 'All Projects', icon: '📁' },
  { id: 'draft', label: 'Drafts', icon: '📝' },
  { id: 'open', label: 'Open', icon: '📢' },
  { id: 'active', label: 'In Progress', icon: '⚡' },
  { id: 'completed', label: 'Completed', icon: '✅' },
  { id: 'cancelled', label: 'Cancelled', icon: '🚫' },
];

/* ============================================================
   MAIN COMPONENT
============================================================ */
export default function MyProjects() {
  const { user } = useAuth();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('grid');

  // Detail drawer
  const [detail, setDetail] = useState(null);
  const [detailTab, setDetailTab] = useState('overview'); // overview | tasks | submissions

  // Action modals
  const [confirmAction, setConfirmAction] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);

  // Task creation form
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    budget: '',
    priority: 'medium',
    deadline: '',
  });
  const [taskFormError, setTaskFormError] = useState('');
  const [taskSubmitting, setTaskSubmitting] = useState(false);

  const currentUserId = user?.userId || user?._id || user?.id;

  const flashNotice = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 3500);
  };

  /* ---------- Fetch Data ---------- */
  const fetchProjects = useCallback(async () => {
    if (!currentUserId) return;

    try {
      setLoading(true);
      setError('');

      console.log('🔍 Client MyProjects loading for userId:', currentUserId);

      // Bulk-fetch all collections in parallel (API has no query filters)
      const [
        clientsRes,
        projRes,
        catRes,
        appRes,
        payRes,
        freelancersRes,
        usersRes,
      ] = await Promise.all([
        API.get('/clients').catch(() => ({ data: [] })),
        API.get('/projects').catch(() => ({ data: [] })),
        API.get('/categories').catch(() => ({ data: [] })),
        API.get('/applications').catch(() => ({ data: [] })),
        API.get('/payments').catch(() => ({ data: [] })),
        API.get('/freelancers').catch(() => ({ data: [] })),
        API.get('/users').catch(() => ({ data: [] })),
      ]);

      const allClients = asArray(clientsRes);
      const allProjects = asArray(projRes);
      const allCategories = asArray(catRes);
      const allApps = asArray(appRes);
      const allPayments = asArray(payRes);
      const allFreelancers = asArray(freelancersRes);
      const allUsers = asArray(usersRes);

      console.log('📦 Loaded counts:', {
        clients: allClients.length,
        projects: allProjects.length,
        applications: allApps.length,
        freelancers: allFreelancers.length,
      });

      // 1. Find this user's client profile
      const myClient = allClients.find((c) => eqId(c.userId, currentUserId));
      const clientId = myClient?.clientId || myClient?._id;

      console.log('🆔 My clientId:', clientId);

      if (!clientId) {
        setError('Client profile not found. Please complete your profile setup.');
        setLoading(false);
        return;
      }

      // 2. Filter projects owned by this client
      const myProjects = allProjects.filter((p) => eqId(p.clientId, clientId));
      console.log('📁 Projects owned by me:', myProjects.length);

      // 3. Build lookup maps
      const catMap = new Map();
      allCategories.forEach((c) => {
        const id = c.categoryId || c._id;
        if (id) catMap.set(String(id), c);
      });

      // 4. Application stats per project
      const appStats = {};
      allApps.forEach((a) => {
        const pid = getRawId(a.projectId);
        if (!pid) return;
        if (!appStats[pid]) appStats[pid] = { total: 0, pending: 0, accepted: 0 };
        appStats[pid].total += 1;
        if (a.status === 'pending') appStats[pid].pending += 1;
        if (a.status === 'accepted') appStats[pid].accepted += 1;
      });

      // 5. Payment stats per project
      const payStats = {};
      allPayments.forEach((p) => {
        const pid = getRawId(p.projectId);
        if (!pid) return;
        if (!payStats[pid]) payStats[pid] = { paid: 0, count: 0 };
        if (p.status === 'completed') payStats[pid].paid += p.amount || 0;
        payStats[pid].count += 1;
      });

      // 6. Resolve freelancer details for each project
      const resolved = myProjects.map((p) => {
        const pid = p.projectId || p._id;
        const fid = getRawId(p.freelancerId);
        const catObj = catMap.get(String(getRawId(p.categoryId)));
        const dLeft = daysLeft(p.deadline);
        const tasks = p.tasks || [];

        let freelancer = null;
        if (fid) {
          const fDoc = allFreelancers.find(
            (f) => eqId(f.freelancerId, fid) || eqId(f._id, fid)
          );
          if (fDoc) {
            const uDoc = allUsers.find((u) => eqId(u, fDoc.userId));
            freelancer = {
              id: fid,
              name: uDoc
                ? `${uDoc.firstName || ''} ${uDoc.lastName || ''}`.trim() ||
                  uDoc.username
                : 'Freelancer',
              headline: fDoc.headline || 'Professional Freelancer',
              profileImage: uDoc?.profileImage || fDoc.profileImage || '',
              hourlyRate: fDoc.hourlyRate || 0,
              jobSuccessRate: fDoc.jobSuccessRate || 0,
              rating:
                fDoc.dashboardStats?.averageRating || fDoc.rating || 0,
              isTopRated: fDoc.isTopRated || false,
              email: uDoc?.email || '',
            };
          }
        }

        const completedTasks = tasks.filter((t) => t.status === 'completed').length;

        return {
          projectId: pid,
          raw: p,
          title: p.title || 'Untitled Project',
          description: p.description || '',
          categoryName: catObj?.name || 'General',
          categoryIcon: catObj?.icon || '📁',
          budget: p.budget || 0,
          status: p.status || 'draft',
          startDate: p.startDate,
          deadline: p.deadline,
          daysLeft: dLeft,
          isOverdue: dLeft !== null && dLeft < 0 && p.status !== 'completed',
          isUrgent:
            dLeft !== null &&
            dLeft >= 0 &&
            dLeft <= 7 &&
            (p.status === 'active' || p.status === 'in-progress'),
          progress: p.progress || 0,
          tasks,
          totalTasks: tasks.length,
          completedTasks,
          freelancer,
          applications: appStats[pid] || { total: 0, pending: 0, accepted: 0 },
          payments: payStats[pid] || { paid: 0, count: 0 },
          submittedFiles: p.submittedFiles || [],
          metadata: p.metadata || {},
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        };
      });

      setProjects(resolved);
    } catch (err) {
      console.error('❌ Failed to load projects:', err);
      setError('Failed to load your projects. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  /* ---------- Sync Detail with Projects List ---------- */
  useEffect(() => {
    if (!detail) return;
    const updated = projects.find((p) => eqId(p.projectId, detail.projectId));
    if (updated) setDetail(updated);
  }, [projects]); // eslint-disable-line

  /* ---------- Stats ---------- */
  const stats = useMemo(() => {
    const totalBudget = projects.reduce((s, p) => s + p.budget, 0);
    const totalSpent = projects.reduce((s, p) => s + p.payments.paid, 0);
    return {
      total: projects.length,
      draft: projects.filter((p) => p.status === 'draft').length,
      open: projects.filter((p) => p.status === 'open').length,
      active: projects.filter(
        (p) => p.status === 'active' || p.status === 'in-progress' || p.status === 'review'
      ).length,
      completed: projects.filter((p) => p.status === 'completed').length,
      cancelled: projects.filter((p) => p.status === 'cancelled').length,
      totalBudget,
      totalSpent,
      pendingApps: projects.reduce((s, p) => s + p.applications.pending, 0),
    };
  }, [projects]);

  const tabCounts = useMemo(
    () => ({
      all: stats.total,
      draft: stats.draft,
      open: stats.open,
      active: stats.active,
      completed: stats.completed,
      cancelled: stats.cancelled,
    }),
    [stats]
  );

  /* ---------- Filtered List ---------- */
  const filtered = useMemo(() => {
    let list = projects.filter((p) => {
      if (activeTab !== 'all') {
        if (activeTab === 'active') {
          if (
            p.status !== 'active' &&
            p.status !== 'in-progress' &&
            p.status !== 'review'
          )
            return false;
        } else if (p.status !== activeTab) return false;
      }

      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !p.title.toLowerCase().includes(q) &&
          !p.description.toLowerCase().includes(q) &&
          !p.categoryName.toLowerCase().includes(q) &&
          !(p.freelancer?.name || '').toLowerCase().includes(q)
        )
          return false;
      }

      return true;
    });

    list.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === 'budget-high') return b.budget - a.budget;
      if (sortBy === 'budget-low') return a.budget - b.budget;
      if (sortBy === 'progress') return b.progress - a.progress;
      if (sortBy === 'deadline') {
        if (a.daysLeft === null) return 1;
        if (b.daysLeft === null) return -1;
        return a.daysLeft - b.daysLeft;
      }
      return 0;
    });

    return list;
  }, [projects, activeTab, search, sortBy]);

  /* ---------- Task Cost Calculation ---------- */
  const taskBudgetSummary = useMemo(() => {
    if (!detail) return { allocated: 0, remaining: 0, isExceeded: false };
    const allocated = (detail.tasks || []).reduce(
      (sum, t) => sum + (Number(t.budget) || 0),
      0
    );
    const remaining = detail.budget - allocated;
    return {
      allocated,
      remaining,
      isExceeded: allocated > detail.budget,
    };
  }, [detail]);

  /* ---------- Project Actions (publish/cancel/complete/delete) ---------- */
  const handleAction = async () => {
    if (!confirmAction) return;
    const { type, project } = confirmAction;

    setActionBusy(true);
    try {
      const pid = getRawId(project.projectId);

      if (type === 'publish') {
        await API.put(`/projects/${pid}`, { status: 'open' });
      } else if (type === 'cancel') {
        await API.put(`/projects/${pid}`, { status: 'cancelled' });
      } else if (type === 'complete') {
        await API.put(`/projects/${pid}`, { status: 'completed', progress: 100 });
      } else if (type === 'delete') {
        await API.delete(`/projects/${pid}`);
      }

      await fetchProjects();
      setConfirmAction(null);
      if (type === 'delete') setDetail(null);
      flashNotice(`Project ${type} successful`);
    } catch (err) {
      console.error('Action failed:', err);
      setError(err.response?.data?.message || 'Action failed. Please try again.');
      setConfirmAction(null);
    } finally {
      setActionBusy(false);
    }
  };

  /* ---------- Add Task ---------- */
  const validateTaskForm = () => {
    if (!taskForm.title.trim()) return 'Task title is required.';
    if (!taskForm.description.trim()) return 'Task description is required.';
    const cost = Number(taskForm.budget);
    if (!taskForm.budget || isNaN(cost) || cost < 0)
      return 'Task cost must be a valid positive number.';

    // Enforce budget rule: sum(tasks) ≤ project budget
    const newAllocated = taskBudgetSummary.allocated + cost;
    if (newAllocated > detail.budget) {
      return `Adding this task would exceed the project budget by ${formatCurrency(
        newAllocated - detail.budget
      )}. Remaining budget: ${formatCurrency(taskBudgetSummary.remaining)}`;
    }
    return '';
  };

  const handleAddTask = async () => {
    const err = validateTaskForm();
    if (err) {
      setTaskFormError(err);
      return;
    }

    setTaskSubmitting(true);
    setTaskFormError('');

    try {
      const newTask = {
        taskId: `TASK_${Date.now()}`,
        title: taskForm.title.trim(),
        description: taskForm.description.trim(),
        budget: Number(taskForm.budget),
        budgetType: 'fixed',
        deadline: taskForm.deadline || null,
        priority: taskForm.priority,
        status: 'pending',
        progress: 0,
        clientNote: '',
        freelancerNote: '',
        sections: [],
        requestedAt: new Date(),
        createdAt: new Date(),
      };

      const updatedTasks = [...(detail.tasks || []), newTask];

      await API.put(`/projects/${getRawId(detail.projectId)}`, {
        tasks: updatedTasks,
      });

      // Reset form and reload
      setTaskForm({
        title: '',
        description: '',
        budget: '',
        priority: 'medium',
        deadline: '',
      });
      setShowTaskForm(false);
      await fetchProjects();
      flashNotice(`✅ Task "${newTask.title}" added successfully`);
    } catch (err) {
      console.error('Failed to add task:', err);
      setTaskFormError(
        err.response?.data?.message || 'Failed to save task. Please try again.'
      );
    } finally {
      setTaskSubmitting(false);
    }
  };

  /* ---------- Delete Task ---------- */
  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Delete this task? This action cannot be undone.')) return;

    try {
      const updatedTasks = (detail.tasks || []).filter(
        (t) => !eqId(t.taskId || t._id, taskId)
      );
      await API.put(`/projects/${getRawId(detail.projectId)}`, {
        tasks: updatedTasks,
      });
      await fetchProjects();
      flashNotice('Task deleted');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete task.');
    }
  };

  /* ---------- Loading ---------- */
  if (loading) {
    return (
      <div className="mp-loading">
        <div className="mp-spinner" />
        <p>Loading your projects...</p>
      </div>
    );
  }

  return (
    <div className="mp-page">
      {/* HERO */}
      <div className="mp-hero">
        <div className="mp-hero-inner">
          <div className="mp-hero-text">
            <span className="mp-hero-badge">📂 Project Manager</span>
            <h1>My Projects</h1>
            <p>Track, manage and monitor all the projects you've posted on Skillora.</p>
          </div>
          <Link to="/client/post-project" className="mp-hero-btn">
            + Post New Project
          </Link>
        </div>
      </div>

      {/* STATS STRIP */}
      <div className="mp-stats-strip">
        <div className="mp-stat blue">
          <div className="mp-stat-icon">📁</div>
          <div>
            <span className="mp-stat-num">{stats.total}</span>
            <span className="mp-stat-lbl">Total Projects</span>
          </div>
        </div>
        <div className="mp-stat green">
          <div className="mp-stat-icon">⚡</div>
          <div>
            <span className="mp-stat-num">{stats.active}</span>
            <span className="mp-stat-lbl">In Progress</span>
          </div>
        </div>
        <div className="mp-stat purple">
          <div className="mp-stat-icon">✅</div>
          <div>
            <span className="mp-stat-num">{stats.completed}</span>
            <span className="mp-stat-lbl">Completed</span>
          </div>
        </div>
        <div className="mp-stat amber">
          <div className="mp-stat-icon">📩</div>
          <div>
            <span className="mp-stat-num">{stats.pendingApps}</span>
            <span className="mp-stat-lbl">Pending Proposals</span>
          </div>
        </div>
        <div className="mp-stat indigo">
          <div className="mp-stat-icon">💰</div>
          <div>
            <span className="mp-stat-num">{formatCurrency(stats.totalSpent)}</span>
            <span className="mp-stat-lbl">Total Spent</span>
          </div>
        </div>
      </div>

      <div className="mp-container">
        {error && (
          <div className="mp-alert">
            <span>⚠️</span>
            <p>{error}</p>
            <button onClick={() => setError('')}>×</button>
          </div>
        )}

        {notice && (
          <div className="mp-alert success">
            <span>✅</span>
            <p>{notice}</p>
            <button onClick={() => setNotice('')}>×</button>
          </div>
        )}

        {/* TABS */}
        <div className="mp-tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`mp-tab ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              <span className="mp-tab-icon">{t.icon}</span>
              {t.label}
              <span className="mp-tab-count">{tabCounts[t.id] ?? 0}</span>
            </button>
          ))}
        </div>

        {/* TOOLBAR */}
        <div className="mp-toolbar">
          <div className="mp-search">
            <span className="mp-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by title, description, category or freelancer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="mp-search-clear" onClick={() => setSearch('')}>
                ×
              </button>
            )}
          </div>

          <select
            className="mp-sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="budget-high">Budget: High to Low</option>
            <option value="budget-low">Budget: Low to High</option>
            <option value="progress">Progress: Most Complete</option>
            <option value="deadline">Deadline: Soonest</option>
          </select>

          <div className="mp-view-toggle">
            <button
              className={viewMode === 'grid' ? 'active' : ''}
              onClick={() => setViewMode('grid')}
              title="Grid view"
            >
              ▦
            </button>
            <button
              className={viewMode === 'list' ? 'active' : ''}
              onClick={() => setViewMode('list')}
              title="List view"
            >
              ☰
            </button>
          </div>
        </div>

        <div className="mp-count">
          Showing <strong>{filtered.length}</strong> of{' '}
          <strong>{projects.length}</strong> projects
        </div>

        {/* PROJECT LIST */}
        {filtered.length === 0 ? (
          <div className="mp-empty">
            <div className="mp-empty-icon">
              {projects.length === 0 ? '🚀' : '🔍'}
            </div>
            <h3>
              {projects.length === 0
                ? "You haven't posted any projects yet"
                : 'No projects match your filters'}
            </h3>
            <p>
              {projects.length === 0
                ? 'Post your first project and start receiving proposals from talented freelancers.'
                : 'Try changing the tab, adjusting your search, or resetting filters.'}
            </p>
            {projects.length === 0 ? (
              <Link to="/client/post-project" className="mp-btn mp-btn-primary">
                🚀 Post Your First Project
              </Link>
            ) : (
              <button
                className="mp-btn mp-btn-outline"
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
          <div className={`mp-list ${viewMode}`}>
            {filtered.map((p) => (
              <div
                key={p.projectId}
                className={`mp-card ${p.isOverdue ? 'overdue' : ''}`}
                onClick={() => {
                  setDetail(p);
                  setDetailTab('overview');
                }}
              >
                <div className="mp-card-head">
                  <div className="mp-card-badges">
                    <span className="mp-cat-badge">
                      {p.categoryIcon} {p.categoryName}
                    </span>
                    <StatusPill status={p.status} />
                    {p.isOverdue && (
                      <span className="mp-pill mp-pill-red">Overdue</span>
                    )}
                    {p.isUrgent && (
                      <span className="mp-pill mp-pill-amber">Due Soon</span>
                    )}
                  </div>
                  <div className="mp-card-budget">{formatCurrency(p.budget)}</div>
                </div>

                <h3 className="mp-card-title">{p.title}</h3>
                <p className="mp-card-desc">
                  {p.description.length > 140
                    ? `${p.description.slice(0, 140)}...`
                    : p.description}
                </p>

                <div className="mp-progress-block">
                  <div className="mp-progress-head">
                    <span>Progress</span>
                    <strong>{p.progress}%</strong>
                  </div>
                  <div className="mp-progress-bar">
                    <div
                      className={`mp-progress-fill ${
                        p.status === 'completed' ? 'done' : ''
                      }`}
                      style={{ width: `${p.progress}%` }}
                    />
                  </div>
                  {p.totalTasks > 0 && (
                    <span className="mp-task-count">
                      {p.completedTasks} of {p.totalTasks} tasks completed
                    </span>
                  )}
                </div>

                <div className="mp-freelancer-row">
                  {p.freelancer ? (
                    <>
                      <div className="mp-fl-avatar">
                        {p.freelancer.profileImage ? (
                          <img
                            src={p.freelancer.profileImage}
                            alt={p.freelancer.name}
                          />
                        ) : (
                          p.freelancer.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="mp-fl-info">
                        <strong>{p.freelancer.name}</strong>
                        <span>
                          ⭐ {p.freelancer.rating.toFixed(1)} ·{' '}
                          {p.freelancer.jobSuccessRate}% success
                        </span>
                      </div>
                      {p.freelancer.isTopRated && (
                        <span className="mp-top-rated">Top Rated</span>
                      )}
                    </>
                  ) : (
                    <div className="mp-no-freelancer">
                      <span className="mp-nf-icon">👤</span>
                      <span>No freelancer assigned yet</span>
                    </div>
                  )}
                </div>

                <div className="mp-card-footer">
                  <div className="mp-metric">
                    <span className="mp-m-label">Deadline</span>
                    <strong className={p.isOverdue ? 'danger' : ''}>
                      {formatDate(p.deadline)}
                    </strong>
                  </div>
                  <div className="mp-metric">
                    <span className="mp-m-label">Time Left</span>
                    <strong
                      className={p.isOverdue ? 'danger' : p.isUrgent ? 'warn' : ''}
                    >
                      {p.daysLeft === null
                        ? '—'
                        : p.daysLeft < 0
                        ? `${Math.abs(p.daysLeft)}d overdue`
                        : `${p.daysLeft} days`}
                    </strong>
                  </div>
                  <div className="mp-metric">
                    <span className="mp-m-label">Proposals</span>
                    <strong>
                      {p.applications.total}
                      {p.applications.pending > 0 && (
                        <span className="mp-new-dot">
                          {p.applications.pending} new
                        </span>
                      )}
                    </strong>
                  </div>
                  <div className="mp-metric">
                    <span className="mp-m-label">Paid</span>
                    <strong className="success">
                      {formatCurrency(p.payments.paid)}
                    </strong>
                  </div>
                </div>

                <div className="mp-card-cta">View Full Details →</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ============ DETAIL DRAWER ============ */}
      {detail && (
        <div className="mp-drawer-overlay" onClick={() => setDetail(null)}>
          <div className="mp-drawer" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="mp-drawer-head">
              <button
                className="mp-drawer-close"
                onClick={() => setDetail(null)}
              >
                ✕
              </button>
              <div className="mp-drawer-badges">
                <span className="mp-cat-badge light">
                  {detail.categoryIcon} {detail.categoryName}
                </span>
                <StatusPill status={detail.status} />
              </div>
              <h2>{detail.title}</h2>
              <div className="mp-drawer-meta">
                <span>📅 Created {formatDate(detail.createdAt)}</span>
                <span>•</span>
                <span>🔄 Updated {formatDate(detail.updatedAt)}</span>
              </div>
            </div>

            {/* Detail Tabs */}
            <div className="mp-drawer-tabs">
              <button
                className={`mp-drawer-tab ${
                  detailTab === 'overview' ? 'active' : ''
                }`}
                onClick={() => setDetailTab('overview')}
              >
                📋 Overview
              </button>
              <button
                className={`mp-drawer-tab ${detailTab === 'tasks' ? 'active' : ''}`}
                onClick={() => setDetailTab('tasks')}
              >
                ✓ Tasks ({detail.tasks.length})
              </button>
              <button
                className={`mp-drawer-tab ${
                  detailTab === 'submissions' ? 'active' : ''
                }`}
                onClick={() => setDetailTab('submissions')}
              >
                📎 Submissions ({detail.submittedFiles?.length || 0})
              </button>
            </div>

            <div className="mp-drawer-body">
              {/* ============ OVERVIEW TAB ============ */}
              {detailTab === 'overview' && (
                <>
                  <div className="mp-d-stats">
                    <div>
                      <span>Budget</span>
                      <strong className="green">
                        {formatCurrency(detail.budget)}
                      </strong>
                    </div>
                    <div>
                      <span>Paid</span>
                      <strong>{formatCurrency(detail.payments.paid)}</strong>
                    </div>
                    <div>
                      <span>Progress</span>
                      <strong>{detail.progress}%</strong>
                    </div>
                    <div>
                      <span>Proposals</span>
                      <strong>{detail.applications.total}</strong>
                    </div>
                  </div>

                  {/* Timeline */}
                  <section className="mp-d-section">
                    <h4>📆 Timeline</h4>
                    <div className="mp-timeline">
                      <div className="mp-tl-item">
                        <span className="mp-tl-dot start" />
                        <div>
                          <strong>Start Date</strong>
                          <span>{formatFullDate(detail.startDate)}</span>
                        </div>
                      </div>
                      <div className="mp-tl-line" />
                      <div className="mp-tl-item">
                        <span
                          className={`mp-tl-dot ${
                            detail.isOverdue ? 'overdue' : 'end'
                          }`}
                        />
                        <div>
                          <strong>Deadline</strong>
                          <span className={detail.isOverdue ? 'danger' : ''}>
                            {formatFullDate(detail.deadline)}
                            {detail.daysLeft !== null && (
                              <em>
                                {detail.daysLeft < 0
                                  ? ` (${Math.abs(detail.daysLeft)} days overdue)`
                                  : ` (${detail.daysLeft} days left)`}
                              </em>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mp-d-progress">
                      <div className="mp-progress-bar lg">
                        <div
                          className={`mp-progress-fill ${
                            detail.status === 'completed' ? 'done' : ''
                          }`}
                          style={{ width: `${detail.progress}%` }}
                        />
                      </div>
                      <span>{detail.progress}% Complete</span>
                    </div>
                  </section>

                  {/* Description */}
                  <section className="mp-d-section">
                    <h4>📄 Description</h4>
                    <p className="mp-d-text">{detail.description}</p>
                  </section>

                  {/* Freelancer */}
                  <section className="mp-d-section">
                    <h4>👤 Assigned Freelancer</h4>
                    {detail.freelancer ? (
                      <div className="mp-d-freelancer">
                        <div className="mp-fl-avatar lg">
                          {detail.freelancer.profileImage ? (
                            <img
                              src={detail.freelancer.profileImage}
                              alt={detail.freelancer.name}
                            />
                          ) : (
                            detail.freelancer.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="mp-d-fl-info">
                          <div className="mp-d-fl-name">
                            <strong>{detail.freelancer.name}</strong>
                            {detail.freelancer.isTopRated && (
                              <span className="mp-top-rated">⭐ Top Rated</span>
                            )}
                          </div>
                          <p>{detail.freelancer.headline}</p>
                          <div className="mp-d-fl-stats">
                            <span>
                              ⭐ {detail.freelancer.rating.toFixed(1)} rating
                            </span>
                            <span>•</span>
                            <span>
                              {detail.freelancer.jobSuccessRate}% job success
                            </span>
                            <span>•</span>
                            <span>
                              {formatCurrency(detail.freelancer.hourlyRate)}/hr
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="mp-d-empty">
                        <span>👤</span>
                        <div>
                          <strong>No freelancer assigned</strong>
                          <p>
                            {detail.applications.pending > 0
                              ? `You have ${detail.applications.pending} pending proposal(s) waiting for review.`
                              : 'Waiting for freelancers to apply to your project.'}
                          </p>
                        </div>
                        {detail.applications.pending > 0 && (
                          <Link
                            to="/client/applications"
                            className="mp-btn mp-btn-sm"
                          >
                            Review Proposals
                          </Link>
                        )}
                      </div>
                    )}
                  </section>

                  {/* Applications Summary */}
                  <section className="mp-d-section">
                    <h4>📩 Applications Overview</h4>
                    <div className="mp-app-summary">
                      <div className="mp-app-stat">
                        <strong>{detail.applications.total}</strong>
                        <span>Total Received</span>
                      </div>
                      <div className="mp-app-stat amber">
                        <strong>{detail.applications.pending}</strong>
                        <span>Pending Review</span>
                      </div>
                      <div className="mp-app-stat green">
                        <strong>{detail.applications.accepted}</strong>
                        <span>Accepted</span>
                      </div>
                    </div>
                    {detail.applications.total > 0 && (
                      <Link
                        to="/client/applications"
                        className="mp-btn mp-btn-outline full"
                      >
                        View All Proposals →
                      </Link>
                    )}
                  </section>

                  {/* Payments Summary */}
                  <section className="mp-d-section">
                    <h4>💳 Payment Summary</h4>
                    <div className="mp-pay-box">
                      <div>
                        <span>Total Budget</span>
                        <strong>{formatCurrency(detail.budget)}</strong>
                      </div>
                      <div>
                        <span>Amount Paid</span>
                        <strong className="green">
                          {formatCurrency(detail.payments.paid)}
                        </strong>
                      </div>
                      <div>
                        <span>Remaining</span>
                        <strong className="amber">
                          {formatCurrency(
                            Math.max(0, detail.budget - detail.payments.paid)
                          )}
                        </strong>
                      </div>
                    </div>
                    <div className="mp-pay-bar">
                      <div
                        className="mp-pay-fill"
                        style={{
                          width: `${
                            detail.budget > 0
                              ? Math.min(
                                  100,
                                  (detail.payments.paid / detail.budget) * 100
                                )
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </section>
                </>
              )}

              {/* ============ TASKS TAB ============ */}
              {detailTab === 'tasks' && (
                <>
                  {/* Budget Summary Bar */}
                  <div className="mp-budget-summary">
                    <div className="mp-budget-row">
                      <div>
                        <span className="mp-bs-label">Project Budget</span>
                        <strong className="mp-bs-total">
                          {formatCurrency(detail.budget)}
                        </strong>
                      </div>
                      <div>
                        <span className="mp-bs-label">Allocated to Tasks</span>
                        <strong
                          className={
                            taskBudgetSummary.isExceeded ? 'danger' : ''
                          }
                        >
                          {formatCurrency(taskBudgetSummary.allocated)}
                        </strong>
                      </div>
                      <div>
                        <span className="mp-bs-label">Remaining</span>
                        <strong
                          className={
                            taskBudgetSummary.remaining <= 0 ? 'danger' : 'green'
                          }
                        >
                          {formatCurrency(taskBudgetSummary.remaining)}
                        </strong>
                      </div>
                    </div>
                    <div className="mp-budget-bar-outer">
                      <div
                        className={`mp-budget-bar-fill ${
                          taskBudgetSummary.isExceeded ? 'exceeded' : ''
                        }`}
                        style={{
                          width: `${Math.min(
                            100,
                            (taskBudgetSummary.allocated / detail.budget) * 100
                          )}%`,
                        }}
                      />
                    </div>
                    {taskBudgetSummary.isExceeded && (
                      <div className="mp-budget-warn">
                        ⚠️ Task allocations exceed the project budget by{' '}
                        {formatCurrency(
                          taskBudgetSummary.allocated - detail.budget
                        )}
                      </div>
                    )}
                  </div>

                  {/* Add Task Button */}
                  {(detail.status === 'active' ||
                    detail.status === 'in-progress' ||
                    detail.status === 'open' ||
                    detail.status === 'draft') &&
                    !showTaskForm && (
                      <button
                        className="mp-btn mp-btn-primary full"
                        onClick={() => setShowTaskForm(true)}
                        disabled={taskBudgetSummary.remaining <= 0}
                        title={
                          taskBudgetSummary.remaining <= 0
                            ? 'No budget remaining — all funds allocated'
                            : 'Add a new task'
                        }
                      >
                        + Add New Task
                      </button>
                    )}

                  {/* Task Creation Form */}
                  {showTaskForm && (
                    <section className="mp-task-form-card">
                      <h4>Create New Task</h4>

                      <div className="mp-form-field">
                        <label>Task Title *</label>
                        <input
                          type="text"
                          value={taskForm.title}
                          onChange={(e) =>
                            setTaskForm({ ...taskForm, title: e.target.value })
                          }
                          placeholder="e.g. Design landing page mockup"
                          disabled={taskSubmitting}
                        />
                      </div>

                      <div className="mp-form-field">
                        <label>Description *</label>
                        <textarea
                          rows="3"
                          value={taskForm.description}
                          onChange={(e) =>
                            setTaskForm({
                              ...taskForm,
                              description: e.target.value,
                            })
                          }
                          placeholder="Describe what needs to be done..."
                          disabled={taskSubmitting}
                        />
                      </div>

                      <div className="mp-form-grid">
                        <div className="mp-form-field">
                          <label>
                            Task Cost * (Max:{' '}
                            {formatCurrency(taskBudgetSummary.remaining)})
                          </label>
                          <div className="mp-cost-input">
                            <span>$</span>
                            <input
                              type="number"
                              min="0"
                              max={taskBudgetSummary.remaining}
                              value={taskForm.budget}
                              onChange={(e) =>
                                setTaskForm({
                                  ...taskForm,
                                  budget: e.target.value,
                                })
                              }
                              placeholder="0"
                              disabled={taskSubmitting}
                            />
                          </div>
                        </div>

                        <div className="mp-form-field">
                          <label>Priority</label>
                          <select
                            value={taskForm.priority}
                            onChange={(e) =>
                              setTaskForm({
                                ...taskForm,
                                priority: e.target.value,
                              })
                            }
                            disabled={taskSubmitting}
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                          </select>
                        </div>

                        <div className="mp-form-field">
                          <label>Deadline (optional)</label>
                          <input
                            type="date"
                            value={taskForm.deadline}
                            onChange={(e) =>
                              setTaskForm({
                                ...taskForm,
                                deadline: e.target.value,
                              })
                            }
                            disabled={taskSubmitting}
                          />
                        </div>
                      </div>

                      {taskFormError && (
                        <div className="mp-form-error">⚠️ {taskFormError}</div>
                      )}

                      <div className="mp-form-actions">
                        <button
                          className="mp-btn mp-btn-outline"
                          onClick={() => {
                            setShowTaskForm(false);
                            setTaskFormError('');
                            setTaskForm({
                              title: '',
                              description: '',
                              budget: '',
                              priority: 'medium',
                              deadline: '',
                            });
                          }}
                          disabled={taskSubmitting}
                        >
                          Cancel
                        </button>
                        <button
                          className="mp-btn mp-btn-primary"
                          onClick={handleAddTask}
                          disabled={taskSubmitting}
                        >
                          {taskSubmitting ? 'Adding...' : '✓ Add Task'}
                        </button>
                      </div>
                    </section>
                  )}

                  {/* Task List */}
                  <section className="mp-d-section">
                    <h4>
                      📋 Project Tasks
                      <span className="mp-count-tag">
                        {detail.completedTasks}/{detail.totalTasks} done
                      </span>
                    </h4>

                    {detail.tasks.length === 0 ? (
                      <div className="mp-d-empty simple">
                        <span>📋</span>
                        <p>
                          No tasks yet. Click "Add New Task" above to break down
                          the project into manageable pieces.
                        </p>
                      </div>
                    ) : (
                      <div className="mp-task-list">
                        {detail.tasks.map((task, idx) => (
                          <div
                            key={task.taskId || idx}
                            className={`mp-task ${
                              task.status === 'completed' ? 'done' : ''
                            }`}
                          >
                            <div className="mp-task-head">
                              <div>
                                <strong>{task.title}</strong>
                                {task.description && <p>{task.description}</p>}
                              </div>
                              <div className="mp-task-badges">
                                <StatusPill status={task.status} />
                                {task.priority && (
                                  <span
                                    className={`mp-prio mp-prio-${task.priority}`}
                                  >
                                    {task.priority}
                                  </span>
                                )}
                                {(detail.status === 'draft' ||
                                  detail.status === 'open') && (
                                  <button
                                    className="mp-task-del"
                                    onClick={() =>
                                      handleDeleteTask(task.taskId || task._id)
                                    }
                                    title="Delete task"
                                  >
                                    🗑
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="mp-task-metrics">
                              {task.budget > 0 && (
                                <span>💰 {formatCurrency(task.budget)}</span>
                              )}
                              {task.deadline && (
                                <span>🎯 {formatDate(task.deadline)}</span>
                              )}
                            </div>

                            <div className="mp-task-progress">
                              <div className="mp-progress-bar sm">
                                <div
                                  className="mp-progress-fill"
                                  style={{ width: `${task.progress || 0}%` }}
                                />
                              </div>
                              <span>{task.progress || 0}%</span>
                            </div>

                            {task.clientNote && (
                              <div className="mp-note client">
                                <strong>Your Note:</strong> {task.clientNote}
                              </div>
                            )}
                            {task.freelancerNote && (
                              <div className="mp-note freelancer">
                                <strong>💬 Freelancer's Update:</strong>{' '}
                                {task.freelancerNote}
                              </div>
                            )}

                            {task.completedAt && (
                              <div className="mp-task-completed">
                                ✅ Completed {formatTimestamp(task.completedAt)}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </>
              )}

              {/* ============ SUBMISSIONS TAB ============ */}
              {detailTab === 'submissions' && (
                <div>
                  <div className="mp-d-section-header">
                    <h4>📎 Freelancer Submissions</h4>
                    <p>
                      Files and deliverables submitted by{' '}
                      {detail.freelancer?.name || 'the freelancer'}.
                    </p>
                  </div>

                  {(!detail.submittedFiles || detail.submittedFiles.length === 0) ? (
                    <div className="mp-d-empty simple">
                      <span>📭</span>
                      <p>
                        No submissions yet. When the freelancer uploads files, they
                        will appear here for your review.
                      </p>
                    </div>
                  ) : (
                    <div className="mp-submission-list">
                      {detail.submittedFiles
                        .slice()
                        .reverse()
                        .map((sub, i) => (
                          <div
                            key={sub.submissionId || i}
                            className="mp-submission-card"
                          >
                            <div className="mp-sub-header">
                              <div className="mp-sub-num">
                                #{detail.submittedFiles.length - i}
                              </div>
                              <div className="mp-sub-info">
                                <strong>
                                  Submission on {formatDate(sub.submittedAt)}
                                </strong>
                                <span>{formatTimestamp(sub.submittedAt)}</span>
                              </div>
                              <StatusPill status={sub.status || 'pending-review'} />
                            </div>

                            {sub.note && (
                              <div className="mp-sub-note-box">
                                <strong>Freelancer's Note:</strong>
                                <p>{sub.note}</p>
                              </div>
                            )}

                            {sub.files?.length > 0 && (
                              <div className="mp-sub-files-list">
                                <span className="mp-sub-files-label">
                                  {sub.files.length} file
                                  {sub.files.length !== 1 ? 's' : ''}:
                                </span>
                                {sub.files.map((f, fi) => (
                                  <div key={fi} className="mp-sub-file-item">
                                    <div className="mp-sub-file-icon">📎</div>
                                    <div className="mp-sub-file-info">
                                      <strong>{f.name}</strong>
                                      <span>
                                        {(f.size / 1024).toFixed(1)} KB ·{' '}
                                        {f.type || 'file'}
                                      </span>
                                    </div>
                                    {f.url && (
                                      <a
                                        href={f.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mp-btn mp-btn-sm mp-btn-outline"
                                      >
                                        Download
                                      </a>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Drawer Footer Actions */}
            <div className="mp-drawer-foot">
              {detail.status === 'draft' && (
                <>
                  <button
                    className="mp-btn mp-btn-danger-ghost"
                    onClick={() =>
                      setConfirmAction({ type: 'delete', project: detail })
                    }
                  >
                    🗑 Delete
                  </button>
                  <button
                    className="mp-btn mp-btn-primary"
                    onClick={() =>
                      setConfirmAction({ type: 'publish', project: detail })
                    }
                  >
                    🚀 Publish Project
                  </button>
                </>
              )}

              {detail.status === 'open' && (
                <>
                  <button
                    className="mp-btn mp-btn-danger-ghost"
                    onClick={() =>
                      setConfirmAction({ type: 'cancel', project: detail })
                    }
                  >
                    Cancel Project
                  </button>
                  <Link
                    to="/client/applications"
                    className="mp-btn mp-btn-primary"
                  >
                    Review Proposals →
                  </Link>
                </>
              )}

              {(detail.status === 'active' ||
                detail.status === 'in-progress' ||
                detail.status === 'review') && (
                <>
                  <button
                    className="mp-btn mp-btn-danger-ghost"
                    onClick={() =>
                      setConfirmAction({ type: 'cancel', project: detail })
                    }
                  >
                    Cancel Project
                  </button>
                  <button
                    className="mp-btn mp-btn-success"
                    onClick={() =>
                      setConfirmAction({ type: 'complete', project: detail })
                    }
                  >
                    ✓ Mark as Completed
                  </button>
                </>
              )}

              {(detail.status === 'completed' ||
                detail.status === 'cancelled') && (
                <button
                  className="mp-btn mp-btn-outline full"
                  onClick={() => setDetail(null)}
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM MODAL */}
      {confirmAction && (
        <div
          className="mp-modal-overlay"
          onClick={() => !actionBusy && setConfirmAction(null)}
        >
          <div className="mp-modal" onClick={(e) => e.stopPropagation()}>
            <div className={`mp-modal-icon ${confirmAction.type}`}>
              {confirmAction.type === 'publish' && '🚀'}
              {confirmAction.type === 'cancel' && '⚠️'}
              {confirmAction.type === 'complete' && '✅'}
              {confirmAction.type === 'delete' && '🗑️'}
            </div>

            <h3>
              {confirmAction.type === 'publish' && 'Publish this project?'}
              {confirmAction.type === 'cancel' && 'Cancel this project?'}
              {confirmAction.type === 'complete' && 'Mark as completed?'}
              {confirmAction.type === 'delete' && 'Delete this project?'}
            </h3>

            <p>
              {confirmAction.type === 'publish' &&
                `"${confirmAction.project.title}" will go live and freelancers can start submitting proposals.`}
              {confirmAction.type === 'cancel' &&
                `"${confirmAction.project.title}" will be cancelled and freelancers will be notified.`}
              {confirmAction.type === 'complete' &&
                `"${confirmAction.project.title}" will be marked 100% complete.`}
              {confirmAction.type === 'delete' &&
                `"${confirmAction.project.title}" will be permanently deleted.`}
            </p>

            <div className="mp-modal-actions">
              <button
                className="mp-btn mp-btn-outline"
                onClick={() => setConfirmAction(null)}
                disabled={actionBusy}
              >
                Keep It
              </button>
              <button
                className={`mp-btn ${
                  confirmAction.type === 'delete' ||
                  confirmAction.type === 'cancel'
                    ? 'mp-btn-danger'
                    : confirmAction.type === 'complete'
                    ? 'mp-btn-success'
                    : 'mp-btn-primary'
                }`}
                onClick={handleAction}
                disabled={actionBusy}
              >
                {actionBusy
                  ? 'Processing...'
                  : confirmAction.type === 'publish'
                  ? 'Yes, Publish'
                  : confirmAction.type === 'cancel'
                  ? 'Yes, Cancel'
                  : confirmAction.type === 'complete'
                  ? 'Yes, Complete'
                  : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}