// src/components/AdminComponents/Navbar/Navbar.jsx
import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import './Navbar.css';

const adminLinks = [
  { id: 1, label: 'Dashboard', path: '/admin/dashboard' },
  { id: 2, label: 'Users', path: '/admin/users' },
  { id: 3, label: 'Projects', path: '/admin/projects' },
  { id: 4, label: 'Categories', path: '/admin/categories' },
  { id: 5, label: 'Payments', path: '/admin/payments' },
  //{ id: 6, label: 'Reports', path: '/admin/reports' },
  { id: 7, label: 'Settings', path: '/admin/settings' },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef(null);
  const btnRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (
        menuRef.current && !menuRef.current.contains(e.target) &&
        btnRef.current && !btnRef.current.contains(e.target)
      ) setMobileOpen(false);
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setMobileOpen(false);
    navigate('/');
  };

  return (
    <nav className="admin-navbar">
      <div className="admin-navbar-container">
        <Link to="/admin/dashboard" className="admin-navbar-logo">
          <img src="/logo.png" alt="Skillora Logo" className="logo-img" />
          Skillora <span className="admin-tag">Admin</span>
        </Link>

        <div className="admin-navbar-links">
          {adminLinks.map((link) => (
            <Link
              key={link.id}
              to={link.path}
              className={location.pathname === link.path ? 'active' : ''}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="admin-navbar-user">
          <span className="user-greet">Hi, {user?.name || 'Admin'}</span>
          <button onClick={handleLogout} className="btn-logout">Logout</button>
        </div>

        <button
          ref={btnRef}
          className={`admin-mobile-btn${mobileOpen ? ' active' : ''}`}
          onClick={() => setMobileOpen((p) => !p)}
          aria-label="Toggle menu"
        >
          <div className="hamburger">
            <span></span><span></span><span></span>
          </div>
        </button>
      </div>

      <div ref={menuRef} className={`admin-mobile-menu${mobileOpen ? ' active' : ''}`}>
        {adminLinks.map((link) => (
          <Link
            key={link.id}
            to={link.path}
            className={location.pathname === link.path ? 'active' : ''}
          >
            {link.label}
          </Link>
        ))}
        <button onClick={handleLogout} className="btn-logout mobile">Logout</button>
      </div>
    </nav>
  );
}