import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import API from '../../../api/axios';
import './Navbar.css';

const freelancerLinks = [
  { id: 1, label: 'Dashboard', path: '/freelancer/dashboard' },
  { id: 2, label: 'Browse Projects', path: '/freelancer/browse-projects' },
  { id: 3, label: 'My Projects', path: '/freelancer/my-projects' },
  { id: 4, label: 'Notifications', path: '/freelancer/notifications' },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const menuRef = useRef(null);
  const btnRef = useRef(null);
  const profileRef = useRef(null);

  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const freelancerName =
    user?.firstName ||
    user?.name ||
    user?.username ||
    (user?.email ? user.email.split('@')[0] : 'Freelancer');

  const avatarLetter = freelancerName.charAt(0).toUpperCase();

  // Fetch real unread notification count from API
  useEffect(() => {
    if (!user) return;

    const fetchUnread = async () => {
      try {
        const res = await API.get('/notifications');
        const notifications = res.data?.data || res.data || [];
        const userId = user.userId || user._id;
        const unread = notifications.filter(
          (n) => n.userId === userId && !n.isRead
        ).length;
        setUnreadCount(unread);
      } catch (err) {
        console.error('Failed to load notifications count:', err);
      }
    };

    fetchUnread();
    // Poll every 60 seconds for new notifications
    const interval = setInterval(fetchUnread, 60000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    setMobileOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        btnRef.current &&
        !btnRef.current.contains(e.target)
      ) {
        setMobileOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setMobileOpen(false);
    setProfileOpen(false);
    navigate('/auth/signin');
  };

  return (
    <nav className="role-navbar">
      <div className="role-navbar-container">
        <Link to="/freelancer/dashboard" className="role-navbar-logo">
          <img src="/logo.png" alt="Skillora Logo" className="logo-img" />
          Skillora
        </Link>

        <div className="role-navbar-links">
          {freelancerLinks.map((link) => (
            <Link
              key={link.id}
              to={link.path}
              className={location.pathname === link.path ? 'active' : ''}
            >
              {link.label}
              {link.label === 'Notifications' && unreadCount > 0 && (
                <span className="nav-badge">{unreadCount}</span>
              )}
            </Link>
          ))}
        </div>

        <div className="role-navbar-user-section" ref={profileRef}>
          <button
            className={`role-avatar-btn ${profileOpen ? 'active' : ''}`}
            onClick={() => setProfileOpen((p) => !p)}
            aria-label="User Profile Options"
          >
            <div className="navbar-avatar">
              {user?.profileImage ? (
                <img src={user.profileImage} alt={freelancerName} />
              ) : (
                avatarLetter
              )}
            </div>
            <span className="user-greet-name hide-mobile">
              {freelancerName} ▾
            </span>
          </button>

          {profileOpen && (
            <div className="profile-dropdown">
              <div className="dropdown-user-header">
                <strong>{freelancerName}</strong>
                <span>{user?.email || 'Freelancer Account'}</span>
              </div>
              <hr />
              <Link to="/freelancer/profile" className="dropdown-item">
                👤 My Profile
              </Link>
              <Link to="/freelancer/settings" className="dropdown-item">
                ⚙️ Settings
              </Link>
              <hr />
              <button
                onClick={handleLogout}
                className="dropdown-item logout-btn-item"
              >
                🚪 Logout
              </button>
            </div>
          )}
        </div>

        <button
          ref={btnRef}
          className={`role-mobile-btn${mobileOpen ? ' active' : ''}`}
          onClick={() => setMobileOpen((p) => !p)}
          aria-label="Toggle navigation menu"
        >
          <div className="hamburger">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </button>
      </div>

      <div
        ref={menuRef}
        className={`role-mobile-menu${mobileOpen ? ' active' : ''}`}
      >
        <div className="mobile-user-info">
          <div className="mobile-user-avatar">
            {user?.profileImage ? (
              <img src={user.profileImage} alt={freelancerName} />
            ) : (
              avatarLetter
            )}
          </div>
          <div>
            <div className="mobile-user-name">{freelancerName}</div>
            <div className="mobile-user-role">Freelancer Account</div>
          </div>
        </div>

        <div className="mobile-core-links">
          {freelancerLinks.map((link) => (
            <Link
              key={link.id}
              to={link.path}
              className={location.pathname === link.path ? 'active' : ''}
            >
              {link.label}
              {link.label === 'Notifications' && unreadCount > 0 && (
                <span className="nav-badge mobile-badge">{unreadCount}</span>
              )}
            </Link>
          ))}
        </div>

        <hr className="mobile-divider" />

        <div className="mobile-profile-actions">
          <Link to="/freelancer/profile" className="mobile-profile-link">
            👤 My Profile
          </Link>
          <Link to="/freelancer/settings" className="mobile-profile-link">
            ⚙️ Settings
          </Link>
          <button onClick={handleLogout} className="btn-logout mobile">
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}