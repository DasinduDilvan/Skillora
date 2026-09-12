// src/components/FreelancerComponents/Profile/Profile.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import API from '../../../api/axios';
import './Profile.css';

/* ── helpers ── */
const arr = (r) => {
  const d = r?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.results)) return d.results;
  return [];
};
const rid = (v) => {
  if (!v) return null;
  if (typeof v === 'string') return v;
  return v.freelancerId || v.userId || v.clientId || v._id || v.id || null;
};
const eq = (a, b) => {
  const x = rid(a), y = rid(b);
  return x && y && String(x) === String(y);
};
const money = (v) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v || 0);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '');
const fmtFull = (d) => (d ? new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '');

const EMP_TYPES = ['Full-time', 'Part-time', 'Contract', 'Freelance', 'Internship'];
const AVAIL_OPTS = ['Full-time', 'Part-time', 'Hourly', 'Not Available'];

/* ── Modal shell ── */
function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null;
  return (
    <div className="pfp-overlay" onClick={onClose}>
      <div className={`pfp-modal ${wide ? 'pfp-modal--wide' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="pfp-modal__head">
          <h3>{title}</h3>
          <button className="pfp-modal__x" onClick={onClose}>×</button>
        </div>
        <div className="pfp-modal__body">{children}</div>
      </div>
    </div>
  );
}

/* ── Pencil button ── */
function PenBtn({ onClick, label }) {
  return (
    <button className="pfp-pen" onClick={onClick} title={label || 'Edit'}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
        <path d="m15 5 4 4" />
      </svg>
    </button>
  );
}

/* ── Trash button ── */
function TrashBtn({ onClick }) {
  return (
    <button className="pfp-trash" onClick={onClick} title="Delete">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      </svg>
    </button>
  );
}

/* ── Plus button ── */
function PlusBtn({ onClick, label }) {
  return (
    <button className="pfp-plus" onClick={onClick}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      {label}
    </button>
  );
}

/* ============================================================
   MAIN COMPONENT
============================================================ */
export default function Profile() {
  const { user } = useAuth();
  const uid = user?.userId || user?._id || user?.id;

  const [U, setU] = useState(null);           // user doc
  const [F, setF] = useState(null);           // freelancer doc
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  /* modals */
  const [introModal, setIntroModal] = useState(false);
  const [aboutModal, setAboutModal] = useState(false);
  const [expModal, setExpModal] = useState({ open: false, idx: null });
  const [eduModal, setEduModal] = useState({ open: false, idx: null });
  const [certModal, setCertModal] = useState({ open: false, idx: null });
  const [svcModal, setSvcModal] = useState({ open: false, idx: null });
  const [folioModal, setFolioModal] = useState({ open: false, idx: null });
  const [skillModal, setSkillModal] = useState(false);
  const [rateModal, setRateModal] = useState(false);

  const flash = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };

  /* ── FETCH ── */
  const load = useCallback(async () => {
    if (!uid) return;
    try {
      setLoading(true);
      const [uR, fR] = await Promise.all([
        API.get('/users').catch(() => ({ data: [] })),
        API.get('/freelancers').catch(() => ({ data: [] })),
      ]);
      const me = arr(uR).find((u) => eq(u, uid));
      const fl = arr(fR).find((f) => eq(f.userId, uid));
      if (me) setU(me);
      if (fl) setF(fl);
    } catch { flash('Failed to load profile', false); }
    finally { setLoading(false); }
  }, [uid]);

  useEffect(() => { load(); }, [load]);

  /* ── SAVE ── */
  const patchU = async (d) => {
    const id = U?.userId || U?._id;
    if (!id) return;
    setSaving(true);
    try { await API.put(`/users/${id}`, { ...U, ...d }); setU((p) => ({ ...p, ...d })); flash('Saved'); }
    catch { flash('Save failed', false); }
    finally { setSaving(false); }
  };
  const patchF = async (d) => {
    const id = F?.freelancerId || F?._id;
    if (!id) return;
    setSaving(true);
    try { await API.put(`/freelancers/${id}`, { ...F, ...d }); setF((p) => ({ ...p, ...d })); flash('Saved'); }
    catch { flash('Save failed', false); }
    finally { setSaving(false); }
  };

  /* ── ARRAY CRUD ── */
  const saveArr = (key, list) => patchF({ [key]: list });
  const addItem = (key, item) => saveArr(key, [...(F?.[key] || []), item]);
  const updItem = (key, idx, item) => { const a = [...(F?.[key] || [])]; a[idx] = item; saveArr(key, a); };
  const delItem = (key, idx) => { const a = [...(F?.[key] || [])]; a.splice(idx, 1); saveArr(key, a); };

  /* ── IMAGE ── */
  const pickImage = () => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = (e) => {
      const f = e.target.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = (ev) => { patchU({ profileImage: ev.target.result }); patchF({ profileImage: ev.target.result }); };
      r.readAsDataURL(f);
    };
    inp.click();
  };

  const pickResume = () => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.pdf,.doc,.docx';
    inp.onchange = (e) => { const f = e.target.files[0]; if (f) { patchF({ resumeUrl: f.name }); } };
    inp.click();
  };

  /* ── LOADING / ERROR ── */
  if (loading) return (
    <div className="pfp-center"><div className="pfp-spin" /><p>Loading profile…</p></div>
  );
  if (!F) return (
    <div className="pfp-center">
      <p className="pfp-muted">No freelancer profile found for this account.</p>
    </div>
  );

  const name = `${U?.firstName || ''} ${U?.lastName || ''}`.trim() || 'Unnamed';
  const img = F.profileImage || U?.profileImage;
  const skills = F.skills || [];
  const experience = F.experience || [];
  const education = F.education || [];
  const certs = F.certifications || [];
  const services = F.services || [];
  const portfolio = F.portfolio || [];
  const ds = F.dashboardStats || {};

  return (
    <div className="pfp">
      {toast && <div className={`pfp-toast ${toast.ok ? '' : 'pfp-toast--err'}`}>{toast.msg}</div>}
      {saving && <div className="pfp-saving">Saving…</div>}

      <div className="pfp-shell">
        {/* ============ LEFT ============ */}
        <div className="pfp-main">

          {/* ─── INTRO CARD ─── */}
          <section className="pfp-card pfp-intro-card">
            <div className="pfp-banner" />
            <div className="pfp-intro">
              <div className="pfp-avatar" onClick={pickImage}>
                {img
                  ? <img src={img} alt="" />
                  : <span className="pfp-avatar__letter">{name[0]}</span>}
                <div className="pfp-avatar__cam">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff" stroke="#fff" strokeWidth="1.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4" fill="none" stroke="#fff" strokeWidth="2"/></svg>
                </div>
                {F.isTopRated && <span className="pfp-top">★</span>}
              </div>

              <div className="pfp-intro__body">
                <div className="pfp-intro__row">
                  <div>
                    <h1 className="pfp-name">{name}</h1>
                    <p className="pfp-headline">{F.headline || <span className="pfp-muted">Add a headline</span>}</p>
                    <p className="pfp-loc">
                      {(F.location || U?.location) && <>{F.location || U.location}</>}
                      {U?.email && <> · {U.email}</>}
                      {U?.phone && <> · {U.phone}</>}
                    </p>
                    <div className="pfp-badges">
                      {U?.isEmailVerified && <span className="pfp-badge pfp-badge--green">Verified</span>}
                      {F.isOpenToWork && <span className="pfp-badge pfp-badge--blue">Open to work</span>}
                      {F.isAvailable && <span className="pfp-badge pfp-badge--teal">Available now</span>}
                    </div>
                  </div>
                  <div className="pfp-intro__actions">
                    <PenBtn onClick={() => setIntroModal(true)} label="Edit intro" />
                  </div>
                </div>

                {F.resumeUrl && (
                  <p className="pfp-resume-line">📎 {F.resumeUrl}</p>
                )}

                <div className="pfp-kpis">
                  <div className="pfp-kpi"><strong>{F.projectsCompleted || 0}</strong><span>Projects</span></div>
                  <div className="pfp-kpi"><strong>{F.jobSuccessRate || 0}%</strong><span>Success</span></div>
                  <div className="pfp-kpi"><strong>{money(F.totalEarnings)}</strong><span>Earned</span></div>
                  <div className="pfp-kpi"><strong>{ds.averageRating || '—'}</strong><span>Rating</span></div>
                </div>
              </div>
            </div>
          </section>

          {/* ─── ABOUT ─── */}
          <section className="pfp-card">
            <div className="pfp-card__head">
              <h2>About</h2>
              <PenBtn onClick={() => setAboutModal(true)} />
            </div>
            {F.bio || U?.bio ? (
              <p className="pfp-body-text">{F.bio || U.bio}</p>
            ) : (
              <p className="pfp-empty-hint" onClick={() => setAboutModal(true)}>
                Write a summary about your expertise and what makes you unique.
              </p>
            )}
          </section>

          {/* ─── SERVICES ─── */}
          <section className="pfp-card">
            <div className="pfp-card__head">
              <h2>Services</h2>
              <PlusBtn onClick={() => setSvcModal({ open: true, idx: null })} label="Add" />
            </div>
            {services.length === 0 ? (
              <p className="pfp-empty-hint" onClick={() => setSvcModal({ open: true, idx: null })}>
                + Add services you offer
              </p>
            ) : (
              <div className="pfp-svc-grid">
                {services.map((s, i) => (
                  <div key={i} className="pfp-svc">
                    <div className="pfp-svc__top">
                      <h4>{s.title}</h4>
                      <span className="pfp-svc__actions">
                        <PenBtn onClick={() => setSvcModal({ open: true, idx: i })} />
                        <TrashBtn onClick={() => delItem('services', i)} />
                      </span>
                    </div>
                    {s.serviceType && <span className="pfp-tag pfp-tag--outline">{s.serviceType}</span>}
                    <p>{s.description}</p>
                    {s.startingPrice > 0 && <p className="pfp-svc__price">From {money(s.startingPrice)}</p>}
                    {s.deliverables?.length > 0 && (
                      <div className="pfp-chips">
                        {(Array.isArray(s.deliverables) ? s.deliverables : s.deliverables.split(',')).map((d, j) => (
                          <span key={j} className="pfp-chip pfp-chip--green">✓ {d.trim()}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ─── EXPERIENCE ─── */}
          <section className="pfp-card">
            <div className="pfp-card__head">
              <h2>Experience</h2>
              <PlusBtn onClick={() => setExpModal({ open: true, idx: null })} label="Add" />
            </div>
            {experience.length === 0 ? (
              <p className="pfp-empty-hint" onClick={() => setExpModal({ open: true, idx: null })}>
                + Add work experience
              </p>
            ) : (
              <div className="pfp-list">
                {experience.map((x, i) => (
                  <div key={i} className="pfp-list__item">
                    <div className="pfp-list__icon">💼</div>
                    <div className="pfp-list__content">
                      <div className="pfp-list__row">
                        <div>
                          <h4>{x.position}</h4>
                          <p className="pfp-sub">{x.company}{x.employmentType ? ` · ${x.employmentType}` : ''}</p>
                          <p className="pfp-meta">
                            {fmtDate(x.startDate)} – {x.endDate ? fmtDate(x.endDate) : 'Present'}
                            {x.location ? ` · ${x.location}` : ''}
                          </p>
                        </div>
                        <span className="pfp-list__actions">
                          <PenBtn onClick={() => setExpModal({ open: true, idx: i })} />
                          <TrashBtn onClick={() => delItem('experience', i)} />
                        </span>
                      </div>
                      {x.description && <p className="pfp-desc">{x.description}</p>}
                      {x.technologies?.length > 0 && (
                        <div className="pfp-chips">
                          {(Array.isArray(x.technologies) ? x.technologies : x.technologies.split(',')).map((t, j) => (
                            <span key={j} className="pfp-chip">{t.trim()}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ─── PORTFOLIO ─── */}
          <section className="pfp-card">
            <div className="pfp-card__head">
              <h2>Portfolio</h2>
              <PlusBtn onClick={() => setFolioModal({ open: true, idx: null })} label="Add" />
            </div>
            {portfolio.length === 0 ? (
              <p className="pfp-empty-hint" onClick={() => setFolioModal({ open: true, idx: null })}>
                + Add portfolio projects
              </p>
            ) : (
              <div className="pfp-folio-grid">
                {portfolio.map((p, i) => (
                  <div key={i} className="pfp-folio">
                    <div className="pfp-folio__img">
                      {p.imageUrl ? <img src={p.imageUrl} alt="" /> : <span className="pfp-folio__ph">🖼</span>}
                      <div className="pfp-folio__over">
                        <PenBtn onClick={() => setFolioModal({ open: true, idx: i })} />
                        <TrashBtn onClick={() => delItem('portfolio', i)} />
                      </div>
                    </div>
                    <div className="pfp-folio__info">
                      {p.category && <span className="pfp-tag">{p.category}</span>}
                      <h4>{p.title}</h4>
                      {p.description && <p>{p.description.slice(0, 120)}{p.description.length > 120 ? '…' : ''}</p>}
                      {p.technologies?.length > 0 && (
                        <div className="pfp-chips">
                          {(Array.isArray(p.technologies) ? p.technologies : p.technologies.split(',')).slice(0, 4).map((t, j) => (
                            <span key={j} className="pfp-chip">{t.trim()}</span>
                          ))}
                        </div>
                      )}
                      {p.projectUrl && (
                        <a href={p.projectUrl} target="_blank" rel="noreferrer" className="pfp-link">View project →</a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ─── EDUCATION ─── */}
          <section className="pfp-card">
            <div className="pfp-card__head">
              <h2>Education</h2>
              <PlusBtn onClick={() => setEduModal({ open: true, idx: null })} label="Add" />
            </div>
            {education.length === 0 ? (
              <p className="pfp-empty-hint" onClick={() => setEduModal({ open: true, idx: null })}>
                + Add education
              </p>
            ) : (
              <div className="pfp-list">
                {education.map((x, i) => (
                  <div key={i} className="pfp-list__item">
                    <div className="pfp-list__icon">🎓</div>
                    <div className="pfp-list__content">
                      <div className="pfp-list__row">
                        <div>
                          <h4>{x.institution}</h4>
                          <p className="pfp-sub">{x.degree}{x.field ? `, ${x.field}` : ''}</p>
                          <p className="pfp-meta">{x.startYear} – {x.endYear || 'Present'}</p>
                        </div>
                        <span className="pfp-list__actions">
                          <PenBtn onClick={() => setEduModal({ open: true, idx: i })} />
                          <TrashBtn onClick={() => delItem('education', i)} />
                        </span>
                      </div>
                      {x.description && <p className="pfp-desc">{x.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ─── CERTIFICATIONS ─── */}
          <section className="pfp-card">
            <div className="pfp-card__head">
              <h2>Licenses & Certifications</h2>
              <PlusBtn onClick={() => setCertModal({ open: true, idx: null })} label="Add" />
            </div>
            {certs.length === 0 ? (
              <p className="pfp-empty-hint" onClick={() => setCertModal({ open: true, idx: null })}>
                + Add certifications
              </p>
            ) : (
              <div className="pfp-list">
                {certs.map((c, i) => (
                  <div key={i} className="pfp-list__item">
                    <div className="pfp-list__icon">🏅</div>
                    <div className="pfp-list__content">
                      <div className="pfp-list__row">
                        <div>
                          <h4>{c.name}</h4>
                          <p className="pfp-sub">{c.issuer}</p>
                          <p className="pfp-meta">
                            {c.issueDate ? `Issued ${fmtFull(c.issueDate)}` : ''}
                            {c.expiryDate ? ` · Expires ${fmtFull(c.expiryDate)}` : ''}
                          </p>
                          {c.credentialUrl && (
                            <a href={c.credentialUrl} target="_blank" rel="noreferrer" className="pfp-link">Show credential →</a>
                          )}
                        </div>
                        <span className="pfp-list__actions">
                          <PenBtn onClick={() => setCertModal({ open: true, idx: i })} />
                          <TrashBtn onClick={() => delItem('certifications', i)} />
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ============ SIDEBAR ============ */}
        <aside className="pfp-side">

          {/* Availability */}
          <div className="pfp-card pfp-card--compact">
            <div className="pfp-card__head">
              <h2>Availability</h2>
              <PenBtn onClick={() => setRateModal(true)} />
            </div>
            <div className="pfp-field-row">
              <span className="pfp-label">Status</span>
              <span className={`pfp-badge ${F.isOpenToWork ? 'pfp-badge--green' : 'pfp-badge--gray'}`}>
                {F.isOpenToWork ? 'Open to work' : 'Not available'}
              </span>
            </div>
            <div className="pfp-field-row">
              <span className="pfp-label">Type</span>
              <span>{F.availability || '—'}</span>
            </div>
            <div className="pfp-field-row">
              <span className="pfp-label">Hourly Rate</span>
              <span className="pfp-rate">{F.hourlyRate ? `$${F.hourlyRate}/hr` : '—'}</span>
            </div>
            <div className="pfp-field-row">
              <span className="pfp-label">Response Time</span>
              <span>{F.responseTime || '—'}</span>
            </div>
          </div>

          {/* Skills */}
          <div className="pfp-card pfp-card--compact">
            <div className="pfp-card__head">
              <h2>Skills</h2>
              <PlusBtn onClick={() => setSkillModal(true)} label="Add" />
            </div>
            {skills.length === 0 ? (
              <p className="pfp-empty-hint" onClick={() => setSkillModal(true)}>+ Add skills</p>
            ) : (
              <div className="pfp-chips pfp-chips--wrap">
                {skills.map((s, i) => (
                  <span key={i} className="pfp-chip pfp-chip--skill">
                    {s.skillId || s.name}
                    {s.endorsementCount > 0 && <em>{s.endorsementCount}</em>}
                    <button onClick={() => delItem('skills', i)}>×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="pfp-card pfp-card--compact">
            <h2 className="pfp-card__head-solo">Statistics</h2>
            <div className="pfp-stats">
              {[
                ['Profile Views', ds.profileViews || 0],
                ['Active Projects', ds.activeProjects || 0],
                ['Completed', ds.completedProjects || 0],
                ['Pending Apps', ds.pendingApplications || 0],
                ['Total Earned', money(ds.totalEarnings || F.totalEarnings)],
                ['Unread Notifs', ds.unreadNotifications || 0],
              ].map(([l, v], i) => (
                <div key={i} className="pfp-stat-row">
                  <span>{l}</span><strong>{v}</strong>
                </div>
              ))}
            </div>
          </div>

          {/* Resume */}
          <div className="pfp-card pfp-card--compact">
            <h2 className="pfp-card__head-solo">Resume</h2>
            {F.resumeUrl ? (
              <div className="pfp-resume">
                <span>📄 {F.resumeUrl}</span>
                <button className="pfp-btn pfp-btn--sm pfp-btn--ghost" onClick={pickResume}>Replace</button>
              </div>
            ) : (
              <button className="pfp-btn pfp-btn--outline pfp-btn--full" onClick={pickResume}>Upload Resume</button>
            )}
          </div>

          {/* Member */}
          <div className="pfp-card pfp-card--compact">
            <h2 className="pfp-card__head-solo">Joined</h2>
            <p className="pfp-joined">{fmtFull(U?.createdAt || F.createdAt)}</p>
            {F.lastActiveAt && <p className="pfp-meta">Last active {fmtFull(F.lastActiveAt)}</p>}
          </div>
        </aside>
      </div>

      {/* ================ MODALS ================ */}

      {/* INTRO */}
      <Modal open={introModal} onClose={() => setIntroModal(false)} title="Edit Intro">
        <IntroForm U={U} F={F} onSave={(uD, fD) => { patchU(uD); patchF(fD); setIntroModal(false); }} onCancel={() => setIntroModal(false)} />
      </Modal>

      {/* ABOUT */}
      <Modal open={aboutModal} onClose={() => setAboutModal(false)} title="Edit About">
        <AboutForm val={F.bio || U?.bio || ''} onSave={(v) => { patchF({ bio: v }); patchU({ bio: v }); setAboutModal(false); }} onCancel={() => setAboutModal(false)} />
      </Modal>

      {/* EXPERIENCE */}
      <Modal open={expModal.open} onClose={() => setExpModal({ open: false, idx: null })} title={expModal.idx !== null ? 'Edit Experience' : 'Add Experience'}>
        <ExpForm
          data={expModal.idx !== null ? experience[expModal.idx] : null}
          onSave={(d) => { expModal.idx !== null ? updItem('experience', expModal.idx, d) : addItem('experience', d); setExpModal({ open: false, idx: null }); }}
          onCancel={() => setExpModal({ open: false, idx: null })}
        />
      </Modal>

      {/* EDUCATION */}
      <Modal open={eduModal.open} onClose={() => setEduModal({ open: false, idx: null })} title={eduModal.idx !== null ? 'Edit Education' : 'Add Education'}>
        <EduForm
          data={eduModal.idx !== null ? education[eduModal.idx] : null}
          onSave={(d) => { eduModal.idx !== null ? updItem('education', eduModal.idx, d) : addItem('education', d); setEduModal({ open: false, idx: null }); }}
          onCancel={() => setEduModal({ open: false, idx: null })}
        />
      </Modal>

      {/* CERT */}
      <Modal open={certModal.open} onClose={() => setCertModal({ open: false, idx: null })} title={certModal.idx !== null ? 'Edit Certification' : 'Add Certification'}>
        <CertForm
          data={certModal.idx !== null ? certs[certModal.idx] : null}
          onSave={(d) => { certModal.idx !== null ? updItem('certifications', certModal.idx, d) : addItem('certifications', d); setCertModal({ open: false, idx: null }); }}
          onCancel={() => setCertModal({ open: false, idx: null })}
        />
      </Modal>

      {/* SERVICE */}
      <Modal open={svcModal.open} onClose={() => setSvcModal({ open: false, idx: null })} title={svcModal.idx !== null ? 'Edit Service' : 'Add Service'}>
        <SvcForm
          data={svcModal.idx !== null ? services[svcModal.idx] : null}
          onSave={(d) => { svcModal.idx !== null ? updItem('services', svcModal.idx, d) : addItem('services', d); setSvcModal({ open: false, idx: null }); }}
          onCancel={() => setSvcModal({ open: false, idx: null })}
        />
      </Modal>

      {/* PORTFOLIO */}
      <Modal open={folioModal.open} onClose={() => setFolioModal({ open: false, idx: null })} title={folioModal.idx !== null ? 'Edit Project' : 'Add Project'} wide>
        <FolioForm
          data={folioModal.idx !== null ? portfolio[folioModal.idx] : null}
          onSave={(d) => { folioModal.idx !== null ? updItem('portfolio', folioModal.idx, d) : addItem('portfolio', d); setFolioModal({ open: false, idx: null }); }}
          onCancel={() => setFolioModal({ open: false, idx: null })}
        />
      </Modal>

      {/* SKILLS */}
      <Modal open={skillModal} onClose={() => setSkillModal(false)} title="Manage Skills">
        <SkillForm skills={skills} onAdd={(s) => addItem('skills', s)} onDel={(i) => delItem('skills', i)} onClose={() => setSkillModal(false)} />
      </Modal>

      {/* RATE / AVAILABILITY */}
      <Modal open={rateModal} onClose={() => setRateModal(false)} title="Availability & Rate">
        <RateForm F={F} onSave={(d) => { patchF(d); setRateModal(false); }} onCancel={() => setRateModal(false)} />
      </Modal>
    </div>
  );
}

/* ============================================================
   FORMS
============================================================ */

function IntroForm({ U, F, onSave, onCancel }) {
  const [f, s] = useState({
    firstName: U?.firstName || '', lastName: U?.lastName || '',
    headline: F?.headline || '', location: F?.location || U?.location || '',
    email: U?.email || '', phone: U?.phone || '',
  });
  const h = (k) => (e) => s((p) => ({ ...p, [k]: e.target.value }));
  return (
    <form className="pfp-form" onSubmit={(e) => { e.preventDefault(); onSave({ firstName: f.firstName, lastName: f.lastName, email: f.email, phone: f.phone, location: f.location }, { headline: f.headline, location: f.location }); }}>
      <div className="pfp-form__2col">
        <label>First Name<input value={f.firstName} onChange={h('firstName')} required /></label>
        <label>Last Name<input value={f.lastName} onChange={h('lastName')} required /></label>
      </div>
      <label>Headline<input value={f.headline} onChange={h('headline')} placeholder="e.g. Senior React Developer" /></label>
      <label>Location<input value={f.location} onChange={h('location')} placeholder="City, Country" /></label>
      <div className="pfp-form__2col">
        <label>Email<input type="email" value={f.email} onChange={h('email')} /></label>
        <label>Phone<input value={f.phone} onChange={h('phone')} placeholder="+1 555 000 0000" /></label>
      </div>
      <div className="pfp-form__foot"><button type="button" className="pfp-btn pfp-btn--ghost" onClick={onCancel}>Cancel</button><button className="pfp-btn pfp-btn--primary">Save</button></div>
    </form>
  );
}

function AboutForm({ val, onSave, onCancel }) {
  const [v, s] = useState(val);
  return (
    <form className="pfp-form" onSubmit={(e) => { e.preventDefault(); onSave(v); }}>
      <label>Bio<textarea rows={6} value={v} onChange={(e) => s(e.target.value)} placeholder="Write about yourself…" /></label>
      <div className="pfp-form__foot"><button type="button" className="pfp-btn pfp-btn--ghost" onClick={onCancel}>Cancel</button><button className="pfp-btn pfp-btn--primary">Save</button></div>
    </form>
  );
}

function ExpForm({ data, onSave, onCancel }) {
  const [f, s] = useState({
    position: data?.position || '', company: data?.company || '',
    employmentType: data?.employmentType || '', location: data?.location || '',
    startDate: data?.startDate?.slice(0, 10) || '', endDate: data?.endDate?.slice(0, 10) || '',
    description: data?.description || '',
    technologies: Array.isArray(data?.technologies) ? data.technologies.join(', ') : data?.technologies || '',
  });
  const h = (k) => (e) => s((p) => ({ ...p, [k]: e.target.value }));
  return (
    <form className="pfp-form" onSubmit={(e) => { e.preventDefault(); onSave({ ...f, technologies: f.technologies ? f.technologies.split(',').map(t => t.trim()).filter(Boolean) : [] }); }}>
      <div className="pfp-form__2col">
        <label>Position *<input value={f.position} onChange={h('position')} required /></label>
        <label>Company *<input value={f.company} onChange={h('company')} required /></label>
      </div>
      <div className="pfp-form__2col">
        <label>Employment Type<select value={f.employmentType} onChange={h('employmentType')}><option value="">Select…</option>{EMP_TYPES.map(t => <option key={t}>{t}</option>)}</select></label>
        <label>Location<input value={f.location} onChange={h('location')} /></label>
      </div>
      <div className="pfp-form__2col">
        <label>Start Date *<input type="date" value={f.startDate} onChange={h('startDate')} required /></label>
        <label>End Date <span className="pfp-hint">(empty = present)</span><input type="date" value={f.endDate} onChange={h('endDate')} /></label>
      </div>
      <label>Description<textarea rows={4} value={f.description} onChange={h('description')} /></label>
      <label>Technologies <span className="pfp-hint">(comma-separated)</span><input value={f.technologies} onChange={h('technologies')} /></label>
      <div className="pfp-form__foot"><button type="button" className="pfp-btn pfp-btn--ghost" onClick={onCancel}>Cancel</button><button className="pfp-btn pfp-btn--primary">Save</button></div>
    </form>
  );
}

function EduForm({ data, onSave, onCancel }) {
  const [f, s] = useState({
    institution: data?.institution || '', degree: data?.degree || '', field: data?.field || '',
    startYear: data?.startYear || '', endYear: data?.endYear || '', description: data?.description || '',
  });
  const h = (k) => (e) => s((p) => ({ ...p, [k]: e.target.value }));
  return (
    <form className="pfp-form" onSubmit={(e) => { e.preventDefault(); onSave(f); }}>
      <label>Institution *<input value={f.institution} onChange={h('institution')} required /></label>
      <div className="pfp-form__2col">
        <label>Degree *<input value={f.degree} onChange={h('degree')} required /></label>
        <label>Field<input value={f.field} onChange={h('field')} /></label>
      </div>
      <div className="pfp-form__2col">
        <label>Start Year *<input type="number" value={f.startYear} onChange={h('startYear')} required min="1950" max="2035" /></label>
        <label>End Year<input type="number" value={f.endYear} onChange={h('endYear')} min="1950" max="2040" /></label>
      </div>
      <label>Description<textarea rows={3} value={f.description} onChange={h('description')} /></label>
      <div className="pfp-form__foot"><button type="button" className="pfp-btn pfp-btn--ghost" onClick={onCancel}>Cancel</button><button className="pfp-btn pfp-btn--primary">Save</button></div>
    </form>
  );
}

function CertForm({ data, onSave, onCancel }) {
  const [f, s] = useState({
    name: data?.name || '', issuer: data?.issuer || '',
    issueDate: data?.issueDate?.slice(0, 10) || '', expiryDate: data?.expiryDate?.slice(0, 10) || '',
    credentialUrl: data?.credentialUrl || '',
  });
  const h = (k) => (e) => s((p) => ({ ...p, [k]: e.target.value }));
  return (
    <form className="pfp-form" onSubmit={(e) => { e.preventDefault(); onSave(f); }}>
      <label>Name *<input value={f.name} onChange={h('name')} required /></label>
      <label>Issuer *<input value={f.issuer} onChange={h('issuer')} required /></label>
      <div className="pfp-form__2col">
        <label>Issue Date<input type="date" value={f.issueDate} onChange={h('issueDate')} /></label>
        <label>Expiry Date<input type="date" value={f.expiryDate} onChange={h('expiryDate')} /></label>
      </div>
      <label>Credential URL<input value={f.credentialUrl} onChange={h('credentialUrl')} placeholder="https://…" /></label>
      <div className="pfp-form__foot"><button type="button" className="pfp-btn pfp-btn--ghost" onClick={onCancel}>Cancel</button><button className="pfp-btn pfp-btn--primary">Save</button></div>
    </form>
  );
}

function SvcForm({ data, onSave, onCancel }) {
  const [f, s] = useState({
    title: data?.title || '', description: data?.description || '',
    startingPrice: data?.startingPrice || '', serviceType: data?.serviceType || '',
    deliverables: Array.isArray(data?.deliverables) ? data.deliverables.join(', ') : data?.deliverables || '',
  });
  const h = (k) => (e) => s((p) => ({ ...p, [k]: e.target.value }));
  return (
    <form className="pfp-form" onSubmit={(e) => { e.preventDefault(); onSave({ ...f, startingPrice: Number(f.startingPrice) || 0, deliverables: f.deliverables ? f.deliverables.split(',').map(d => d.trim()).filter(Boolean) : [] }); }}>
      <label>Title *<input value={f.title} onChange={h('title')} required /></label>
      <div className="pfp-form__2col">
        <label>Type<select value={f.serviceType} onChange={h('serviceType')}><option value="">Select…</option><option value="development">Development</option><option value="design">Design</option><option value="consulting">Consulting</option><option value="marketing">Marketing</option><option value="writing">Writing</option><option value="other">Other</option></select></label>
        <label>Starting Price ($)<input type="number" value={f.startingPrice} onChange={h('startingPrice')} min="0" /></label>
      </div>
      <label>Description *<textarea rows={4} value={f.description} onChange={h('description')} required /></label>
      <label>Deliverables <span className="pfp-hint">(comma-separated)</span><input value={f.deliverables} onChange={h('deliverables')} /></label>
      <div className="pfp-form__foot"><button type="button" className="pfp-btn pfp-btn--ghost" onClick={onCancel}>Cancel</button><button className="pfp-btn pfp-btn--primary">Save</button></div>
    </form>
  );
}

function FolioForm({ data, onSave, onCancel }) {
  const [f, s] = useState({
    title: data?.title || '', category: data?.category || '',
    description: data?.description || '', imageUrl: data?.imageUrl || '',
    results: data?.results || '', projectUrl: data?.projectUrl || '',
    technologies: Array.isArray(data?.technologies) ? data.technologies.join(', ') : data?.technologies || '',
  });
  const h = (k) => (e) => s((p) => ({ ...p, [k]: e.target.value }));
  return (
    <form className="pfp-form" onSubmit={(e) => { e.preventDefault(); onSave({ ...f, technologies: f.technologies ? f.technologies.split(',').map(t => t.trim()).filter(Boolean) : [] }); }}>
      <div className="pfp-form__2col">
        <label>Title *<input value={f.title} onChange={h('title')} required /></label>
        <label>Category<input value={f.category} onChange={h('category')} /></label>
      </div>
      <label>Description *<textarea rows={4} value={f.description} onChange={h('description')} required /></label>
      <label>Results / Impact<textarea rows={2} value={f.results} onChange={h('results')} /></label>
      <label>Image URL<input value={f.imageUrl} onChange={h('imageUrl')} placeholder="https://…" /></label>
      <label>Technologies <span className="pfp-hint">(comma-separated)</span><input value={f.technologies} onChange={h('technologies')} /></label>
      <label>Project URL<input value={f.projectUrl} onChange={h('projectUrl')} placeholder="https://…" /></label>
      <div className="pfp-form__foot"><button type="button" className="pfp-btn pfp-btn--ghost" onClick={onCancel}>Cancel</button><button className="pfp-btn pfp-btn--primary">Save</button></div>
    </form>
  );
}

function SkillForm({ skills, onAdd, onDel, onClose }) {
  const [v, s] = useState('');
  const add = () => {
    if (!v.trim()) return;
    if (skills.some((sk) => (sk.skillId || sk.name || '').toLowerCase() === v.trim().toLowerCase())) return;
    onAdd({ skillId: v.trim(), endorsementCount: 0 });
    s('');
  };
  return (
    <div className="pfp-form">
      <div className="pfp-form__row-inline">
        <input value={v} onChange={(e) => s(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())} placeholder="Type a skill…" />
        <button className="pfp-btn pfp-btn--primary pfp-btn--sm" onClick={add} type="button">Add</button>
      </div>
      {skills.length > 0 && (
        <div className="pfp-chips pfp-chips--wrap" style={{ marginTop: 16 }}>
          {skills.map((sk, i) => (
            <span key={i} className="pfp-chip pfp-chip--skill">
              {sk.skillId || sk.name}
              <button onClick={() => onDel(i)}>×</button>
            </span>
          ))}
        </div>
      )}
      <div className="pfp-form__foot"><button className="pfp-btn pfp-btn--ghost" onClick={onClose}>Done</button></div>
    </div>
  );
}

function RateForm({ F, onSave, onCancel }) {
  const [f, s] = useState({
    isOpenToWork: F?.isOpenToWork || false,
    isAvailable: F?.isAvailable || false,
    availability: F?.availability || '',
    hourlyRate: F?.hourlyRate || '',
    responseTime: F?.responseTime || '',
  });
  const h = (k) => (e) => s((p) => ({ ...p, [k]: e.target.value }));
  return (
    <form className="pfp-form" onSubmit={(e) => { e.preventDefault(); onSave({ ...f, hourlyRate: Number(f.hourlyRate) || 0 }); }}>
      <label className="pfp-toggle-label">
        <span>Open to Work</span>
        <button type="button" className={`pfp-toggle ${f.isOpenToWork ? 'on' : ''}`} onClick={() => s(p => ({ ...p, isOpenToWork: !p.isOpenToWork, isAvailable: !p.isOpenToWork }))}>
          <span className="pfp-toggle__dot" />
        </button>
      </label>
      <label>Availability<select value={f.availability} onChange={h('availability')}><option value="">Select…</option>{AVAIL_OPTS.map(o => <option key={o}>{o}</option>)}</select></label>
      <label>Hourly Rate ($)<input type="number" value={f.hourlyRate} onChange={h('hourlyRate')} min="0" /></label>
      <label>Response Time<input value={f.responseTime} onChange={h('responseTime')} placeholder="e.g. Within 2 hours" /></label>
      <div className="pfp-form__foot"><button type="button" className="pfp-btn pfp-btn--ghost" onClick={onCancel}>Cancel</button><button className="pfp-btn pfp-btn--primary">Save</button></div>
    </form>
  );
}