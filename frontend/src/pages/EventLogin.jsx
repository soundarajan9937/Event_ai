import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';

const EventLogin = ({ onLoginSuccess }) => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.email || !formData.password) {
      setError('Please enter both your email address and password.');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/auth/login', {
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        isEventLogin: true
      });

      const { token, user } = response.data;

      // Save credentials locally
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      if (onLoginSuccess) {
        onLoginSuccess(user);
      }

      // Redirect Event Adder / Manager directly to Event Dashboard
      navigate('/event-dashboard');
    } catch (err) {
      console.error('Event login error:', err);
      const message = err.response?.data?.error || 'Invalid email or password for Event Adding Page.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        {/* Header Branding matching user screenshot */}
        <div className="auth-header">
          <div className="auth-logo-badge">
            ✨
          </div>
          <h1 className="auth-title">Welcome Back</h1>
          <div className="auth-subtitle-event">Event Adding Page</div>
          <p className="auth-subtitle">
            Sign in with your email & password to manage events, upload images, and view registrations
          </p>
        </div>

        {error && (
          <div className="alert alert-error">
            <span>⚠️ {error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="event-email">Email Address</label>
            <input
              id="event-email"
              type="email"
              name="email"
              className="form-control"
              placeholder="Enter your email address"
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="event-password">Password</label>
            <input
              id="event-password"
              type="password"
              name="password"
              className="form-control"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
              required
            />
          </div>

          <button
            id="event-login-submit-btn"
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%', marginTop: '0.5rem' }}
            disabled={loading}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', textAlign: 'center' }}>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            Need an Event Adder account?{' '}
            <Link to="/register" style={{ color: 'var(--primary-light)', fontWeight: '600' }}>
              Register Here
            </Link>
          </p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>
            Are you a student / user?{' '}
            <Link to="/login" style={{ color: 'var(--accent-green-light)', fontWeight: '600' }}>
              User Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default EventLogin;
