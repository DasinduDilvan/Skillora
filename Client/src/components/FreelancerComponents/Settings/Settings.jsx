// src/components/FreelancerComponents/Settings/Settings.jsx
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import API from '../../../api/axios';
import './Settings.css';

/* ── Helpers ── */
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
    return v.freelancerId || v.userId || v._id || v.id || null;
  }
  return String(v);
};

const eqId = (a, b) => {
  const x = getRawId(a), y = getRawId(b);
  return x && y && String(x) === String(y);
};

const TABS = [
  { id: 'profile', label: 'Profile Info', icon: '👤' },
  { id: 'account', label: 'Account & Security', icon: '🔒' },
  { id: 'professional', label: 'Professional', icon: '💼' },
  { id: 'notifications', label: 'Notifications', icon: '🔔' },
  { id: 'privacy', label: 'Privacy', icon: '🛡️' },
];

const AVAILABILITY_OPTIONS = [
  { value: 'full-time', label: 'Full-time (40+ hrs/week)' },
  { value: 'part-time', label: 'Part-time (20-30 hrs/week)' },
  { value: 'hourly', label: 'Hourly (Less than 20 hrs/week)' },
  { value: 'contract', label: 'Contract-based' },
  { value: 'not-available', label: 'Not Available' },
];

export default function Settings() {
  const { user, setUser } = useAuth();
  const currentUserId = user?.userId || user?._id || user?.id;

  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // Profile Info state
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    phone: '',
    bio: '',
    location: '',
    profileImage: '',
  });

  // Password state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // Professional state
  const [professionalForm, setProfessionalForm] = useState({
    headline: '',
    hourlyRate: '',
    availability: '',
    isOpenToWork: true,
    isAvailable: true,
    responseTime: '',
    freelancerBio: '',
    resumeUrl: '',
    freelancerLocation: '',
  });

  // Notification preferences state
  const [notifPrefs, setNotifPrefs] = useState({
    emailProjectUpdates: true,
    emailApplicationStatus: true,
    emailPayments: true,
    emailReviews: true,
    emailPromotions: false,
    emailNewsletter: false,
    pushProjectUpdates: true,
    pushApplicationStatus: true,
    pushPayments: true,
    pushMessages: true,
  });

  // Privacy state
  const [privacyPrefs, setPrivacyPrefs] = useState({
    showProfile: true,
    showEarnings: false,
    showCompletedProjects: true,
    showEmail: false,
    showPhone: false,
    showLocation: true,
    allowSearchEngines: true,
  });

  // Store IDs for updates
  const [userId, setUserId] = useState(null);
  const [freelancerId, setFreelancerId] = useState(null);

  /* ── Show toast ── */
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  /* ── Load data ── */
/* ── Load data ── */
const fetchData = useCallback(async () => {
  if (!currentUserId) return;
  try {
    setLoading(true);

    // Try direct fetch first (faster), fallback to bulk
    let currentUser = null;
    let myFreelancer = null;

    try {
      const directUserRes = await API.get(`/users/${currentUserId}`);
      currentUser = directUserRes?.data?.data || directUserRes?.data || null;
    } catch {
      const usersRes = await API.get('/users').catch(() => ({ data: [] }));
      const allUsers = asArray(usersRes);
      currentUser = allUsers.find((u) => eqId(u, currentUserId));
    }

    // Fetch freelancers to find profile
    const freelancersRes = await API.get('/freelancers').catch(() => ({ data: [] }));
    const allFreelancers = asArray(freelancersRes);
    myFreelancer = allFreelancers.find((f) => eqId(f.userId, currentUserId));

    console.log('👤 Loaded user:', currentUser);
    console.log('💼 Loaded freelancer:', myFreelancer);

    // Populate Profile Form
    if (currentUser) {
      const uid = currentUser.userId || currentUser._id;
      setUserId(uid);
      setProfileForm({
        firstName: currentUser.firstName || '',
        lastName: currentUser.lastName || '',
        username: currentUser.username || '',
        email: currentUser.email || '',
        phone: currentUser.phone || '',
        bio: currentUser.bio || '',
        location: currentUser.location || '',
        profileImage: currentUser.profileImage || '',
      });
    } else {
      // Fallback to auth context user if API fails
      setProfileForm({
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        username: user?.username || '',
        email: user?.email || '',
        phone: user?.phone || '',
        bio: user?.bio || '',
        location: user?.location || '',
        profileImage: user?.profileImage || '',
      });
      setUserId(currentUserId);
    }

    // Populate Professional Form
    if (myFreelancer) {
      const fid = myFreelancer.freelancerId || myFreelancer._id;
      setFreelancerId(fid);
      setProfessionalForm({
        headline: myFreelancer.headline || '',
        hourlyRate: myFreelancer.hourlyRate || '',
        availability: myFreelancer.availability || '',
        isOpenToWork: myFreelancer.isOpenToWork !== false,
        isAvailable: myFreelancer.isAvailable !== false,
        responseTime: myFreelancer.responseTime || '',
        freelancerBio: myFreelancer.bio || '',
        resumeUrl: myFreelancer.resumeUrl || '',
        freelancerLocation: myFreelancer.location || '',
      });
    }
  } catch (err) {
    console.error('Failed to load settings data:', err);
    showToast('Failed to load your settings. Please try again.', 'error');
  } finally {
    setLoading(false);
  }
}, [currentUserId, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ── Save Profile Info ── */
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!userId) return showToast('User not found.', 'error');

    if (!profileForm.firstName.trim()) return showToast('First name is required.', 'error');
    if (!profileForm.lastName.trim()) return showToast('Last name is required.', 'error');
    if (!profileForm.email.trim()) return showToast('Email is required.', 'error');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(profileForm.email)) return showToast('Please enter a valid email.', 'error');

    try {
      setSaving(true);
      await API.put(`/users/${userId}`, {
        firstName: profileForm.firstName.trim(),
        lastName: profileForm.lastName.trim(),
        username: profileForm.username.trim(),
        email: profileForm.email.trim(),
        phone: profileForm.phone.trim(),
        bio: profileForm.bio.trim(),
        location: profileForm.location.trim(),
        profileImage: profileForm.profileImage.trim(),
      });

      // Update auth context
      if (setUser) {
        setUser((prev) => ({
          ...prev,
          firstName: profileForm.firstName.trim(),
          lastName: profileForm.lastName.trim(),
          username: profileForm.username.trim(),
          email: profileForm.email.trim(),
          phone: profileForm.phone.trim(),
          bio: profileForm.bio.trim(),
          location: profileForm.location.trim(),
          profileImage: profileForm.profileImage.trim(),
        }));
      }

      showToast('Profile updated successfully!');
    } catch (err) {
      console.error('Failed to update profile:', err);
      showToast('Failed to update profile. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  /* ── Change Password ── */
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!userId) return showToast('User not found.', 'error');

    if (!passwordForm.currentPassword) return showToast('Current password is required.', 'error');
    if (!passwordForm.newPassword) return showToast('New password is required.', 'error');
    if (passwordForm.newPassword.length < 8) return showToast('Password must be at least 8 characters.', 'error');
    if (passwordForm.newPassword !== passwordForm.confirmPassword) return showToast('Passwords do not match.', 'error');
    if (passwordForm.currentPassword === passwordForm.newPassword) return showToast('New password must be different from current password.', 'error');

    try {
      setSaving(true);
      await API.put(`/users/${userId}`, {
        password: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showToast('Password changed successfully!');
    } catch (err) {
      console.error('Failed to change password:', err);
      showToast('Failed to change password. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  /* ── Save Professional Settings ── */
  const handleSaveProfessional = async (e) => {
    e.preventDefault();
    if (!freelancerId) return showToast('Freelancer profile not found.', 'error');

    if (professionalForm.hourlyRate && isNaN(Number(professionalForm.hourlyRate))) {
      return showToast('Hourly rate must be a valid number.', 'error');
    }

    try {
      setSaving(true);
      await API.put(`/freelancers/${freelancerId}`, {
        headline: professionalForm.headline.trim(),
        hourlyRate: Number(professionalForm.hourlyRate) || 0,
        availability: professionalForm.availability,
        isOpenToWork: professionalForm.isOpenToWork,
        isAvailable: professionalForm.isAvailable,
        responseTime: professionalForm.responseTime.trim(),
        bio: professionalForm.freelancerBio.trim(),
        resumeUrl: professionalForm.resumeUrl.trim(),
        location: professionalForm.freelancerLocation.trim(),
      });
      showToast('Professional settings updated!');
    } catch (err) {
      console.error('Failed to update professional settings:', err);
      showToast('Failed to update settings. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  /* ── Save Notification Prefs (local only — no backend entity) ── */
  const handleSaveNotifications = (e) => {
    e.preventDefault();
    // These would be stored locally or in a preferences sub-document
    localStorage.setItem('freelancer_notif_prefs', JSON.stringify(notifPrefs));
    showToast('Notification preferences saved!');
  };

  /* ── Save Privacy Prefs (local only — no backend entity) ── */
  const handleSavePrivacy = (e) => {
    e.preventDefault();
    localStorage.setItem('freelancer_privacy_prefs', JSON.stringify(privacyPrefs));
    showToast('Privacy settings saved!');
  };

  /* ── Load local prefs on mount ── */
  useEffect(() => {
    try {
      const savedNotif = localStorage.getItem('freelancer_notif_prefs');
      if (savedNotif) setNotifPrefs(JSON.parse(savedNotif));
      const savedPrivacy = localStorage.getItem('freelancer_privacy_prefs');
      if (savedPrivacy) setPrivacyPrefs(JSON.parse(savedPrivacy));
    } catch {}
  }, []);

  /* ── Password strength indicator ── */
  const getPasswordStrength = (password) => {
    if (!password) return { level: 0, label: '', cls: '' };
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) return { level: 1, label: 'Weak', cls: 'weak' };
    if (score <= 2) return { level: 2, label: 'Fair', cls: 'fair' };
    if (score <= 3) return { level: 3, label: 'Good', cls: 'good' };
    if (score <= 4) return { level: 4, label: 'Strong', cls: 'strong' };
    return { level: 5, label: 'Very Strong', cls: 'very-strong' };
  };

  const pwStrength = getPasswordStrength(passwordForm.newPassword);

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="fset-loading">
        <div className="fset-spinner" />
        <p>Loading your settings...</p>
      </div>
    );
  }

  return (
    <div className="fset-page">
      {/* TOAST */}
      {toast && (
        <div className={`fset-toast ${toast.type}`}>
          <span className="fset-toast-icon">
            {toast.type === 'success' ? '✅' : '❌'}
          </span>
          <span>{toast.message}</span>
          <button className="fset-toast-close" onClick={() => setToast(null)}>×</button>
        </div>
      )}

      {/* HERO */}
      <div className="fset-hero">
        <div className="fset-hero-inner">
          <div className="fset-hero-text">
            <span className="fset-hero-badge">⚙️ Account Settings</span>
            <h1>Settings</h1>
            <p>Manage your profile, security, preferences and privacy settings.</p>
          </div>
        </div>
      </div>

      <div className="fset-container">
        <div className="fset-layout">
          {/* SIDEBAR TABS */}
          <aside className="fset-sidebar">
            <nav className="fset-sidebar-nav">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  className={`fset-sidebar-item ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span className="fset-sidebar-icon">{tab.icon}</span>
                  <span className="fset-sidebar-label">{tab.label}</span>
                </button>
              ))}
            </nav>

            <div className="fset-sidebar-footer">
              <div className="fset-sidebar-user">
                <div className="fset-sidebar-avatar">
                  {profileForm.profileImage ? (
                    <img src={profileForm.profileImage} alt="Profile" />
                  ) : (
                    (profileForm.firstName || 'U').charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <strong>{profileForm.firstName} {profileForm.lastName}</strong>
                  <span>Freelancer</span>
                </div>
              </div>
            </div>
          </aside>

          {/* MOBILE TABS */}
          <div className="fset-mobile-tabs">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                className={`fset-mobile-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* CONTENT */}
          <main className="fset-content">
            {/* ═══════════════ PROFILE TAB ═══════════════ */}
            {activeTab === 'profile' && (
              <form className="fset-section" onSubmit={handleSaveProfile}>
                <div className="fset-section-header">
                  <div>
                    <h2>👤 Profile Information</h2>
                    <p>Update your personal details and public profile information.</p>
                  </div>
                </div>

                {/* Avatar Preview */}
                <div className="fset-avatar-section">
                  <div className="fset-avatar-preview">
                    {profileForm.profileImage ? (
                      <img src={profileForm.profileImage} alt="Profile" />
                    ) : (
                      <span className="fset-avatar-letter">
                        {(profileForm.firstName || 'U').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="fset-avatar-info">
                    <h3>{profileForm.firstName} {profileForm.lastName}</h3>
                    <p>Update your photo by providing an image URL below.</p>
                  </div>
                </div>

                <div className="fset-form-grid">
                  <div className="fset-field">
                    <label className="fset-label">
                      First Name <span className="fset-required">*</span>
                    </label>
                    <input
                      type="text"
                      className="fset-input"
                      value={profileForm.firstName}
                      onChange={(e) => setProfileForm((p) => ({ ...p, firstName: e.target.value }))}
                      placeholder="Enter your first name"
                    />
                  </div>

                  <div className="fset-field">
                    <label className="fset-label">
                      Last Name <span className="fset-required">*</span>
                    </label>
                    <input
                      type="text"
                      className="fset-input"
                      value={profileForm.lastName}
                      onChange={(e) => setProfileForm((p) => ({ ...p, lastName: e.target.value }))}
                      placeholder="Enter your last name"
                    />
                  </div>

                  <div className="fset-field">
                    <label className="fset-label">Username</label>
                    <input
                      type="text"
                      className="fset-input"
                      value={profileForm.username}
                      onChange={(e) => setProfileForm((p) => ({ ...p, username: e.target.value }))}
                      placeholder="Choose a username"
                    />
                  </div>

                  <div className="fset-field">
                    <label className="fset-label">
                      Email <span className="fset-required">*</span>
                    </label>
                    <input
                      type="email"
                      className="fset-input"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm((p) => ({ ...p, email: e.target.value }))}
                      placeholder="Enter your email"
                    />
                  </div>

                  <div className="fset-field">
                    <label className="fset-label">Phone Number</label>
                    <input
                      type="tel"
                      className="fset-input"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))}
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>

                  <div className="fset-field">
                    <label className="fset-label">Location</label>
                    <input
                      type="text"
                      className="fset-input"
                      value={profileForm.location}
                      onChange={(e) => setProfileForm((p) => ({ ...p, location: e.target.value }))}
                      placeholder="City, Country"
                    />
                  </div>

                  <div className="fset-field fset-field-full">
                    <label className="fset-label">Profile Image URL</label>
                    <input
                      type="url"
                      className="fset-input"
                      value={profileForm.profileImage}
                      onChange={(e) => setProfileForm((p) => ({ ...p, profileImage: e.target.value }))}
                      placeholder="https://example.com/your-photo.jpg"
                    />
                  </div>

                  <div className="fset-field fset-field-full">
                    <label className="fset-label">Bio</label>
                    <textarea
                      className="fset-textarea"
                      rows={4}
                      value={profileForm.bio}
                      onChange={(e) => setProfileForm((p) => ({ ...p, bio: e.target.value }))}
                      placeholder="Tell us a little about yourself..."
                      maxLength={500}
                    />
                    <span className="fset-char-count">
                      {profileForm.bio.length}/500
                    </span>
                  </div>
                </div>

                <div className="fset-actions">
                  <button type="button" className="fset-btn fset-btn-ghost" onClick={fetchData}>
                    Discard Changes
                  </button>
                  <button type="submit" className="fset-btn fset-btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}

            {/* ═══════════════ ACCOUNT & SECURITY TAB ═══════════════ */}
            {activeTab === 'account' && (
              <div className="fset-section-group">
                {/* Change Password */}
                <form className="fset-section" onSubmit={handleChangePassword}>
                  <div className="fset-section-header">
                    <div>
                      <h2>🔑 Change Password</h2>
                      <p>Update your password to keep your account secure.</p>
                    </div>
                  </div>

                  <div className="fset-form-stack">
                    <div className="fset-field">
                      <label className="fset-label">Current Password</label>
                      <div className="fset-password-wrap">
                        <input
                          type={showPasswords.current ? 'text' : 'password'}
                          className="fset-input"
                          value={passwordForm.currentPassword}
                          onChange={(e) =>
                            setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))
                          }
                          placeholder="Enter current password"
                        />
                        <button
                          type="button"
                          className="fset-pw-toggle"
                          onClick={() =>
                            setShowPasswords((p) => ({ ...p, current: !p.current }))
                          }
                        >
                          {showPasswords.current ? '🙈' : '👁️'}
                        </button>
                      </div>
                    </div>

                    <div className="fset-field">
                      <label className="fset-label">New Password</label>
                      <div className="fset-password-wrap">
                        <input
                          type={showPasswords.new ? 'text' : 'password'}
                          className="fset-input"
                          value={passwordForm.newPassword}
                          onChange={(e) =>
                            setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))
                          }
                          placeholder="Enter new password (min. 8 characters)"
                        />
                        <button
                          type="button"
                          className="fset-pw-toggle"
                          onClick={() =>
                            setShowPasswords((p) => ({ ...p, new: !p.new }))
                          }
                        >
                          {showPasswords.new ? '🙈' : '👁️'}
                        </button>
                      </div>
                      {passwordForm.newPassword && (
                        <div className="fset-pw-strength">
                          <div className="fset-pw-bars">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <div
                                key={i}
                                className={`fset-pw-bar ${i <= pwStrength.level ? pwStrength.cls : ''}`}
                              />
                            ))}
                          </div>
                          <span className={`fset-pw-label ${pwStrength.cls}`}>
                            {pwStrength.label}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="fset-field">
                      <label className="fset-label">Confirm New Password</label>
                      <div className="fset-password-wrap">
                        <input
                          type={showPasswords.confirm ? 'text' : 'password'}
                          className="fset-input"
                          value={passwordForm.confirmPassword}
                          onChange={(e) =>
                            setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))
                          }
                          placeholder="Re-enter new password"
                        />
                        <button
                          type="button"
                          className="fset-pw-toggle"
                          onClick={() =>
                            setShowPasswords((p) => ({ ...p, confirm: !p.confirm }))
                          }
                        >
                          {showPasswords.confirm ? '🙈' : '👁️'}
                        </button>
                      </div>
                      {passwordForm.confirmPassword && passwordForm.newPassword && (
                        <span
                          className={`fset-pw-match ${
                            passwordForm.newPassword === passwordForm.confirmPassword
                              ? 'match'
                              : 'no-match'
                          }`}
                        >
                          {passwordForm.newPassword === passwordForm.confirmPassword
                            ? '✓ Passwords match'
                            : '✗ Passwords do not match'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="fset-actions">
                    <button
                      type="button"
                      className="fset-btn fset-btn-ghost"
                      onClick={() =>
                        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
                      }
                    >
                      Cancel
                    </button>
                    <button type="submit" className="fset-btn fset-btn-primary" disabled={saving}>
                      {saving ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </form>

                {/* Account Info Card */}
                <div className="fset-section">
                  <div className="fset-section-header">
                    <div>
                      <h2>📋 Account Information</h2>
                      <p>Your account details and verification status.</p>
                    </div>
                  </div>

                  <div className="fset-info-grid">
                    <div className="fset-info-item">
                      <span className="fset-info-label">Account ID</span>
                      <span className="fset-info-value fset-mono">
                        {userId ? String(userId).slice(-8).toUpperCase() : '—'}
                      </span>
                    </div>
                    <div className="fset-info-item">
                      <span className="fset-info-label">Email Verified</span>
                      <span className="fset-info-value">
                        {user?.isEmailVerified ? (
                          <span className="fset-badge-green">✓ Verified</span>
                        ) : (
                          <span className="fset-badge-amber">⚠ Not Verified</span>
                        )}
                      </span>
                    </div>
                    <div className="fset-info-item">
                      <span className="fset-info-label">Account Status</span>
                      <span className="fset-info-value">
                        {user?.isActive !== false ? (
                          <span className="fset-badge-green">● Active</span>
                        ) : (
                          <span className="fset-badge-red">● Inactive</span>
                        )}
                      </span>
                    </div>
                    <div className="fset-info-item">
                      <span className="fset-info-label">Role</span>
                      <span className="fset-info-value">
                        <span className="fset-badge-indigo">Freelancer</span>
                      </span>
                    </div>
                    <div className="fset-info-item">
                      <span className="fset-info-label">Last Login</span>
                      <span className="fset-info-value">
                        {user?.lastLoginAt
                          ? new Date(user.lastLoginAt).toLocaleString()
                          : '—'}
                      </span>
                    </div>
                    <div className="fset-info-item">
                      <span className="fset-info-label">Member Since</span>
                      <span className="fset-info-value">
                        {user?.createdAt
                          ? new Date(user.createdAt).toLocaleDateString('en-US', {
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : '—'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="fset-section fset-danger-zone">
                  <div className="fset-section-header">
                    <div>
                      <h2>⚠️ Danger Zone</h2>
                      <p>Irreversible and destructive actions.</p>
                    </div>
                  </div>

                  <div className="fset-danger-actions">
                    <div className="fset-danger-item">
                      <div>
                        <strong>Deactivate Account</strong>
                        <p>Temporarily disable your account. You can reactivate it later.</p>
                      </div>
                      <button
                        className="fset-btn fset-btn-outline-danger"
                        onClick={() => showToast('Account deactivation is not available in this version.', 'error')}
                      >
                        Deactivate
                      </button>
                    </div>
                    <div className="fset-danger-item">
                      <div>
                        <strong>Delete Account</strong>
                        <p>Permanently delete your account and all associated data. This cannot be undone.</p>
                      </div>
                      <button
                        className="fset-btn fset-btn-danger"
                        onClick={() => showToast('Account deletion requires contacting support.', 'error')}
                      >
                        Delete Account
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════════ PROFESSIONAL TAB ═══════════════ */}
            {activeTab === 'professional' && (
              <form className="fset-section" onSubmit={handleSaveProfessional}>
                <div className="fset-section-header">
                  <div>
                    <h2>💼 Professional Settings</h2>
                    <p>Configure your freelancer profile, rates, and availability.</p>
                  </div>
                </div>

                <div className="fset-form-grid">
                  <div className="fset-field fset-field-full">
                    <label className="fset-label">Professional Headline</label>
                    <input
                      type="text"
                      className="fset-input"
                      value={professionalForm.headline}
                      onChange={(e) =>
                        setProfessionalForm((p) => ({ ...p, headline: e.target.value }))
                      }
                      placeholder="e.g. Senior Full-Stack Developer | React & Node.js Expert"
                    />
                    <span className="fset-hint">This appears at the top of your profile.</span>
                  </div>

                  <div className="fset-field">
                    <label className="fset-label">Hourly Rate (USD)</label>
                    <div className="fset-input-prefix-wrap">
                      <span className="fset-input-prefix">$</span>
                      <input
                        type="number"
                        className="fset-input fset-input-with-prefix"
                        value={professionalForm.hourlyRate}
                        onChange={(e) =>
                          setProfessionalForm((p) => ({ ...p, hourlyRate: e.target.value }))
                        }
                        placeholder="0"
                        min="0"
                        step="1"
                      />
                      <span className="fset-input-suffix">/hr</span>
                    </div>
                  </div>

                  <div className="fset-field">
                    <label className="fset-label">Availability</label>
                    <select
                      className="fset-select"
                      value={professionalForm.availability}
                      onChange={(e) =>
                        setProfessionalForm((p) => ({ ...p, availability: e.target.value }))
                      }
                    >
                      <option value="">Select availability</option>
                      {AVAILABILITY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="fset-field">
                    <label className="fset-label">Response Time</label>
                    <input
                      type="text"
                      className="fset-input"
                      value={professionalForm.responseTime}
                      onChange={(e) =>
                        setProfessionalForm((p) => ({ ...p, responseTime: e.target.value }))
                      }
                      placeholder="e.g. Within 2 hours"
                    />
                  </div>

                  <div className="fset-field">
                    <label className="fset-label">Work Location</label>
                    <input
                      type="text"
                      className="fset-input"
                      value={professionalForm.freelancerLocation}
                      onChange={(e) =>
                        setProfessionalForm((p) => ({ ...p, freelancerLocation: e.target.value }))
                      }
                      placeholder="Remote, City, Country"
                    />
                  </div>

                  <div className="fset-field fset-field-full">
                    <label className="fset-label">Resume / CV URL</label>
                    <input
                      type="url"
                      className="fset-input"
                      value={professionalForm.resumeUrl}
                      onChange={(e) =>
                        setProfessionalForm((p) => ({ ...p, resumeUrl: e.target.value }))
                      }
                      placeholder="https://example.com/resume.pdf"
                    />
                  </div>

                  <div className="fset-field fset-field-full">
                    <label className="fset-label">Professional Bio</label>
                    <textarea
                      className="fset-textarea"
                      rows={5}
                      value={professionalForm.freelancerBio}
                      onChange={(e) =>
                        setProfessionalForm((p) => ({ ...p, freelancerBio: e.target.value }))
                      }
                      placeholder="Describe your expertise, experience, and what makes you stand out..."
                      maxLength={1000}
                    />
                    <span className="fset-char-count">
                      {professionalForm.freelancerBio.length}/1000
                    </span>
                  </div>
                </div>

                {/* Toggles */}
                <div className="fset-toggles-section">
                  <h3>Availability Toggles</h3>
                  <div className="fset-toggle-row">
                    <div className="fset-toggle-info">
                      <strong>Open to Work</strong>
                      <p>Show clients that you're actively looking for new projects.</p>
                    </div>
                    <label className="fset-switch">
                      <input
                        type="checkbox"
                        checked={professionalForm.isOpenToWork}
                        onChange={(e) =>
                          setProfessionalForm((p) => ({ ...p, isOpenToWork: e.target.checked }))
                        }
                      />
                      <span className="fset-slider" />
                    </label>
                  </div>

                  <div className="fset-toggle-row">
                    <div className="fset-toggle-info">
                      <strong>Available for Hire</strong>
                      <p>Let clients know you can start working immediately.</p>
                    </div>
                    <label className="fset-switch">
                      <input
                        type="checkbox"
                        checked={professionalForm.isAvailable}
                        onChange={(e) =>
                          setProfessionalForm((p) => ({ ...p, isAvailable: e.target.checked }))
                        }
                      />
                      <span className="fset-slider" />
                    </label>
                  </div>
                </div>

                <div className="fset-actions">
                  <button type="button" className="fset-btn fset-btn-ghost" onClick={fetchData}>
                    Discard Changes
                  </button>
                  <button type="submit" className="fset-btn fset-btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}

            {/* ═══════════════ NOTIFICATIONS TAB ═══════════════ */}
            {activeTab === 'notifications' && (
              <form className="fset-section" onSubmit={handleSaveNotifications}>
                <div className="fset-section-header">
                  <div>
                    <h2>🔔 Notification Preferences</h2>
                    <p>Choose what notifications you want to receive.</p>
                  </div>
                </div>

                <div className="fset-notif-group">
                  <h3>📧 Email Notifications</h3>
                  {[
                    { key: 'emailProjectUpdates', label: 'Project Updates', desc: 'Get notified about changes to your active projects.' },
                    { key: 'emailApplicationStatus', label: 'Application Status', desc: 'Updates when your applications are accepted or rejected.' },
                    { key: 'emailPayments', label: 'Payment Notifications', desc: 'Receive emails about payments and transactions.' },
                    { key: 'emailReviews', label: 'Reviews & Ratings', desc: 'When a client leaves a review on your work.' },
                    { key: 'emailPromotions', label: 'Promotions & Offers', desc: 'Special offers and platform promotions.' },
                    { key: 'emailNewsletter', label: 'Weekly Newsletter', desc: 'Weekly digest of opportunities and tips.' },
                  ].map((item) => (
                    <div className="fset-toggle-row" key={item.key}>
                      <div className="fset-toggle-info">
                        <strong>{item.label}</strong>
                        <p>{item.desc}</p>
                      </div>
                      <label className="fset-switch">
                        <input
                          type="checkbox"
                          checked={notifPrefs[item.key]}
                          onChange={(e) =>
                            setNotifPrefs((p) => ({ ...p, [item.key]: e.target.checked }))
                          }
                        />
                        <span className="fset-slider" />
                      </label>
                    </div>
                  ))}
                </div>

                <div className="fset-notif-group">
                  <h3>📱 Push Notifications</h3>
                  {[
                    { key: 'pushProjectUpdates', label: 'Project Updates', desc: 'Real-time updates about project progress.' },
                    { key: 'pushApplicationStatus', label: 'Application Status', desc: 'Instant alerts on application responses.' },
                    { key: 'pushPayments', label: 'Payment Alerts', desc: 'Instant payment confirmations.' },
                    { key: 'pushMessages', label: 'Messages', desc: 'New message notifications from clients.' },
                  ].map((item) => (
                    <div className="fset-toggle-row" key={item.key}>
                      <div className="fset-toggle-info">
                        <strong>{item.label}</strong>
                        <p>{item.desc}</p>
                      </div>
                      <label className="fset-switch">
                        <input
                          type="checkbox"
                          checked={notifPrefs[item.key]}
                          onChange={(e) =>
                            setNotifPrefs((p) => ({ ...p, [item.key]: e.target.checked }))
                          }
                        />
                        <span className="fset-slider" />
                      </label>
                    </div>
                  ))}
                </div>

                <div className="fset-actions">
                  <button type="submit" className="fset-btn fset-btn-primary" disabled={saving}>
                    Save Preferences
                  </button>
                </div>
              </form>
            )}

            {/* ═══════════════ PRIVACY TAB ═══════════════ */}
            {activeTab === 'privacy' && (
              <form className="fset-section" onSubmit={handleSavePrivacy}>
                <div className="fset-section-header">
                  <div>
                    <h2>🛡️ Privacy Settings</h2>
                    <p>Control what information is visible to others.</p>
                  </div>
                </div>

                <div className="fset-notif-group">
                  <h3>👁️ Profile Visibility</h3>
                  {[
                    { key: 'showProfile', label: 'Public Profile', desc: 'Allow your profile to be visible to clients and other users.' },
                    { key: 'showEarnings', label: 'Show Earnings', desc: 'Display your total earnings on your public profile.' },
                    { key: 'showCompletedProjects', label: 'Completed Projects Count', desc: 'Show how many projects you have completed.' },
                    { key: 'allowSearchEngines', label: 'Search Engine Indexing', desc: 'Allow search engines to index your profile.' },
                  ].map((item) => (
                    <div className="fset-toggle-row" key={item.key}>
                      <div className="fset-toggle-info">
                        <strong>{item.label}</strong>
                        <p>{item.desc}</p>
                      </div>
                      <label className="fset-switch">
                        <input
                          type="checkbox"
                          checked={privacyPrefs[item.key]}
                          onChange={(e) =>
                            setPrivacyPrefs((p) => ({ ...p, [item.key]: e.target.checked }))
                          }
                        />
                        <span className="fset-slider" />
                      </label>
                    </div>
                  ))}
                </div>

                <div className="fset-notif-group">
                  <h3>📞 Contact Information</h3>
                  {[
                    { key: 'showEmail', label: 'Show Email Address', desc: 'Make your email address visible on your profile.' },
                    { key: 'showPhone', label: 'Show Phone Number', desc: 'Make your phone number visible on your profile.' },
                    { key: 'showLocation', label: 'Show Location', desc: 'Display your location on your public profile.' },
                  ].map((item) => (
                    <div className="fset-toggle-row" key={item.key}>
                      <div className="fset-toggle-info">
                        <strong>{item.label}</strong>
                        <p>{item.desc}</p>
                      </div>
                      <label className="fset-switch">
                        <input
                          type="checkbox"
                          checked={privacyPrefs[item.key]}
                          onChange={(e) =>
                            setPrivacyPrefs((p) => ({ ...p, [item.key]: e.target.checked }))
                          }
                        />
                        <span className="fset-slider" />
                      </label>
                    </div>
                  ))}
                </div>

                <div className="fset-actions">
                  <button type="submit" className="fset-btn fset-btn-primary" disabled={saving}>
                    Save Privacy Settings
                  </button>
                </div>
              </form>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}