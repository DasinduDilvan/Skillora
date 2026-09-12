// src/components/FreelancerComponents/MyProjects/WorkingOn.jsx
import { useState, useMemo } from 'react';
import API from '../../../api/axios';
import './WorkingOn.css';

/* ---------- Helpers ---------- */
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

const formatFullDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

const getRawId = (v) => {
  if (!v) return null;
  if (typeof v === 'string') return v;
  if (typeof v === 'object') {
    return (
      v.taskId ||
      v.sectionId ||
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

const eqId = (a, b) => {
  const idA = getRawId(a);
  const idB = getRawId(b);
  if (!idA || !idB) return false;
  return String(idA) === String(idB);
};

const StatusPill = ({ status }) => {
  const map = {
    pending: { label: 'Pending', cls: 'wo-pill-gray' },
    'in-progress': { label: 'In Progress', cls: 'wo-pill-blue' },
    in_progress: { label: 'In Progress', cls: 'wo-pill-blue' },
    active: { label: 'Active', cls: 'wo-pill-blue' },
    completed: { label: 'Completed', cls: 'wo-pill-green' },
    review: { label: 'In Review', cls: 'wo-pill-amber' },
    cancelled: { label: 'Cancelled', cls: 'wo-pill-red' },
  };
  const b = map[status] || { label: status || 'Pending', cls: 'wo-pill-gray' };
  return <span className={`wo-pill ${b.cls}`}>{b.label}</span>;
};

const PriorityPill = ({ priority }) => {
  if (!priority) return null;
  const map = {
    low: 'wo-prio-low',
    medium: 'wo-prio-medium',
    high: 'wo-prio-high',
    urgent: 'wo-prio-urgent',
  };
  return (
    <span className={`wo-prio ${map[priority] || 'wo-prio-low'}`}>
      {priority.toUpperCase()}
    </span>
  );
};

export default function WorkingOn({ project, onBack, onUpdate }) {
  const [tasks, setTasks] = useState(project.tasks || []);
  const [activeSection, setActiveSection] = useState('overview');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // File submission
  const [uploadedFiles, setUploadedFiles] = useState(project.raw?.submittedFiles || []);
  const [submissionNote, setSubmissionNote] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);

  // Note editing
  const [editingNoteFor, setEditingNoteFor] = useState(null);
  const [noteDraft, setNoteDraft] = useState('');

  // Completion modal
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);

  /* ---------- Progress Calc ---------- */
  const computedProgress = useMemo(() => {
    if (tasks.length === 0) return project.progress || 0;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    return Math.round((completed / tasks.length) * 100);
  }, [tasks, project.progress]);

  const completedCount = tasks.filter((t) => t.status === 'completed').length;

  const flashNotice = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 3000);
  };

  /* ---------- Sync Project to DB ---------- */
  const syncProject = async (updatedFields) => {
    const pid = getRawId(project.projectId);
    try {
      await API.put(`/projects/${pid}`, updatedFields);
      onUpdate?.({ ...project, ...updatedFields, tasks: updatedFields.tasks || tasks });
    } catch (err) {
      console.error('Failed to sync project:', err);
      throw err;
    }
  };

  /* ---------- Task Status Change ---------- */
  const handleTaskStatusChange = async (taskId, newStatus) => {
    setSubmitting(true);
    setError('');

    try {
      const updatedTasks = tasks.map((t) => {
        const tid = t.taskId || t._id;
        if (!eqId(tid, taskId)) return t;
        return {
          ...t,
          status: newStatus,
          progress: newStatus === 'completed' ? 100 : newStatus === 'pending' ? 0 : t.progress || 50,
          completedAt: newStatus === 'completed' ? new Date() : null,
        };
      });
      setTasks(updatedTasks);

      const newProgress = updatedTasks.length
        ? Math.round(
            (updatedTasks.filter((t) => t.status === 'completed').length /
              updatedTasks.length) *
              100
          )
        : 0;

      await syncProject({ tasks: updatedTasks, progress: newProgress });
      flashNotice('Task updated successfully');
    } catch (err) {
      setError('Failed to update task. Please try again.');
      setTasks(project.tasks || []);
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- Task Progress Slider ---------- */
  const handleTaskProgressChange = async (taskId, newProgress) => {
    setSubmitting(true);
    setError('');

    try {
      const p = Math.max(0, Math.min(100, Number(newProgress)));
      const updatedTasks = tasks.map((t) => {
        const tid = t.taskId || t._id;
        if (!eqId(tid, taskId)) return t;
        return {
          ...t,
          progress: p,
          status: p === 100 ? 'completed' : p > 0 ? 'in-progress' : 'pending',
          completedAt: p === 100 ? new Date() : null,
        };
      });
      setTasks(updatedTasks);

      const newProjectProgress = updatedTasks.length
        ? Math.round(
            (updatedTasks.filter((t) => t.status === 'completed').length /
              updatedTasks.length) *
              100
          )
        : 0;

      await syncProject({ tasks: updatedTasks, progress: newProjectProgress });
    } catch (err) {
      setError('Failed to update progress.');
      setTasks(project.tasks || []);
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- Task Note Save ---------- */
  const handleSaveNote = async (taskId) => {
    setSubmitting(true);
    setError('');

    try {
      const updatedTasks = tasks.map((t) => {
        const tid = t.taskId || t._id;
        if (!eqId(tid, taskId)) return t;
        return { ...t, freelancerNote: noteDraft };
      });
      setTasks(updatedTasks);
      await syncProject({ tasks: updatedTasks });

      setEditingNoteFor(null);
      setNoteDraft('');
      flashNotice('Note saved');
    } catch (err) {
      setError('Failed to save note.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- Section Toggle ---------- */
  const handleSectionStatusToggle = async (taskId, sectionId) => {
    setSubmitting(true);
    setError('');

    try {
      const updatedTasks = tasks.map((t) => {
        const tid = t.taskId || t._id;
        if (!eqId(tid, taskId)) return t;

        const updatedSections = (t.sections || []).map((s) => {
          const sid = s.sectionId || s._id;
          if (!eqId(sid, sectionId)) return s;
          const isDone = s.status === 'completed';
          return {
            ...s,
            status: isDone ? 'pending' : 'completed',
            progress: isDone ? 0 : 100,
          };
        });

        let taskProgress = t.progress || 0;
        if (updatedSections.length > 0) {
          const completedSecs = updatedSections.filter(
            (s) => s.status === 'completed'
          ).length;
          taskProgress = Math.round((completedSecs / updatedSections.length) * 100);
        }

        return {
          ...t,
          sections: updatedSections,
          progress: taskProgress,
          status:
            taskProgress === 100
              ? 'completed'
              : taskProgress > 0
              ? 'in-progress'
              : 'pending',
        };
      });

      setTasks(updatedTasks);

      const newProgress = updatedTasks.length
        ? Math.round(
            (updatedTasks.filter((t) => t.status === 'completed').length /
              updatedTasks.length) *
              100
          )
        : 0;

      await syncProject({ tasks: updatedTasks, progress: newProgress });
    } catch (err) {
      setError('Failed to update section.');
      setTasks(project.tasks || []);
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- File Upload ---------- */
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const removeSelectedFile = (idx) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleFileSubmit = async () => {
    if (selectedFiles.length === 0 && !submissionNote.trim()) {
      setError('Please add files or write a note before submitting.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const newSubmission = {
        submissionId: `sub_${Date.now()}`,
        files: selectedFiles.map((f) => ({
          name: f.name,
          size: f.size,
          type: f.type,
          uploadedAt: new Date(),
        })),
        note: submissionNote.trim(),
        submittedAt: new Date(),
        status: 'pending-review',
      };

      const updatedFiles = [...uploadedFiles, newSubmission];

      await API.put(`/projects/${getRawId(project.projectId)}`, {
        submittedFiles: updatedFiles,
      });

      setUploadedFiles(updatedFiles);
      setSelectedFiles([]);
      setSubmissionNote('');
      flashNotice(
        `✅ ${selectedFiles.length} file(s) submitted successfully to client`
      );

      onUpdate?.({
        ...project,
        raw: { ...project.raw, submittedFiles: updatedFiles },
      });
    } catch (err) {
      console.error('File submission failed:', err);
      setError(
        err.response?.data?.message || 'Failed to submit files. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- Request Completion ---------- */
  const handleRequestCompletion = async () => {
    setSubmitting(true);
    setError('');

    try {
      await API.put(`/projects/${getRawId(project.projectId)}`, {
        progress: 100,
        status: 'review',
        completionRequestedAt: new Date(),
      });

      flashNotice('✅ Completion requested. Waiting for client approval.');
      onUpdate?.({ ...project, status: 'review', progress: 100 });
      setShowCompleteConfirm(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to request completion.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="wo-page">
      {/* HEADER */}
      <div className="wo-header">
        <div className="wo-header-inner">
          <button className="wo-back-btn" onClick={onBack}>
            ← Back to Projects
          </button>

          <div className="wo-header-body">
            <div className="wo-header-left">
              <div className="wo-header-badges">
                <span className="wo-cat-badge">
                  {project.categoryIcon} {project.categoryName}
                </span>
                <StatusPill status={project.status} />
                {project.isOverdue && (
                  <span className="wo-pill wo-pill-red">⚠ Overdue</span>
                )}
              </div>
              <h1>{project.title}</h1>
              <div className="wo-header-meta">
                <span>📅 Deadline: {formatDate(project.deadline)}</span>
                <span>•</span>
                <span>💰 {formatCurrency(project.budget)}</span>
                {project.daysLeft !== null && (
                  <>
                    <span>•</span>
                    <span className={project.isOverdue ? 'danger' : ''}>
                      {project.daysLeft < 0
                        ? `${Math.abs(project.daysLeft)} days overdue`
                        : `${project.daysLeft} days left`}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="wo-header-right">
              <div className="wo-header-progress-block">
                <div className="wo-header-progress-label">
                  <span>Overall Progress</span>
                  <strong>{computedProgress}%</strong>
                </div>
                <div className="wo-header-progress-bar">
                  <div
                    className={`wo-header-progress-fill ${
                      computedProgress === 100 ? 'done' : ''
                    }`}
                    style={{ width: `${computedProgress}%` }}
                  />
                </div>
                <span className="wo-header-progress-sub">
                  {completedCount} of {tasks.length} tasks completed
                </span>
              </div>

              {project.status !== 'completed' &&
                project.status !== 'cancelled' &&
                project.status !== 'review' && (
                  <button
                    className="wo-btn wo-btn-primary"
                    onClick={() => setShowCompleteConfirm(true)}
                    disabled={submitting || computedProgress < 100}
                    title={
                      computedProgress < 100
                        ? 'Complete all tasks before requesting completion'
                        : 'Request project completion'
                    }
                  >
                    ✓ Request Completion
                  </button>
                )}
            </div>
          </div>
        </div>
      </div>

      {/* NAV TABS */}
      <div className="wo-nav">
        <div className="wo-nav-inner">
          {[
            { id: 'overview', label: 'Overview', icon: '📋' },
            { id: 'tasks', label: `Tasks (${tasks.length})`, icon: '✓' },
            { id: 'files', label: `Submissions (${uploadedFiles.length})`, icon: '📎' },
          ].map((s) => (
            <button
              key={s.id}
              className={`wo-nav-item ${activeSection === s.id ? 'active' : ''}`}
              onClick={() => setActiveSection(s.id)}
            >
              <span>{s.icon}</span>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* FLASH NOTICES */}
      {(error || notice) && (
        <div className="wo-flash-wrap">
          {error && (
            <div className="wo-alert error">
              <span>⚠️</span>
              <p>{error}</p>
              <button onClick={() => setError('')}>×</button>
            </div>
          )}
          {notice && (
            <div className="wo-alert success">
              <span>✅</span>
              <p>{notice}</p>
              <button onClick={() => setNotice('')}>×</button>
            </div>
          )}
        </div>
      )}

      {/* CONTENT */}
      <div className="wo-content">
        {/* OVERVIEW */}
        {activeSection === 'overview' && (
          <div className="wo-grid">
            <div className="wo-main-col">
              <section className="wo-card">
                <h3>📄 Project Description</h3>
                <p className="wo-text">{project.description}</p>
              </section>

              {project.metadata?.workRequirements && (
                <section className="wo-card">
                  <h3>📌 Deliverables & Requirements</h3>
                  <p className="wo-text">{project.metadata.workRequirements}</p>
                </section>
              )}

              {project.metadata?.requiredSkills?.length > 0 && (
                <section className="wo-card">
                  <h3>🛠 Required Skills</h3>
                  <div className="wo-chips">
                    {project.metadata.requiredSkills.map((s, i) => (
                      <span key={i} className="wo-chip">
                        {s}
                      </span>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <div className="wo-side-col">
              <section className="wo-card">
                <h3>👤 Client</h3>
                <div className="wo-client-block">
                  <div className="wo-client-avatar">
                    {(project.client.name || 'C').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <strong>{project.client.name}</strong>
                    {project.client.companyName && (
                      <p>{project.client.companyName}</p>
                    )}
                  </div>
                </div>
              </section>

              <section className="wo-card">
                <h3>📅 Timeline</h3>
                <div className="wo-timeline">
                  <div className="wo-tl-item">
                    <span className="wo-tl-dot start" />
                    <div>
                      <strong>Start Date</strong>
                      <span>{formatFullDate(project.startDate)}</span>
                    </div>
                  </div>
                  <div className="wo-tl-item">
                    <span
                      className={`wo-tl-dot ${
                        project.isOverdue ? 'overdue' : 'end'
                      }`}
                    />
                    <div>
                      <strong>Deadline</strong>
                      <span className={project.isOverdue ? 'danger' : ''}>
                        {formatFullDate(project.deadline)}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              <section className="wo-card">
                <h3>💰 Budget Info</h3>
                <div className="wo-info-list">
                  <div>
                    <span>Total Budget</span>
                    <strong>{formatCurrency(project.budget)}</strong>
                  </div>
                  {project.metadata?.projectType && (
                    <div>
                      <span>Payment Model</span>
                      <strong>{project.metadata.projectType}</strong>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        )}

        {/* TASKS */}
        {activeSection === 'tasks' && (
          <div className="wo-single-col">
            <div className="wo-tasks-header">
              <div>
                <h2>Task Checklist</h2>
                <p>
                  Track your progress by updating task status. Progress bars
                  update automatically.
                </p>
              </div>
              <div className="wo-tasks-summary">
                <div className="wo-summary-item">
                  <strong>{completedCount}</strong>
                  <span>Done</span>
                </div>
                <div className="wo-summary-item">
                  <strong>
                    {
                      tasks.filter(
                        (t) =>
                          t.status === 'in-progress' || t.status === 'in_progress'
                      ).length
                    }
                  </strong>
                  <span>In Progress</span>
                </div>
                <div className="wo-summary-item">
                  <strong>
                    {
                      tasks.filter(
                        (t) => !t.status || t.status === 'pending'
                      ).length
                    }
                  </strong>
                  <span>Pending</span>
                </div>
              </div>
            </div>

            {tasks.length === 0 ? (
              <div className="wo-empty">
                <div className="wo-empty-icon">📋</div>
                <h3>No tasks assigned yet</h3>
                <p>
                  Your client hasn't created any tasks for this project. Contact
                  them if you need task breakdowns.
                </p>
              </div>
            ) : (
              <div className="wo-task-list">
                {tasks.map((task, idx) => {
                  const tid = task.taskId || task._id || idx;
                  const isDone = task.status === 'completed';
                  const isInProgress =
                    task.status === 'in-progress' || task.status === 'in_progress';

                  return (
                    <div key={tid} className={`wo-task ${isDone ? 'done' : ''}`}>
                      <div className="wo-task-main">
                        <label className="wo-task-check">
                          <input
                            type="checkbox"
                            checked={isDone}
                            disabled={submitting}
                            onChange={() =>
                              handleTaskStatusChange(
                                tid,
                                isDone ? 'pending' : 'completed'
                              )
                            }
                          />
                          <span className="wo-check-visual" />
                        </label>

                        <div className="wo-task-body">
                          <div className="wo-task-top">
                            <div>
                              <h4 className={isDone ? 'done' : ''}>
                                {task.title}
                              </h4>
                              {task.description && <p>{task.description}</p>}
                            </div>
                            <div className="wo-task-badges">
                              <StatusPill status={task.status || 'pending'} />
                              <PriorityPill priority={task.priority} />
                            </div>
                          </div>

                          <div className="wo-task-metrics">
                            {task.budget > 0 && (
                              <span>💰 {formatCurrency(task.budget)}</span>
                            )}
                            {task.deadline && (
                              <span>🎯 Due {formatDate(task.deadline)}</span>
                            )}
                            {task.workRange && (
                              <span>📏 {task.workRange}</span>
                            )}
                          </div>

                          {/* Progress Slider */}
                          <div className="wo-task-progress-block">
                            <div className="wo-progress-slider-row">
                              <input
                                type="range"
                                min="0"
                                max="100"
                                step="5"
                                value={task.progress || 0}
                                disabled={submitting || isDone}
                                onChange={(e) =>
                                  handleTaskProgressChange(tid, e.target.value)
                                }
                                className="wo-progress-slider"
                              />
                              <span className="wo-progress-val">
                                {task.progress || 0}%
                              </span>
                            </div>
                            <div className="wo-progress-bar-outer">
                              <div
                                className={`wo-progress-bar-fill ${
                                  isDone ? 'done' : ''
                                }`}
                                style={{ width: `${task.progress || 0}%` }}
                              />
                            </div>
                          </div>

                          {/* Client Note */}
                          {task.clientNote && (
                            <div className="wo-note client">
                              <strong>💬 Client Note:</strong>
                              <p>{task.clientNote}</p>
                            </div>
                          )}

                          {/* Freelancer Note */}
                          {task.freelancerNote && editingNoteFor !== tid && (
                            <div className="wo-note freelancer">
                              <strong>📝 Your Note:</strong>
                              <p>{task.freelancerNote}</p>
                              <button
                                className="wo-note-edit-btn"
                                onClick={() => {
                                  setEditingNoteFor(tid);
                                  setNoteDraft(task.freelancerNote);
                                }}
                              >
                                Edit
                              </button>
                            </div>
                          )}

                          {editingNoteFor === tid && (
                            <div className="wo-note-editor">
                              <textarea
                                rows="3"
                                value={noteDraft}
                                onChange={(e) => setNoteDraft(e.target.value)}
                                placeholder="Add a note about your progress..."
                                disabled={submitting}
                              />
                              <div className="wo-note-actions">
                                <button
                                  className="wo-btn wo-btn-sm wo-btn-outline"
                                  onClick={() => {
                                    setEditingNoteFor(null);
                                    setNoteDraft('');
                                  }}
                                  disabled={submitting}
                                >
                                  Cancel
                                </button>
                                <button
                                  className="wo-btn wo-btn-sm wo-btn-primary"
                                  onClick={() => handleSaveNote(tid)}
                                  disabled={submitting}
                                >
                                  Save Note
                                </button>
                              </div>
                            </div>
                          )}

                          {!task.freelancerNote && editingNoteFor !== tid && (
                            <button
                              className="wo-add-note-btn"
                              onClick={() => {
                                setEditingNoteFor(tid);
                                setNoteDraft('');
                              }}
                            >
                              + Add Progress Note
                            </button>
                          )}

                          {/* Sections */}
                          {task.sections?.length > 0 && (
                            <div className="wo-sections">
                              <span className="wo-sec-title">
                                Sub-sections ({task.sections.length})
                              </span>
                              {task.sections
                                .slice()
                                .sort(
                                  (a, b) => (a.order || 0) - (b.order || 0)
                                )
                                .map((sec, si) => {
                                  const sid = sec.sectionId || sec._id || si;
                                  const secDone = sec.status === 'completed';
                                  return (
                                    <div
                                      key={sid}
                                      className={`wo-section ${
                                        secDone ? 'done' : ''
                                      }`}
                                    >
                                      <label className="wo-sec-check">
                                        <input
                                          type="checkbox"
                                          checked={secDone}
                                          disabled={submitting}
                                          onChange={() =>
                                            handleSectionStatusToggle(tid, sid)
                                          }
                                        />
                                        <span className="wo-check-visual sm" />
                                      </label>
                                      <div className="wo-sec-body">
                                        <strong className={secDone ? 'done' : ''}>
                                          {sec.title}
                                        </strong>
                                        {sec.description && (
                                          <p>{sec.description}</p>
                                        )}
                                        <div className="wo-sec-foot">
                                          <span>
                                            Due {formatDate(sec.dueDate)}
                                          </span>
                                          {sec.progress > 0 && (
                                            <span>· {sec.progress}%</span>
                                          )}
                                        </div>
                                      </div>
                                      <StatusPill
                                        status={sec.status || 'pending'}
                                      />
                                    </div>
                                  );
                                })}
                            </div>
                          )}

                          {/* Quick Actions */}
                          <div className="wo-task-quick-actions">
                            {!isDone && !isInProgress && (
                              <button
                                className="wo-btn wo-btn-sm wo-btn-outline"
                                onClick={() =>
                                  handleTaskStatusChange(tid, 'in-progress')
                                }
                                disabled={submitting}
                              >
                                ▶ Start Working
                              </button>
                            )}
                            {!isDone && (
                              <button
                                className="wo-btn wo-btn-sm wo-btn-success"
                                onClick={() =>
                                  handleTaskStatusChange(tid, 'completed')
                                }
                                disabled={submitting}
                              >
                                ✓ Mark Complete
                              </button>
                            )}
                            {isDone && (
                              <button
                                className="wo-btn wo-btn-sm wo-btn-outline"
                                onClick={() =>
                                  handleTaskStatusChange(tid, 'in-progress')
                                }
                                disabled={submitting}
                              >
                                ↺ Reopen Task
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* FILES */}
        {activeSection === 'files' && (
          <div className="wo-single-col">
            <div className="wo-tasks-header">
              <div>
                <h2>File Submissions</h2>
                <p>
                  Upload deliverables and files for client review.
                </p>
              </div>
            </div>

            {/* Upload Zone */}
            <section className="wo-card wo-upload-card">
              <h3>📤 New Submission</h3>

              <label className="wo-upload-zone">
                <input
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  disabled={submitting}
                  style={{ display: 'none' }}
                />
                <div className="wo-upload-icon">📁</div>
                <strong>Click to select files or drag & drop</strong>
                <span>Any file type — Max 25MB per file</span>
              </label>

              {selectedFiles.length > 0 && (
                <div className="wo-selected-files">
                  <span className="wo-sel-label">
                    Selected files ({selectedFiles.length})
                  </span>
                  {selectedFiles.map((f, i) => (
                    <div key={i} className="wo-file-item pending">
                      <div className="wo-file-icon">📎</div>
                      <div className="wo-file-info">
                        <strong>{f.name}</strong>
                        <span>
                          {(f.size / 1024).toFixed(1)} KB · {f.type || 'file'}
                        </span>
                      </div>
                      <button
                        className="wo-file-remove"
                        onClick={() => removeSelectedFile(i)}
                        disabled={submitting}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="wo-submission-note">
                <label>Submission Note (optional)</label>
                <textarea
                  rows="3"
                  value={submissionNote}
                  onChange={(e) => setSubmissionNote(e.target.value)}
                  placeholder="Describe what you're submitting..."
                  disabled={submitting}
                />
              </div>

              <button
                className="wo-btn wo-btn-primary full"
                onClick={handleFileSubmit}
                disabled={
                  submitting ||
                  (selectedFiles.length === 0 && !submissionNote.trim())
                }
              >
                {submitting ? 'Submitting...' : '📤 Submit to Client'}
              </button>
            </section>

            {/* History */}
            <div className="wo-submissions-history">
              <h3>📚 Submission History</h3>

              {uploadedFiles.length === 0 ? (
                <div className="wo-empty">
                  <div className="wo-empty-icon">📭</div>
                  <h3>No submissions yet</h3>
                  <p>Your first submission will appear here after upload.</p>
                </div>
              ) : (
                <div className="wo-submission-list">
                  {uploadedFiles
                    .slice()
                    .reverse()
                    .map((sub, i) => (
                      <div
                        key={sub.submissionId || i}
                        className="wo-submission-item"
                      >
                        <div className="wo-sub-head">
                          <div className="wo-sub-num">
                            #{uploadedFiles.length - i}
                          </div>
                          <div className="wo-sub-info">
                            <strong>
                              Submission on {formatDate(sub.submittedAt)}
                            </strong>
                            <span>
                              {sub.files?.length || 0} file
                              {(sub.files?.length || 0) !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <StatusPill status={sub.status || 'pending-review'} />
                        </div>

                        {sub.note && (
                          <div className="wo-sub-note">
                            <strong>Note:</strong> {sub.note}
                          </div>
                        )}

                        {sub.files?.length > 0 && (
                          <div className="wo-sub-files">
                            {sub.files.map((f, fi) => (
                              <div key={fi} className="wo-file-item saved">
                                <div className="wo-file-icon">📎</div>
                                <div className="wo-file-info">
                                  <strong>{f.name}</strong>
                                  <span>
                                    {(f.size / 1024).toFixed(1)} KB
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* COMPLETION MODAL */}
      {showCompleteConfirm && (
        <div
          className="wo-modal-overlay"
          onClick={() => !submitting && setShowCompleteConfirm(false)}
        >
          <div className="wo-modal" onClick={(e) => e.stopPropagation()}>
            <div className="wo-modal-icon">✅</div>
            <h3>Request Project Completion?</h3>
            <p>
              This will notify <strong>{project.client.name}</strong> that all
              deliverables are ready for final review.
            </p>

            <div className="wo-modal-actions">
              <button
                className="wo-btn wo-btn-outline"
                onClick={() => setShowCompleteConfirm(false)}
                disabled={submitting}
              >
                Not Yet
              </button>
              <button
                className="wo-btn wo-btn-success"
                onClick={handleRequestCompletion}
                disabled={submitting}
              >
                {submitting ? 'Sending...' : 'Yes, Request Completion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}