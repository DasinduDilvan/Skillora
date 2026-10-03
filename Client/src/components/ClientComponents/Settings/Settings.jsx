// src/components/ClientComponents/Settings/Settings.jsx
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import API from '../../../api/axios';
import './Settings.css';

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

const eqId = (a, b) => {
  const getId = (v) => {
    if (!v) return null;
    if (typeof v === 'string') return v;
    if (typeof v === 'object')
      return v.userId || v.clientId || v._id || v.id || null;
    return String(v);
  };
  const x = getId(a), y = getId(b);
  return x && y && String(x) === String(y);
};

const SECTIONS = [
  { id: 'profile',   label: 'Personal Info',  icon: '👤' },
  { id: 'company',   label: 'Company Details', icon: '🏢' },
  { id: 'security',  label: 'Security',        icon: '🔒' },
  { id: 'prefs',     label: 'Preferences',     icon: '🎯' },
  { id: 'account',   label: 'Account',         icon: '⚙️' },
];

/* ============================================================
   MAIN COMPONENT
============================================================ */
export default function Settings() {
  const { user, setUser, logout } = useAuth();

  const [activeSection, setActiveSection] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ show: false, type: '', msg: '' });

  const [client, setClient] = useState(null);

  const [profileForm, setProfileForm] = useState({
    firstName: '', lastName: '', username: '', email: '', phone: '',
    location: '', bio: '', profileImage: '',
  });

  const [companyForm, setCompanyForm] = useState({
    companyName: '', companyLogo: '', companyDescription: '',
    industry: '', website: '', companySize: '', jobTitle: '',
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '', newPassword: '', confirmPassword: '',
  });

  const [prefsForm, setPrefsForm] = useState({
    preferredFreelancerType: 'any',
    preferredProjectType: 'any',
    preferredBudgetMin: '',
    preferredBudgetMax: '',
  });

  const [deleteConfirm, setDeleteConfirm] = useState('');

  const currentUserId = user?.userId || user?._id || user?.id;

  const showToast = (type, msg) => {
    setToast({ show: true, type, msg });
    setTimeout(() => setToast({ show: false, type: '', msg: '' }), 3500);
  };

  const fetchData = useCallback(async () => {
    if (!currentUserId) return;
    try {
      setLoading(true);
      const res = await API.get('/clients').catch(() => ({ data: [] }));
      const allClients = asArray(res);
      const myClient = allClients.find((c) => eqId(c.userId, currentUserId));
      setClient(myClient);

      setProfileForm({
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        username: user?.username || '',
        email: user?.email || '',
        phone: user?.phone || '',
        location: user?.location || myClient?.location || '',
        bio: user?.bio || myClient?.bio || '',
        profileImage: user?.profileImage || '',
      });

      if (myClient) {
        setCompanyForm({
          companyName: myClient.companyName || '',
          companyLogo: myClient.companyLogo || '',
          companyDescription: myClient.companyDescription || '',
          industry: myClient.industry || '',
          website: myClient.website || '',
          companySize: myClient.companySize || '',
          jobTitle: myClient.jobTitle || '',
        });
        setPrefsForm({
          preferredFreelancerType: myClient.preferredFreelancerType || 'any',
          preferredProjectType: myClient.preferredProjectType || 'any',
          preferredBudgetMin: myClient.preferredBudgetMin || '',
          preferredBudgetMax: myClient.preferredBudgetMax || '',
        });
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
      showToast('error', 'Failed to load settings.');
    } finally {
      setLoading(false);
    }
  }, [currentUserId, user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ---------- SAVE: PERSONAL PROFILE ---------- */
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await API.put(`/users/${currentUserId}`, {
        firstName: profileForm.firstName,
        lastName: profileForm.lastName,
        username: profileForm.username,
        email: profileForm.email,
        phone: profileForm.phone,
        location: profileForm.location,
        bio: profileForm.bio,
        profileImage: profileForm.profileImage,
      });
      if (client) {
        const cid = client.clientId || client._id;
        await API.put(`/clients/${cid}`, {
          location: profileForm.location,
          bio: profileForm.bio,
        });
      }
      if (setUser) setUser({ ...user, ...profileForm });
      showToast('success', 'Profile updated successfully!');
    } catch (err) {
      showToast('error', err?.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  /* ---------- SAVE: COMPANY ---------- */
  const handleSaveCompany = async (e) => {
    e.preventDefault();
    if (!client) { showToast('error', 'Client profile not found.'); return; }
    try {
      setSaving(true);
      const cid = client.clientId || client._id;
      await API.put(`/clients/${cid}`, companyForm);
      showToast('success', 'Company details updated!');
    } catch (err) {
      showToast('error', 'Failed to update company details.');
    } finally {
      setSaving(false);
    }
  };

  /* ---------- SAVE: PASSWORD ---------- */
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      showToast('error', 'Fill in all password fields.'); return;
    }
    if (passwordForm.newPassword.length < 6) {
      showToast('error', 'Password must be at least 6 characters.'); return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast('error', 'Passwords do not match.'); return;
    }
    try {
      setSaving(true);
      await API.put(`/users/${currentUserId}`, {
        currentPassword: passwordForm.currentPassword,
        password: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showToast('success', 'Password changed successfully!');
    } catch (err) {
      showToast('error', err?.response?.data?.message || 'Failed to change password.');
    } finally {
      setSaving(false);
    }
  };

  /* ---------- SAVE: PREFERENCES ---------- */
  const handleSavePrefs = async (e) => {
    e.preventDefault();
    if (!client) { showToast('error', 'Client profile not found.'); return; }
    try {
      setSaving(true);
      const cid = client.clientId || client._id;
      await API.put(`/clients/${cid}`, {
        preferredFreelancerType: prefsForm.preferredFreelancerType,
        preferredProjectType: prefsForm.preferredProjectType,
        preferredBudgetMin: Number(prefsForm.preferredBudgetMin) || 0,
        preferredBudgetMax: Number(prefsForm.preferredBudgetMax) || 0,
      });
      showToast('success', 'Preferences saved!');
    } catch (err) {
      showToast('error', 'Failed to save preferences.');
    } finally {
      setSaving(false);
    }
  };

  /* ---------- DELETE ACCOUNT ---------- */
  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') {
      showToast('error', 'Type DELETE to confirm.'); return;
    }
    try {
      setSaving(true);
      if (client) {
        const cid = client.clientId || client._id;
        await API.delete(`/clients/${cid}`).catch(() => {});
      }
      await API.delete(`/users/${currentUserId}`);
      showToast('success', 'Account deleted. Redirecting...');
      setTimeout(() => { logout(); window.location.href = '/auth/signin'; }, 1500);
    } catch (err) {
      showToast('error', 'Failed to delete account.');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="cset-loading">
        <div className="cset-spinner" />
        <p>Loading settings...</p>
      </div>
    );
  }

  const avatarLetter = (profileForm.firstName || 'C').charAt(0).toUpperCase();

  return (
    <div className="cset-page">
      {toast.show && (
        <div className={`cset-toast cset-toast-${toast.type}`}>
          <span>{toast.type === 'success' ? '✅' : '⚠️'}</span>
          <p>{toast.msg}</p>
        </div>
      )}

      <div className="cset-hero">
        <div className="cset-hero-inner">
          <span className="cset-hero-badge">⚙️ Account Settings</span>
          <h1>Settings</h1>
          <p>Manage your profile, company, security, and preferences.</p>
        </div>
      </div>

      <div className="cset-container">
        <div className="cset-layout">
          {/* SIDEBAR */}
          <aside className="cset-sidebar">
            <div className="cset-user-card">
              <div className="cset-user-avatar">
                {profileForm.profileImage ? (
                  <img src={profileForm.profileImage} alt="" />
                ) : avatarLetter}
              </div>
              <div className="cset-user-info">
                <strong>{profileForm.firstName} {profileForm.lastName}</strong>
                <span>{profileForm.email}</span>
              </div>
            </div>
            <nav className="cset-nav">
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  className={`cset-nav-item ${activeSection === s.id ? 'active' : ''}`}
                  onClick={() => setActiveSection(s.id)}
                >
                  <span className="cset-nav-icon">{s.icon}</span>
                  <span>{s.label}</span>
                </button>
              ))}
            </nav>
          </aside>

          {/* CONTENT */}
          <div className="cset-content">

            {/* ===== PERSONAL INFO ===== */}
            {activeSection === 'profile' && (
              <form className="cset-panel" onSubmit={handleSaveProfile}>
                <div className="cset-panel-head">
                  <h2>Personal Information</h2>
                  <p>Update your personal details visible to freelancers.</p>
                </div>

                <div className="cset-avatar-section">
                  <div className="cset-avatar-lg">
                    {profileForm.profileImage ? (
                      <img src={profileForm.profileImage} alt="" />
                    ) : avatarLetter}
                  </div>
                  <div className="cset-avatar-actions">
                    <label>Profile Image URL</label>
                    <input
                      type="url" className="cset-input"
                      placeholder="https://example.com/photo.jpg"
                      value={profileForm.profileImage}
                      onChange={(e) => setProfileForm({ ...profileForm, profileImage: e.target.value })}
                    />
                  </div>
                </div>

                <div className="cset-grid-2">
                  <div className="cset-field">
                    <label>First Name *</label>
                    <input type="text" className="cset-input" value={profileForm.firstName}
                      onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })} required />
                  </div>
                  <div className="cset-field">
                    <label>Last Name *</label>
                    <input type="text" className="cset-input" value={profileForm.lastName}
                      onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })} required />
                  </div>
                </div>

                <div className="cset-grid-2">
                  <div className="cset-field">
                    <label>Username *</label>
                    <input type="text" className="cset-input" value={profileForm.username}
                      onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })} required />
                  </div>
                  <div className="cset-field">
                    <label>Email *</label>
                    <input type="email" className="cset-input" value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} required />
                  </div>
                </div>

                <div className="cset-grid-2">
                  <div className="cset-field">
                    <label>Phone</label>
                    <input type="tel" className="cset-input" placeholder="+94 77 123 4567"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} />
                  </div>
                  <div className="cset-field">
                    <label>Location</label>
                    <input type="text" className="cset-input" placeholder="City, Country"
                      value={profileForm.location}
                      onChange={(e) => setProfileForm({ ...profileForm, location: e.target.value })} />
                  </div>
                </div>

                <div className="cset-field">
                  <label>Bio</label>
                  <textarea className="cset-textarea" rows="3" placeholder="Tell freelancers about yourself..."
                    value={profileForm.bio}
                    onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })} />
                </div>

                <div className="cset-actions">
                  <button type="submit" className="cset-btn cset-btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}

            {/* ===== COMPANY DETAILS ===== */}
            {activeSection === 'company' && (
              <form className="cset-panel" onSubmit={handleSaveCompany}>
                <div className="cset-panel-head">
                  <h2>Company Details</h2>
                  <p>Update your company information displayed on your profile.</p>
                </div>

                <div className="cset-grid-2">
                  <div className="cset-field">
                    <label>Company Name</label>
                    <input type="text" className="cset-input" placeholder="Acme Corp"
                      value={companyForm.companyName}
                      onChange={(e) => setCompanyForm({ ...companyForm, companyName: e.target.value })} />
                  </div>
                  <div className="cset-field">
                    <label>Your Job Title</label>
                    <input type="text" className="cset-input" placeholder="CEO, CTO, Product Manager..."
                      value={companyForm.jobTitle}
                      onChange={(e) => setCompanyForm({ ...companyForm, jobTitle: e.target.value })} />
                  </div>
                </div>

                <div className="cset-grid-2">
                  <div className="cset-field">
                    <label>Industry</label>
                    <select className="cset-input" value={companyForm.industry}
                      onChange={(e) => setCompanyForm({ ...companyForm, industry: e.target.value })}>
                      <option value="">Select Industry</option>
                      <option value="technology">Technology</option>
                      <option value="design">Design & Creative</option>
                      <option value="marketing">Marketing & Advertising</option>
                      <option value="finance">Finance & Banking</option>
                      <option value="healthcare">Healthcare</option>
                      <option value="education">Education</option>
                      <option value="ecommerce">E-Commerce</option>
                      <option value="real-estate">Real Estate</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="cset-field">
                    <label>Company Size</label>
                    <select className="cset-input" value={companyForm.companySize}
                      onChange={(e) => setCompanyForm({ ...companyForm, companySize: e.target.value })}>
                      <option value="">Select Size</option>
                      <option value="1-10">1–10 employees</option>
                      <option value="11-50">11–50 employees</option>
                      <option value="51-200">51–200 employees</option>
                      <option value="201-500">201–500 employees</option>
                      <option value="500+">500+ employees</option>
                    </select>
                  </div>
                </div>

                <div className="cset-field">
                  <label>Website</label>
                  <input type="url" className="cset-input" placeholder="https://yourcompany.com"
                    value={companyForm.website}
                    onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })} />
                </div>

                <div className="cset-field">
                  <label>Company Logo URL</label>
                  <input type="url" className="cset-input" placeholder="https://..."
                    value={companyForm.companyLogo}
                    onChange={(e) => setCompanyForm({ ...companyForm, companyLogo: e.target.value })} />
                </div>

                <div className="cset-field">
                  <label>Company Description</label>
                  <textarea className="cset-textarea" rows="3"
                    placeholder="Brief description of your company..."
                    value={companyForm.companyDescription}
                    onChange={(e) => setCompanyForm({ ...companyForm, companyDescription: e.target.value })} />
                </div>

                <div className="cset-actions">
                  <button type="submit" className="cset-btn cset-btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Company Info'}
                  </button>
                </div>
              </form>
            )}

            {/* ===== SECURITY ===== */}
            {activeSection === 'security' && (
              <div className="cset-panel">
                <div className="cset-panel-head">
                  <h2>Security</h2>
                  <p>Change your password and review account security.</p>
                </div>

                <form onSubmit={handleChangePassword}>
                  <div className="cset-field">
                    <label>Current Password *</label>
                    <input type="password" className="cset-input"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      required />
                  </div>
                  <div className="cset-grid-2">
                    <div className="cset-field">
                      <label>New Password *</label>
                      <input type="password" className="cset-input" minLength={6}
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        required />
                      <span className="cset-hint">At least 6 characters.</span>
                    </div>
                    <div className="cset-field">
                      <label>Confirm New Password *</label>
                      <input type="password" className="cset-input"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                        required />
                    </div>
                  </div>
                  <div className="cset-actions">
                    <button type="submit" className="cset-btn cset-btn-primary" disabled={saving}>
                      {saving ? 'Updating...' : 'Change Password'}
                    </button>
                  </div>
                </form>

                <div className="cset-divider" />

                <div className="cset-info-box">
                  <div className="cset-info-icon">🛡️</div>
                  <div>
                    <strong>Account Verification</strong>
                    <p>Email Verified: <span className={user?.isEmailVerified ? 'cset-ok' : 'cset-warn'}>
                      {user?.isEmailVerified ? '✓ Verified' : '⚠ Not Verified'}</span></p>
                    <p>Account Status: <span className={user?.isActive ? 'cset-ok' : 'cset-warn'}>
                      {user?.isActive ? '✓ Active' : 'Inactive'}</span></p>
                  </div>
                </div>
              </div>
            )}

            {/* ===== PREFERENCES ===== */}
            {activeSection === 'prefs' && (
              <form className="cset-panel" onSubmit={handleSavePrefs}>
                <div className="cset-panel-head">
                  <h2>Hiring Preferences</h2>
                  <p>Set your default preferences for finding freelancers.</p>
                </div>

                <div className="cset-grid-2">
                  <div className="cset-field">
                    <label>Preferred Freelancer Type</label>
                    <select className="cset-input" value={prefsForm.preferredFreelancerType}
                      onChange={(e) => setPrefsForm({ ...prefsForm, preferredFreelancerType: e.target.value })}>
                      <option value="any">Any</option>
                      <option value="top-rated">Top Rated Only</option>
                      <option value="rising-talent">Rising Talent</option>
                      <option value="expert">Expert Level</option>
                      <option value="entry-level">Entry Level</option>
                    </select>
                  </div>
                  <div className="cset-field">
                    <label>Preferred Project Type</label>
                    <select className="cset-input" value={prefsForm.preferredProjectType}
                      onChange={(e) => setPrefsForm({ ...prefsForm, preferredProjectType: e.target.value })}>
                      <option value="any">Any</option>
                      <option value="fixed">Fixed Price</option>
                      <option value="hourly">Hourly</option>
                      <option value="milestone">Milestone Based</option>
                    </select>
                  </div>
                </div>

                <div className="cset-grid-2">
                  <div className="cset-field">
                    <label>Min Budget (USD)</label>
                    <input type="number" min="0" className="cset-input" placeholder="0"
                      value={prefsForm.preferredBudgetMin}
                      onChange={(e) => setPrefsForm({ ...prefsForm, preferredBudgetMin: e.target.value })} />
                  </div>
                  <div className="cset-field">
                    <label>Max Budget (USD)</label>
                    <input type="number" min="0" className="cset-input" placeholder="10000"
                      value={prefsForm.preferredBudgetMax}
                      onChange={(e) => setPrefsForm({ ...prefsForm, preferredBudgetMax: e.target.value })} />
                  </div>
                </div>

                <div className="cset-actions">
                  <button type="submit" className="cset-btn cset-btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Preferences'}
                  </button>
                </div>
              </form>
            )}

            {/* ===== ACCOUNT ===== */}
            {activeSection === 'account' && (
              <div className="cset-panel">
                <div className="cset-panel-head">
                  <h2>Account Management</h2>
                  <p>Manage your account status and data.</p>
                </div>

                <div className="cset-info-box">
                  <div className="cset-info-icon">📊</div>
                  <div>
                    <strong>Account Overview</strong>
                    <p>Member since: {new Date(user?.createdAt || Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    <p>User ID: <code>{currentUserId}</code></p>
                    <p>Role: <span className="cset-ok">Client</span></p>
                  </div>
                </div>

                <div className="cset-divider" />

                <div className="cset-danger-zone">
                  <div className="cset-danger-head">
                    <h3>⚠️ Danger Zone</h3>
                    <p>These actions are irreversible.</p>
                  </div>
                  <div className="cset-danger-box">
                    <div>
                      <strong>Delete Account</strong>
                      <p>Permanently delete your account, projects, and all associated data.</p>
                    </div>
                    <div className="cset-field">
                      <label>Type <strong>DELETE</strong> to confirm</label>
                      <input type="text" className="cset-input cset-input-danger"
                        placeholder="DELETE" value={deleteConfirm}
                        onChange={(e) => setDeleteConfirm(e.target.value)} />
                    </div>
                    <button className="cset-btn cset-btn-danger"
                      onClick={handleDeleteAccount}
                      disabled={saving || deleteConfirm !== 'DELETE'}>
                      {saving ? 'Deleting...' : 'Delete My Account'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}