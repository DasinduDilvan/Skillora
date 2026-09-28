// src/components/AdminComponents/Settings/Settings.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import API from '../../../api/axios';
import '../Users/Users.css';
import '../Categories/Categories.css';
import './Settings.css';

export default function Settings() {
  const { user, setUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const [profileForm, setProfileForm] = useState({
    firstName: '', lastName: '', username: '', email: '', phone: '', profileImage: '',
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '', newPassword: '', confirmPassword: '',
  });

  const [platformSettings, setPlatformSettings] = useState({
    platformName: 'Skillora',
    supportEmail: 'support@skillora.com',
    commissionRate: 10,
    maintenanceMode: false,
    allowSignups: true,
    requireEmailVerification: true,
    autoApproveProjects: false,
  });

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const currentUserId = user?.userId || user?._id || user?.id;

  useEffect(() => {
    if (user) {
      setProfileForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        username: user.username || '',
        email: user.email || '',
        phone: user.phone || '',
        profileImage: user.profileImage || '',
      });
    }
    const stored = localStorage.getItem('platformSettings');
    if (stored) {
      try { setPlatformSettings(JSON.parse(stored)); } catch {}
    }
  }, [user]);

  const saveProfile = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await API.put(`/users/${currentUserId}`, profileForm);
      if (setUser) setUser({ ...user, ...profileForm });
      showToast('Profile updated');
    } catch (err) {
      showToast('Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }
    try {
      setSaving(true);
      await API.put(`/users/${currentUserId}`, {
        currentPassword: passwordForm.currentPassword,
        password: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showToast('Password changed');
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to change password', 'error');
    } finally {
      setSaving(false);
    }
  };

  const savePlatform = (e) => {
    e.preventDefault();
    localStorage.setItem('platformSettings', JSON.stringify(platformSettings));
    showToast('Platform settings saved');
  };

  const avatarLetter = (profileForm.firstName || 'A').charAt(0).toUpperCase();

  return (
    <div className="adm-page">
      {toast && (
        <div className={`adm-toast adm-toast-${toast.type}`}>
          {toast.type === 'success' ? '✅' : '⚠️'} {toast.msg}
        </div>
      )}

      <div className="adm-header">
        <div>
          <h1>⚙️ Platform Settings</h1>
          <p>Manage your admin profile and platform configuration.</p>
        </div>
      </div>

      <div className="settings-layout">
        <aside className="settings-sidebar">
          <div className="settings-user-card">
            <div className="settings-avatar">
              {profileForm.profileImage ? (
                <img src={profileForm.profileImage} alt="" />
              ) : avatarLetter}
            </div>
            <strong>{profileForm.firstName} {profileForm.lastName}</strong>
            <span>{profileForm.email}</span>
          </div>

          <nav className="settings-nav">
            <button className={activeTab === 'profile' ? 'active' : ''} onClick={() => setActiveTab('profile')}>
              👤 Profile
            </button>
            <button className={activeTab === 'security' ? 'active' : ''} onClick={() => setActiveTab('security')}>
              🔒 Security
            </button>
            <button className={activeTab === 'platform' ? 'active' : ''} onClick={() => setActiveTab('platform')}>
              🌐 Platform Config
            </button>
            <button className={activeTab === 'system' ? 'active' : ''} onClick={() => setActiveTab('system')}>
              🖥️ System Info
            </button>
          </nav>
        </aside>

        <div className="settings-content">
          {/* PROFILE */}
          {activeTab === 'profile' && (
            <form className="settings-panel" onSubmit={saveProfile}>
              <div className="settings-panel-head">
                <h2>Admin Profile</h2>
                <p>Update your admin account information.</p>
              </div>

              <div className="adm-grid-2">
                <div className="adm-field">
                  <label>First Name</label>
                  <input
                    type="text"
                    className="adm-input"
                    value={profileForm.firstName}
                    onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                    required
                  />
                </div>
                <div className="adm-field">
                  <label>Last Name</label>
                  <input
                    type="text"
                    className="adm-input"
                    value={profileForm.lastName}
                    onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="adm-grid-2">
                <div className="adm-field">
                  <label>Username</label>
                  <input
                    type="text"
                    className="adm-input"
                    value={profileForm.username}
                    onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                  />
                </div>
                <div className="adm-field">
                  <label>Email</label>
                  <input
                    type="email"
                    className="adm-input"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="adm-field">
                <label>Phone</label>
                <input
                  type="tel"
                  className="adm-input"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                />
              </div>

              <div className="adm-field">
                <label>Profile Image URL</label>
                <input
                  type="url"
                  className="adm-input"
                  value={profileForm.profileImage}
                  onChange={(e) => setProfileForm({ ...profileForm, profileImage: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="adm-modal-actions">
                <button type="submit" className="adm-btn primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          )}

          {/* SECURITY */}
          {activeTab === 'security' && (
            <form className="settings-panel" onSubmit={changePassword}>
              <div className="settings-panel-head">
                <h2>Change Password</h2>
                <p>Keep your admin account secure.</p>
              </div>

              <div className="adm-field">
                <label>Current Password *</label>
                <input
                  type="password"
                  className="adm-input"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  required
                />
              </div>

              <div className="adm-grid-2">
                <div className="adm-field">
                  <label>New Password *</label>
                  <input
                    type="password"
                    className="adm-input"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    minLength={6}
                    required
                  />
                </div>
                <div className="adm-field">
                  <label>Confirm New Password *</label>
                  <input
                    type="password"
                    className="adm-input"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="adm-modal-actions">
                <button type="submit" className="adm-btn primary" disabled={saving}>
                  {saving ? 'Updating...' : 'Change Password'}
                </button>
              </div>
            </form>
          )}

          {/* PLATFORM */}
          {activeTab === 'platform' && (
            <form className="settings-panel" onSubmit={savePlatform}>
              <div className="settings-panel-head">
                <h2>Platform Configuration</h2>
                <p>Global platform settings and behavior.</p>
              </div>

              <div className="adm-grid-2">
                <div className="adm-field">
                  <label>Platform Name</label>
                  <input
                    type="text"
                    className="adm-input"
                    value={platformSettings.platformName}
                    onChange={(e) => setPlatformSettings({ ...platformSettings, platformName: e.target.value })}
                  />
                </div>
                <div className="adm-field">
                  <label>Support Email</label>
                  <input
                    type="email"
                    className="adm-input"
                    value={platformSettings.supportEmail}
                    onChange={(e) => setPlatformSettings({ ...platformSettings, supportEmail: e.target.value })}
                  />
                </div>
              </div>

              <div className="adm-field">
                <label>Commission Rate (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="adm-input"
                  value={platformSettings.commissionRate}
                  onChange={(e) => setPlatformSettings({ ...platformSettings, commissionRate: Number(e.target.value) })}
                />
              </div>

              <label className="adm-checkbox">
                <input
                  type="checkbox"
                  checked={platformSettings.maintenanceMode}
                  onChange={(e) => setPlatformSettings({ ...platformSettings, maintenanceMode: e.target.checked })}
                />
                <span><strong>Maintenance Mode</strong> - Temporarily disable the platform for users</span>
              </label>

              <label className="adm-checkbox">
                <input
                  type="checkbox"
                  checked={platformSettings.allowSignups}
                  onChange={(e) => setPlatformSettings({ ...platformSettings, allowSignups: e.target.checked })}
                />
                <span><strong>Allow New Signups</strong> - Users can register on the platform</span>
              </label>

              <label className="adm-checkbox">
                <input
                  type="checkbox"
                  checked={platformSettings.requireEmailVerification}
                  onChange={(e) => setPlatformSettings({ ...platformSettings, requireEmailVerification: e.target.checked })}
                />
                <span><strong>Require Email Verification</strong> - Users must verify email before use</span>
              </label>

              <label className="adm-checkbox">
                <input
                  type="checkbox"
                  checked={platformSettings.autoApproveProjects}
                  onChange={(e) => setPlatformSettings({ ...platformSettings, autoApproveProjects: e.target.checked })}
                />
                <span><strong>Auto-Approve Projects</strong> - Skip admin review for new projects</span>
              </label>

              <div className="adm-modal-actions">
                <button type="submit" className="adm-btn primary">Save Settings</button>
              </div>
            </form>
          )}

          {/* SYSTEM */}
          {activeTab === 'system' && (
            <div className="settings-panel">
              <div className="settings-panel-head">
                <h2>System Information</h2>
                <p>Platform and account details.</p>
              </div>

              <div className="sys-info-grid">
                <div className="sys-info">
                  <label>Admin ID</label>
                  <code>{currentUserId}</code>
                </div>
                <div className="sys-info">
                  <label>Role</label>
                  <span className="adm-role-badge role-admin">{user?.role}</span>
                </div>
                <div className="sys-info">
                  <label>Account Status</label>
                  <span className="adm-status active">✓ Active</span>
                </div>
                <div className="sys-info">
                  <label>Email Verified</label>
                  <span className={user?.isEmailVerified ? 'adm-status active' : 'adm-status inactive'}>
                    {user?.isEmailVerified ? '✓ Verified' : 'Not Verified'}
                  </span>
                </div>
                <div className="sys-info">
                  <label>Joined</label>
                  <p>{new Date(user?.createdAt || Date.now()).toLocaleDateString()}</p>
                </div>
                <div className="sys-info">
                  <label>Last Login</label>
                  <p>{user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : '—'}</p>
                </div>
              </div>

              <div className="settings-danger">
                <h3>⚠️ Danger Zone</h3>
                <p>Signing out will end your admin session.</p>
                <button className="adm-btn danger" onClick={logout}>
                  🚪 Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}