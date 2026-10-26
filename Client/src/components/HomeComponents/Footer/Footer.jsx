import { Link } from 'react-router-dom';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link to="/" className="footer-logo">
              <span className="logo-icon">⚡</span>
              <span className="logo-text">Skillora</span>
            </Link>
            <p>Connecting talented freelancers with clients worldwide. Build your career, grow your business.</p>
          </div>

          <div className="footer-col">
            <h4>Platform</h4>
            <Link to="/auth/signup">Find Freelancers</Link>
            <Link to="/auth/signup">Post a Project</Link>
            <Link to="/auth/signup">Browse Projects</Link>
            <Link to="/auth/signup">Categories</Link>
          </div>

          <div className="footer-col">
            <h4>Company</h4>
            <Link to="/">About Us</Link>
            <Link to="/">Careers</Link>
            <Link to="/">Blog</Link>
            <Link to="/">Contact</Link>
          </div>

          <div className="footer-col">
            <h4>Support</h4>
            <Link to="/">Help Center</Link>
            <Link to="/">Privacy Policy</Link>
            <Link to="/">Terms of Service</Link>
            <Link to="/">Report an Issue</Link>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Skillora. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}