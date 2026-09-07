// src/components/ClientComponents/Applications/Applications.jsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import API from '../../../api/axios';
import './Applications.css';

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

const StatusBadge = ({ status }) => {
  const map = {
    pending: { label: 'Pending', cls: 'badge-yellow' },
    accepted: { label: 'Accepted', cls: 'badge-green' },
    rejected: { label: 'Rejected', cls: 'badge-red' },
    withdrawn: { label: 'Withdrawn', cls: 'badge-gray' },
  };
  const badge = map[status] || { label: status || 'Pending', cls: 'badge-gray' };
  return <span className={`cl-badge ${badge.cls}`}>{badge.label}</span>;
};

/* ---------- Strict ID Mapping Helpers ---------- */
const extractData = (res) => {
  if (!res?.data) return [];
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.data.data)) return res.data.data;
  if (Array.isArray(res.data.results)) return res.data.results;
  return [];
};

// Extracts custom primary key schema values cleanly
const getRawId = (v) => {
  if (!v) return null;
  if (typeof v === 'string') return v;
  if (typeof v === 'object') {
    return (
      v.applicationId ||
      v.projectId ||
      v.freelancerId ||
      v.clientId ||
      v.userId ||
      v._id ||
      v.id ||
      null
    );
  }
  return String(v);
};

// Performs exact, type-insensitive comparison across custom IDs
const eqId = (a, b) => {
  const idA = getRawId(a);
  const idB = getRawId(b);
  if (!idA || !idB) return false;
  return String(idA) === String(idB);
};

export default function Applications() {
  const { user } = useAuth();

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [minBudget, setMinBudget] = useState('');
  const [maxBudget, setMaxBudget] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  // Modals
  const [selectedApp, setSelectedApp] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);

  const currentUserId = user?.userId || user?._id || user?.id;

  /* ---------- Fetch Applications & Match In-Memory ---------- */
  const fetchApplicationsData = useCallback(async () => {
    if (!currentUserId) return;

    try {
      setLoading(true);
      setError('');

      console.log('🔍 Executing parallel bulk collections fetch for Client User:', currentUserId);

      // Fetch all collections in parallel to prevent query filter failures on the backend
      const [clientsRes, projectsRes, appsRes, freelancersRes, usersRes] = await Promise.all([
        API.get('/clients').catch(() => ({ data: [] })),
        API.get('/projects').catch(() => ({ data: [] })),
        API.get('/applications').catch(() => ({ data: [] })),
        API.get('/freelancers').catch(() => ({ data: [] })),
        API.get('/users').catch(() => ({ data: [] })),
      ]);

      const allClients = extractData(clientsRes);
      const allProjects = extractData(projectsRes);
      const allApps = extractData(appsRes);
      const allFreelancers = extractData(freelancersRes);
      const allUsers = extractData(usersRes);

      // 1. Match logged-in user to their unique Client profile document
      const currentClientDoc = allClients.find((c) => eqId(c.userId, currentUserId));
      const clientId = currentClientDoc?.clientId || currentClientDoc?._id;

      if (!clientId) {
        console.warn('⚠️ No unique Client profile found in database matching:', currentUserId);
        setError('Your Client profile could not be verified. Please complete your registration.');
        setLoading(false);
        return;
      }
      console.log('✅ Resolved Client ID:', clientId);

      // 2. Filter Client's projects in memory
      const myProjects = allProjects.filter((p) => eqId(p.clientId, clientId));
      const projectsMap = new Map(myProjects.map((p) => [String(p.projectId || p._id), p]));
      console.log('📁 Client projects indexed in memory:', projectsMap.size);

      // 3. Filter applications for this client's projects
      const incomingAppsRaw = allApps.filter((app) => {
        const pRefId = getRawId(app.projectId);
        return pRefId && projectsMap.has(String(pRefId));
      });
      console.log('📨 Matched incoming proposals:', incomingAppsRaw.length);

      // 4. Map deep properties from matching collections with zero extra API requests
      const resolvedApps = incomingAppsRaw.map((app) => {
        const projId = getRawId(app.projectId);
        const project = projectsMap.get(String(projId));
        const projectTitle = project?.title || 'Unknown Project';

        const fid = getRawId(app.freelancerId);
        const freelancerDoc = allFreelancers.find(
          (f) => eqId(f.freelancerId, fid) || eqId(f._id, fid)
        );
        const freelancerUserDoc = freelancerDoc
          ? allUsers.find((u) => eqId(u, freelancerDoc.userId))
          : null;

        const freelancerInfo = {
          name: freelancerUserDoc
            ? `${freelancerUserDoc.firstName || ''} ${freelancerUserDoc.lastName || ''}`.trim() ||
              freelancerUserDoc.username
            : 'Active Freelancer',
          headline: freelancerDoc?.headline || 'Professional Freelancer',
          rating: freelancerDoc?.dashboardStats?.averageRating || freelancerDoc?.rating || 5.0,
          jobSuccessRate: freelancerDoc?.jobSuccessRate || 100,
          hourlyRate: freelancerDoc?.hourlyRate || 0,
          profileImage: freelancerUserDoc?.profileImage || freelancerDoc?.profileImage || '',
        };

        const resolvedAppId = app.applicationId || app._id || app.id;

        return {
          applicationId: resolvedAppId,
          projectId: projId,
          projectTitle,
          freelancerId: fid,
          freelancer: freelancerInfo,
          coverLetter: app.coverLetter || '',
          proposedBudget: app.proposedBudget || 0,
          budgetType: app.budgetType || 'fixed',
          estimatedDuration: app.estimatedDuration || 1,
          durationUnit: app.durationUnit || 'weeks',
          appliedAt: app.appliedAt || app.createdAt,
          status: app.status || 'pending',
        };
      });

      setApplications(resolvedApps);
    } catch (err) {
      console.error('Error fetching applications context:', err);
      setError('Failed to load project applications. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchApplicationsData();
  }, [fetchApplicationsData]);

  /* ---------- Project List for Filter ---------- */
  const filteredProjectList = useMemo(() => {
    const map = new Map();
    applications.forEach((a) => map.set(a.projectId, a.projectTitle));
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [applications]);

  /* ---------- Filtered & Sorted ---------- */
  const filteredApps = useMemo(() => {
    return applications
      .filter((app) => {
        if (search.trim()) {
          const q = search.toLowerCase();
          if (
            !app.freelancer.name.toLowerCase().includes(q) &&
            !app.projectTitle.toLowerCase().includes(q) &&
            !app.coverLetter.toLowerCase().includes(q)
          )
            return false;
        }
        if (projectFilter !== 'all' && !eqId(app.projectId, projectFilter)) return false;
        if (statusFilter !== 'all' && app.status !== statusFilter) return false;
        if (minBudget && app.proposedBudget < Number(minBudget)) return false;
        if (maxBudget && app.proposedBudget > Number(maxBudget)) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return new Date(b.appliedAt) - new Date(a.appliedAt);
        if (sortBy === 'oldest') return new Date(a.appliedAt) - new Date(b.appliedAt);
        if (sortBy === 'budget-high') return b.proposedBudget - a.proposedBudget;
        if (sortBy === 'budget-low') return a.proposedBudget - b.proposedBudget;
        return 0;
      });
  }, [applications, search, projectFilter, statusFilter, minBudget, maxBudget, sortBy]);

  /* ---------- Accept / Reject Actions ---------- */
  const handleStatusChange = async (appId, newStatus) => {
    setActionSubmitting(true);
    setError('');

    const targetApp = applications.find((a) => eqId(a.applicationId, appId));
    if (!targetApp) {
      console.error("Critical: Selection not mapped in state memory.");
      setActionSubmitting(false);
      return;
    }

    const exactAppId = getRawId(targetApp.applicationId);
    const exactProjId = getRawId(targetApp.projectId);
    const exactFreelancerId = getRawId(targetApp.freelancerId);

    console.log(`Sending PUT to /applications/${exactAppId} status: ${newStatus}`);

    try {
      if (newStatus === 'rejected') {
        // 1. PUT application rejection status update
        await API.put(`/applications/${exactAppId}`, {
          status: 'rejected',
          clientMessage: rejectReason.trim(),
          respondedAt: new Date(),
        });
      } else if (newStatus === 'accepted') {
        // 1. PUT application accept status update
        await API.put(`/applications/${exactAppId}`, {
          status: 'accepted',
          respondedAt: new Date(),
        });

        // 2. PUT project progress status configuration update
        try {
          await API.put(`/projects/${exactProjId}`, {
            status: 'in-progress',
            freelancerId: exactFreelancerId,
            startDate: new Date(),
          });
        } catch (projErr) {
          console.warn("Schema does not support 'in-progress' status path. Standardizing structure:", projErr.message);
          await API.put(`/projects/${exactProjId}`, {
            status: 'in_progress',
            freelancerId: exactFreelancerId,
            startDate: new Date(),
          });
        }
      }

      // Synchronize in-memory applications state array
      setApplications((prev) =>
        prev.map((app) => (eqId(app.applicationId, appId) ? { ...app, status: newStatus } : app))
      );

      setConfirmAction(null);
      setSelectedApp(null);
      setRejectReason('');
    } catch (err) {
      console.error(`Failed to execute proposal state mutation:`, err);
      setError(err.response?.data?.message || 'Database update rejected. Check server state logs.');
    } finally {
      setActionSubmitting(false);
    }
  };

  /* ---------- Loading Screen ---------- */
  if (loading) {
    return (
      <div className="cl-apps-loading">
        <div className="cl-apps-spinner" />
        <p>Loading incoming applications...</p>
      </div>
    );
  }

  return (
    <div className="cl-apps-page">
      {/* Page Header */}
      <div className="cl-apps-hero">
        <div className="cl-apps-hero-inner">
          <h1>Applications</h1>
          <p>Review freelancer applications and find the right person for your projects.</p>
        </div>
      </div>

      <div className="cl-apps-wrap">
        {error && (
          <div
            className="cl-apps-alert"
            style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* Filter Toolbar */}
        <div className="cl-filter-bar">
          <div className="cl-filter-row">
            <div className="cl-search-box">
              <input
                type="text"
                placeholder="Search by freelancer name, project, or keyword..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="newest">Sort by: Newest First</option>
              <option value="oldest">Sort by: Oldest First</option>
              <option value="budget-high">Budget: High to Low</option>
              <option value="budget-low">Budget: Low to High</option>
            </select>
          </div>

          <div className="cl-filter-row secondary">
            <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
              <option value="all">All Projects</option>
              {filteredProjectList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>

            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>

            <div className="cl-budget-inputs">
              <input
                type="number"
                placeholder="Min $"
                value={minBudget}
                onChange={(e) => setMinBudget(e.target.value)}
              />
              <span>-</span>
              <input
                type="number"
                placeholder="Max $"
                value={maxBudget}
                onChange={(e) => setMaxBudget(e.target.value)}
              />
            </div>

            {(search ||
              projectFilter !== 'all' ||
              statusFilter !== 'all' ||
              minBudget ||
              maxBudget) && (
              <button
                type="button"
                className="cl-btn-sm"
                onClick={() => {
                  setSearch('');
                  setProjectFilter('all');
                  setStatusFilter('all');
                  setMinBudget('');
                  setMaxBudget('');
                }}
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        <div className="cl-count-label">
          Showing <strong>{filteredApps.length}</strong> of <strong>{applications.length}</strong>{' '}
          proposals
        </div>

        {/* Proposals Feed */}
        {filteredApps.length === 0 ? (
          <div className="cl-empty-box">
            <div className="cl-empty-emoji">📭</div>
            <h3>No applications match your criteria</h3>
            <p>Try adjusting your search query or removing active filters.</p>
          </div>
        ) : (
          <div className="cl-cards-list">
            {filteredApps.map((app) => (
              <div key={app.applicationId} className="cl-proposal-card">
                <div className="cl-proposal-head">
                  <div className="cl-freelancer-block">
                    <div className="cl-avatar-circle">
                      {app.freelancer.profileImage ? (
                        <img src={app.freelancer.profileImage} alt={app.freelancer.name} />
                      ) : (
                        app.freelancer.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <h3 className="cl-freelancer-title">{app.freelancer.name}</h3>
                      <p className="cl-freelancer-tagline">{app.freelancer.headline}</p>
                      <div className="cl-stats-inline">
                        <span>⭐ {app.freelancer.rating.toFixed(1)}</span>
                        <span>•</span>
                        <span>{app.freelancer.jobSuccessRate}% Job Success</span>
                      </div>
                    </div>
                  </div>
                  <StatusBadge status={app.status} />
                </div>

                <div className="cl-project-badge-row">
                  <span className="cl-tag-label">Project:</span>
                  <strong>{app.projectTitle}</strong>
                </div>

                <p className="cl-cover-snippet">{app.coverLetter}</p>

                <div className="cl-proposal-metrics">
                  <div>
                    <span className="metric-title">Proposed Budget</span>
                    <span className="metric-value">{formatCurrency(app.proposedBudget)}</span>
                    <span className="metric-sub">
                      {app.budgetType === 'fixed' ? 'Fixed Price' : 'Hourly'}
                    </span>
                  </div>
                  <div>
                    <span className="metric-title">Estimated Duration</span>
                    <span className="metric-value">
                      {app.estimatedDuration} {app.durationUnit}
                    </span>
                  </div>
                  <div>
                    <span className="metric-title">Applied Date</span>
                    <span className="metric-value">{formatDate(app.appliedAt)}</span>
                  </div>
                </div>

                <div className="cl-proposal-actions">
                  <button
                    type="button"
                    className="cl-btn cl-btn-secondary"
                    onClick={() => setSelectedApp(app)}
                  >
                    View Details
                  </button>

                  {app.status === 'pending' && (
                    <>
                      <button
                        type="button"
                        className="cl-btn cl-btn-danger"
                        onClick={() => setConfirmAction({ type: 'reject', app })}
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        className="cl-btn cl-btn-primary"
                        onClick={() => setConfirmAction({ type: 'accept', app })}
                      >
                        Accept Proposal
                      </button>
                    </>
                  )}

                  {app.status === 'accepted' && (
                    <Link to="/client/my-projects" className="cl-btn cl-btn-primary">
                      View Project
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Details Drawer Modal */}
      {selectedApp && (
        <div className="cl-modal-overlay" onClick={() => setSelectedApp(null)}>
          <div className="cl-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="cl-modal-header">
              <h2>Proposal Details</h2>
              <button className="cl-modal-close-btn" onClick={() => setSelectedApp(null)}>
                ×
              </button>
            </div>

            <div className="cl-modal-content">
              <div className="cl-modal-profile">
                <div className="cl-avatar-circle lg">
                  {selectedApp.freelancer.profileImage ? (
                    <img
                      src={selectedApp.freelancer.profileImage}
                      alt={selectedApp.freelancer.name}
                    />
                  ) : (
                    selectedApp.freelancer.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <h3>{selectedApp.freelancer.name}</h3>
                  <p>{selectedApp.freelancer.headline}</p>
                  <div className="cl-stats-inline">
                    <span>⭐ {selectedApp.freelancer.rating.toFixed(1)}</span>
                    <span>•</span>
                    <span>{selectedApp.freelancer.jobSuccessRate}% Job Success</span>
                    <span>•</span>
                    <span>{formatCurrency(selectedApp.freelancer.hourlyRate)}/hr</span>
                  </div>
                </div>
              </div>

              <div className="cl-modal-section">
                <span className="cl-section-tag">Project</span>
                <h4>{selectedApp.projectTitle}</h4>
              </div>

              <div className="cl-modal-section">
                <span className="cl-section-tag">Cover Letter</span>
                <p className="cl-modal-cover">{selectedApp.coverLetter}</p>
              </div>

              <div className="cl-modal-grid">
                <div>
                  <span className="cl-section-tag">Proposed Budget</span>
                  <strong>{formatCurrency(selectedApp.proposedBudget)}</strong>
                </div>
                <div>
                  <span className="cl-section-tag">Duration</span>
                  <strong>
                    {selectedApp.estimatedDuration} {selectedApp.durationUnit}
                  </strong>
                </div>
                <div>
                  <span className="cl-section-tag">Submission Date</span>
                  <strong>{formatDate(selectedApp.appliedAt)}</strong>
                </div>
                <div>
                  <span className="cl-section-tag">Current Status</span>
                  <div>
                    <StatusBadge status={selectedApp.status} />
                  </div>
                </div>
              </div>
            </div>

            <div className="cl-modal-footer">
              <button className="cl-btn cl-btn-secondary" onClick={() => setSelectedApp(null)}>
                Close
              </button>
              {selectedApp.status === 'pending' && (
                <>
                  <button
                    className="cl-btn cl-btn-danger"
                    onClick={() => setConfirmAction({ type: 'reject', app: selectedApp })}
                  >
                    Reject
                  </button>
                  <button
                    className="cl-btn cl-btn-primary"
                    onClick={() => setConfirmAction({ type: 'accept', app: selectedApp })}
                  >
                    Accept
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Action Modal */}
      {confirmAction && (
        <div
          className="cl-modal-overlay"
          onClick={() => !actionSubmitting && setConfirmAction(null)}
        >
          <div className="cl-modal-card sm" onClick={(e) => e.stopPropagation()}>
            <div className="cl-modal-header">
              <h2>
                {confirmAction.type === 'accept'
                  ? 'Accept Freelancer Proposal?'
                  : 'Reject Application?'}
              </h2>
              <button
                className="cl-modal-close-btn"
                onClick={() => !actionSubmitting && setConfirmAction(null)}
                disabled={actionSubmitting}
              >
                ×
              </button>
            </div>
            <div className="cl-modal-content">
              <p>
                {confirmAction.type === 'accept'
                  ? `Are you sure you want to assign "${confirmAction.app.projectTitle}" to ${confirmAction.app.freelancer.name}?`
                  : `Are you sure you want to decline ${confirmAction.app.freelancer.name}'s proposal?`}
              </p>

              {confirmAction.type === 'reject' && (
                <div className="cl-reject-block">
                  <label htmlFor="reject-reason">Optional Feedback for Freelancer:</label>
                  <textarea
                    id="reject-reason"
                    rows="3"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="We decided to go in a different direction..."
                    disabled={actionSubmitting}
                  />
                </div>
              )}
            </div>
            <div className="cl-modal-footer">
              <button
                className="cl-btn cl-btn-secondary"
                onClick={() => setConfirmAction(null)}
                disabled={actionSubmitting}
              >
                Cancel
              </button>
              <button
                className={`cl-btn ${
                  confirmAction.type === 'accept' ? 'cl-btn-primary' : 'cl-btn-danger'
                }`}
                disabled={actionSubmitting}
                onClick={() =>
                  handleStatusChange(
                    confirmAction.app.applicationId,
                    confirmAction.type === 'accept' ? 'accepted' : 'rejected'
                  )
                }
              >
                {actionSubmitting
                  ? 'Processing...'
                  : confirmAction.type === 'accept'
                  ? 'Yes, Accept'
                  : 'Yes, Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}