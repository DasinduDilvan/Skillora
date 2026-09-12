// src/components/FreelancerComponents/Navbar/Navbar.jsx
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

/* ── helpers ── */
const asArray = (res) => {
  const d = res?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.results)) return d.results;
  return [];
};

const rid = (v) => {
  if (!v) return null;
  if (typeof v === 'string') return v;
  if (typeof v === 'object') {
    return v.freelancerId || v.userId || v.projectId || v._id || v.id || null;
  }
  return String(v);
};

const eqId = (a, b) => {
  const x = rid(a), y = rid(b);
  return x && y && String(x) === String(y);
};

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [counts, setCounts] = useState({
    notifications: 0,
    myProjects: 0,
  });

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
  const currentUserId = user?.userId || user?._id || user?.id;

  /* ── Fetch live counts (notifications + my projects) ── */
  useEffect(() => {
    if (!user || !currentUserId) return;

    const fetchCounts = async () => {
      try {
        const [notifRes, freelancersRes, projectsRes] = await Promise.all([
          API.get('/notifications').catch(() => ({ data: [] })),
          API.get('/freelancers').catch(() => ({ data: [] })),
          API.get('/projects').catch(() => ({ data: [] })),
        ]);

        const notifications = asArray(notifRes);
        const freelancers = asArray(freelancersRes);
        const projects = asArray(projectsRes);

        // unread notifications
        const unread = notifications.filter(
          (n) => eqId(n.userId, currentUserId) && !n.isRead
        ).length;

        // find this user's freelancer profile
        const myFreelancer = freelancers.find((f) => eqId(f.userId, currentUserId));
        const freelancerId = myFreelancer?.freelancerId || myFreelancer?._id;

        // count active (non-completed / non-cancelled) projects assigned to me
        let myProjectsCount = 0;
        if (freelancerId) {
          myProjectsCount = projects.filter((p) => {
            if (!eqId(p.freelancerId, freelancerId)) return false;
            const status = (p.status || '').toLowerCase();
            return status !== 'completed' && status !== 'cancelled';
          }).length;
        }

        setCounts({
          notifications: unread,
          myProjects: myProjectsCount,
        });
      } catch (err) {
        console.error('Failed to load navbar counts:', err);
      }
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 60000); // refresh every 60s
    return () => clearInterval(interval);
  }, [user, currentUserId]);

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

  /* ── returns the badge number for a given link label ── */
  const getBadge = (label) => {
    if (label === 'Notifications') return counts.notifications;
    if (label === 'My Projects') return counts.myProjects;
    return 0;
  };

  return (
    <nav className="role-navbar">
      <div className="role-navbar-container">
        <Link to="/freelancer/dashboard" className="role-navbar-logo">
          <img src="/logo.png" alt="Skillora Logo" className="logo-img" />
          Skillora
        </Link>

        <div className="role-navbar-links">
          {freelancerLinks.map((link) => {
            const badge = getBadge(link.label);
            return (
              <Link
                key={link.id}
                to={link.path}
                className={location.pathname === link.path ? 'active' : ''}
              >
                {link.label}
                {badge > 0 && (
                  <span className="nav-badge">{badge > 99 ? '99+' : badge}</span>
                )}
              </Link>
            );
          })}
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
          {freelancerLinks.map((link) => {
            const badge = getBadge(link.label);
            return (
              <Link
                key={link.id}
                to={link.path}
                className={location.pathname === link.path ? 'active' : ''}
              >
                {link.label}
                {badge > 0 && (
                  <span className="nav-badge mobile-badge">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </Link>
            );
          })}
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