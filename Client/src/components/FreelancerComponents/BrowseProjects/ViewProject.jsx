import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import API from '../../../api/axios';
import './ViewProject.css';

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

const StatusPill = ({ status }) => {
  const map = {
    draft: 'vp-pill-gray',
    open: 'vp-pill-green',
    active: 'vp-pill-blue',
    completed: 'vp-pill-purple',
    cancelled: 'vp-pill-red',
    pending: 'vp-pill-amber',
    accepted: 'vp-pill-green',
    rejected: 'vp-pill-red',
  };
  return <span className={`vp-pill ${map[status] || 'vp-pill-gray'}`}>{status}</span>;
};

export default function ViewProject({ projectId, onBack, onApply }) {
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [category, setCategory] = useState(null);
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [myProposal, setMyProposal] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetchProjectDetails = async () => {
      try {
        setLoading(true);
        setError('');
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // 1. Fetch main project structure
        const pRes = await API.get(`/projects/${projectId}`);
        const p = pRes.data?.data || pRes.data;
        setProject(p);

        const catId = p.categoryId?._id || p.categoryId;
        const cliId = p.clientId?._id || p.clientId;

        const apiTasks = [];

        // 2. Fetch category details
        if (catId) {
          apiTasks.push(
            API.get(`/categories/${catId}`)
              .then((r) => setCategory(r.data?.data || r.data))
              .catch(() => setCategory(null))
          );
        }

        // 3. Fetch client profile
        if (cliId) {
          apiTasks.push(
            API.get(`/clients/${cliId}`)
              .then(async (r) => {
                const cData = r.data?.data || r.data;
                const uid = cData?.userId?._id || cData?.userId;
                let uData = null;
                if (uid) {
                  try {
                    const uRes = await API.get(`/users/${uid}`);
                    uData = uRes.data?.data || uRes.data;
                  } catch {
                    /* Ignored silently */
                  }
                }
                setClient({ ...cData, user: uData });
              })
              .catch(() => setClient(null))
          );
        }

        // 4. Check if current freelancer already submitted a proposal
        const currentUserId = user.userId || user._id;
        apiTasks.push(
          API.get('/freelancers')
            .then(async (fRes) => {
              const freelancersList = fRes.data?.data || fRes.data || [];
              const freelancer = freelancersList.find(
                (f) => f.userId === currentUserId || f.userId?._id === currentUserId
              );
              const freelancerId = freelancer?.freelancerId || freelancer?._id;

              if (freelancerId) {
                const appsRes = await API.get('/applications');
                const appsList = appsRes.data?.data || appsRes.data || [];
                const proposal = appsList.find(
                  (app) =>
                    (app.projectId?._id === projectId || app.projectId === projectId) &&
                    (app.freelancerId?._id === freelancerId || app.freelancerId === freelancerId)
                );
                setMyProposal(proposal);
              }
            })
            .catch(() => setMyProposal(null))
        );

        await Promise.all(apiTasks);
      } catch (err) {
        console.error('Failed to load project:', err);
        setError('Error retrieving project details.');
      } finally {
        setLoading(false);
      }
    };

    if (projectId) fetchProjectDetails();
  }, [projectId, user]);

  if (loading) {
    return (
      <div className="vp-loading">
        <div className="vp-spinner" />
        <p>Loading project details...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="vp-error">
        <div className="vp-error-icon">⚠️</div>
        <h3>{error || 'Project not found'}</h3>
        <button className="vp-btn vp-btn-primary" onClick={onBack}>
          ← Back to Marketplace
        </button>
      </div>
    );
  }

  const dLeft = daysLeft(project.deadline);
  const tasksArr = project.tasks || [];
  const clientName =
    client?.companyName ||
    (client?.user ? `${client.user.firstName || ''} ${client.user.lastName || ''}`.trim() : 'Client');

  return (
    <div className="vp-page">
      <div className="vp-back-bar">
        <button className="vp-back-btn" onClick={onBack}>
          ← Back to Marketplace
        </button>
        {myProposal ? (
          <span className="vp-access-tag applied">Proposal Submitted Status: {myProposal.status}</span>
        ) : (
          <span className="vp-access-tag eligible">Available for Bidding</span>
        )}
      </div>

      {/* Hero Header */}
      <div className="vp-hero">
        <div className="vp-hero-inner">
          <div className="vp-hero-badges">
            <span className="vp-badge-cat">{category?.name || 'General'}</span>
            <StatusPill status={project.status} />
            {dLeft !== null && dLeft >= 0 && dLeft <= 7 && <span className="vp-pill vp-pill-red">Urgent</span>}
          </div>
          <h1>{project.title}</h1>
          <div className="vp-hero-meta">
            <span>📅 Posted {formatDate(project.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Stats Summary Panel */}
      <div className="vp-stats-strip">
        <div className="vp-stat">
          <span className="vp-stat-label">Project Budget</span>
          <span className="vp-stat-value green">{formatCurrency(project.budget)}</span>
        </div>
        <div className="vp-stat">
          <span className="vp-stat-label">Timeline Limit</span>
          <span className="vp-stat-value">{formatDate(project.deadline)}</span>
        </div>
        <div className="vp-stat">
          <span className="vp-stat-label">Days Left</span>
          <span className="vp-stat-value">{dLeft === null ? '—' : dLeft < 0 ? 'Expired' : `${dLeft} days`}</span>
        </div>
        <div className="vp-stat">
          <span className="vp-stat-label">Your Status</span>
          <span className="vp-stat-value">
            {myProposal ? <span className="vp-applied-text">{myProposal.status}</span> : 'Not Applied'}
          </span>
        </div>
      </div>

      {/* Application CTA Bar */}
      {!myProposal && project.status === 'open' ? (
        <div className="vp-apply-action-bar">
          <div className="vp-action-text">
            <strong>Ready to apply?</strong> Custom proposals let you pitch your services, bid your rate, and specify delivery estimates.
          </div>
          <button className="vp-btn vp-btn-primary" onClick={() => onApply(projectId)}>
            Submit Proposal
          </button>
        </div>
      ) : myProposal ? (
        <div className="vp-applied-action-bar">
          <span>✓</span>
          <div>
            <strong>Proposal submitted!</strong> You proposed a budget of{' '}
            <strong>{formatCurrency(myProposal.proposedBudget)}</strong> on this project.
          </div>
        </div>
      ) : null}

      {/* Tab Selectors */}
      <div className="vp-tabs">
        <button className={`vp-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
          Overview
        </button>
        <button className={`vp-tab ${activeTab === 'tasks' ? 'active' : ''}`} onClick={() => setActiveTab('tasks')}>
          Scope of Work ({tasksArr.length})
        </button>
        {myProposal && (
          <button className={`vp-tab ${activeTab === 'proposal' ? 'active' : ''}`} onClick={() => setActiveTab('proposal')}>
            My Proposal
          </button>
        )}
      </div>

      <div className="vp-layout">
        <div className="vp-main">
          {activeTab === 'overview' && (
            <section className="vp-card">
              <h2>Project Description</h2>
              <p className="vp-description">{project.description}</p>
            </section>
          )}

          {activeTab === 'tasks' && (
            <section className="vp-card">
              <h2>Project Tasks & Deliverables</h2>
              {tasksArr.length === 0 ? (
                <div className="vp-empty-inline">
                  <span>📋</span>
                  <p>No subtasks have been structured for this project brief yet.</p>
                </div>
              ) : (
                <div className="vp-task-list">
                  {tasksArr.map((task, idx) => (
                    <div key={task.taskId || idx} className="vp-task-item">
                      <div className="vp-task-head">
                        <div>
                          <h4>{task.title}</h4>
                          <p className="vp-task-desc">{task.description}</p>
                        </div>
                        <div className="vp-task-badges">
                          <StatusPill status={task.status} />
                          {task.priority && <span className={`vp-priority vp-prio-${task.priority}`}>{task.priority}</span>}
                        </div>
                      </div>

                      <div className="vp-task-metrics">
                        {task.budget > 0 && (
                          <div>
                            <span>Subtask Budget</span>
                            <strong>
                              {formatCurrency(task.budget)} {task.budgetType && `(${task.budgetType})`}
                            </strong>
                          </div>
                        )}
                        {task.deadline && (
                          <div>
                            <span>Target Date</span>
                            <strong>{formatDate(task.deadline)}</strong>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeTab === 'proposal' && myProposal && (
            <section className="vp-card">
              <h2>My Proposal Details</h2>
              <div className="vp-proposal-details-box">
                <div className="vp-proposal-row">
                  <span>Bid Amount:</span>
                  <strong>{formatCurrency(myProposal.proposedBudget)}</strong>
                </div>
                <div className="vp-proposal-row">
                  <span>Billing Model:</span>
                  <strong>{myProposal.budgetType === 'fixed' ? 'Fixed Price' : 'Hourly rate'}</strong>
                </div>
                <div className="vp-proposal-row">
                  <span>Expected Delivery:</span>
                  <strong>
                    {myProposal.estimatedDuration} {myProposal.durationUnit}
                  </strong>
                </div>
                <div className="vp-proposal-row">
                  <span>Submitted On:</span>
                  <strong>{formatDate(myProposal.appliedAt || myProposal.createdAt)}</strong>
                </div>
                {myProposal.clientMessage && (
                  <div className="vp-proposal-feedback">
                    <strong>Client Feedback Message:</strong>
                    <p>{myProposal.clientMessage}</p>
                  </div>
                )}
                <div className="vp-proposal-section">
                  <strong>My Pitch / Cover Letter:</strong>
                  <p className="vp-cover-text">{myProposal.coverLetter}</p>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <aside className="vp-sidebar">
          {/* Client Info */}
          <div className="vp-card vp-side-card">
            <h3>About the Client</h3>
            <div className="vp-party">
              <div className="vp-party-avatar">
                {client?.companyLogo || client?.user?.profileImage ? (
                  <img src={client.companyLogo || client.user.profileImage} alt={clientName} />
                ) : (
                  clientName.charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <h4>{clientName}</h4>
                {client?.jobTitle && <p>{client.jobTitle}</p>}
                {client?.isVerified && <span className="vp-verified">✓ Verified Client</span>}
              </div>
            </div>

            <div className="vp-side-list">
              {client?.location && (
                <div>
                  <span>Location</span>
                  <strong>{client.location}</strong>
                </div>
              )}
              {client?.industry && (
                <div>
                  <span>Industry</span>
                  <strong>{client.industry}</strong>
                </div>
              )}
              <div>
                <span>Jobs Posted</span>
                <strong>{client?.totalProjectsPosted ?? 0}</strong>
              </div>
              <div>
                <span>Completed</span>
                <strong>{client?.totalProjectsCompleted ?? 0}</strong>
              </div>
              {client?.website && (
                <div>
                  <span>Website</span>
                  <a href={client.website} target="_blank" rel="noopener noreferrer">
                    Visit Site →
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Project Summary */}
          <div className="vp-card vp-side-card">
            <h3>Contract Summary</h3>
            <div className="vp-side-list">
              <div>
                <span>Contract Status</span>
                <StatusPill status={project.status} />
              </div>
              <div>
                <span>Starting Budget</span>
                <strong>{formatCurrency(project.budget)}</strong>
              </div>
              <div>
                <span>Start Window</span>
                <strong>{formatDate(project.startDate)}</strong>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}