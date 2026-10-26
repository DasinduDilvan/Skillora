// src/components/AuthComponents/SignUp/SignUp.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext'; // <-- LIVE AUTH
import './SignUp.css';

const initialForm = {
  firstName: '', lastName: '', email: '', phone: '',
  primarySkill: '', password: '', confirmPassword: '', terms: false,
};

const SignUp = () => {
  const navigate = useNavigate();
  const { signup } = useAuth(); // <-- Get signup function
  
  const [role, setRole] = useState('client');
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState({ type: '', message: '' });

  const handleChange = (e) => {
    const { id, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [id]: type === 'checkbox' ? checked : value }));
    if (errors[id]) setErrors((prev) => ({ ...prev, [id]: null }));
  };

  const getStrength = (pw) => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;

    const configs = [
      { pct: '0%', color: '#E5E7EB', text: 'Enter a password' },
      { pct: '25%', color: '#EF4444', text: 'Weak' },
      { pct: '50%', color: '#F59E0B', text: 'Fair' },
      { pct: '75%', color: '#3B82F6', text: 'Good' },
      { pct: '100%', color: '#22C55E', text: 'Strong' },
    ];
    return configs[score];
  };

  const strength = getStrength(form.password);

  const validate = () => {
    const newErrors = {};
    if (!form.firstName.trim()) newErrors.firstName = 'Enter your first name.';
    if (!form.lastName.trim()) newErrors.lastName = 'Enter your last name.';
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email))
      newErrors.email = 'Enter a valid email address.';
    if (form.password.length < 8)
      newErrors.password = 'Password must be at least 8 characters.';
    if (form.password !== form.confirmPassword)
      newErrors.confirmPassword = 'Passwords do not match.';
    if (!form.terms) newErrors.terms = 'You must accept the terms.';
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setAlert({ type: 'error', message: 'Please fill in all required fields correctly.' });
      setTimeout(() => setAlert({ type: '', message: '' }), 3000);
      return;
    }

    setSubmitting(true);
    try {
      // Generate a username safely for the backend
      const autoUsername = form.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') + Math.floor(Math.random() * 1000);

      const payload = {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        phone: form.phone,
        role: role,
        username: autoUsername
      };

      await signup(payload);
      
      setAlert({ type: 'success', message: '🎉 Account created successfully! Redirecting...' });
      setTimeout(() => navigate(`/${role}/dashboard`), 1500);

    } catch (err) {
      setAlert({ 
        type: 'error', 
        message: err.response?.data?.message || 'Registration failed.' 
      });
      setSubmitting(false);
    }
  };

  return (
    <div className="signup-page-wrap">
      {/* LEFT PANEL */}
      <div className="signup-left-panel">
        <h2>Join the Skillora Community</h2>
        <p>Whether you need a skilled professional or want to offer your services, Skillora is the right place to start.</p>
        <ul className="feature-list">
          <li>Access Design, Video & IT projects</li>
          <li>Showcase your portfolio and skills</li>
          <li>Simple and transparent hiring process</li>
          <li>Secure online payment workflow</li>
          <li>Build your professional reputation</li>
          <li>Free to register and get started</li>
        </ul>
      </div>

      {/* RIGHT PANEL */}
      <div className="signup-right-panel">
        <div className="form-header">
          <h2>Create your Account</h2>
          <p>Join as a client or freelancer in just a few steps.</p>
        </div>

        {alert.message && (
          <div className={`alert alert-${alert.type}`}>{alert.message}</div>
        )}

        <div className="role-selector">
          <div
            className={`role-option ${role === 'client' ? 'active' : ''}`}
            onClick={() => setRole('client')}
          >
            <div className="role-icon">💼</div>
            <h4>I'm a Client</h4>
            <p>I need freelance services</p>
          </div>
          <div
            className={`role-option ${role === 'freelancer' ? 'active' : ''}`}
            onClick={() => setRole('freelancer')}
          >
            <div className="role-icon">🎯</div>
            <h4>I'm a Freelancer</h4>
            <p>I want to offer services</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">First Name *</label>
              <input
                type="text"
                id="firstName"
                value={form.firstName}
                onChange={handleChange}
                placeholder="John"
                className={errors.firstName ? 'error' : ''}
              />
              {errors.firstName && <div className="error-msg">{errors.firstName}</div>}
            </div>
            <div className="form-group">
              <label htmlFor="lastName">Last Name *</label>
              <input
                type="text"
                id="lastName"
                value={form.lastName}
                onChange={handleChange}
                placeholder="Doe"
                className={errors.lastName ? 'error' : ''}
              />
              {errors.lastName && <div className="error-msg">{errors.lastName}</div>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address *</label>
            <input
              type="email"
              id="email"
              value={form.email}
              onChange={handleChange}
              placeholder="youremail@example.com"
              className={errors.email ? 'error' : ''}
            />
            {errors.email && <div className="error-msg">{errors.email}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone Number</label>
            <input
              type="tel"
              id="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="+94 77 000 0000"
            />
          </div>

          {role === 'freelancer' && (
            <div className="form-group">
              <label htmlFor="primarySkill">Primary Skill *</label>
              <select id="primarySkill" value={form.primarySkill} onChange={handleChange} className={errors.primarySkill ? 'error' : ''}>
                <option value="">Select your main skill</option>
                <option>Graphic Design</option>
                <option>Logo Design</option>
                <option>UI/UX Design</option>
                <option>Video Editing</option>
                <option>Web Development</option>
                <option>React.js</option>
                <option>WordPress</option>
                <option>Full-Stack Development</option>
                <option>Content Writing</option>
                <option>Copywriting</option>
                <option>Translation</option>
                <option>Proofreading</option>
                <option>Technical Support</option>
                <option>Help Desk</option>
                <option>Virtual Assistance</option>
              </select>
              {errors.primarySkill && <div className="error-msg">{errors.primarySkill}</div>}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="password">Password *</label>
            <div className="password-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Create a strong password"
                className={errors.password ? 'error' : ''}
              />
              <button
                type="button"
                className="toggle-pw"
                onClick={() => setShowPassword((p) => !p)}
              >
                {showPassword ? '🙈' : '👁'}
              </button>
            </div>
            <div className="pw-strength">
              <div
                className="pw-strength-bar"
                style={{ width: strength.pct, background: strength.color }}
              />
            </div>
            <div className="pw-strength-label" style={{ color: strength.color }}>
              {strength.text}
            </div>
            {errors.password && <div className="error-msg">{errors.password}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password *</label>
            <div className="password-wrap">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter your password"
                className={errors.confirmPassword ? 'error' : ''}
              />
              <button
                type="button"
                className="toggle-pw"
                onClick={() => setShowConfirmPassword((p) => !p)}
              >
                {showConfirmPassword ? '🙈' : '👁'}
              </button>
            </div>
            {errors.confirmPassword && (
              <div className="error-msg">{errors.confirmPassword}</div>
            )}
          </div>

          <div className="checkbox-group">
            <input
              type="checkbox"
              id="terms"
              checked={form.terms}
              onChange={handleChange}
            />
            <label htmlFor="terms">
              I agree to the <a href="#">Terms of Service</a> and{' '}
              <a href="#">Privacy Policy</a>
            </label>
          </div>

          <button type="submit" className="btn-submit" disabled={submitting}>
            {submitting ? 'Creating Account...' : 'Create Account'}
          </button>

          <div className="sign-in-link" style={{ marginTop: '1.25rem' }}>
            Already have an account? <Link to="/auth/signin">Log In</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignUp;