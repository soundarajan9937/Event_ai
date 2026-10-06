import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';

import Home from './pages/Home';
import Login from './pages/Login';
import EventLogin from './pages/EventLogin';
import Register from './pages/Register';
import Events from './pages/Events';
import Recommendations from './pages/Recommendations';
import EventDetails from './pages/EventDetails';
import MyEvents from './pages/MyEvents';
import AdminDashboard from './pages/AdminDashboard';
import EventDashboard from './pages/EventDashboard';

import api from './api';

function App() {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    try {
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  // Verify stored user session on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.get('/auth/me')
        .then((res) => {
          setUser(res.data.user);
          localStorage.setItem('user', JSON.stringify(res.data.user));
        })
        .catch(() => {
          // Token invalid or expired
          handleLogout();
        });
    }
  }, []);

  const handleLoginSuccess = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <Router>
      <Navbar user={user} onLogout={handleLogout} />
      <main className="main-content">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home user={user} />} />
          <Route path="/events" element={<Events user={user} />} />
          <Route path="/events/:id" element={<EventDetails user={user} />} />
          <Route path="/recommendations" element={<Recommendations user={user} />} />

          {/* Guest Routes (redirect if already logged in) */}
          <Route
            path="/login"
            element={
              user ? (
                user.role === 'admin' ? <Navigate to="/admin" replace /> :
                (user.role === 'organizer' || user.role === 'event') ? <Navigate to="/event-dashboard" replace /> :
                <Navigate to="/events" replace />
              ) : (
                <Login onLoginSuccess={handleLoginSuccess} />
              )
            }
          />
          <Route
            path="/event-login"
            element={
              user ? (
                (user.role === 'organizer' || user.role === 'event' || user.role === 'admin') ? (
                  <Navigate to="/event-dashboard" replace />
                ) : (
                  <Navigate to="/events" replace />
                )
              ) : (
                <EventLogin onLoginSuccess={(u) => {
                  const token = localStorage.getItem('token');
                  handleLoginSuccess(token, u);
                }} />
              )
            }
          />
          <Route
            path="/register"
            element={
              user ? (
                user.role === 'admin' ? <Navigate to="/admin" replace /> :
                (user.role === 'organizer' || user.role === 'event') ? <Navigate to="/event-dashboard" replace /> :
                <Navigate to="/events" replace />
              ) : (
                <Register />
              )
            }
          />

          {/* User Protected Routes */}
          <Route
            path="/my-events"
            element={
              <ProtectedRoute user={user}>
                <MyEvents user={user} />
              </ProtectedRoute>
            }
          />

          {/* Event Manager / Event Adder Protected Routes */}
          <Route
            path="/event-dashboard"
            element={
              <ProtectedRoute user={user} organizerOnly={true}>
                <EventDashboard user={user} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/add-event"
            element={
              <ProtectedRoute user={user} organizerOnly={true}>
                <EventDashboard user={user} autoOpenModal={true} />
              </ProtectedRoute>
            }
          />

          {/* Admin Protected Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute user={user} adminOnly={true}>
                <AdminDashboard user={user} />
              </ProtectedRoute>
            }
          />

          {/* Fallback 404 Route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </Router>
  );
}

export default App;
