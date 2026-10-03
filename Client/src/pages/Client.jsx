// src/pages/Client.jsx
import { useEffect } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/ClientComponents/Navbar/Navbar';
import Dashboard from '../components/ClientComponents/Dashboard/Dashboard';
import PostProject from '../components/ClientComponents/PostProject/PostProject';
import Applications from '../components/ClientComponents/Applications/Applications';
import Freelancers from '../components/ClientComponents/Freelancers/Freelancers';
import BrowseProjects from '../components/ClientComponents/BrowseProjects/BrowseProjects';
import MyProjects from '../components/ClientComponents/MyProjects/MyProjects';
import Payments from '../components/ClientComponents/Payments/Payments';
import Profile from '../components/ClientComponents/Profile/Profile';
import Settings from '../components/ClientComponents/Settings/Settings';

export default function Client() {
  const { section } = useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Authentication & Role-Based Access Control Protection
  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate('/auth/signin', { replace: true });
      return;
    }

    if (user.role && user.role !== 'client') {
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
          fontFamily: 'inherit',
        }}
      >
        Verifying client session...
      </div>
    );
  }

  if (!user || user.role !== 'client') {
    return null;
  }

  // Component Router matching the :section URL parameter
  const renderClientSection = () => {
    switch (section) {
      case 'dashboard':
        return <Dashboard />;
      case 'post-project':
        return <PostProject />;
      case 'applications':
        return <Applications />;
      case 'browse-projects':
        return <BrowseProjects />;
      case 'my-projects':
        return <MyProjects />;
      case 'payments':
        return <Payments />;
      case 'freelancers':
        return <Freelancers />;
      case 'profile':
        return <Profile />;
      case 'settings':
        return <Settings />;
      default:
        return <Navigate to="/client/dashboard" replace />;
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <Navbar />
      <main>{renderClientSection()}</main>
    </div>
  );
}