import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../../../api/axios';
import Navbar from '../Navbar/Navbar';
import './FindFreelancers.css';

const PER_PAGE = 9;
const AVATAR_COLORS = ['#4F46E5', '#7C3AED', '#059669', '#DB2777', '#F59E0B', '#0EA5E9'];

const asArray = (res) => {
  const d = res?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.results)) return d.results;
  return [];
};

const getInitials = (name) => {
  if (!name) return 'FL';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const maskName = (name) => {
  if (!name) return 'Verified Freelancer';
  const parts = name.trim().split(' ');
  const first = parts[0];
  const lastInitial = parts.length > 1 ? parts[parts.length - 1][0] + '.' : '';
  return `${first} ${lastInitial}`.trim();
};

const renderStars = (rating) => {
  const r = rating || 0;
  const full = Math.floor(r);
  const half = r % 1 >= 0.5;
  let stars = '';
  for (let i = 0; i < full; i++) stars += '★';
  if (half) stars += '½';
  if (!stars) stars = '☆';
  return stars;
};

const getSkillsArray = (f) => {
  if (Array.isArray(f.skills)) return f.skills.slice(0, 4);
  if (f.mainSkill) return [f.mainSkill];
  if (f.skill) return [f.skill];
  return ['General'];
};

const getAvailability = (f) => {
  if (f.availability) return f.availability;
  if (f.isAvailable === false) return 'Busy';
  return 'Available';
};

const getLevel = (projects) => {
  if (projects >= 100) return { label: 'Expert', color: '#7C3AED' };
  if (projects >= 50) return { label: 'Advanced', color: '#4F46E5' };
  if (projects >= 20) return { label: 'Intermediate', color: '#059669' };
  return { label: 'Rising', color: '#F59E0B' };
};

export default function FindFreelancers() {
  const navigate = useNavigate();

  const [freelancers, setFreelancers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [sortBy, setSortBy] = useState('rating');
  const [page, setPage] = useState(1);

  const [previewFreelancer, setPreviewFreelancer] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const flRes = await API.get('/freelancers').catch(() => ({ data: [] }));
      const allFreelancers = asArray(flRes);

      const resolved = allFreelancers.map((f, i) => {
        const fullName =
          f.name ||
          `${f.firstName || ''} ${f.lastName || ''}`.trim() ||
          f.username ||
          'Freelancer';
        const projects = f.completedProjects || 0;
        const level = getLevel(projects);

        return {
          freelancerId: f.freelancerId || f._id,
          name: fullName,
          maskedName: maskName(fullName),
          initials: getInitials(fullName),
          title: f.title || f.mainSkill || 'Freelancer',
          skills: getSkillsArray(f),
          bio: f.bio || f.description || 'Skilled professional ready to take on your next project.',
          rating: f.rating || 0,
          reviews: f.totalReviews || f.reviews || 0,
          completedProjects: projects,
          hourlyRate: f.hourlyRate || 0,
          availability: getAvailability(f),
          level: level,
          responseTime: f.responseTime || '< 1 hour',
          memberSince: f.memberSince || f.createdAt || '2024',
          color: AVATAR_COLORS[i % AVATAR_COLORS.length],
        };
      });

      setFreelancers(resolved);
    } catch (err) {
      console.error('Failed to load freelancers:', err);
      setError('Failed to load freelancers. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = useMemo(() => {
    let list = freelancers.filter((f) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = f.name.toLowerCase().includes(q);
        const matchTitle = f.title.toLowerCase().includes(q);
        const matchSkills = f.skills.some((s) => s.toLowerCase().includes(q));
        const matchBio = f.bio.toLowerCase().includes(q);
        if (!matchName && !matchTitle && !matchSkills && !matchBio) return false;
      }
      if (skillFilter) {
        const hasSkill = f.skills.some(
          (s) => s.toLowerCase() === skillFilter.toLowerCase()
        );
        if (!hasSkill) return false;
      }
      return true;
    });

    list.sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'projects') return b.completedProjects - a.completedProjects;
      if (sortBy === 'rate-low') return a.hourlyRate - b.hourlyRate;
      if (sortBy === 'rate-high') return b.hourlyRate - a.hourlyRate;
      if (sortBy === 'reviews') return b.reviews - a.reviews;
      return 0;
    });

    return list;
  }, [freelancers, search, skillFilter, sortBy]);

  const stats = useMemo(() => ({
    total: freelancers.length,
    topRated: freelancers.filter((f) => f.rating >= 4.5).length,
    skills: new Set(freelancers.flatMap((f) => f.skills)).size,
    avgRating: freelancers.length
      ? (freelancers.reduce((s, f) => s + (f.rating || 0), 0) / freelancers.length).toFixed(1)
      : 0,
  }), [freelancers]);

  const availableSkills = useMemo(() => {
    const set = new Set(freelancers.flatMap((f) => f.skills));
    return Array.from(set).sort();
  }, [freelancers]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  useEffect(() => {
    setPage(1);
  }, [search, skillFilter, sortBy]);

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++)
        pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  const clearFilters = () => {
    setSearch('');
    setSkillFilter('');
    setSortBy('rating');
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="ff-loading">
          <div className="ff-spinner" />
          <p>Loading talented freelancers...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="ff-page">
        {/* HERO */}
        <div className="ff-hero">
          <div className="ff-hero-inner">
            <span className="ff-hero-badge">🌟 Top Talent</span>
            <h1>Find Skilled Freelancers</h1>
            <p>
              Browse verified professionals across design, development, writing, and support.
              Sign up to hire and connect directly with experts.
            </p>
            <div className="ff-hero-cta">
              <Link to="/auth/signup" className="ff-btn ff-btn--white">Hire a Freelancer</Link>
              <Link to="/auth/signin" className="ff-btn ff-btn--outline-white">Sign In</Link>
            </div>
          </div>
        </div>

        {/* STATS STRIP */}
        <div className="ff-stats-strip">
          <div className="ff-stat-card blue">
            <div className="ff-stat-icon">👥</div>
            <div>
              <span className="ff-stat-num">{stats.total}</span>
              <span className="ff-stat-lbl">Freelancers</span>
            </div>
          </div>
          <div className="ff-stat-card amber">
            <div className="ff-stat-icon">⭐</div>
            <div>
              <span className="ff-stat-num">{stats.topRated}</span>
              <span className="ff-stat-lbl">Top Rated</span>
            </div>
          </div>
          <div className="ff-stat-card purple">
            <div className="ff-stat-icon">🏷️</div>
            <div>
              <span className="ff-stat-num">{stats.skills}</span>
              <span className="ff-stat-lbl">Skills</span>
            </div>
          </div>
          <div className="ff-stat-card green">
            <div className="ff-stat-icon">📈</div>
            <div>
              <span className="ff-stat-num">{stats.avgRating}</span>
              <span className="ff-stat-lbl">Avg Rating</span>
            </div>
          </div>
        </div>

        {/* SEARCH BAR */}
        <div className="ff-search-section">
          <div className="ff-search-bar">
            <div className="ff-search-wrap">
              <span className="ff-search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search by name, skill, or title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button className="ff-search-clear" onClick={() => setSearch('')}>×</button>
              )}
            </div>
            <select value={skillFilter} onChange={(e) => setSkillFilter(e.target.value)}>
              <option value="">All Skills</option>
              {availableSkills.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="rating">Highest Rated</option>
              <option value="reviews">Most Reviews</option>
              <option value="projects">Most Projects</option>
              <option value="rate-low">Rate: Low → High</option>
              <option value="rate-high">Rate: High → Low</option>
            </select>
          </div>
        </div>

        <div className="ff-container">
          {error && <div className="ff-alert">{error}</div>}

          <div className="ff-results-header">
            <h2>
              Showing <span>{filtered.length}</span> freelancer{filtered.length !== 1 ? 's' : ''}
            </h2>
            {(search || skillFilter) && (
              <button className="ff-reset-link" onClick={clearFilters}>Reset Filters</button>
            )}
          </div>

          {paginated.length === 0 ? (
            <div className="ff-empty">
              <div className="ff-empty-icon">🔍</div>
              <h3>No freelancers found</h3>
              <p>
                {freelancers.length === 0
                  ? 'No freelancers available right now. Check back soon!'
                  : 'Try adjusting your search or filters.'}
              </p>
              {freelancers.length > 0 && (
                <button className="ff-btn ff-btn--primary" onClick={clearFilters}>
                  Clear All Filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="ff-grid">
                {paginated.map((f) => (
                  <div
                    key={f.freelancerId}
                    className="ff-card"
                    onClick={() => setPreviewFreelancer(f)}
                  >
                    {/* Card Header */}
                    <div className="ff-card-header">
                      <div className="ff-avatar" style={{ background: f.color }}>
                        {f.initials}
                      </div>
                      <div className="ff-header-info">
                        <div className="ff-name-row">
                          <h3 className="ff-name">{f.maskedName}</h3>
                          <span
                            className="ff-level-badge"
                            style={{ background: f.level.color + '18', color: f.level.color }}
                          >
                            {f.level.label}
                          </span>
                        </div>
                        <span className="ff-title">{f.title}</span>
                      </div>
                      <div className="ff-rate-badge">
                        {f.hourlyRate ? `$${f.hourlyRate}` : 'N/A'}
                        <span>/hr</span>
                      </div>
                    </div>

                    {/* Bio */}
                    <p className="ff-bio">
                      {f.bio.length > 110 ? f.bio.slice(0, 110) + '...' : f.bio}
                    </p>

                    {/* Skills */}
                    <div className="ff-skills-row">
                      {f.skills.map((s) => (
                        <span key={s} className="ff-skill-tag">{s}</span>
                      ))}
                    </div>

                    {/* Stats Row */}
                    <div className="ff-stats-row">
                      <div className="ff-stat-item">
                        <span className="ff-stars">{renderStars(f.rating)}</span>
                        <strong>{f.rating.toFixed(1)}</strong>
                        <span className="ff-muted">({f.reviews})</span>
                      </div>
                      <div className="ff-stat-divider" />
                      <div className="ff-stat-item">
                        <span className="ff-stat-emoji">📁</span>
                        <strong>{f.completedProjects}</strong>
                        <span className="ff-muted">projects</span>
                      </div>
                      <div className="ff-stat-divider" />
                      <div className="ff-stat-item">
                        <span className="ff-stat-emoji">⚡</span>
                        <span className="ff-muted">{f.responseTime}</span>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="ff-card-footer">
                      <span className={`ff-availability ${f.availability === 'Available' ? 'online' : 'busy'}`}>
                        <span className="ff-dot" />
                        {f.availability}
                      </span>
                      <span className="ff-view-profile">View Profile →</span>
                    </div>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="ff-pagination">
                  <button className="ff-page-btn" disabled={currentPage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>‹</button>
                  {getPageNumbers().map((num, idx) =>
                    num === '...' ? (
                      <span key={`dots-${idx}`} className="ff-page-dots">...</span>
                    ) : (
                      <button key={num} className={`ff-page-btn ${num === currentPage ? 'active' : ''}`} onClick={() => setPage(num)}>{num}</button>
                    )
                  )}
                  <button className="ff-page-btn" disabled={currentPage === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>›</button>
                </div>
              )}
            </>
          )}

          <div className="ff-cta-banner">
            <div className="ff-cta-content">
              <div>
                <h2>Ready to Hire Top Talent?</h2>
                <p>Create a free account and connect with skilled freelancers today.</p>
              </div>
              <div className="ff-cta-actions">
                <Link to="/auth/signup" className="ff-btn ff-btn--white">Sign Up Free</Link>
                <Link to="/auth/signin" className="ff-btn ff-btn--outline-white">Login to Hire</Link>
              </div>
            </div>
          </div>
        </div>

        {/* PREVIEW MODAL */}
        {previewFreelancer && (
          <div className="ff-modal-overlay" onClick={() => setPreviewFreelancer(null)}>
            <div className="ff-modal" onClick={(e) => e.stopPropagation()}>
              <button className="ff-modal-close" onClick={() => setPreviewFreelancer(null)}>×</button>

              <div className="ff-modal-header">
                <div className="ff-modal-avatar" style={{ background: previewFreelancer.color }}>
                  {previewFreelancer.initials}
                </div>
                <h2>{previewFreelancer.maskedName}</h2>
                <p className="ff-modal-title">{previewFreelancer.title}</p>
                <div className="ff-modal-badges">
                  <span className="ff-level-badge" style={{ background: previewFreelancer.level.color + '18', color: previewFreelancer.level.color }}>
                    {previewFreelancer.level.label}
                  </span>
                  <span className={`ff-availability ${previewFreelancer.availability === 'Available' ? 'online' : 'busy'}`}>
                    <span className="ff-dot" />
                    {previewFreelancer.availability}
                  </span>
                </div>
                <div className="ff-modal-rating">
                  <span className="ff-stars">{renderStars(previewFreelancer.rating)}</span>
                  <strong>{previewFreelancer.rating.toFixed(1)}</strong>
                  <span>({previewFreelancer.reviews} reviews)</span>
                </div>
              </div>

              <div className="ff-modal-body">
                <div className="ff-modal-section">
                  <h3>About</h3>
                  <p className="ff-modal-bio">{previewFreelancer.bio}</p>
                </div>

                <div className="ff-modal-section">
                  <h3>Skills</h3>
                  <div className="ff-skills-row">
                    {previewFreelancer.skills.map((s) => (
                      <span key={s} className="ff-skill-tag">{s}</span>
                    ))}
                  </div>
                </div>

                <div className="ff-locked-content">
                  <div className="ff-lock-icon">🔒</div>
                  <p><strong>Sign in to view full profile</strong></p>
                  <p className="ff-locked-hint">
                    Access portfolio, work history, client reviews, and hire this freelancer directly.
                  </p>
                </div>

                <div className="ff-modal-grid">
                  <div className="ff-modal-stat">
                    <span className="ff-modal-stat-label">Hourly Rate</span>
                    <strong>{previewFreelancer.hourlyRate ? `$${previewFreelancer.hourlyRate}/hr` : 'Negotiable'}</strong>
                  </div>
                  <div className="ff-modal-stat">
                    <span className="ff-modal-stat-label">Projects Done</span>
                    <strong>{previewFreelancer.completedProjects}</strong>
                  </div>
                  <div className="ff-modal-stat">
                    <span className="ff-modal-stat-label">Response Time</span>
                    <strong>{previewFreelancer.responseTime}</strong>
                  </div>
                  <div className="ff-modal-stat">
                    <span className="ff-modal-stat-label">Member Since</span>
                    <strong>{new Date(previewFreelancer.memberSince).getFullYear()}</strong>
                  </div>
                </div>
              </div>

              <div className="ff-modal-footer">
                <button className="ff-btn ff-btn--ghost" onClick={() => setPreviewFreelancer(null)}>Close</button>
                <button className="ff-btn ff-btn--primary" onClick={() => navigate('/auth/signup')}>Sign Up to Hire →</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}