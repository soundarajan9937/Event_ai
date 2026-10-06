import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';

const Navbar = ({ user, onLogout }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogoutClick = () => {
    onLogout();
    setMobileMenuOpen(false);
    navigate('/');
  };

  const closeMobile = () => setMobileMenuOpen(false);

  return (
    <nav className="navbar">
      <div className="container navbar-inner">
        {/* Brand / Logo */}
        <Link to="/" className="navbar-brand" onClick={closeMobile}>
          <div className="brand-icon">✨</div>
          <span className="brand-text">
            Event<span>AI</span>
          </span>
        </Link>

        {/* Mobile menu hamburger */}
        <button
          className="mobile-menu-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation"
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>

        {/* Nav Links based on Auth & Role */}
        <div className={`navbar-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          {/* Always Visible */}
          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={closeMobile}
          >
            Home
          </NavLink>

          {/* Logged Out Navigation */}
          {!user && (
            <>
              <NavLink
                to="/events"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={closeMobile}
              >
                Events
              </NavLink>
              <NavLink
                to="/login"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={closeMobile}
              >
                Login
              </NavLink>
              <NavLink
                to="/event-login"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                style={{ color: 'var(--accent-green-light)', fontWeight: '600' }}
                onClick={closeMobile}
              >
                Event Login
              </NavLink>
              <Link
                to="/register"
                className="btn btn-primary btn-sm"
                onClick={closeMobile}
              >
                Register
              </Link>
            </>
          )}

          {/* Logged in as Normal Student User */}
          {user && user.role === 'user' && (
            <>
              <NavLink
                to="/events"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={closeMobile}
              >
                Events
              </NavLink>
              <NavLink
                to="/recommendations"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={closeMobile}
              >
                Recommendations
              </NavLink>
              <NavLink
                to="/my-events"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={closeMobile}
              >
                My Events
              </NavLink>
            </>
          )}

          {/* Logged in as Event Manager / Event Adder (Organiser) */}
          {user && (user.role === 'organizer' || user.role === 'event') && (
            <>
              <NavLink
                to="/event-dashboard"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                style={{ color: 'var(--accent-green-light)', fontWeight: '600' }}
                onClick={closeMobile}
              >
                Event Dashboard
              </NavLink>
            </>
          )}

          {/* Logged in as Admin */}
          {user && user.role === 'admin' && (
            <>
              <NavLink
                to="/event-dashboard"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={closeMobile}
              >
                Event Dashboard
              </NavLink>
              <NavLink
                to="/admin"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={closeMobile}
              >
                Admin Dashboard
              </NavLink>
            </>
          )}

          {/* User Badge & Logout Button when logged in */}
          {user && (
            <div className="navbar-auth">
              <div className="user-badge">
                <span>{user.name}</span>
                <span className={`role-pill ${user.role}`}>
                  {user.role}
                </span>
              </div>
              <button
                onClick={handleLogoutClick}
                className="btn btn-outline btn-sm"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
