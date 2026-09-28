// src/pages/Admin.jsx
import { useParams, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/AdminComponents/Navbar/Navbar';
import Dashboard from '../components/AdminComponents/Dashboard/Dashboard';
import Users from '../components/AdminComponents/Users/Users';
import Projects from '../components/AdminComponents/Projects/Projects';
import Categories from '../components/AdminComponents/Categories/Categories';
import Payments from '../components/AdminComponents/Payments/Payments';
import Reports from '../components/AdminComponents/Reports/Reports';
import Settings from '../components/AdminComponents/Settings/Settings';

export default function Admin() {
  const { section } = useParams();
  const { user } = useAuth();

  if (!user) return <Navigate to="/auth/signin" replace />;
  if (user.role !== 'admin') return <Navigate to={`/${user.role}/dashboard`} replace />;

  const renderSection = () => {
    switch (section) {
      case 'dashboard':  return <Dashboard />;
      case 'users':      return <Users />;
      case 'projects':   return <Projects />;
      case 'categories': return <Categories />;
      case 'payments':   return <Payments />;
      case 'reports':    return <Reports />;
      case 'settings':   return <Settings />;
      default:           return <Dashboard />;
    }
  };

  return (
    <>
      <Navbar />
      <main className="role-main">{renderSection()}</main>
    </>
  );
}