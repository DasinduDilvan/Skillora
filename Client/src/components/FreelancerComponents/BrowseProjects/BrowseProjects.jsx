import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import API from '../../../api/axios';
import ViewProject from './ViewProject';
import ApplyProject from './ApplyProject';
import './BrowseProjects.css';

const PER_PAGE = 6;
const CLIENT_COLORS = ['#4F46E5', '#7C3AED', '#059669', '#DB2777', '#F59E0B', '#0EA5E9'];

const formatCurrency = (val) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(val || 0);

const daysLeft = (deadline) => {
  if (!deadline) return null;
  return Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));
};

/* ---------- Helpers ---------- */
const asArray = (res) => {
  const data = res?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};

const eqId = (a, b) => {
  if (!a || !b) return false;
  const extract = (v) => {
    if (typeof v === 'string') return v;
    if (typeof v === 'object') return v.userId || v.freelancerId || v.clientId || v.projectId || v.categoryId || v._id || v.id;
    return String(v);
  };
  return String(extract(a)) === String(extract(b));
};

const getRawId = (v) => {
  if (!v) return null;
  if (typeof v === 'string') return v;
  if (typeof v === 'object') return v.userId || v.freelancerId || v.clientId || v.projectId || v.categoryId || v._id || v.id || null;
  return String(v);
};

export default function BrowseProjects() {
  const { user } = useAuth();

  const [projects, setProjects] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [myFreelancerId, setMyFreelancerId] = useState(null);
  const [myAppliedProjectIds, setMyAppliedProjectIds] = useState(new Set());

  // Navigation
  const [viewProjectId, setViewProjectId] = useState(null);
  const [applyProjectId, setApplyProjectId] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [budgetFilter, setBudgetFilter] = useState('');
  const [checkedCats, setCheckedCats] = useState([]);
  const [minBudget, setMinBudget] = useState('');
  const [maxBudget, setMaxBudget] = useState('');
  const [statusFilters, setStatusFilters] = useState([]);
  const [deadlineFilter, setDeadlineFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);

  const currentUserId = user?.userId || user?._id || user?.id;

  const fetchAllData = useCallback(async () => {
    if (!currentUserId) return;

    try {
      setLoading(true);
      setError('');

      console.log('🔍 BrowseProjects loading for userId:', currentUserId);

      /* ============================================================
       * 1. LOAD ALL SUPPORTING DATA IN PARALLEL
       * ============================================================ */
      const [freelancersRes, projRes, catRes, appRes, clientsRes, usersRes] =
        await Promise.all([
          API.get('/freelancers').catch(() => ({ data: [] })),
          API.get('/projects').catch(() => ({ data: [] })),
          API.get('/categories').catch(() => ({ data: [] })),
          API.get('/applications').catch(() => ({ data: [] })),
          API.get('/clients').catch(() => ({ data: [] })),
          API.get('/users').catch(() => ({ data: [] })),
        ]);

      const allFreelancers = asArray(freelancersRes);
      const allProjects = asArray(projRes);
      const allCategories = asArray(catRes);
      const allApps = asArray(appRes);
      const allClients = asArray(clientsRes);
      const allUsers = asArray(usersRes);

      console.log('📦 Loaded:', {
        freelancers: allFreelancers.length,
        projects: allProjects.length,
        categories: allCategories.length,
        applications: allApps.length,
        clients: allClients.length,
        users: allUsers.length,
      });

      /* ============================================================
       * 2. RESOLVE CURRENT FREELANCER ID
       * ============================================================ */
      const matchedFreelancer = allFreelancers.find((f) => eqId(f.userId, currentUserId));
      const freelancerId = matchedFreelancer?.freelancerId || matchedFreelancer?._id;
      setMyFreelancerId(freelancerId);
      console.log('🆔 My freelancer ID:', freelancerId);

      /* ============================================================
       * 3. SET CATEGORIES
       * ============================================================ */
      const activeCategories = allCategories.filter((c) => c.isActive !== false);
      setCategories(activeCategories);

      // Build category lookup map
      const catMap = new Map();
      allCategories.forEach((c) => {
        const id = c.categoryId || c._id;
        if (id) catMap.set(String(id), c);
      });

      /* ============================================================
       * 4. FIND MY APPLIED PROJECTS
       * ============================================================ */
      const appliedIds = new Set();
      const appCounts = {};

      allApps.forEach((app) => {
        const pid = getRawId(app.projectId);
        const fid = getRawId(app.freelancerId);

        // Count applications per project
        if (pid) appCounts[String(pid)] = (appCounts[String(pid)] || 0) + 1;

        // Track my applied projects
        if (freelancerId && String(fid) === String(freelancerId) && pid) {
          appliedIds.add(String(pid));
        }
      });

      setMyAppliedProjectIds(appliedIds);
      console.log('📝 My applied projects:', appliedIds.size);

      /* ============================================================
       * 5. BUILD CLIENT NAME MAP (no additional API calls needed)
       * ============================================================ */
      const clientNameMap = new Map();
      allClients.forEach((client) => {
        const cid = client.clientId || client._id;
        if (!cid) return;

        const clientUser = allUsers.find((u) => eqId(u, client.userId));

        const fullName = clientUser
          ? `${clientUser.firstName || ''} ${clientUser.lastName?.charAt(0) || ''}.`.trim()
          : '';

        const name =
          client.companyName ||
          fullName ||
          clientUser?.username ||
          'Client';

        clientNameMap.set(String(cid), name);
      });

      /* ============================================================
       * 6. RESOLVE PROJECTS
       * ============================================================ */
      const resolved = allProjects.map((p) => {
        const pid = p.projectId || p._id;
        const cid = getRawId(p.clientId);
        const catId = getRawId(p.categoryId);
        const catObj = catId ? catMap.get(String(catId)) : null;
        const dLeft = daysLeft(p.deadline);

        return {
          projectId: pid,
          clientId: cid,
          title: p.title || 'Untitled Project',
          description: p.description || '',
          categoryId: catId || '',
          categoryName: catObj?.name || 'General',
          budget: p.budget || 0,
          status: p.status || 'open',
          startDate: p.startDate,
          deadline: p.deadline,
          daysLeft: dLeft,
          isUrgent: dLeft !== null && dLeft <= 7 && dLeft >= 0,
          progress: p.progress || 0,
          applicants: appCounts[String(pid)] || 0,
          clientName: clientNameMap.get(String(cid)) || 'Client',
          createdAt: p.createdAt,
        };
      });

      // Filter out drafts (only show public/visible projects)
      const visible = resolved.filter((p) => p.status !== 'draft');
      console.log('✅ Visible projects:', visible.length);
      setProjects(visible);
    } catch (err) {
      console.error('❌ Failed to load browse data:', err);
      setError('Failed to fetch projects. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  /* ---------- Filters & Sorts ---------- */
  const categoryCounts = useMemo(() => {
    const counts = {};
    projects.forEach((p) => {
      if (p.categoryId) counts[p.categoryId] = (counts[p.categoryId] || 0) + 1;
    });
    return counts;
  }, [projects]);

  const statusCounts = useMemo(
    () => ({
      open: projects.filter((p) => p.status === 'open').length,
      urgent: projects.filter((p) => p.isUrgent).length,
      active: projects.filter((p) => p.status === 'active' || p.status === 'in-progress').length,
      completed: projects.filter((p) => p.status === 'completed').length,
    }),
    [projects]
  );

  const filtered = useMemo(() => {
    let list = projects.filter((p) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !p.title.toLowerCase().includes(q) &&
          !p.description.toLowerCase().includes(q) &&
          !p.categoryName.toLowerCase().includes(q)
        )
          return false;
      }

      if (catFilter && String(p.categoryId) !== String(catFilter)) return false;
      if (checkedCats.length > 0 && !checkedCats.includes(String(p.categoryId))) return false;

      if (budgetFilter === 'low' && p.budget >= 100) return false;
      if (budgetFilter === 'mid' && (p.budget < 100 || p.budget > 500)) return false;
      if (budgetFilter === 'high' && p.budget <= 500) return false;

      if (minBudget && p.budget < Number(minBudget)) return false;
      if (maxBudget && p.budget > Number(maxBudget)) return false;

      if (statusFilters.length > 0) {
        const matched = statusFilters.some((s) =>
          s === 'urgent' ? p.isUrgent : p.status === s
        );
        if (!matched) return false;
      }

      if (deadlineFilter) {
        const limit = Number(deadlineFilter);
        if (p.daysLeft === null || p.daysLeft < 0 || p.daysLeft > limit) return false;
      }

      return true;
    });

    list.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === 'budget-high') return b.budget - a.budget;
      if (sortBy === 'budget-low') return a.budget - b.budget;
      if (sortBy === 'deadline') {
        if (a.daysLeft === null) return 1;
        if (b.daysLeft === null) return -1;
        return a.daysLeft - b.daysLeft;
      }
      return 0;
    });

    return list;
  }, [
    projects,
    search,
    catFilter,
    checkedCats,
    budgetFilter,
    minBudget,
    maxBudget,
    statusFilters,
    deadlineFilter,
    sortBy,
  ]);

  /* ---------- Pagination ---------- */
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  useEffect(() => {
    setPage(1);
  }, [
    search,
    catFilter,
    checkedCats,
    budgetFilter,
    minBudget,
    maxBudget,
    statusFilters,
    deadlineFilter,
    sortBy,
  ]);

  const toggleCat = (id) =>
    setCheckedCats((prev) =>
      prev.includes(String(id)) ? prev.filter((c) => c !== String(id)) : [...prev, String(id)]
    );

  const toggleStatus = (s) =>
    setStatusFilters((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const clearFilters = () => {
    setSearch('');
    setCatFilter('');
    setBudgetFilter('');
    setCheckedCats([]);
    setMinBudget('');
    setMaxBudget('');
    setStatusFilters([]);
    setDeadlineFilter('');
    setSortBy('newest');
  };

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      for (
        let i = Math.max(2, currentPage - 1);
        i <= Math.min(totalPages - 1, currentPage + 1);
        i++
      )
        pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  /* ---------- Sub-component Routing ---------- */
  if (viewProjectId) {
    return (
      <ViewProject
        projectId={viewProjectId}
        onBack={() => {
          setViewProjectId(null);
          fetchAllData();
        }}
        onApply={(pid) => {
          setViewProjectId(null);
          setApplyProjectId(pid);
        }}
      />
    );
  }

  if (applyProjectId) {
    return (
      <ApplyProject
        projectId={applyProjectId}
        freelancerId={myFreelancerId}
        onBack={() => setViewProjectId(applyProjectId)}
        onSuccess={() => {
          setApplyProjectId(null);
          setViewProjectId(applyProjectId);
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="bp-loading-screen">
        <div className="bp-spinner" />
        <p>Loading available projects...</p>
      </div>
    );
  }

  return (
    <div className="bp-page">
      <div className="bp-page-header">
        <h1>Browse Projects</h1>
        <p>Explore contracts, apply with custom proposals, and establish partnerships.</p>
      </div>

      {/* Search Header */}
      <div className="bp-search-section">
        <div className="bp-search-bar">
          <div className="bp-search-input-wrap">
            <span className="bp-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by project keyword or tech stacks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map((c) => {
              const id = c.categoryId || c._id;
              return (
                <option key={id} value={id}>
                  {c.name}
                </option>
              );
            })}
          </select>

          <select value={budgetFilter} onChange={(e) => setBudgetFilter(e.target.value)}>
            <option value="">Any Budget</option>
            <option value="low">Under $100</option>
            <option value="mid">$100 – $500</option>
            <option value="high">$500+</option>
          </select>

          <button type="button" onClick={() => setPage(1)}>
            Filter
          </button>
        </div>
      </div>

      {error && <div className="bp-alert">{error}</div>}

      <div className="bp-main-layout">
        {/* Sidebar Filter Panel */}
        <aside className="bp-sidebar">
          <div className="bp-filter-card">
            <h3>Filter Categories</h3>
            {categories.length === 0 ? (
              <p className="bp-no-filter">No active categories</p>
            ) : (
              categories.map((c) => {
                const cid = String(c.categoryId || c._id);
                return (
                  <div className="bp-filter-option" key={cid}>
                    <input
                      type="checkbox"
                      id={`cat-${cid}`}
                      checked={checkedCats.includes(cid)}
                      onChange={() => toggleCat(cid)}
                    />
                    <label htmlFor={`cat-${cid}`}>{c.name}</label>
                    <span className="bp-count">{categoryCounts[cid] || 0}</span>
                  </div>
                );
              })
            )}
          </div>

          <div className="bp-filter-card">
            <h3>Budget Parameters</h3>
            <div className="bp-budget-inputs">
              <input
                type="number"
                placeholder="Min $"
                value={minBudget}
                onChange={(e) => setMinBudget(e.target.value)}
              />
              <input
                type="number"
                placeholder="Max $"
                value={maxBudget}
                onChange={(e) => setMaxBudget(e.target.value)}
              />
            </div>
            <button className="bp-clear-filter-btn" onClick={clearFilters}>
              Reset Parameters
            </button>
          </div>

          <div className="bp-filter-card">
            <h3>Job Status</h3>
            {[
              { v: 'open', l: 'Open Contracts', c: statusCounts.open },
              { v: 'urgent', l: 'Urgent Posts', c: statusCounts.urgent },
              { v: 'active', l: 'In Progress', c: statusCounts.active },
              { v: 'completed', l: 'Completed', c: statusCounts.completed },
            ].map((s) => (
              <div className="bp-filter-option" key={s.v}>
                <input
                  type="checkbox"
                  id={`st-${s.v}`}
                  checked={statusFilters.includes(s.v)}
                  onChange={() => toggleStatus(s.v)}
                />
                <label htmlFor={`st-${s.v}`}>{s.l}</label>
                <span className="bp-count">{s.c}</span>
              </div>
            ))}
          </div>

          <div className="bp-filter-card">
            <h3>Deadline Window</h3>
            {[
              { v: '7', l: 'Next 7 days' },
              { v: '14', l: 'Next 14 days' },
              { v: '30', l: 'Next 30 days' },
            ].map((d) => (
              <div className="bp-filter-option" key={d.v}>
                <input
                  type="radio"
                  name="deadline"
                  id={`dl-${d.v}`}
                  checked={deadlineFilter === d.v}
                  onChange={() => setDeadlineFilter(d.v)}
                />
                <label htmlFor={`dl-${d.v}`}>{d.l}</label>
              </div>
            ))}
            {deadlineFilter && (
              <button
                className="bp-clear-filter-btn"
                onClick={() => setDeadlineFilter('')}
              >
                Reset Window
              </button>
            )}
          </div>
        </aside>

        {/* Projects Grid */}
        <div className="bp-projects-area">
          <div className="bp-results-header">
            <h2>
              Found <span>{filtered.length}</span> matching contract briefs
            </h2>
            <select
              className="bp-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="newest">Newest First</option>
              <option value="budget-high">Budget: High to Low</option>
              <option value="budget-low">Budget: Low to High</option>
              <option value="deadline">Deadline: Soonest</option>
            </select>
          </div>

          {paginated.length === 0 ? (
            <div className="bp-empty-state">
              <div className="bp-empty-icon">📂</div>
              <h3>No projects found</h3>
              <p>
                {projects.length === 0
                  ? 'There are no available projects in the database yet.'
                  : 'No listings match your current filters. Try resetting filter parameters.'}
              </p>
            </div>
          ) : (
            <>
              {paginated.map((p, i) => {
                const hasApplied = myAppliedProjectIds.has(String(p.projectId));
                return (
                  <div
                    key={p.projectId}
                    className={`bp-proj-card ${hasApplied ? 'applied' : ''}`}
                    onClick={() => setViewProjectId(p.projectId)}
                  >
                    {hasApplied && (
                      <span className="bp-applied-ribbon">Proposal Submitted</span>
                    )}

                    <div className="bp-proj-card-header">
                      <div className="bp-proj-badges">
                        <span className="bp-badge bp-badge-cat">{p.categoryName}</span>
                        <span className={`bp-badge bp-badge-${p.status}`}>{p.status}</span>
                        {p.isUrgent && (
                          <span className="bp-badge bp-badge-urgent">Urgent</span>
                        )}
                      </div>
                      <div className="bp-meta-item bp-budget">
                        <strong>{formatCurrency(p.budget)}</strong>
                      </div>
                    </div>

                    <h3>{p.title}</h3>
                    <p>
                      {p.description.length > 180
                        ? `${p.description.slice(0, 180)}...`
                        : p.description}
                    </p>

                    <div className="bp-proj-meta-row">
                      <div className="bp-meta-item">
                        ⏰{' '}
                        <strong>
                          {p.daysLeft === null
                            ? 'No deadline'
                            : p.daysLeft < 0
                            ? 'Expired'
                            : `${p.daysLeft} days left`}
                        </strong>
                      </div>

                      <div className="bp-meta-item">
                        👥 <strong>{p.applicants} applicants</strong>
                      </div>

                      <div className="bp-proj-client">
                        <div
                          className="bp-client-avatar"
                          style={{
                            background: CLIENT_COLORS[i % CLIENT_COLORS.length],
                          }}
                        >
                          {p.clientName.slice(0, 2).toUpperCase()}
                        </div>
                        <span>{p.clientName}</span>
                      </div>
                    </div>

                    <div className="bp-card-cta">
                      <span className="bp-cta-full">
                        {hasApplied
                          ? 'View My Proposal & Project Details →'
                          : 'Review Scope & Apply →'}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="bp-pagination">
                  <button
                    className="bp-page-btn"
                    disabled={currentPage === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    ‹
                  </button>
                  {getPageNumbers().map((num, idx) =>
                    num === '...' ? (
                      <button key={`dots-${idx}`} className="bp-page-btn dots">
                        ...
                      </button>
                    ) : (
                      <button
                        key={num}
                        className={`bp-page-btn ${num === currentPage ? 'active' : ''}`}
                        onClick={() => setPage(num)}
                      >
                        {num}
                      </button>
                    )
                  )}
                  <button
                    className="bp-page-btn"
                    disabled={currentPage === totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    ›
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}