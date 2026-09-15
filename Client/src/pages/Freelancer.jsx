import { useEffect } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/FreelancerComponents/Navbar/Navbar';
import Dashboard from '../components/FreelancerComponents/Dashboard/Dashboard';
import BrowseProjects from '../components/FreelancerComponents/BrowseProjects/BrowseProjects';
import MyProjects from '../components/FreelancerComponents/MyProjects/MyProjects';
import Profile from '../components/FreelancerComponents/Profile/Profile';
import Settings from '../components/FreelancerComponents/Settings/Settings';
import Notifications from '../components/FreelancerComponents/Notifications/Notifications';

// Placeholder view for secondary Freelancer sub-pages
const FreelancerPlaceholder = ({ title }) => (
  <div
    style={{
      maxWidth: 1400,
      margin: '0 auto',
      padding: '70px 24px',
      textAlign: 'center',
    }}
  >
    <div
      style={{
        width: 56,
        height: 56,
        background: 'var(--primary-light, #eef2ff)',
        color: 'var(--primary, #4f46e5)',
        borderRadius: 12,
        display: 'grid',
        placeItems: 'center',
        fontSize: '1.6rem',
        margin: '0 auto 16px',
      }}
    >
      🚧
    </div>
    <h1 style={{ fontSize: '1.6rem', color: 'var(--text, #111827)', marginBottom: 8 }}>
      {title}
    </h1>
    <p style={{ color: 'var(--text-light, #6b7280)', maxWidth: 450, margin: '0 auto' }}>
      This module is under development and will be available in the next release.
    </p>
  </div>
);

export default function Freelancer() {
  const { section } = useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Auth & Role Protection
  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate('/auth/signin', { replace: true });
      return;
    }

    if (user.role && user.role !== 'freelancer') {
      navigate(`/${user.role}/dashboard`, { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--text-light, #6b7280)',
        }}
      >
        Verifying freelancer session...
      </div>
    );
  }

  if (!user || user.role !== 'freelancer') {
    return null;
  }

  // Section Router
  const renderFreelancerSection = () => {
    switch (section) {
      case 'dashboard':
        return <Dashboard />;
      case 'browse-projects':
        return <BrowseProjects />;
      case 'my-projects':
        return <MyProjects />;
      case 'notifications':
        return <Notifications />;
      case 'profile':
        return <Profile />;
      case 'settings':
        return <Settings />;
      default:
        return <Navigate to="/freelancer/dashboard" replace />;
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <Navbar />
      <main>{renderFreelancerSection()}</main>
    </div>
  );
}