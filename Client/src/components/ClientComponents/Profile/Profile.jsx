// src/components/ClientComponents/Profile/Profile.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import API from '../../../api/axios';
import './Profile.css';

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
  if (typeof v === 'object')
    return v.clientId || v.userId || v.projectId || v._id || v.id || null;
  return String(v);
};

const eqId = (a, b) => {
  const x = getRawId(a), y = getRawId(b);
  return x && y && String(x) === String(y);
};

const formatCurrency = (val) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
  }).format(val || 0);

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
};

/* ============================================================
   MAIN COMPONENT
============================================================ */
export default function Profile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState(null);
  const [projects, setProjects] = useState([]);
  const [payments, setPayments] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState('');

  const currentUserId = user?.userId || user?._id || user?.id;

  const fetchData = useCallback(async () => {
    if (!currentUserId) return;
    try {
      setLoading(true);
      const [clientsRes, projectsRes, paymentsRes, reviewsRes] = await Promise.all([
        API.get('/clients').catch(() => ({ data: [] })),
        API.get('/projects').catch(() => ({ data: [] })),
        API.get('/payments').catch(() => ({ data: [] })),
        API.get('/reviews').catch(() => ({ data: [] })),
      ]);

      const allClients = asArray(clientsRes);
      const allProjects = asArray(projectsRes);
      const allPayments = asArray(paymentsRes);
      const allReviews = asArray(reviewsRes);

      const myClient = allClients.find((c) => eqId(c.userId, currentUserId));
      if (!myClient) {
        setError('Client profile not found. Please complete your profile setup.');
        setLoading(false);
        return;
      }

      setClient(myClient);

      const clientId = myClient.clientId || myClient._id;
      const myProjects = allProjects.filter((p) => eqId(p.clientId, clientId));
      setProjects(myProjects);

      const myProjectIds = new Set(myProjects.map((p) => String(getRawId(p))));
      const myPayments = allPayments.filter((p) => {
        if (eqId(p.clientId, clientId)) return true;
        return myProjectIds.has(String(getRawId(p.projectId)));
      });
      setPayments(myPayments);

      const myReviews = allReviews.filter((r) => eqId(r.reviewerId, currentUserId));
      setReviews(myReviews);
    } catch (err) {
      console.error('Failed to load profile:', err);
      setError('Failed to load profile data.');
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const stats = useMemo(() => {
    const completedProjects = projects.filter((p) => p.status === 'completed').length;
    const activeProjects = projects.filter((p) =>
      ['active', 'in-progress', 'in_progress'].includes(p.status)
    ).length;
    const totalSpent = payments
      .filter((p) => p.status === 'completed')
      .reduce((s, p) => s + (p.amount || 0), 0);
    const avgRating = reviews.length > 0
      ? reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length
      : 0;

    return {
      totalProjects: projects.length,
      completedProjects,
      activeProjects,
      totalSpent,
      totalReviews: reviews.length,
      avgRating,
    };
  }, [projects, payments, reviews]);

  if (loading) {
    return (
      <div className="cprof-loading">
        <div className="cprof-spinner" />
        <p>Loading your profile...</p>
      </div>
    );
  }

  const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.username || 'Client';
  const avatarLetter = (user?.firstName || 'C').charAt(0).toUpperCase();
  const memberSince = formatDate(user?.createdAt);

  return (
    <div className="cprof-page">
      {/* HERO BANNER */}
      <div className="cprof-hero">
        <div className="cprof-hero-inner">
          <div className="cprof-avatar-wrap">
            <div className="cprof-avatar">
              {user?.profileImage ? (
                <img src={user.profileImage} alt={fullName} />
              ) : avatarLetter}
            </div>
            {client?.isVerified && (
              <span className="cprof-verified">✓ Verified</span>
            )}
          </div>
          <div className="cprof-hero-info">
            <h1>{fullName}</h1>
            <p className="cprof-headline">
              {client?.jobTitle || 'Client'}
              {client?.companyName ? ` at ${client.companyName}` : ''}
            </p>
            <div className="cprof-meta-row">
              <span>📍 {client?.location || user?.location || 'Not specified'}</span>
              <span>📅 Member since {memberSince}</span>
              <span>⭐ {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : 'No ratings'}</span>
            </div>
          </div>
          <Link to="/client/settings" className="cprof-edit-btn">
            ✏️ Edit Profile
          </Link>
        </div>
      </div>

      {/* STATS STRIP */}
      <div className="cprof-stats">
        <div className="cprof-stat">
          <span className="cprof-stat-num">{stats.totalProjects}</span>
          <span className="cprof-stat-lbl">Projects Posted</span>
        </div>
        <div className="cprof-stat green">
          <span className="cprof-stat-num">{stats.completedProjects}</span>
          <span className="cprof-stat-lbl">Completed</span>
        </div>
        <div className="cprof-stat blue">
          <span className="cprof-stat-num">{stats.activeProjects}</span>
          <span className="cprof-stat-lbl">Active</span>
        </div>
        <div className="cprof-stat purple">
          <span className="cprof-stat-num">{formatCurrency(stats.totalSpent)}</span>
          <span className="cprof-stat-lbl">Total Spent</span>
        </div>
        <div className="cprof-stat amber">
          <span className="cprof-stat-num">{stats.totalReviews}</span>
          <span className="cprof-stat-lbl">Reviews Given</span>
        </div>
      </div>

      <div className="cprof-container">
        {error && (
          <div className="cprof-alert">
            <span>⚠️</span><p>{error}</p>
          </div>
        )}

        <div className="cprof-grid">
          {/* LEFT COLUMN */}
          <div className="cprof-main">
            {/* About */}
            <div className="cprof-card">
              <h2>📄 About</h2>
              <p className="cprof-bio">
                {client?.bio || client?.companyDescription || user?.bio ||
                  'No bio provided yet. Update your profile to tell freelancers about yourself and your company.'}
              </p>
            </div>

            {/* Company Info */}
            {client?.companyName && (
              <div className="cprof-card">
                <h2>🏢 Company Information</h2>
                <div className="cprof-detail-grid">
                  <div>
                    <label>Company Name</label>
                    <p>{client.companyName}</p>
                  </div>
                  <div>
                    <label>Industry</label>
                    <p>{client.industry || '—'}</p>
                  </div>
                  <div>
                    <label>Company Size</label>
                    <p>{client.companySize || '—'}</p>
                  </div>
                  <div>
                    <label>Website</label>
                    <p>
                      {client.website ? (
                        <a href={client.website} target="_blank" rel="noopener noreferrer">
                          {client.website}
                        </a>
                      ) : '—'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Projects */}
            <div className="cprof-card">
              <div className="cprof-card-head">
                <h2>📁 Recent Projects</h2>
                <Link to="/client/my-projects" className="cprof-link">View All →</Link>
              </div>
              {projects.length === 0 ? (
                <p className="cprof-empty">No projects posted yet.</p>
              ) : (
                <div className="cprof-project-list">
                  {projects.slice(0, 5).map((p) => (
                    <div key={getRawId(p)} className="cprof-project-item">
                      <div className="cprof-pi-info">
                        <strong>{p.title || 'Untitled'}</strong>
                        <span>{formatDate(p.createdAt)}</span>
                      </div>
                      <div className="cprof-pi-right">
                        <span className="cprof-pi-budget">{formatCurrency(p.budget)}</span>
                        <span className={`cprof-pi-status status-${p.status}`}>
                          {p.status || 'draft'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="cprof-sidebar">
            {/* Contact Info */}
            <div className="cprof-card">
              <h2>📬 Contact</h2>
              <div className="cprof-contact-list">
                <div className="cprof-contact-item">
                  <span className="cprof-ci-icon">📧</span>
                  <div>
                    <label>Email</label>
                    <p>{user?.email || '—'}</p>
                  </div>
                </div>
                <div className="cprof-contact-item">
                  <span className="cprof-ci-icon">📱</span>
                  <div>
                    <label>Phone</label>
                    <p>{user?.phone || '—'}</p>
                  </div>
                </div>
                <div className="cprof-contact-item">
                  <span className="cprof-ci-icon">📍</span>
                  <div>
                    <label>Location</label>
                    <p>{client?.location || user?.location || '—'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Preferences */}
            <div className="cprof-card">
              <h2>🎯 Preferences</h2>
              <div className="cprof-pref-list">
                <div>
                  <label>Preferred Freelancer Type</label>
                  <p>{client?.preferredFreelancerType || 'Any'}</p>
                </div>
                <div>
                  <label>Preferred Project Type</label>
                  <p>{client?.preferredProjectType || 'Any'}</p>
                </div>
                <div>
                  <label>Budget Range</label>
                  <p>
                    {client?.preferredBudgetMin || client?.preferredBudgetMax
                      ? `${formatCurrency(client?.preferredBudgetMin)} – ${formatCurrency(client?.preferredBudgetMax)}`
                      : 'Flexible'}
                  </p>
                </div>
              </div>
            </div>

            {/* Account Status */}
            <div className="cprof-card">
              <h2>🛡️ Account Status</h2>
              <div className="cprof-status-list">
                <div className="cprof-status-row">
                  <span>Email Verified</span>
                  <span className={user?.isEmailVerified ? 'ok' : 'warn'}>
                    {user?.isEmailVerified ? '✓ Yes' : '⚠ No'}
                  </span>
                </div>
                <div className="cprof-status-row">
                  <span>Account Active</span>
                  <span className={user?.isActive ? 'ok' : 'warn'}>
                    {user?.isActive ? '✓ Yes' : '⚠ No'}
                  </span>
                </div>
                <div className="cprof-status-row">
                  <span>Company Verified</span>
                  <span className={client?.isCompanyVerified ? 'ok' : 'warn'}>
                    {client?.isCompanyVerified ? '✓ Yes' : '⚠ No'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}