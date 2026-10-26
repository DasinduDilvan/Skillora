import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import AuthNavbar from '../Navbar/Navbar';
import './ForgotPassword.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

const ForgotPassword = () => {
  const [step, setStep] = useState(1);
  const [verifyData, setVerifyData] = useState({ email: '', username: '' });
  const [passwords, setPasswords] = useState({ newPassword: '', confirmPassword: '' });
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState({ type: '', message: '' });
  const [matchedUserId, setMatchedUserId] = useState(null);

  const showAlert = (type, message) => setAlert({ type, message });
  const clearAlert = () => setAlert({ type: '', message: '' });

  /* ── Step 1 : Verify identity using GET /api/users ── */
  const handleVerify = async (e) => {
    e.preventDefault();
    clearAlert();

    const { email, username } = verifyData;

    if (!email || !username) {
      showAlert('error', '❌ Please enter both your email and username.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showAlert('error', '❌ Please enter a valid email address.');
      return;
    }

    setSubmitting(true);
    try {
      // Fetch all users and find the one matching email + username
      const res = await axios.get(`${API_BASE}/users`);
      const users = res.data?.users || res.data?.data || res.data || [];

      const matched = users.find(
        (u) =>
          u.email?.toLowerCase() === email.toLowerCase() &&
          u.username?.toLowerCase() === username.toLowerCase()
      );

      if (matched) {
        setMatchedUserId(matched.userId || matched._id);
        showAlert('success', '✅ Identity verified! You can now reset your password.');
        setTimeout(() => setStep(2), 600);
      } else {
        showAlert(
          'error',
          '❌ No account found with that email and username combination.'
        );
      }
    } catch (err) {
      console.error('Verify error:', err);
      showAlert(
        'error',
        `❌ ${err.response?.data?.message || 'Verification failed. Try again.'}`
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Step 2 : Reset password using PUT /api/users/:userId ── */
  const handleResetPassword = async (e) => {
    e.preventDefault();
    clearAlert();

    const { newPassword, confirmPassword } = passwords;

    if (!newPassword || !confirmPassword) {
      showAlert('error', '❌ Please fill in both password fields.');
      return;
    }
    if (newPassword.length < 8) {
      showAlert('error', '❌ Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showAlert('error', '❌ Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      // Update the user's password using the existing PUT endpoint
      await axios.put(`${API_BASE}/users/${matchedUserId}`, {
        password: newPassword,
      });

      showAlert('success', '✅ Password reset successful! Redirecting to login...');
      setTimeout(() => {
        window.location.href = '/auth/signin';
      }, 1500);
    } catch (err) {
      console.error('Reset error:', err);
      showAlert(
        'error',
        `❌ ${err.response?.data?.message || 'Could not reset password.'}`
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Step indicator ── */
  const stepIndicators = (
    <div className="fp-steps">
      {[1, 2].map((s) => (
        <div key={s} className={`fp-step-dot ${step >= s ? 'active' : ''}`}>
          <span>{s}</span>
          {s < 2 && <div className={`fp-step-line ${step > s ? 'filled' : ''}`} />}
        </div>
      ))}
    </div>
  );

  return (
    <>
      {/* ── Navbar ── */}
      <AuthNavbar mode="forgot-password" />

      <div className="fp-page-wrap">
        {/* ── LEFT PANEL ── */}
        <div className="fp-left-panel">
          <div className="lp-icon">🔑</div>
          <h2>Reset Your Password</h2>
          <p>
            No worries — it happens to the best of us. Verify your identity and
            you'll be back into your Skillora dashboard in no time.
          </p>

          <div className="testimonial">
            <p>
              "I locked myself out right before a big deadline. The password reset
              was so quick I barely missed a beat!"
            </p>
            <div className="testimonial-author">
              <div className="t-avatar">NP</div>
              <div className="t-info">
                <h5>Nadeesha Perera</h5>
                <span>UI/UX Designer, Freelancer</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="fp-right-panel">
          <div className="form-header">
            <h2>
              {step === 1 && 'Forgot Password'}
              {step === 2 && 'Create New Password'}
            </h2>
            <p>
              {step === 1 &&
                'Enter your email and username so we can verify your account.'}
              {step === 2 &&
                "Choose a strong password you haven't used before."}
            </p>
          </div>

          {stepIndicators}

          {alert.message && (
            <div className={`alert alert-${alert.type}`}>{alert.message}</div>
          )}

          {/* ── STEP 1 : Verify Identity ── */}
          {step === 1 && (
            <form onSubmit={handleVerify} noValidate>
              <div className="form-group">
                <label htmlFor="fp-email">Email Address</label>
                <input
                  type="email"
                  id="fp-email"
                  value={verifyData.email}
                  onChange={(e) =>
                    setVerifyData((d) => ({ ...d, email: e.target.value }))
                  }
                  placeholder="youremail@example.com"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="fp-username">Username</label>
                <input
                  type="text"
                  id="fp-username"
                  value={verifyData.username}
                  onChange={(e) =>
                    setVerifyData((d) => ({ ...d, username: e.target.value }))
                  }
                  placeholder="e.g. kamal_dev"
                  required
                />
              </div>

              <button type="submit" className="btn-submit" disabled={submitting}>
                {submitting ? 'Verifying...' : 'Verify My Account'}
              </button>
            </form>
          )}

          {/* ── STEP 2 : New Password ── */}
          {step === 2 && (
            <form onSubmit={handleResetPassword} noValidate>
              <div className="form-group">
                <label htmlFor="newPassword">New Password</label>
                <div className="password-wrap">
                  <input
                    type={showNew ? 'text' : 'password'}
                    id="newPassword"
                    value={passwords.newPassword}
                    onChange={(e) =>
                      setPasswords((p) => ({ ...p, newPassword: e.target.value }))
                    }
                    placeholder="Min. 8 characters"
                    required
                  />
                  <button
                    type="button"
                    className="toggle-pw"
                    onClick={() => setShowNew((v) => !v)}
                  >
                    {showNew ? '🙈' : '👁'}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <div className="password-wrap">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    id="confirmPassword"
                    value={passwords.confirmPassword}
                    onChange={(e) =>
                      setPasswords((p) => ({
                        ...p,
                        confirmPassword: e.target.value,
                      }))
                    }
                    placeholder="Re-enter your password"
                    required
                  />
                  <button
                    type="button"
                    className="toggle-pw"
                    onClick={() => setShowConfirm((v) => !v)}
                  >
                    {showConfirm ? '🙈' : '👁'}
                  </button>
                </div>
              </div>

              <button type="submit" className="btn-submit" disabled={submitting}>
                {submitting ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}

          <div className="back-to-login">
            <Link to="/auth/signin">← Back to Log In</Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default ForgotPassword;