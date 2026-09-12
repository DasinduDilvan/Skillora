import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import API from '../../../api/axios';
import './Dashboard.css';

/* ---------- Helpers ---------- */
const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
};

const formatCurrency = (val) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(val || 0);

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `${days}d ago`;
  if (hrs > 0) return `${hrs}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return 'Just now';
};

const StatusBadge = ({ status }) => {
  const map = {
    draft: { label: 'Draft', cls: 'badge-gray' },
    open: { label: 'Open', cls: 'badge-blue' },
    active: { label: 'Active', cls: 'badge-green' },
    'in-progress': { label: 'In Progress', cls: 'badge-green' },
    completed: { label: 'Completed', cls: 'badge-purple' },
    cancelled: { label: 'Cancelled', cls: 'badge-red' },
    pending: { label: 'Pending', cls: 'badge-yellow' },
    accepted: { label: 'Accepted', cls: 'badge-green' },
    rejected: { label: 'Rejected', cls: 'badge-red' },
    withdrawn: { label: 'Withdrawn', cls: 'badge-gray' },
  };
  const badge = map[status] || { label: status || 'Unknown', cls: 'badge-gray' };
  return <span className={`fl-badge ${badge.cls}`}>{badge.label}</span>;
};

// Extracts an array from various API response shapes
const asArray = (res) => {
  const data = res?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};

// Universal ID matcher — handles custom IDs, _id, and populated docs
const eqId = (a, b) => {
  if (!a || !b) return false;
  const extract = (v) => {
    if (typeof v === 'string') return v;
    if (typeof v === 'object') return v.userId || v.freelancerId || v.clientId || v.projectId || v._id || v.id;
    return String(v);
  };
  return String(extract(a)) === String(extract(b));
};

export default function Dashboard() {
  const { user } = useAuth();

  const [freelancerProfile, setFreelancerProfile] = useState(null);
  const [projects, setProjects] = useState([]);
  const [applications, setApplications] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [clientsMap, setClientsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Extract userId from context (matches your schema field name)
  const userId =
    user?.userId || user?._id || user?.id || user?.user?.userId || user?.user?._id;

  const displayName =
    user?.firstName ||
    user?.name ||
    user?.username ||
    (user?.email ? user.email.split('@')[0] : 'Freelancer');

  const loadDashboardData = useCallback(async () => {
    if (!userId) {
      setError('User authentication data missing. Please log in again.');
      setLoading(false);
      return;
    }

    console.log('🔍 Dashboard loading for userId:', userId);
    setLoading(true);
    setError('');

    try {
      /* ============================================================
       * 1. FIND FREELANCER PROFILE
       *    GET /api/freelancers → filter by userId
       * ============================================================ */
      const freelancersRes = await API.get('/freelancers');
      const allFreelancers = asArray(freelancersRes);
      console.log('📦 All freelancers count:', allFreelancers.length);

      const currentFreelancer = allFreelancers.find((f) => eqId(f.userId, userId));
      console.log('✅ Matched freelancer profile:', currentFreelancer);

      if (!currentFreelancer) {
        console.warn('⚠️ No freelancer profile found for this user');
      }

      setFreelancerProfile(currentFreelancer || null);

      // Use the custom `freelancerId` field (not _id)
      const freelancerId = currentFreelancer?.freelancerId || currentFreelancer?._id;
      console.log('🆔 Freelancer ID for filtering:', freelancerId);

      /* ============================================================
       * 2. PROJECTS
       *    GET /api/projects → filter by freelancerId
       * ============================================================ */
      let myProjects = [];
      if (freelancerId) {
        const projectsRes = await API.get('/projects');
        const allProjects = asArray(projectsRes);
        console.log('📦 All projects count:', allProjects.length);

        myProjects = allProjects.filter((p) => eqId(p.freelancerId, freelancerId));
        console.log('📁 My projects:', myProjects.length);
      }
      setProjects(myProjects);

      /* ============================================================
       * 3. APPLICATIONS
       *    GET /api/applications → filter by freelancerId
       * ============================================================ */
      let myApps = [];
      if (freelancerId) {
        const appsRes = await API.get('/applications');
        const allApps = asArray(appsRes);
        console.log('📦 All applications count:', allApps.length);

        myApps = allApps.filter((a) => eqId(a.freelancerId, freelancerId));
        console.log('📝 My applications:', myApps.length);
      }
      setApplications(myApps);

      /* ============================================================
       * 4. NOTIFICATIONS
       *    GET /api/notifications → filter by userId
       * ============================================================ */
      const notifsRes = await API.get('/notifications');
      const allNotifs = asArray(notifsRes);
      console.log('📦 All notifications count:', allNotifs.length);

      const myNotifs = allNotifs
        .filter((n) => eqId(n.userId, userId))
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .slice(0, 5);
      console.log('🔔 My notifications:', myNotifs.length);
      setNotifications(myNotifs);

      /* ============================================================
       * 5. CLIENTS MAP (for showing client names in project cards)
       * ============================================================ */
      const [clientsRes, usersRes] = await Promise.all([
        API.get('/clients').catch(() => ({ data: [] })),
        API.get('/users').catch(() => ({ data: [] })),
      ]);

      const clients = asArray(clientsRes);
      const users = asArray(usersRes);

      const cMap = {};
      clients.forEach((client) => {
        const cid = client.clientId || client._id;
        if (!cid) return;

        // Find matching user for name
        const clientUser = users.find((u) => eqId(u, client.userId));

        const fullName = clientUser
          ? `${clientUser.firstName || ''} ${clientUser.lastName || ''}`.trim()
          : '';

        cMap[cid] =
          client.companyName ||
          fullName ||
          clientUser?.username ||
          clientUser?.email?.split('@')[0] ||
          'Client';
      });
      console.log('👥 Clients map built:', Object.keys(cMap).length, 'entries');
      setClientsMap(cMap);
    } catch (err) {
      console.error('❌ Dashboard load error:', err);
      setError(err.response?.data?.message || 'Failed to sync with server.');
    } finally {
      setLoading(false);
    }
  }, [userId, user]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  /* ---------- Derived Stats ---------- */
  const activeProjects = projects.filter(
    (p) => p.status === 'active' || p.status === 'in-progress'
  );
  const completedProjects = projects.filter((p) => p.status === 'completed');
  const pendingApps = applications.filter((a) => a.status === 'pending');
  const acceptedApps = applications.filter((a) => a.status === 'accepted');
  const unreadNotifCount = notifications.filter((n) => !n.isRead).length;

  const stats = {
    activeProjects:
      freelancerProfile?.dashboardStats?.activeProjects ?? activeProjects.length,
    completedProjects:
      freelancerProfile?.dashboardStats?.completedProjects ?? completedProjects.length,
    pendingApplications:
      freelancerProfile?.dashboardStats?.pendingApplications ?? pendingApps.length,
    acceptedApplications:
      freelancerProfile?.dashboardStats?.acceptedApplications ?? acceptedApps.length,
    totalEarnings:
      freelancerProfile?.dashboardStats?.totalEarnings ??
      freelancerProfile?.totalEarnings ??
      0,
    unreadNotifications:
      freelancerProfile?.dashboardStats?.unreadNotifications ?? unreadNotifCount,
    averageRating: freelancerProfile?.dashboardStats?.averageRating ?? 0,
    profileViews: freelancerProfile?.dashboardStats?.profileViews ?? 0,
  };

  const getClientName = (project) => {
    if (!project) return 'Client';
    // If clientId is a populated object
    if (project.clientId && typeof project.clientId === 'object') {
      return (
        project.clientId.companyName ||
        clientsMap[project.clientId.clientId || project.clientId._id] ||
        'Client'
      );
    }
    // If clientId is a string
    return clientsMap[project.clientId] || 'Client';
  };

  if (loading) {
    return (
      <div className="fl-dashboard">
        <div className="fl-loading-state">
          <div className="fl-spinner"></div>
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fl-dashboard">
      {error && (
        <div
          className="fl-error-banner"
          style={{
            padding: '12px 16px',
            background: '#fee2e2',
            color: '#991b1b',
            borderRadius: '8px',
            marginBottom: '16px',
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {!freelancerProfile && !error && (
        <div
          style={{
            padding: '14px 18px',
            background: '#FEF3C7',
            color: '#78350F',
            borderRadius: '10px',
            marginBottom: '16px',
            border: '1px solid #FDE68A',
          }}
        >
          ℹ️ Your freelancer profile hasn't been set up yet. Some data may not be
          visible until you complete your profile.
        </div>
      )}

      {/* Top Header */}
      <section className="fl-dash-header">
        <div>
          <h1 className="fl-dash-title">
            {getGreeting()}, {displayName} 👋
          </h1>
          <p className="fl-dash-subtitle">
            Here is your live project status and incoming application activity.
          </p>
        </div>
        <div className="fl-dash-actions">
          <Link to="/freelancer/browse-projects" className="fl-btn fl-btn-primary">
            🔍 Browse Projects
          </Link>
          <Link to="/freelancer/my-projects" className="fl-btn fl-btn-secondary">
            My Projects
          </Link>
        </div>
      </section>

      {/* Profile Snapshot Card */}
      <section className="fl-profile-snapshot">
        <div className="fl-snapshot-left">
          <div className="fl-snapshot-avatar">
            {freelancerProfile?.profileImage || user?.profileImage ? (
              <img
                src={freelancerProfile?.profileImage || user?.profileImage}
                alt={displayName}
              />
            ) : (
              displayName.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <div className="fl-snapshot-name">
              {displayName}
              {freelancerProfile?.isTopRated && (
                <span className="fl-top-rated-badge">⭐ Top Rated</span>
              )}
            </div>
            <div className="fl-snapshot-headline">
              {freelancerProfile?.headline || 'Freelance profile not completed'}
            </div>
            <div className="fl-snapshot-stats">
              <span>⭐ {Number(stats.averageRating).toFixed(1)}</span>
              <span>•</span>
              <span>{freelancerProfile?.jobSuccessRate || 0}% Job Success</span>
              <span>•</span>
              <span>{formatCurrency(freelancerProfile?.hourlyRate)}/hr</span>
              <span>•</span>
              <span>Response: {freelancerProfile?.responseTime || '—'}</span>
            </div>
          </div>
        </div>
        <div className="fl-snapshot-right">
          <div
            className={`fl-availability ${
              freelancerProfile?.isOpenToWork ? 'open' : 'closed'
            }`}
          >
            <span className="fl-status-dot"></span>
            {freelancerProfile?.isOpenToWork ? 'Open to work' : 'Offline'}
          </div>
          <Link to="/freelancer/profile" className="fl-btn-sm">
            My Profile
          </Link>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="fl-stats-grid">
        <div className="fl-stat-card border-green">
          <span className="fl-stat-label">Active Projects</span>
          <span className="fl-stat-value">{stats.activeProjects}</span>
        </div>
        <div className="fl-stat-card border-purple">
          <span className="fl-stat-label">Completed Projects</span>
          <span className="fl-stat-value">{stats.completedProjects}</span>
        </div>
        <div className="fl-stat-card border-blue">
          <span className="fl-stat-label">Pending Applications</span>
          <span className="fl-stat-value">{stats.pendingApplications}</span>
        </div>
        <div className="fl-stat-card border-amber">
          <span className="fl-stat-label">Accepted Applications</span>
          <span className="fl-stat-value">{stats.acceptedApplications}</span>
        </div>
        <div className="fl-stat-card border-indigo">
          <span className="fl-stat-label">Total Earnings</span>
          <span className="fl-stat-value">{formatCurrency(stats.totalEarnings)}</span>
        </div>
        <div className="fl-stat-card border-pink">
          <span className="fl-stat-label">Profile Views</span>
          <span className="fl-stat-value">{stats.profileViews}</span>
        </div>
      </section>

      {/* Layout */}
      <div className="fl-dash-layout">
        <div className="fl-dash-main">
          {/* Active Projects */}
          <section className="fl-card">
            <div className="fl-card-head">
              <h2>Active Projects</h2>
              <Link to="/freelancer/my-projects" className="fl-link">
                View all →
              </Link>
            </div>

            {activeProjects.length === 0 ? (
              <div className="fl-inline-empty">No active projects</div>
            ) : (
              <div className="fl-project-list">
                {activeProjects.slice(0, 4).map((project) => (
                  <div
                    key={project.projectId || project._id}
                    className="fl-project-item"
                  >
                    <div className="fl-project-header">
                      <div>
                        <h3 className="fl-project-title">{project.title}</h3>
                        <div className="fl-project-meta">
                          <span>
                            Client: <strong>{getClientName(project)}</strong>
                          </span>
                        </div>
                      </div>
                      <StatusBadge status={project.status} />
                    </div>

                    <div className="fl-project-metrics">
                      <div>
                        <span className="fl-sub-label">Budget:</span>{' '}
                        <strong>{formatCurrency(project.budget)}</strong>
                      </div>
                      <div>
                        <span className="fl-sub-label">Deadline:</span>{' '}
                        <strong>{formatDate(project.deadline)}</strong>
                      </div>
                    </div>

                    <div className="fl-progress-wrap">
                      <div className="fl-progress-bar">
                        <div
                          className="fl-progress-fill"
                          style={{ width: `${project.progress || 0}%` }}
                        />
                      </div>
                      <span className="fl-progress-text">
                        {project.progress || 0}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Recent Applications */}
          <section className="fl-card">
            <div className="fl-card-head">
              <h2>Recent Applications</h2>
              <Link to="/freelancer/notifications" className="fl-link">
                View all →
              </Link>
            </div>

            {applications.length === 0 ? (
              <div className="fl-inline-empty">No applications yet</div>
            ) : (
              <div className="fl-app-list">
                {applications.slice(0, 4).map((app) => {
                  // Find matching project for title & client
                  const project =
                    typeof app.projectId === 'object'
                      ? app.projectId
                      : projects.find((p) => eqId(p, app.projectId));

                  const projectTitle = project?.title || 'Project';
                  const clientName = project ? getClientName(project) : 'Client';

                  return (
                    <div
                      key={app.applicationId || app._id}
                      className="fl-app-item"
                    >
                      <div className="fl-app-details">
                        <h4 className="fl-app-title">{projectTitle}</h4>
                        <p className="fl-app-meta">
                          <span>
                            Client: <strong>{clientName}</strong>
                          </span>
                          <span>•</span>
                          <span>{formatCurrency(app.proposedBudget)}</span>
                          <span>•</span>
                          <span>
                            Applied {formatDate(app.appliedAt || app.createdAt)}
                          </span>
                        </p>
                      </div>
                      <StatusBadge status={app.status} />
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Sidebar */}
        <div className="fl-dash-sidebar">
          {/* Earnings */}
          <section className="fl-card">
            <div className="fl-card-head">
              <h2>Earnings Overview</h2>
            </div>
            <div className="fl-earnings-box">
              <span className="fl-earnings-label">Total Earnings</span>
              <span className="fl-earnings-figure">
                {formatCurrency(stats.totalEarnings)}
              </span>
              <span className="fl-earnings-sub">
                From {stats.completedProjects} completed projects
              </span>
            </div>
            <div className="fl-earnings-details">
              <div className="fl-earnings-row">
                <span>Success Rate</span>
                <strong>{freelancerProfile?.jobSuccessRate || 0}%</strong>
              </div>
              <div className="fl-earnings-row">
                <span>Avg. Project Value</span>
                <strong>
                  {stats.completedProjects > 0
                    ? formatCurrency(stats.totalEarnings / stats.completedProjects)
                    : '$0'}
                </strong>
              </div>
              <div className="fl-earnings-row">
                <span>Response Time</span>
                <strong>{freelancerProfile?.responseTime || '—'}</strong>
              </div>
              <div className="fl-earnings-row">
                <span>Availability</span>
                <strong>{freelancerProfile?.availability || '—'}</strong>
              </div>
            </div>
          </section>

          {/* Notifications */}
          <section className="fl-card">
            <div className="fl-card-head">
              <h2>
                Notifications
                {stats.unreadNotifications > 0 && (
                  <span className="fl-count-tag">{stats.unreadNotifications}</span>
                )}
              </h2>
              <Link to="/freelancer/notifications" className="fl-link">
                View all →
              </Link>
            </div>

            {notifications.length === 0 ? (
              <div className="fl-inline-empty">No notifications</div>
            ) : (
              <div className="fl-notif-list">
                {notifications.map((notif) => (
                  <div
                    key={notif.notificationId || notif._id}
                    className={`fl-notif-item ${!notif.isRead ? 'unread' : ''}`}
                  >
                    <div className="fl-notif-dot"></div>
                    <div className="fl-notif-body">
                      <div className="fl-notif-title">{notif.title}</div>
                      <p className="fl-notif-message">{notif.message}</p>
                      <span className="fl-notif-time">
                        {timeAgo(notif.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Quick Actions */}
          <section className="fl-card">
            <div className="fl-card-head">
              <h2>Quick Actions</h2>
            </div>
            <div className="fl-quick-grid">
              <Link to="/freelancer/browse-projects" className="fl-quick-item">
                <span className="fl-quick-icon bg-indigo">🔍</span>
                <div>
                  <div className="fl-quick-title">Browse Projects</div>
                  <div className="fl-quick-desc">Find new opportunities</div>
                </div>
              </Link>
              <Link to="/freelancer/my-projects" className="fl-quick-item">
                <span className="fl-quick-icon bg-green">📋</span>
                <div>
                  <div className="fl-quick-title">My Projects</div>
                  <div className="fl-quick-desc">Track active work</div>
                </div>
              </Link>
              <Link to="/freelancer/notifications" className="fl-quick-item">
                <span className="fl-quick-icon bg-amber">🔔</span>
                <div>
                  <div className="fl-quick-title">Notifications</div>
                  <div className="fl-quick-desc">Application updates</div>
                </div>
              </Link>
              <Link to="/freelancer/profile" className="fl-quick-item">
                <span className="fl-quick-icon bg-purple">👤</span>
                <div>
                  <div className="fl-quick-title">My Profile</div>
                  <div className="fl-quick-desc">Update details & skills</div>
                </div>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}