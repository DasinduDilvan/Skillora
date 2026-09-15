// src/components/FreelancerComponents/Profile/Profile.jsx
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import API from '../../../api/axios';
import './Profile.css';

/* ══════════════════════════════════════════
   HELPERS
══════════════════════════════════════════ */
const asArray = (res) => {
  const d = res?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.results)) return d.results;
  return [];
};

const getId = (obj) => {
  if (!obj) return null;
  if (typeof obj === 'string') return obj;
  return obj.userId || obj.freelancerId || obj.clientId || obj._id || obj.id || null;
};

const idsMatch = (a, b) => {
  const idA = typeof a === 'string' ? a : getId(a);
  const idB = typeof b === 'string' ? b : getId(b);
  if (!idA || !idB) return false;
  return String(idA) === String(idB);
};

const money = (v) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(v || 0);

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '';

const fmtFull = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '';

const toArr = (v) => {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') return v.split(',').map((s) => s.trim()).filter(Boolean);
  return [];
};

const EMP_TYPES = ['Full-time', 'Part-time', 'Contract', 'Freelance', 'Internship'];
const AVAIL_OPTS = ['Full-time', 'Part-time', 'Hourly', 'Contract-based', 'Not Available'];

/* ══════════════════════════════════════════
   REUSABLE SUB-COMPONENTS
══════════════════════════════════════════ */

/* Modal */
function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null;
  return (
    <div className="pfp-overlay" onClick={onClose}>
      <div
        className={`pfp-modal${wide ? ' pfp-modal--wide' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pfp-modal__head">
          <h3>{title}</h3>
          <button className="pfp-modal__x" onClick={onClose}>×</button>
        </div>
        <div className="pfp-modal__body">{children}</div>
      </div>
    </div>
  );
}

/* Edit (pencil) button */
function PenBtn({ onClick, label }) {
  return (
    <button className="pfp-pen" onClick={onClick} title={label || 'Edit'}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
        <path d="m15 5 4 4" />
      </svg>
    </button>
  );
}

/* Delete (trash) button */
function TrashBtn({ onClick }) {
  return (
    <button className="pfp-trash" onClick={onClick} title="Delete">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      </svg>
    </button>
  );
}

/* Add (plus) button */
function PlusBtn({ onClick, label }) {
  return (
    <button className="pfp-plus" onClick={onClick}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2.5" strokeLinecap="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      {label}
    </button>
  );
}

/* ══════════════════════════════════════════
   MAIN PROFILE COMPONENT
══════════════════════════════════════════ */
export default function Profile() {
  const { user } = useAuth();
  const currentUserId = user?.userId || user?._id || user?.id;

  const [userData, setUserData] = useState(null);
  const [freelancerData, setFreelancerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  /* Modal states */
  const [introModal, setIntroModal] = useState(false);
  const [aboutModal, setAboutModal] = useState(false);
  const [expModal, setExpModal] = useState({ open: false, idx: null });
  const [eduModal, setEduModal] = useState({ open: false, idx: null });
  const [certModal, setCertModal] = useState({ open: false, idx: null });
  const [svcModal, setSvcModal] = useState({ open: false, idx: null });
  const [folioModal, setFolioModal] = useState({ open: false, idx: null });
  const [skillModal, setSkillModal] = useState(false);
  const [rateModal, setRateModal] = useState(false);
  const [imageModal, setImageModal] = useState(false);

  const flash = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  /* ── FETCH DATA ── */
  const loadProfile = useCallback(async () => {
    if (!currentUserId) return;
    try {
      setLoading(true);

      const [usersRes, freelancersRes] = await Promise.all([
        API.get('/users').catch(() => ({ data: [] })),
        API.get('/freelancers').catch(() => ({ data: [] })),
      ]);

      const allUsers = asArray(usersRes);
      const allFreelancers = asArray(freelancersRes);

      console.log('👤 Looking for userId:', currentUserId);
      console.log('📦 Users loaded:', allUsers.length);
      console.log('💼 Freelancers loaded:', allFreelancers.length);

      // Find current user - try multiple matching strategies
      let foundUser = allUsers.find((u) => {
        const uid = u.userId || u._id || u.id;
        return uid && String(uid) === String(currentUserId);
      });

      // Fallback: match by email
      if (!foundUser && user?.email) {
        foundUser = allUsers.find((u) => u.email === user.email);
      }

      // Fallback: use auth context data
      if (!foundUser) {
        console.warn('⚠️ User not found in API, using auth context');
        foundUser = {
          userId: currentUserId,
          firstName: user?.firstName || '',
          lastName: user?.lastName || '',
          username: user?.username || '',
          email: user?.email || '',
          phone: user?.phone || '',
          bio: user?.bio || '',
          location: user?.location || '',
          profileImage: user?.profileImage || '',
          isEmailVerified: user?.isEmailVerified || false,
          createdAt: user?.createdAt || null,
        };
      }

      console.log('✅ Found user:', foundUser.firstName, foundUser.lastName);

      // Find freelancer profile
      const foundUserId = foundUser.userId || foundUser._id || foundUser.id;
      let foundFreelancer = allFreelancers.find((f) => {
        const fUserId = typeof f.userId === 'object' ? getId(f.userId) : f.userId;
        return fUserId && String(fUserId) === String(foundUserId);
      });

      // Fallback: try matching by currentUserId directly
      if (!foundFreelancer) {
        foundFreelancer = allFreelancers.find((f) => {
          const fUserId = typeof f.userId === 'object' ? getId(f.userId) : f.userId;
          return fUserId && String(fUserId) === String(currentUserId);
        });
      }

      console.log('✅ Found freelancer:', foundFreelancer ? 'Yes' : 'No');

      setUserData(foundUser);
      if (foundFreelancer) setFreelancerData(foundFreelancer);

    } catch (err) {
      console.error('❌ Failed to load profile:', err);
      flash('Failed to load profile', false);
    } finally {
      setLoading(false);
    }
  }, [currentUserId, user]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  /* ── SAVE HELPERS ── */
  const patchUser = async (updates) => {
    const id = userData?.userId || userData?._id;
    if (!id) return;
    setSaving(true);
    try {
      await API.put(`/users/${id}`, { ...userData, ...updates });
      setUserData((prev) => ({ ...prev, ...updates }));
      flash('Profile updated!');
    } catch (err) {
      console.error('Failed to update user:', err);
      flash('Update failed', false);
    } finally {
      setSaving(false);
    }
  };

  const patchFreelancer = async (updates) => {
    const id = freelancerData?.freelancerId || freelancerData?._id;
    if (!id) return;
    setSaving(true);
    try {
      await API.put(`/freelancers/${id}`, { ...freelancerData, ...updates });
      setFreelancerData((prev) => ({ ...prev, ...updates }));
      flash('Profile updated!');
    } catch (err) {
      console.error('Failed to update freelancer:', err);
      flash('Update failed', false);
    } finally {
      setSaving(false);
    }
  };

  /* ── ARRAY CRUD ── */
  const saveArray = (key, list) => patchFreelancer({ [key]: list });
  const addItem = (key, item) => saveArray(key, [...(freelancerData?.[key] || []), item]);
  const updateItem = (key, idx, item) => {
    const arr = [...(freelancerData?.[key] || [])];
    arr[idx] = item;
    saveArray(key, arr);
  };
  const deleteItem = (key, idx) => {
    if (!window.confirm('Are you sure you want to delete this?')) return;
    const arr = [...(freelancerData?.[key] || [])];
    arr.splice(idx, 1);
    saveArray(key, arr);
  };

  /* ── LOADING ── */
  if (loading) {
    return (
      <div className="pfp-loading">
        <div className="pfp-spinner" />
        <p>Loading your profile...</p>
      </div>
    );
  }

  if (!freelancerData) {
    return (
      <div className="pfp-loading">
        <div className="pfp-empty-state">
          <span className="pfp-empty-icon">👤</span>
          <h3>No Freelancer Profile Found</h3>
          <p>Please complete your freelancer profile setup to view this page.</p>
        </div>
      </div>
    );
  }

  /* ── Derived values ── */
  const fullName = `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim() || userData?.username || 'Freelancer';
  const profileImg = freelancerData.profileImage || userData?.profileImage;
  const skills = freelancerData.skills || [];
  const experience = freelancerData.experience || [];
  const education = freelancerData.education || [];
  const certifications = freelancerData.certifications || [];
  const services = freelancerData.services || [];
  const portfolio = freelancerData.portfolio || [];
  const dashStats = freelancerData.dashboardStats || {};

  return (
    <div className="pfp-page">
      {/* Toast */}
      {toast && (
        <div className={`pfp-toast ${toast.ok ? 'pfp-toast--ok' : 'pfp-toast--err'}`}>
          <span>{toast.ok ? '✅' : '❌'}</span>
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Saving indicator */}
      {saving && <div className="pfp-saving-bar">Saving changes...</div>}

      {/* Hero */}
      <div className="pfp-hero">
        <div className="pfp-hero-inner">
          <span className="pfp-hero-badge">👤 My Profile</span>
          <h1>Profile</h1>
          <p>Manage your freelancer profile, skills, portfolio and more.</p>
        </div>
      </div>

      <div className="pfp-container">
        <div className="pfp-layout">

          {/* ════════════ MAIN COLUMN ════════════ */}
          <div className="pfp-main">

            {/* ─── INTRO CARD ─── */}
            <section className="pfp-card pfp-intro-card">
              <div className="pfp-banner-area">
                <div className="pfp-banner-gradient" />
              </div>
              <div className="pfp-intro-content">
                <div className="pfp-avatar-wrap" onClick={() => setImageModal(true)}>
                  {profileImg ? (
                    <img src={profileImg} alt={fullName} className="pfp-avatar-img" />
                  ) : (
                    <span className="pfp-avatar-letter">{fullName.charAt(0).toUpperCase()}</span>
                  )}
                  <div className="pfp-avatar-overlay">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff" stroke="#fff" strokeWidth="1.5">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" fill="none" stroke="#fff" strokeWidth="2" />
                    </svg>
                  </div>
                  {freelancerData.isTopRated && <span className="pfp-top-badge">★ Top Rated</span>}
                </div>

                <div className="pfp-intro-details">
                  <div className="pfp-intro-row">
                    <div className="pfp-intro-info">
                      <h1 className="pfp-fullname">{fullName}</h1>
                      <p className="pfp-headline-text">
                        {freelancerData.headline || (
                          <span className="pfp-placeholder" onClick={() => setIntroModal(true)}>
                            + Add a professional headline
                          </span>
                        )}
                      </p>
                      <p className="pfp-location-line">
                        {(freelancerData.location || userData?.location) && (
                          <span>📍 {freelancerData.location || userData.location}</span>
                        )}
                        {userData?.email && <span>✉️ {userData.email}</span>}
                        {userData?.phone && <span>📱 {userData.phone}</span>}
                      </p>
                      <div className="pfp-badge-row">
                        {userData?.isEmailVerified && (
                          <span className="pfp-status-badge pfp-status-badge--green">✓ Verified</span>
                        )}
                        {freelancerData.isOpenToWork && (
                          <span className="pfp-status-badge pfp-status-badge--blue">🟢 Open to Work</span>
                        )}
                        {freelancerData.isAvailable && (
                          <span className="pfp-status-badge pfp-status-badge--teal">⚡ Available Now</span>
                        )}
                      </div>
                    </div>
                    <div className="pfp-intro-edit">
                      <PenBtn onClick={() => setIntroModal(true)} label="Edit intro" />
                    </div>
                  </div>

                  {freelancerData.resumeUrl && (
                    <p className="pfp-resume-line">📎 {freelancerData.resumeUrl}</p>
                  )}

                  <div className="pfp-kpi-strip">
                    <div className="pfp-kpi">
                      <strong>{freelancerData.projectsCompleted || 0}</strong>
                      <span>Projects</span>
                    </div>
                    <div className="pfp-kpi">
                      <strong>{freelancerData.jobSuccessRate || 0}%</strong>
                      <span>Success Rate</span>
                    </div>
                    <div className="pfp-kpi">
                      <strong>{money(freelancerData.totalEarnings)}</strong>
                      <span>Total Earned</span>
                    </div>
                    <div className="pfp-kpi">
                      <strong>{dashStats.averageRating || '—'}</strong>
                      <span>Avg Rating</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ─── ABOUT ─── */}
            <section className="pfp-card">
              <div className="pfp-card-header">
                <h2>About</h2>
                <PenBtn onClick={() => setAboutModal(true)} />
              </div>
              <div className="pfp-card-body">
                {freelancerData.bio || userData?.bio ? (
                  <p className="pfp-body-text">{freelancerData.bio || userData.bio}</p>
                ) : (
                  <p className="pfp-empty-prompt" onClick={() => setAboutModal(true)}>
                    ✏️ Write a summary about your expertise and what makes you unique.
                  </p>
                )}
              </div>
            </section>

            {/* ─── SERVICES ─── */}
            <section className="pfp-card">
              <div className="pfp-card-header">
                <h2>Services</h2>
                <PlusBtn onClick={() => setSvcModal({ open: true, idx: null })} label="Add Service" />
              </div>
              <div className="pfp-card-body">
                {services.length === 0 ? (
                  <p className="pfp-empty-prompt" onClick={() => setSvcModal({ open: true, idx: null })}>
                    ✏️ Add services you offer to attract more clients.
                  </p>
                ) : (
                  <div className="pfp-services-grid">
                    {services.map((svc, i) => (
                      <div key={i} className="pfp-service-card">
                        <div className="pfp-service-top">
                          <h4>{svc.title}</h4>
                          <span className="pfp-service-actions">
                            <PenBtn onClick={() => setSvcModal({ open: true, idx: i })} />
                            <TrashBtn onClick={() => deleteItem('services', i)} />
                          </span>
                        </div>
                        {svc.serviceType && (
                          <span className="pfp-tag pfp-tag--outline">{svc.serviceType}</span>
                        )}
                        {svc.description && <p className="pfp-service-desc">{svc.description}</p>}
                        {svc.startingPrice > 0 && (
                          <p className="pfp-service-price">From {money(svc.startingPrice)}</p>
                        )}
                        {toArr(svc.deliverables).length > 0 && (
                          <div className="pfp-chip-list">
                            {toArr(svc.deliverables).map((d, j) => (
                              <span key={j} className="pfp-chip pfp-chip--green">✓ {d}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* ─── EXPERIENCE ─── */}
            <section className="pfp-card">
              <div className="pfp-card-header">
                <h2>Experience</h2>
                <PlusBtn onClick={() => setExpModal({ open: true, idx: null })} label="Add" />
              </div>
              <div className="pfp-card-body">
                {experience.length === 0 ? (
                  <p className="pfp-empty-prompt" onClick={() => setExpModal({ open: true, idx: null })}>
                    ✏️ Add your work experience to build credibility.
                  </p>
                ) : (
                  <div className="pfp-timeline">
                    {experience.map((exp, i) => (
                      <div key={i} className="pfp-timeline-item">
                        <div className="pfp-timeline-icon">💼</div>
                        <div className="pfp-timeline-content">
                          <div className="pfp-timeline-top">
                            <div>
                              <h4>{exp.position}</h4>
                              <p className="pfp-subtitle">
                                {exp.company}
                                {exp.employmentType ? ` · ${exp.employmentType}` : ''}
                              </p>
                              <p className="pfp-meta-text">
                                {fmtDate(exp.startDate)} – {exp.endDate ? fmtDate(exp.endDate) : 'Present'}
                                {exp.location ? ` · ${exp.location}` : ''}
                              </p>
                            </div>
                            <span className="pfp-item-actions">
                              <PenBtn onClick={() => setExpModal({ open: true, idx: i })} />
                              <TrashBtn onClick={() => deleteItem('experience', i)} />
                            </span>
                          </div>
                          {exp.description && <p className="pfp-desc-text">{exp.description}</p>}
                          {toArr(exp.technologies).length > 0 && (
                            <div className="pfp-chip-list">
                              {toArr(exp.technologies).map((t, j) => (
                                <span key={j} className="pfp-chip">{t}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* ─── PORTFOLIO ─── */}
            <section className="pfp-card">
              <div className="pfp-card-header">
                <h2>Portfolio</h2>
                <PlusBtn onClick={() => setFolioModal({ open: true, idx: null })} label="Add Project" />
              </div>
              <div className="pfp-card-body">
                {portfolio.length === 0 ? (
                  <p className="pfp-empty-prompt" onClick={() => setFolioModal({ open: true, idx: null })}>
                    ✏️ Showcase your best work to impress clients.
                  </p>
                ) : (
                  <div className="pfp-portfolio-grid">
                    {portfolio.map((item, i) => (
                      <div key={i} className="pfp-portfolio-card">
                        <div className="pfp-portfolio-thumb">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.title} />
                          ) : (
                            <span className="pfp-portfolio-placeholder">🖼️</span>
                          )}
                          <div className="pfp-portfolio-hover">
                            <PenBtn onClick={() => setFolioModal({ open: true, idx: i })} />
                            <TrashBtn onClick={() => deleteItem('portfolio', i)} />
                          </div>
                        </div>
                        <div className="pfp-portfolio-info">
                          {item.category && <span className="pfp-tag">{item.category}</span>}
                          <h4>{item.title}</h4>
                          {item.description && (
                            <p>{item.description.length > 120 ? `${item.description.slice(0, 120)}…` : item.description}</p>
                          )}
                          {toArr(item.technologies).length > 0 && (
                            <div className="pfp-chip-list">
                              {toArr(item.technologies).slice(0, 4).map((t, j) => (
                                <span key={j} className="pfp-chip">{t}</span>
                              ))}
                            </div>
                          )}
                          {item.projectUrl && (
                            <a href={item.projectUrl} target="_blank" rel="noreferrer" className="pfp-project-link">
                              View Project →
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* ─── EDUCATION ─── */}
            <section className="pfp-card">
              <div className="pfp-card-header">
                <h2>Education</h2>
                <PlusBtn onClick={() => setEduModal({ open: true, idx: null })} label="Add" />
              </div>
              <div className="pfp-card-body">
                {education.length === 0 ? (
                  <p className="pfp-empty-prompt" onClick={() => setEduModal({ open: true, idx: null })}>
                    ✏️ Add your educational background.
                  </p>
                ) : (
                  <div className="pfp-timeline">
                    {education.map((edu, i) => (
                      <div key={i} className="pfp-timeline-item">
                        <div className="pfp-timeline-icon">🎓</div>
                        <div className="pfp-timeline-content">
                          <div className="pfp-timeline-top">
                            <div>
                              <h4>{edu.institution}</h4>
                              <p className="pfp-subtitle">
                                {edu.degree}{edu.field ? `, ${edu.field}` : ''}
                              </p>
                              <p className="pfp-meta-text">
                                {edu.startYear} – {edu.endYear || 'Present'}
                              </p>
                            </div>
                            <span className="pfp-item-actions">
                              <PenBtn onClick={() => setEduModal({ open: true, idx: i })} />
                              <TrashBtn onClick={() => deleteItem('education', i)} />
                            </span>
                          </div>
                          {edu.description && <p className="pfp-desc-text">{edu.description}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* ─── CERTIFICATIONS ─── */}
            <section className="pfp-card">
              <div className="pfp-card-header">
                <h2>Licenses & Certifications</h2>
                <PlusBtn onClick={() => setCertModal({ open: true, idx: null })} label="Add" />
              </div>
              <div className="pfp-card-body">
                {certifications.length === 0 ? (
                  <p className="pfp-empty-prompt" onClick={() => setCertModal({ open: true, idx: null })}>
                    ✏️ Add certifications to stand out.
                  </p>
                ) : (
                  <div className="pfp-timeline">
                    {certifications.map((cert, i) => (
                      <div key={i} className="pfp-timeline-item">
                        <div className="pfp-timeline-icon">🏅</div>
                        <div className="pfp-timeline-content">
                          <div className="pfp-timeline-top">
                            <div>
                              <h4>{cert.name}</h4>
                              <p className="pfp-subtitle">{cert.issuer}</p>
                              <p className="pfp-meta-text">
                                {cert.issueDate ? `Issued ${fmtFull(cert.issueDate)}` : ''}
                                {cert.expiryDate ? ` · Expires ${fmtFull(cert.expiryDate)}` : ''}
                              </p>
                              {cert.credentialUrl && (
                                <a href={cert.credentialUrl} target="_blank" rel="noreferrer" className="pfp-project-link">
                                  Show Credential →
                                </a>
                              )}
                            </div>
                            <span className="pfp-item-actions">
                              <PenBtn onClick={() => setCertModal({ open: true, idx: i })} />
                              <TrashBtn onClick={() => deleteItem('certifications', i)} />
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* ════════════ SIDEBAR ════════════ */}
          <aside className="pfp-sidebar">

            {/* Availability */}
            <div className="pfp-card pfp-card--compact">
              <div className="pfp-card-header">
                <h2>Availability</h2>
                <PenBtn onClick={() => setRateModal(true)} />
              </div>
              <div className="pfp-card-body">
                <div className="pfp-info-row">
                  <span className="pfp-info-label">Status</span>
                  <span className={`pfp-status-badge ${freelancerData.isOpenToWork ? 'pfp-status-badge--green' : 'pfp-status-badge--gray'}`}>
                    {freelancerData.isOpenToWork ? '🟢 Open' : '⚪ Closed'}
                  </span>
                </div>
                <div className="pfp-info-row">
                  <span className="pfp-info-label">Type</span>
                  <span className="pfp-info-value">{freelancerData.availability || '—'}</span>
                </div>
                <div className="pfp-info-row">
                  <span className="pfp-info-label">Hourly Rate</span>
                  <span className="pfp-info-value pfp-rate-value">
                    {freelancerData.hourlyRate ? `$${freelancerData.hourlyRate}/hr` : '—'}
                  </span>
                </div>
                <div className="pfp-info-row">
                  <span className="pfp-info-label">Response Time</span>
                  <span className="pfp-info-value">{freelancerData.responseTime || '—'}</span>
                </div>
              </div>
            </div>

            {/* Skills */}
            <div className="pfp-card pfp-card--compact">
              <div className="pfp-card-header">
                <h2>Skills</h2>
                <PlusBtn onClick={() => setSkillModal(true)} label="Add" />
              </div>
              <div className="pfp-card-body">
                {skills.length === 0 ? (
                  <p className="pfp-empty-prompt" onClick={() => setSkillModal(true)}>
                    + Add your skills
                  </p>
                ) : (
                  <div className="pfp-chip-list pfp-chip-list--wrap">
                    {skills.map((sk, i) => (
                      <span key={i} className="pfp-chip pfp-chip--skill">
                        {sk.skillId || sk.name || sk}
                        {sk.endorsementCount > 0 && <em className="pfp-endorse">{sk.endorsementCount}</em>}
                        <button className="pfp-chip-del" onClick={() => deleteItem('skills', i)}>×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Statistics */}
            <div className="pfp-card pfp-card--compact">
              <div className="pfp-card-header">
                <h2>Statistics</h2>
              </div>
              <div className="pfp-card-body">
                <div className="pfp-stats-list">
                  {[
                    ['Profile Views', dashStats.profileViews || 0],
                    ['Active Projects', dashStats.activeProjects || 0],
                    ['Completed', dashStats.completedProjects || freelancerData.projectsCompleted || 0],
                    ['Pending Apps', dashStats.pendingApplications || 0],
                    ['Total Earned', money(dashStats.totalEarnings || freelancerData.totalEarnings)],
                    ['Unread Notifs', dashStats.unreadNotifications || 0],
                  ].map(([label, value], i) => (
                    <div key={i} className="pfp-stat-row">
                      <span>{label}</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Resume */}
            <div className="pfp-card pfp-card--compact">
              <div className="pfp-card-header">
                <h2>Resume</h2>
              </div>
              <div className="pfp-card-body">
                {freelancerData.resumeUrl ? (
                  <div className="pfp-resume-row">
                    <span className="pfp-resume-name">📄 {freelancerData.resumeUrl}</span>
                    <button
                      className="pfp-btn-sm pfp-btn-sm--ghost"
                      onClick={() => {
                        const url = prompt('Enter new resume URL:', freelancerData.resumeUrl);
                        if (url !== null) patchFreelancer({ resumeUrl: url.trim() });
                      }}
                    >
                      Replace
                    </button>
                  </div>
                ) : (
                  <button
                    className="pfp-btn-full pfp-btn-full--outline"
                    onClick={() => {
                      const url = prompt('Enter your resume URL (e.g. Google Drive, Dropbox link):');
                      if (url) patchFreelancer({ resumeUrl: url.trim() });
                    }}
                  >
                    + Add Resume URL
                  </button>
                )}
              </div>
            </div>

            {/* Member Since */}
            <div className="pfp-card pfp-card--compact">
              <div className="pfp-card-header">
                <h2>Member Info</h2>
              </div>
              <div className="pfp-card-body">
                <p className="pfp-member-date">
                  Joined {fmtFull(userData?.createdAt || freelancerData.createdAt)}
                </p>
                {freelancerData.lastActiveAt && (
                  <p className="pfp-meta-text">Last active {fmtFull(freelancerData.lastActiveAt)}</p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* ════════════ MODALS ════════════ */}

      {/* Profile Image Modal */}
      <Modal open={imageModal} onClose={() => setImageModal(false)} title="Update Profile Photo">
        <ImageForm
          currentImage={profileImg}
          onSave={(url) => {
            patchUser({ profileImage: url });
            patchFreelancer({ profileImage: url });
            setImageModal(false);
          }}
          onCancel={() => setImageModal(false)}
        />
      </Modal>

      {/* Intro Modal */}
      <Modal open={introModal} onClose={() => setIntroModal(false)} title="Edit Intro">
        <IntroForm
          U={userData}
          F={freelancerData}
          onSave={(uData, fData) => {
            patchUser(uData);
            patchFreelancer(fData);
            setIntroModal(false);
          }}
          onCancel={() => setIntroModal(false)}
        />
      </Modal>

      {/* About Modal */}
      <Modal open={aboutModal} onClose={() => setAboutModal(false)} title="Edit About">
        <AboutForm
          val={freelancerData.bio || userData?.bio || ''}
          onSave={(v) => {
            patchFreelancer({ bio: v });
            patchUser({ bio: v });
            setAboutModal(false);
          }}
          onCancel={() => setAboutModal(false)}
        />
      </Modal>

      {/* Experience Modal */}
      <Modal
        open={expModal.open}
        onClose={() => setExpModal({ open: false, idx: null })}
        title={expModal.idx !== null ? 'Edit Experience' : 'Add Experience'}
      >
        <ExpForm
          data={expModal.idx !== null ? experience[expModal.idx] : null}
          onSave={(d) => {
            expModal.idx !== null ? updateItem('experience', expModal.idx, d) : addItem('experience', d);
            setExpModal({ open: false, idx: null });
          }}
          onCancel={() => setExpModal({ open: false, idx: null })}
        />
      </Modal>

      {/* Education Modal */}
      <Modal
        open={eduModal.open}
        onClose={() => setEduModal({ open: false, idx: null })}
        title={eduModal.idx !== null ? 'Edit Education' : 'Add Education'}
      >
        <EduForm
          data={eduModal.idx !== null ? education[eduModal.idx] : null}
          onSave={(d) => {
            eduModal.idx !== null ? updateItem('education', eduModal.idx, d) : addItem('education', d);
            setEduModal({ open: false, idx: null });
          }}
          onCancel={() => setEduModal({ open: false, idx: null })}
        />
      </Modal>

      {/* Certification Modal */}
      <Modal
        open={certModal.open}
        onClose={() => setCertModal({ open: false, idx: null })}
        title={certModal.idx !== null ? 'Edit Certification' : 'Add Certification'}
      >
        <CertForm
          data={certModal.idx !== null ? certifications[certModal.idx] : null}
          onSave={(d) => {
            certModal.idx !== null ? updateItem('certifications', certModal.idx, d) : addItem('certifications', d);
            setCertModal({ open: false, idx: null });
          }}
          onCancel={() => setCertModal({ open: false, idx: null })}
        />
      </Modal>

      {/* Service Modal */}
      <Modal
        open={svcModal.open}
        onClose={() => setSvcModal({ open: false, idx: null })}
        title={svcModal.idx !== null ? 'Edit Service' : 'Add Service'}
      >
        <SvcForm
          data={svcModal.idx !== null ? services[svcModal.idx] : null}
          onSave={(d) => {
            svcModal.idx !== null ? updateItem('services', svcModal.idx, d) : addItem('services', d);
            setSvcModal({ open: false, idx: null });
          }}
          onCancel={() => setSvcModal({ open: false, idx: null })}
        />
      </Modal>

      {/* Portfolio Modal */}
      <Modal
        open={folioModal.open}
        onClose={() => setFolioModal({ open: false, idx: null })}
        title={folioModal.idx !== null ? 'Edit Project' : 'Add Project'}
        wide
      >
        <FolioForm
          data={folioModal.idx !== null ? portfolio[folioModal.idx] : null}
          onSave={(d) => {
            folioModal.idx !== null ? updateItem('portfolio', folioModal.idx, d) : addItem('portfolio', d);
            setFolioModal({ open: false, idx: null });
          }}
          onCancel={() => setFolioModal({ open: false, idx: null })}
        />
      </Modal>

      {/* Skills Modal */}
      <Modal open={skillModal} onClose={() => setSkillModal(false)} title="Manage Skills">
        <SkillForm
          skills={skills}
          onAdd={(s) => addItem('skills', s)}
          onDel={(i) => {
            const arr = [...skills];
            arr.splice(i, 1);
            patchFreelancer({ skills: arr });
          }}
          onClose={() => setSkillModal(false)}
        />
      </Modal>

      {/* Rate / Availability Modal */}
      <Modal open={rateModal} onClose={() => setRateModal(false)} title="Availability & Rate">
        <RateForm
          F={freelancerData}
          onSave={(d) => { patchFreelancer(d); setRateModal(false); }}
          onCancel={() => setRateModal(false)}
        />
      </Modal>
    </div>
  );
}

/* ══════════════════════════════════════════
   FORM COMPONENTS
══════════════════════════════════════════ */

function ImageForm({ currentImage, onSave, onCancel }) {
  const [url, setUrl] = useState(currentImage || '');

  return (
    <div className="pfp-form">
      {url && (
        <div className="pfp-image-preview">
          <img src={url} alt="Preview" onError={(e) => { e.target.style.display = 'none'; }} />
        </div>
      )}
      <label className="pfp-form-label">
        Image URL
        <input
          type="url"
          className="pfp-form-input"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/your-photo.jpg"
        />
      </label>
      <p className="pfp-form-hint">Enter a URL to your profile photo (hosted on Imgur, Cloudinary, etc.)</p>
      <div className="pfp-form-footer">
        <button type="button" className="pfp-btn pfp-btn--ghost" onClick={onCancel}>Cancel</button>
        <button
          type="button"
          className="pfp-btn pfp-btn--primary"
          onClick={() => onSave(url.trim())}
          disabled={!url.trim()}
        >
          Save Photo
        </button>
      </div>
    </div>
  );
}

function IntroForm({ U, F, onSave, onCancel }) {
  const [form, setForm] = useState({
    firstName: U?.firstName || '',
    lastName: U?.lastName || '',
    headline: F?.headline || '',
    location: F?.location || U?.location || '',
    email: U?.email || '',
    phone: U?.phone || '',
  });

  const handle = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    onSave(
      { firstName: form.firstName, lastName: form.lastName, email: form.email, phone: form.phone, location: form.location },
      { headline: form.headline, location: form.location }
    );
  };

  return (
    <form className="pfp-form" onSubmit={submit}>
      <div className="pfp-form-grid">
        <label className="pfp-form-label">
          First Name *
          <input className="pfp-form-input" value={form.firstName} onChange={handle('firstName')} required />
        </label>
        <label className="pfp-form-label">
          Last Name *
          <input className="pfp-form-input" value={form.lastName} onChange={handle('lastName')} required />
        </label>
      </div>
      <label className="pfp-form-label">
        Headline
        <input className="pfp-form-input" value={form.headline} onChange={handle('headline')} placeholder="e.g. Senior React Developer" />
      </label>
      <label className="pfp-form-label">
        Location
        <input className="pfp-form-input" value={form.location} onChange={handle('location')} placeholder="City, Country" />
      </label>
      <div className="pfp-form-grid">
        <label className="pfp-form-label">
          Email
          <input className="pfp-form-input" type="email" value={form.email} onChange={handle('email')} />
        </label>
        <label className="pfp-form-label">
          Phone
          <input className="pfp-form-input" value={form.phone} onChange={handle('phone')} placeholder="+1 555 000 0000" />
        </label>
      </div>
      <div className="pfp-form-footer">
        <button type="button" className="pfp-btn pfp-btn--ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="pfp-btn pfp-btn--primary">Save</button>
      </div>
    </form>
  );
}

function AboutForm({ val, onSave, onCancel }) {
  const [text, setText] = useState(val);
  return (
    <form className="pfp-form" onSubmit={(e) => { e.preventDefault(); onSave(text); }}>
      <label className="pfp-form-label">
        Bio
        <textarea
          className="pfp-form-textarea"
          rows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write about yourself, your expertise, and what makes you unique..."
          maxLength={2000}
        />
        <span className="pfp-char-count">{text.length}/2000</span>
      </label>
      <div className="pfp-form-footer">
        <button type="button" className="pfp-btn pfp-btn--ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="pfp-btn pfp-btn--primary">Save</button>
      </div>
    </form>
  );
}

function ExpForm({ data, onSave, onCancel }) {
  const [form, setForm] = useState({
    position: data?.position || '',
    company: data?.company || '',
    employmentType: data?.employmentType || '',
    location: data?.location || '',
    startDate: data?.startDate?.slice?.(0, 10) || '',
    endDate: data?.endDate?.slice?.(0, 10) || '',
    description: data?.description || '',
    technologies: toArr(data?.technologies).join(', '),
  });

  const handle = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    onSave({
      ...form,
      technologies: form.technologies ? form.technologies.split(',').map((t) => t.trim()).filter(Boolean) : [],
    });
  };

  return (
    <form className="pfp-form" onSubmit={submit}>
      <div className="pfp-form-grid">
        <label className="pfp-form-label">Position *<input className="pfp-form-input" value={form.position} onChange={handle('position')} required /></label>
        <label className="pfp-form-label">Company *<input className="pfp-form-input" value={form.company} onChange={handle('company')} required /></label>
      </div>
      <div className="pfp-form-grid">
        <label className="pfp-form-label">
          Employment Type
          <select className="pfp-form-select" value={form.employmentType} onChange={handle('employmentType')}>
            <option value="">Select...</option>
            {EMP_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
        <label className="pfp-form-label">Location<input className="pfp-form-input" value={form.location} onChange={handle('location')} /></label>
      </div>
      <div className="pfp-form-grid">
        <label className="pfp-form-label">Start Date *<input className="pfp-form-input" type="date" value={form.startDate} onChange={handle('startDate')} required /></label>
        <label className="pfp-form-label">End Date <span className="pfp-form-hint-inline">(empty = present)</span><input className="pfp-form-input" type="date" value={form.endDate} onChange={handle('endDate')} /></label>
      </div>
      <label className="pfp-form-label">Description<textarea className="pfp-form-textarea" rows={4} value={form.description} onChange={handle('description')} /></label>
      <label className="pfp-form-label">Technologies <span className="pfp-form-hint-inline">(comma-separated)</span><input className="pfp-form-input" value={form.technologies} onChange={handle('technologies')} /></label>
      <div className="pfp-form-footer">
        <button type="button" className="pfp-btn pfp-btn--ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="pfp-btn pfp-btn--primary">Save</button>
      </div>
    </form>
  );
}

function EduForm({ data, onSave, onCancel }) {
  const [form, setForm] = useState({
    institution: data?.institution || '',
    degree: data?.degree || '',
    field: data?.field || '',
    startYear: data?.startYear || '',
    endYear: data?.endYear || '',
    description: data?.description || '',
  });

  const handle = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  return (
    <form className="pfp-form" onSubmit={(e) => { e.preventDefault(); onSave(form); }}>
      <label className="pfp-form-label">Institution *<input className="pfp-form-input" value={form.institution} onChange={handle('institution')} required /></label>
      <div className="pfp-form-grid">
        <label className="pfp-form-label">Degree *<input className="pfp-form-input" value={form.degree} onChange={handle('degree')} required /></label>
        <label className="pfp-form-label">Field of Study<input className="pfp-form-input" value={form.field} onChange={handle('field')} /></label>
      </div>
      <div className="pfp-form-grid">
        <label className="pfp-form-label">Start Year *<input className="pfp-form-input" type="number" value={form.startYear} onChange={handle('startYear')} required min="1950" max="2035" /></label>
        <label className="pfp-form-label">End Year<input className="pfp-form-input" type="number" value={form.endYear} onChange={handle('endYear')} min="1950" max="2040" /></label>
      </div>
      <label className="pfp-form-label">Description<textarea className="pfp-form-textarea" rows={3} value={form.description} onChange={handle('description')} /></label>
      <div className="pfp-form-footer">
        <button type="button" className="pfp-btn pfp-btn--ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="pfp-btn pfp-btn--primary">Save</button>
      </div>
    </form>
  );
}

function CertForm({ data, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: data?.name || '',
    issuer: data?.issuer || '',
    issueDate: data?.issueDate?.slice?.(0, 10) || '',
    expiryDate: data?.expiryDate?.slice?.(0, 10) || '',
    credentialUrl: data?.credentialUrl || '',
  });

  const handle = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  return (
    <form className="pfp-form" onSubmit={(e) => { e.preventDefault(); onSave(form); }}>
      <label className="pfp-form-label">Certification Name *<input className="pfp-form-input" value={form.name} onChange={handle('name')} required /></label>
      <label className="pfp-form-label">Issuing Organization *<input className="pfp-form-input" value={form.issuer} onChange={handle('issuer')} required /></label>
      <div className="pfp-form-grid">
        <label className="pfp-form-label">Issue Date<input className="pfp-form-input" type="date" value={form.issueDate} onChange={handle('issueDate')} /></label>
        <label className="pfp-form-label">Expiry Date<input className="pfp-form-input" type="date" value={form.expiryDate} onChange={handle('expiryDate')} /></label>
      </div>
      <label className="pfp-form-label">Credential URL<input className="pfp-form-input" value={form.credentialUrl} onChange={handle('credentialUrl')} placeholder="https://..." /></label>
      <div className="pfp-form-footer">
        <button type="button" className="pfp-btn pfp-btn--ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="pfp-btn pfp-btn--primary">Save</button>
      </div>
    </form>
  );
}

function SvcForm({ data, onSave, onCancel }) {
  const [form, setForm] = useState({
    title: data?.title || '',
    description: data?.description || '',
    startingPrice: data?.startingPrice || '',
    serviceType: data?.serviceType || '',
    deliverables: toArr(data?.deliverables).join(', '),
  });

  const handle = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  return (
    <form className="pfp-form" onSubmit={(e) => {
      e.preventDefault();
      onSave({
        ...form,
        startingPrice: Number(form.startingPrice) || 0,
        deliverables: form.deliverables ? form.deliverables.split(',').map((d) => d.trim()).filter(Boolean) : [],
      });
    }}>
      <label className="pfp-form-label">Service Title *<input className="pfp-form-input" value={form.title} onChange={handle('title')} required /></label>
      <div className="pfp-form-grid">
        <label className="pfp-form-label">
          Type
          <select className="pfp-form-select" value={form.serviceType} onChange={handle('serviceType')}>
            <option value="">Select...</option>
            <option value="development">Development</option>
            <option value="design">Design</option>
            <option value="consulting">Consulting</option>
            <option value="marketing">Marketing</option>
            <option value="writing">Writing</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label className="pfp-form-label">Starting Price ($)<input className="pfp-form-input" type="number" value={form.startingPrice} onChange={handle('startingPrice')} min="0" /></label>
      </div>
      <label className="pfp-form-label">Description *<textarea className="pfp-form-textarea" rows={4} value={form.description} onChange={handle('description')} required /></label>
      <label className="pfp-form-label">Deliverables <span className="pfp-form-hint-inline">(comma-separated)</span><input className="pfp-form-input" value={form.deliverables} onChange={handle('deliverables')} /></label>
      <div className="pfp-form-footer">
        <button type="button" className="pfp-btn pfp-btn--ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="pfp-btn pfp-btn--primary">Save</button>
      </div>
    </form>
  );
}

function FolioForm({ data, onSave, onCancel }) {
  const [form, setForm] = useState({
    title: data?.title || '',
    category: data?.category || '',
    description: data?.description || '',
    imageUrl: data?.imageUrl || '',
    results: data?.results || '',
    projectUrl: data?.projectUrl || '',
    technologies: toArr(data?.technologies).join(', '),
  });

  const handle = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  return (
    <form className="pfp-form" onSubmit={(e) => {
      e.preventDefault();
      onSave({
        ...form,
        technologies: form.technologies ? form.technologies.split(',').map((t) => t.trim()).filter(Boolean) : [],
      });
    }}>
      <div className="pfp-form-grid">
        <label className="pfp-form-label">Project Title *<input className="pfp-form-input" value={form.title} onChange={handle('title')} required /></label>
        <label className="pfp-form-label">Category<input className="pfp-form-input" value={form.category} onChange={handle('category')} /></label>
      </div>
      <label className="pfp-form-label">Description *<textarea className="pfp-form-textarea" rows={4} value={form.description} onChange={handle('description')} required /></label>
      <label className="pfp-form-label">Results / Impact<textarea className="pfp-form-textarea" rows={2} value={form.results} onChange={handle('results')} /></label>
      <label className="pfp-form-label">Image URL<input className="pfp-form-input" value={form.imageUrl} onChange={handle('imageUrl')} placeholder="https://..." /></label>
      <label className="pfp-form-label">Technologies <span className="pfp-form-hint-inline">(comma-separated)</span><input className="pfp-form-input" value={form.technologies} onChange={handle('technologies')} /></label>
      <label className="pfp-form-label">Project URL<input className="pfp-form-input" value={form.projectUrl} onChange={handle('projectUrl')} placeholder="https://..." /></label>
      <div className="pfp-form-footer">
        <button type="button" className="pfp-btn pfp-btn--ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="pfp-btn pfp-btn--primary">Save</button>
      </div>
    </form>
  );
}

function SkillForm({ skills, onAdd, onDel, onClose }) {
  const [value, setValue] = useState('');

  const addSkill = () => {
    if (!value.trim()) return;
    if (skills.some((sk) => String(sk.skillId || sk.name || sk).toLowerCase() === value.trim().toLowerCase())) {
      return;
    }
    onAdd({ skillId: value.trim(), endorsementCount: 0 });
    setValue('');
  };

  return (
    <div className="pfp-form">
      <div className="pfp-form-inline">
        <input
          className="pfp-form-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
          placeholder="Type a skill and press Enter..."
        />
        <button type="button" className="pfp-btn pfp-btn--primary pfp-btn--sm" onClick={addSkill}>Add</button>
      </div>
      {skills.length > 0 && (
        <div className="pfp-chip-list pfp-chip-list--wrap" style={{ marginTop: 16 }}>
          {skills.map((sk, i) => (
            <span key={i} className="pfp-chip pfp-chip--skill">
              {sk.skillId || sk.name || sk}
              <button className="pfp-chip-del" onClick={() => onDel(i)}>×</button>
            </span>
          ))}
        </div>
      )}
      <div className="pfp-form-footer">
        <button type="button" className="pfp-btn pfp-btn--ghost" onClick={onClose}>Done</button>
      </div>
    </div>
  );
}

function RateForm({ F, onSave, onCancel }) {
  const [form, setForm] = useState({
    isOpenToWork: F?.isOpenToWork || false,
    isAvailable: F?.isAvailable || false,
    availability: F?.availability || '',
    hourlyRate: F?.hourlyRate || '',
    responseTime: F?.responseTime || '',
  });

  const handle = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  return (
    <form className="pfp-form" onSubmit={(e) => {
      e.preventDefault();
      onSave({ ...form, hourlyRate: Number(form.hourlyRate) || 0 });
    }}>
      <div className="pfp-toggle-field">
        <span>Open to Work</span>
        <button
          type="button"
          className={`pfp-toggle-switch ${form.isOpenToWork ? 'pfp-toggle-switch--on' : ''}`}
          onClick={() => setForm((p) => ({ ...p, isOpenToWork: !p.isOpenToWork, isAvailable: !p.isOpenToWork }))}
        >
          <span className="pfp-toggle-dot" />
        </button>
      </div>
      <label className="pfp-form-label">
        Availability
        <select className="pfp-form-select" value={form.availability} onChange={handle('availability')}>
          <option value="">Select...</option>
          {AVAIL_OPTS.map((o) => <option key={o}>{o}</option>)}
        </select>
      </label>
      <label className="pfp-form-label">
        Hourly Rate ($)
        <input className="pfp-form-input" type="number" value={form.hourlyRate} onChange={handle('hourlyRate')} min="0" />
      </label>
      <label className="pfp-form-label">
        Response Time
        <input className="pfp-form-input" value={form.responseTime} onChange={handle('responseTime')} placeholder="e.g. Within 2 hours" />
      </label>
      <div className="pfp-form-footer">
        <button type="button" className="pfp-btn pfp-btn--ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="pfp-btn pfp-btn--primary">Save</button>
      </div>
    </form>
  );
}