// src/components/HomeComponents/PublicBrowseProjects/PublicBrowseProjects.jsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../../../api/axios';
import './PublicBrowseProjects.css';

const PER_PAGE = 9;
const CLIENT_COLORS = ['#4F46E5', '#7C3AED', '#059669', '#DB2777', '#F59E0B', '#0EA5E9'];

/* ── Helpers ── */
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
    return v.projectId || v.categoryId || v.clientId || v._id || v.id || null;
  }
  return String(v);
};

/* ── Mask client name (privacy for guest view) ── */
const maskClientName = (name) => {
  if (!name || name === 'Client') return 'Verified Client';
  const first = name.charAt(0).toUpperCase();
  return `${first}${'•'.repeat(Math.min(name.length - 1, 6))} Client`;
};

/* ── Truncate description for teaser ── */
const teaser = (text, len = 140) => {
  if (!text) return '';
  return text.length > len ? `${text.slice(0, len)}...` : text;
};

/* ============================================================
   MAIN COMPONENT
============================================================ */
export default function PublicBrowseProjects() {
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters (simplified for public view)
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [budgetFilter, setBudgetFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);

  // Preview modal
  const [previewProject, setPreviewProject] = useState(null);

  /* ── Fetch Public Data ── */
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const [projRes, catRes] = await Promise.all([
        API.get('/projects').catch(() => ({ data: [] })),
        API.get('/categories').catch(() => ({ data: [] })),
      ]);

      const allProjects = asArray(projRes);
      const allCategories = asArray(catRes);

      // Category lookup
      const catMap = new Map();
      allCategories.forEach((c) => {
        const id = c.categoryId || c._id;
        if (id) catMap.set(String(id), c);
      });

      setCategories(allCategories.filter((c) => c.isActive !== false));

      // Resolve projects (public version — minimal data)
      const resolved = allProjects
        .filter((p) => p.status === 'open') // Only open projects for guests
        .map((p) => {
          const pid = p.projectId || p._id;
          const catId = getRawId(p.categoryId);
          const catObj = catId ? catMap.get(String(catId)) : null;
          const dLeft = daysLeft(p.deadline);

          return {
            projectId: pid,
            title: p.title || 'Untitled Project',
            description: p.description || '',
            categoryId: catId || '',
            categoryName: catObj?.name || 'General',
            categoryIcon: catObj?.icon || '📁',
            budget: p.budget || 0,
            status: p.status || 'open',
            deadline: p.deadline,
            daysLeft: dLeft,
            isUrgent: dLeft !== null && dLeft <= 7 && dLeft >= 0,
            createdAt: p.createdAt,
          };
        });

      setProjects(resolved);
    } catch (err) {
      console.error('Failed to load projects:', err);
      setError('Failed to load projects. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ── Filters ── */
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

      if (budgetFilter === 'low' && p.budget >= 100) return false;
      if (budgetFilter === 'mid' && (p.budget < 100 || p.budget > 500)) return false;
      if (budgetFilter === 'high' && p.budget <= 500) return false;

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
  }, [projects, search, catFilter, budgetFilter, sortBy]);

  /* ── Stats ── */
  const stats = useMemo(() => ({
    total: projects.length,
    urgent: projects.filter((p) => p.isUrgent).length,
    categories: new Set(projects.map((p) => p.categoryId).filter(Boolean)).size,
    avgBudget: projects.length
      ? Math.round(projects.reduce((s, p) => s + p.budget, 0) / projects.length)
      : 0,
  }), [projects]);

  /* ── Pagination ── */
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  useEffect(() => {
    setPage(1);
  }, [search, catFilter, budgetFilter, sortBy]);

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 5) {
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

  const clearFilters = () => {
    setSearch('');
    setCatFilter('');
    setBudgetFilter('');
    setSortBy('newest');
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="pbp-loading">
        <div className="pbp-spinner" />
        <p>Loading available projects...</p>
      </div>
    );
  }

  return (
    <div className="pbp-page">
      {/* HERO */}
      <div className="pbp-hero">
        <div className="pbp-hero-inner">
          <span className="pbp-hero-badge">🌍 Explore Opportunities</span>
          <h1>Discover Amazing Projects</h1>
          <p>
            Browse thousands of open projects from clients worldwide. Sign up as a freelancer
            to apply and start earning today.
          </p>
          <div className="pbp-hero-cta">
            <Link to="/auth/signup" className="pbp-btn pbp-btn--white">
              Join as Freelancer
            </Link>
            <Link to="/auth/signin" className="pbp-btn pbp-btn--outline-white">
              Sign In
            </Link>
          </div>
        </div>
      </div>

      {/* STATS STRIP */}
      <div className="pbp-stats-strip">
        <div className="pbp-stat blue">
          <div className="pbp-stat-icon">📁</div>
          <div>
            <span className="pbp-stat-num">{stats.total}</span>
            <span className="pbp-stat-lbl">Open Projects</span>
          </div>
        </div>
        <div className="pbp-stat amber">
          <div className="pbp-stat-icon">🔥</div>
          <div>
            <span className="pbp-stat-num">{stats.urgent}</span>
            <span className="pbp-stat-lbl">Urgent Projects</span>
          </div>
        </div>
        <div className="pbp-stat purple">
          <div className="pbp-stat-icon">🏷️</div>
          <div>
            <span className="pbp-stat-num">{stats.categories}</span>
            <span className="pbp-stat-lbl">Categories</span>
          </div>
        </div>
        <div className="pbp-stat green">
          <div className="pbp-stat-icon">💰</div>
          <div>
            <span className="pbp-stat-num">{formatCurrency(stats.avgBudget)}</span>
            <span className="pbp-stat-lbl">Avg. Budget</span>
          </div>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="pbp-search-section">
        <div className="pbp-search-bar">
          <div className="pbp-search-wrap">
            <span className="pbp-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search projects by title, category, or keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="pbp-search-clear" onClick={() => setSearch('')}>×</button>
            )}
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

          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="newest">Newest First</option>
            <option value="budget-high">Budget: High to Low</option>
            <option value="budget-low">Budget: Low to High</option>
            <option value="deadline">Deadline: Soonest</option>
          </select>
        </div>
      </div>

      <div className="pbp-container">
        {error && <div className="pbp-alert">{error}</div>}

        <div className="pbp-results-header">
          <h2>
            Showing <span>{filtered.length}</span> open project{filtered.length !== 1 ? 's' : ''}
          </h2>
          {(search || catFilter || budgetFilter) && (
            <button className="pbp-reset-link" onClick={clearFilters}>
              Reset Filters
            </button>
          )}
        </div>

        {/* PROJECTS GRID */}
        {paginated.length === 0 ? (
          <div className="pbp-empty">
            <div className="pbp-empty-icon">🔍</div>
            <h3>No projects found</h3>
            <p>
              {projects.length === 0
                ? 'There are no open projects at the moment. Please check back soon!'
                : 'Try adjusting your search or filters to find more projects.'}
            </p>
            {projects.length > 0 && (
              <button className="pbp-btn pbp-btn--primary" onClick={clearFilters}>
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="pbp-grid">
              {paginated.map((p, i) => (
                <div
                  key={p.projectId}
                  className="pbp-card"
                  onClick={() => setPreviewProject(p)}
                >
                  <div className="pbp-card-head">
                    <div className="pbp-card-badges">
                      <span className="pbp-badge pbp-badge-cat">
                        {p.categoryIcon} {p.categoryName}
                      </span>
                      {p.isUrgent && (
                        <span className="pbp-badge pbp-badge-urgent">🔥 Urgent</span>
                      )}
                    </div>
                    <div className="pbp-card-budget">{formatCurrency(p.budget)}</div>
                  </div>

                  <h3 className="pbp-card-title">{p.title}</h3>
                  <p className="pbp-card-desc">{teaser(p.description, 150)}</p>

                  <div className="pbp-card-meta">
                    <div className="pbp-meta-item">
                      <span className="pbp-meta-icon">⏰</span>
                      <span>
                        {p.daysLeft === null
                          ? 'Flexible'
                          : p.daysLeft < 0
                          ? 'Expired'
                          : `${p.daysLeft} days left`}
                      </span>
                    </div>
                    <div className="pbp-meta-item">
                      <span className="pbp-meta-icon">🟢</span>
                      <span className="pbp-status-open">Open</span>
                    </div>
                  </div>

                  <div className="pbp-card-footer">
                    <div className="pbp-card-client">
                      <div
                        className="pbp-client-avatar"
                        style={{ background: CLIENT_COLORS[i % CLIENT_COLORS.length] }}
                      >
                        🔒
                      </div>
                      <span>{maskClientName('Client')}</span>
                    </div>
                    <span className="pbp-view-more">View Details →</span>
                  </div>
                </div>
              ))}
            </div>

            {/* PAGINATION */}
            {totalPages > 1 && (
              <div className="pbp-pagination">
                <button
                  className="pbp-page-btn"
                  disabled={currentPage === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  ‹
                </button>
                {getPageNumbers().map((num, idx) =>
                  num === '...' ? (
                    <span key={`dots-${idx}`} className="pbp-page-dots">...</span>
                  ) : (
                    <button
                      key={num}
                      className={`pbp-page-btn ${num === currentPage ? 'active' : ''}`}
                      onClick={() => setPage(num)}
                    >
                      {num}
                    </button>
                  )
                )}
                <button
                  className="pbp-page-btn"
                  disabled={currentPage === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  ›
                </button>
              </div>
            )}
          </>
        )}

        {/* CTA BANNER */}
        <div className="pbp-cta-banner">
          <div className="pbp-cta-content">
            <div>
              <h2>Ready to Start Earning?</h2>
              <p>Join thousands of freelancers finding meaningful work every day.</p>
            </div>
            <div className="pbp-cta-actions">
              <Link to="/auth/signup" className="pbp-btn pbp-btn--white">
                Sign Up Free
              </Link>
              <Link to="/auth/signin" className="pbp-btn pbp-btn--outline-white">
                Login to Apply
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* PREVIEW MODAL */}
      {previewProject && (
        <div className="pbp-modal-overlay" onClick={() => setPreviewProject(null)}>
          <div className="pbp-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="pbp-modal-close"
              onClick={() => setPreviewProject(null)}
            >
              ×
            </button>

            <div className="pbp-modal-header">
              <div className="pbp-card-badges">
                <span className="pbp-badge pbp-badge-cat">
                  {previewProject.categoryIcon} {previewProject.categoryName}
                </span>
                {previewProject.isUrgent && (
                  <span className="pbp-badge pbp-badge-urgent">🔥 Urgent</span>
                )}
                <span className="pbp-badge pbp-badge-open">🟢 Open</span>
              </div>
              <h2>{previewProject.title}</h2>
              <div className="pbp-modal-budget">
                {formatCurrency(previewProject.budget)}
              </div>
            </div>

            <div className="pbp-modal-body">
              <div className="pbp-modal-section">
                <h3>Project Preview</h3>
                <p>{teaser(previewProject.description, 300)}</p>
                <div className="pbp-locked-content">
                  <div className="pbp-lock-icon">🔒</div>
                  <p>
                    <strong>Sign in to view full project details</strong>
                  </p>
                  <p className="pbp-locked-hint">
                    Get access to complete descriptions, requirements, client information,
                    and the ability to submit proposals.
                  </p>
                </div>
              </div>

              <div className="pbp-modal-grid">
                <div className="pbp-modal-stat">
                  <span className="pbp-modal-stat-label">Budget</span>
                  <strong>{formatCurrency(previewProject.budget)}</strong>
                </div>
                <div className="pbp-modal-stat">
                  <span className="pbp-modal-stat-label">Deadline</span>
                  <strong>
                    {previewProject.daysLeft === null
                      ? 'Flexible'
                      : previewProject.daysLeft < 0
                      ? 'Expired'
                      : `${previewProject.daysLeft} days`}
                  </strong>
                </div>
                <div className="pbp-modal-stat">
                  <span className="pbp-modal-stat-label">Category</span>
                  <strong>{previewProject.categoryName}</strong>
                </div>
                <div className="pbp-modal-stat">
                  <span className="pbp-modal-stat-label">Status</span>
                  <strong className="pbp-status-open">Accepting Proposals</strong>
                </div>
              </div>
            </div>

            <div className="pbp-modal-footer">
              <button
                className="pbp-btn pbp-btn--ghost"
                onClick={() => setPreviewProject(null)}
              >
                Close
              </button>
              <button
                className="pbp-btn pbp-btn--primary"
                onClick={() => navigate('/auth/signup')}
              >
                Sign Up to Apply →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}