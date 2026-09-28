// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Auth from './pages/Auth';
import Client from './pages/Client';
import Freelancer from './pages/Freelancer';
import Admin from './pages/Admin';
import './App.css';
import PublicBrowseProjects from './components/HomeComponents/PublicBrowseProjects/PublicBrowseProjects';

function App() {
  return (
    <Routes>
      {/* Landing Page */}
      <Route path="/" element={<Home />} />

      {/* Public Browse Projects */}
      <Route path="/browse" element={<PublicBrowseProjects />} /> {/* <-- 2. Add route */}
      <Route path="/projects" element={<Navigate to="/browse" replace />} />

      {/* Auth Routes */}
      <Route path="/auth/:mode" element={<Auth />} />
      <Route path="/auth" element={<Navigate to="/auth/signin" replace />} />
      <Route path="/signin" element={<Navigate to="/auth/signin" replace />} />
      <Route path="/signup" element={<Navigate to="/auth/signup" replace />} />

      {/* Role-Based Routes */}
      <Route path="/client/:section" element={<Client />} />
      <Route path="/client" element={<Navigate to="/client/dashboard" replace />} />

      <Route path="/freelancer/:section" element={<Freelancer />} />
      <Route path="/freelancer" element={<Navigate to="/freelancer/dashboard" replace />} />

      <Route path="/admin/:section" element={<Admin />} />
      <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

      {/* Catch-all fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;