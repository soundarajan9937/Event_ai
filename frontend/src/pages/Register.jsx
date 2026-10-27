
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'user'
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value
    }));

    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError('');
    setSuccess('');

    const name = formData.name.trim();
    const email = formData.email.trim().toLowerCase();
    const { password, confirmPassword, role } = formData;

    // Validate required fields
    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all required fields.');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    // Validate password
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please try again.');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/auth/register', {
        name,
        email,
        password,
        confirmPassword,
        role
      });

      setSuccess(
        response.data.message ||
          'Registration successful! Redirecting to login...'
      );

      // Registration does not automatically log the user in.
      setTimeout(() => {
        navigate(
          role === 'organizer' || role === 'event'
            ? '/event-login'
            : '/login'
        );
      }, 1500);
    } catch (err) {
      console.error(
        'Registration error:',
        err.response?.data || err.message
      );

      if (err.response) {
        const status = err.response.status;
        const serverMessage =
          err.response.data?.error ||
          err.response.data?.message;

        if (serverMessage) {
          setError(serverMessage);
        } else if (status === 404) {
          setError(
            'Registration endpoint not found. Please check the backend route.'
          );
        } else if (status >= 500) {
          setError(
            'A server error occurred during registration. Please check the backend terminal.'
          );
        } else {
          setError(`Registration failed (HTTP ${status}).`);
        }
      } else if (err.request) {
        setError(
          'Cannot connect to the backend. Check the API URL and ensure the server is running.'
        );
      } else {
        setError(
          err.message || 'An unexpected error occurred during registration.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo-badge">✨</div>

          <h1 className="auth-title">Create Account</h1>

          <p className="auth-subtitle">
            Join EventAI to discover, track, and register for campus events
          </p>
        </div>

        {error && (
          <div className="alert alert-error" role="alert">
            <span>⚠️ {error}</span>
          </div>
        )}

        {success && (
          <div className="alert alert-success" role="status">
            <span>✓ {success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="register-name">
              Full Name
            </label>

            <input
              id="register-name"
              type="text"
              name="name"
              className="form-control"
              placeholder="e.g. John Doe"
              value={formData.name}
              onChange={handleChange}
              disabled={loading}
              autoComplete="name"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="register-email">
              Email Address
            </label>

            <input
              id="register-email"
              type="email"
              name="email"
              className="form-control"
              placeholder="name@college.edu"
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="register-role">
              Account Purpose / Role
            </label>

            <select
              id="register-role"
              name="role"
              className="form-control"
              value={formData.role}
              onChange={handleChange}
              disabled={loading}
            >
              <option value="user">
                👤 Student / User (View &amp; Register for Events)
              </option>

              <option value="organizer">
                ⚙️ Event Adder / Manager (Publish Events &amp; Upload Images)
              </option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="register-password">
              Password
            </label>

            <input
              id="register-password"
              type="password"
              name="password"
              className="form-control"
              placeholder="Minimum 6 characters"
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
              autoComplete="new-password"
              minLength={6}
              required
            />
          </div>

          <div className="form-group">
            <label
              className="form-label"
              htmlFor="register-confirm-password"
            >
              Confirm Password
            </label>

            <input
              id="register-confirm-password"
              type="password"
              name="confirmPassword"
              className="form-control"
              placeholder="Re-enter your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              disabled={loading}
              autoComplete="new-password"
              minLength={6}
              required
            />
          </div>

          <button
            id="register-submit-btn"
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%', marginTop: '0.5rem' }}
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Register Now'}
          </button>
        </form>

        <div
          style={{
            textAlign: 'center',
            marginTop: '1.5rem',
            fontSize: '0.9rem',
            color: 'var(--text-muted)'
          }}
        >
          Already have an account?{' '}
          <Link
            to="/login"
            style={{
              color: 'var(--primary-light)',
              fontWeight: '600'
            }}
          >
            Sign In here
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
