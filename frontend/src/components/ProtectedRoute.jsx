import React, { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import api from '../api';

const ProtectedRoute = ({ user, adminOnly = false, organizerOnly = false, children }) => {
  const location = useLocation();
  const [upgrading, setUpgrading] = useState(false);
  const [error, setError] = useState('');

  // If user is not authenticated at all
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If route is restricted to admins only
  if (adminOnly && user.role !== 'admin') {
    return (
      <div className="container page-container">
        <div className="alert alert-error">
          <span>⚠️ Access Denied: You must be an administrator to view this page.</span>
        </div>
      </div>
    );
  }

  // Handler to upgrade user role to Event Adder / Manager
  const handleUpgradeRole = async () => {
    setUpgrading(true);
    setError('');

    try {
      const response = await api.post('/auth/upgrade-role');
      const { token, user: updatedUser } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(updatedUser));

      // Reload page to reflect updated role across the app
      window.location.reload();
    } catch (err) {
      console.error('Failed to upgrade account role:', err);
      setError(err.response?.data?.error || 'Failed to activate Event Adder permissions.');
    } finally {
      setUpgrading(false);
    }
  };

  // If route is restricted to event organizers / managers or admins
  if (organizerOnly && user.role !== 'organizer' && user.role !== 'event' && user.role !== 'admin') {
    return (
      <div className="container page-container">
        <div className="card" style={{ maxWidth: '620px', margin: '3rem auto', textAlign: 'center', padding: '2.5rem 2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚙️</div>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '0.75rem', color: '#ffffff' }}>
            Event Adding Access Required
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: '1.6', fontSize: '1rem' }}>
            You are currently signed in as <strong style={{ color: '#ffffff' }}>{user.name}</strong> with a Student account. To create events, upload images, and manage registrations, activate your Event Adder permissions below.
          </p>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>
              <span>⚠️ {error}</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              id="activate-event-adder-btn"
              className="btn btn-primary btn-lg"
              onClick={handleUpgradeRole}
              disabled={upgrading}
            >
              {upgrading ? 'Activating Access...' : '🚀 Switch to Event Adder Account'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
