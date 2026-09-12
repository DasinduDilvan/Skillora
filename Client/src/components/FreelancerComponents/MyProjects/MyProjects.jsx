// src/components/FreelancerComponents/MyProjects/MyProjects.jsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import API from '../../../api/axios';
import WorkingOn from './WorkingOn';
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

const daysLeft = (deadline) => {
  if (!deadline) return null;
  return Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));
};

/* ---------- Bulk-fetch safe array extractor ---------- */
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

/* ---------- Type-safe ID comparison ---------- */
const eqId = (a, b) => {
  const idA = getRawId(a);
  const idB = getRawId(b);
  if (!idA || !idB) return false;
  return String(idA) === String(idB);
};

const StatusPill = ({ status }) => {
  const map = {
    draft: { label: 'Draft', cls: 'fmp-pill-gray' },
    open: { label: 'Open', cls: 'fmp-pill-green' },
    active: { label: 'In Progress', cls: 'fmp-pill-blue' },
    'in-progress': { label: 'In Progress', cls: 'fmp-pill-blue' },
    in_progress: { label: 'In Progress', cls: 'fmp-pill-blue' },
    review: { label: 'In Review', cls: 'fmp-pill-amber' },
    completed: { label: 'Completed', cls: 'fmp-pill-purple' },
    cancelled: { label: 'Cancelled', cls: 'fmp-pill-red' },
    pending: { label: 'Pending', cls: 'fmp-pill-amber' },
    accepted: { label: 'Accepted', cls: 'fmp-pill-green' },
  };
  const b = map[status] || { label: status || 'Unknown', cls: 'fmp-pill-gray' };
  return <span className={`fmp-pill ${b.cls}`}>{b.label}</span>;
};

const TABS = [
  { id: 'all', label: 'All Projects', icon: '📁' },
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

  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  const [workingProject, setWorkingProject] = useState(null);

  const currentUserId = user?.userId || user?._id || user?.id;

  /* ---------- Fetch Data ---------- */
  const fetchProjects = useCallback(async () => {
    if (!currentUserId) return;

    try {
      setLoading(true);
      setError('');

      console.log('🔍 MyProjects loading for userId:', currentUserId);

      // Bulk-fetch all collections in parallel (API has no query filters)
      const [freelancersRes, projRes, catRes, clientsRes, usersRes] =
        await Promise.all([
          API.get('/freelancers').catch(() => ({ data: [] })),
          API.get('/projects').catch(() => ({ data: [] })),
          API.get('/categories').catch(() => ({ data: [] })),
          API.get('/clients').catch(() => ({ data: [] })),
          API.get('/users').catch(() => ({ data: [] })),
        ]);

      const allFreelancers = asArray(freelancersRes);
      const allProjects = asArray(projRes);
      const allCategories = asArray(catRes);
      const allClients = asArray(clientsRes);
      const allUsers = asArray(usersRes);

      console.log('📦 Loaded counts:', {
        freelancers: allFreelancers.length,
        projects: allProjects.length,
        categories: allCategories.length,
        clients: allClients.length,
        users: allUsers.length,
      });

      // 1. Find this user's freelancer profile
      const myFreelancer = allFreelancers.find((f) => eqId(f.userId, currentUserId));
      const freelancerId = myFreelancer?.freelancerId || myFreelancer?._id;

      console.log('🆔 My freelancerId:', freelancerId);

      if (!freelancerId) {
        setError('Freelancer profile not found. Please complete your profile setup.');
        setLoading(false);
        return;
      }

      // 2. Filter projects assigned to this freelancer IN MEMORY
      const myProjects = allProjects.filter((p) => eqId(p.freelancerId, freelancerId));
      console.log('📁 Projects assigned to me:', myProjects.length, myProjects.map(p => ({ id: p.projectId, title: p.title, status: p.status, freelancerId: p.freelancerId })));

      // 3. Build lookup maps
      const catMap = new Map();
      allCategories.forEach((c) => {
        const id = c.categoryId || c._id;
        if (id) catMap.set(String(id), c);
      });

      const clientNameMap = new Map();
      allClients.forEach((client) => {
        const cid = client.clientId || client._id;
        if (!cid) return;
        const clientUser = allUsers.find((u) => eqId(u, client.userId));
        const fullName = clientUser
          ? `${clientUser.firstName || ''} ${clientUser.lastName || ''}`.trim()
          : '';
        clientNameMap.set(
          String(cid),
          client.companyName || fullName || clientUser?.username || 'Client'
        );
      });

      // 4. Resolve project details
      const resolved = myProjects.map((p) => {
        const pid = p.projectId || p._id;
        const catId = getRawId(p.categoryId);
        const catObj = catId ? catMap.get(String(catId)) : null;
        const cid = getRawId(p.clientId);
        const dLeft = daysLeft(p.deadline);
        const tasks = p.tasks || [];
        const completedTasks = tasks.filter((t) => t.status === 'completed').length;

        return {
          projectId: pid,
          raw: p,
          title: p.title || 'Untitled Project',
          description: p.description || '',
          categoryName: catObj?.name || 'General',
          categoryIcon: catObj?.icon || '📁',
          budget: p.budget || 0,
          status: p.status || 'active',
          startDate: p.startDate,
          deadline: p.deadline,
          daysLeft: dLeft,
          isOverdue: dLeft !== null && dLeft < 0 && p.status !== 'completed',
          isUrgent:
            dLeft !== null &&
            dLeft >= 0 &&
            dLeft <= 7 &&
            (p.status === 'active' || p.status === 'in-progress' || p.status === 'in_progress'),
          progress: p.progress || 0,
          tasks,
          totalTasks: tasks.length,
          completedTasks,
          client: {
            name: clientNameMap.get(String(cid)) || 'Client',
            companyName: '',
            profileImage: '',
          },
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

  /* ---------- Stats ---------- */
  const stats = useMemo(() => {
    const totalEarnings = projects
      .filter((p) => p.status === 'completed')
      .reduce((s, p) => s + p.budget, 0);
    return {
      total: projects.length,
      active: projects.filter(
        (p) =>
          p.status === 'active' ||
          p.status === 'in-progress' ||
          p.status === 'in_progress' ||
          p.status === 'review'
      ).length,
      completed: projects.filter((p) => p.status === 'completed').length,
      cancelled: projects.filter((p) => p.status === 'cancelled').length,
      totalEarnings,
      overdue: projects.filter((p) => p.isOverdue).length,
    };
  }, [projects]);

  const tabCounts = useMemo(
    () => ({
      all: stats.total,
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
            p.status !== 'in_progress' &&
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
          !(p.client?.name || '').toLowerCase().includes(q)
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

  /* ---------- Handle Update from Working View ---------- */
  const handleProjectUpdate = (updatedProject) => {
    setProjects((prev) =>
      prev.map((p) => (eqId(p.projectId, updatedProject.projectId) ? updatedProject : p))
    );
    setWorkingProject(updatedProject);
  };

  /* ---------- Loading ---------- */
  if (loading) {
    return (
      <div className="fmp-loading">
        <div className="fmp-spinner" />
        <p>Loading your projects...</p>
      </div>
    );
  }

  /* ---------- Working View ---------- */
  if (workingProject) {
    return (
      <WorkingOn
        project={workingProject}
        onBack={() => {
          setWorkingProject(null);
          fetchProjects();
        }}
        onUpdate={handleProjectUpdate}
      />
    );
  }

  return (
    <div className="fmp-page">
      {/* HERO */}
      <div className="fmp-hero">
        <div className="fmp-hero-inner">
          <div className="fmp-hero-text">
            <span className="fmp-hero-badge">💼 Freelancer Workspace</span>
            <h1>My Projects</h1>
            <p>Manage all your accepted and ongoing projects in one place.</p>
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="fmp-stats-strip">
        <div className="fmp-stat blue">
          <div className="fmp-stat-icon">📁</div>
          <div>
            <span className="fmp-stat-num">{stats.total}</span>
            <span className="fmp-stat-lbl">Total Projects</span>
          </div>
        </div>
        <div className="fmp-stat green">
          <div className="fmp-stat-icon">⚡</div>
          <div>
            <span className="fmp-stat-num">{stats.active}</span>
            <span className="fmp-stat-lbl">In Progress</span>
          </div>
        </div>
        <div className="fmp-stat purple">
          <div className="fmp-stat-icon">✅</div>
          <div>
            <span className="fmp-stat-num">{stats.completed}</span>
            <span className="fmp-stat-lbl">Completed</span>
          </div>
        </div>
        <div className="fmp-stat amber">
          <div className="fmp-stat-icon">⏰</div>
          <div>
            <span className="fmp-stat-num">{stats.overdue}</span>
            <span className="fmp-stat-lbl">Overdue</span>
          </div>
        </div>
        <div className="fmp-stat indigo">
          <div className="fmp-stat-icon">💰</div>
          <div>
            <span className="fmp-stat-num">{formatCurrency(stats.totalEarnings)}</span>
            <span className="fmp-stat-lbl">Total Earnings</span>
          </div>
        </div>
      </div>

      <div className="fmp-container">
        {error && (
          <div className="fmp-alert">
            <span>⚠️</span>
            <p>{error}</p>
            <button onClick={() => setError('')}>×</button>
          </div>
        )}

        {/* TABS */}
        <div className="fmp-tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`fmp-tab ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              <span className="fmp-tab-icon">{t.icon}</span>
              {t.label}
              <span className="fmp-tab-count">{tabCounts[t.id] ?? 0}</span>
            </button>
          ))}
        </div>

        {/* TOOLBAR */}
        <div className="fmp-toolbar">
          <div className="fmp-search">
            <span className="fmp-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by title, description, category or client..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="fmp-search-clear" onClick={() => setSearch('')}>
                ×
              </button>
            )}
          </div>

          <select
            className="fmp-sort"
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
        </div>

        <div className="fmp-count">
          Showing <strong>{filtered.length}</strong> of{' '}
          <strong>{projects.length}</strong> projects
        </div>

        {/* PROJECT LIST */}
        {filtered.length === 0 ? (
          <div className="fmp-empty">
            <div className="fmp-empty-icon">{projects.length === 0 ? '🚀' : '🔍'}</div>
            <h3>
              {projects.length === 0
                ? 'No approved projects yet'
                : 'No projects match your filters'}
            </h3>
            <p>
              {projects.length === 0
                ? 'Once a client accepts your proposal, the project will appear here automatically.'
                : 'Try changing the tab, adjusting your search, or resetting filters.'}
            </p>
            {projects.length > 0 && (
              <button
                className="fmp-btn fmp-btn-outline"
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
          <div className="fmp-list">
            {filtered.map((p) => (
              <div
                key={p.projectId}
                className={`fmp-card ${p.isOverdue ? 'overdue' : ''}`}
                onClick={() => setWorkingProject(p)}
              >
                <div className="fmp-card-head">
                  <div className="fmp-card-badges">
                    <span className="fmp-cat-badge">
                      {p.categoryIcon} {p.categoryName}
                    </span>
                    <StatusPill status={p.status} />
                    {p.isOverdue && <span className="fmp-pill fmp-pill-red">Overdue</span>}
                    {p.isUrgent && <span className="fmp-pill fmp-pill-amber">Due Soon</span>}
                  </div>
                  <div className="fmp-card-budget">{formatCurrency(p.budget)}</div>
                </div>

                <h3 className="fmp-card-title">{p.title}</h3>
                <p className="fmp-card-desc">
                  {p.description.length > 140
                    ? `${p.description.slice(0, 140)}...`
                    : p.description}
                </p>

                <div className="fmp-progress-block">
                  <div className="fmp-progress-head">
                    <span>Progress</span>
                    <strong>{p.progress}%</strong>
                  </div>
                  <div className="fmp-progress-bar">
                    <div
                      className={`fmp-progress-fill ${
                        p.status === 'completed' ? 'done' : ''
                      }`}
                      style={{ width: `${p.progress}%` }}
                    />
                  </div>
                  {p.totalTasks > 0 && (
                    <span className="fmp-task-count">
                      {p.completedTasks} of {p.totalTasks} tasks completed
                    </span>
                  )}
                </div>

                <div className="fmp-client-row">
                  <div className="fmp-client-avatar">
                    {(p.client.name || 'C').charAt(0).toUpperCase()}
                  </div>
                  <div className="fmp-client-info">
                    <strong>{p.client.name}</strong>
                  </div>
                </div>

                <div className="fmp-card-footer">
                  <div className="fmp-metric">
                    <span className="fmp-m-label">Deadline</span>
                    <strong className={p.isOverdue ? 'danger' : ''}>
                      {formatDate(p.deadline)}
                    </strong>
                  </div>
                  <div className="fmp-metric">
                    <span className="fmp-m-label">Time Left</span>
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
                  <div className="fmp-metric">
                    <span className="fmp-m-label">Tasks</span>
                    <strong>
                      {p.completedTasks}/{p.totalTasks}
                    </strong>
                  </div>
                </div>

                <div className="fmp-card-cta">Open Workspace →</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}