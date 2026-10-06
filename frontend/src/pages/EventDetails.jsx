import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api';
import Loading from '../components/Loading';

const EventDetails = ({ user }) => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Registration form state
  const [showRegModal, setShowRegModal] = useState(false);
  const [regForm, setRegForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    members: '1'
  });
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');

  const fetchEvent = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.get(`/events/${id}`);
      setEvent(response.data);
    } catch (err) {
      console.error('Error fetching event details:', err);
      setError(err.response?.data?.error || 'Event not found or server is unreachable.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvent();
  }, [id]);

  // Update reg form defaults when user changes
  useEffect(() => {
    if (user) {
      setRegForm((prev) => ({
        ...prev,
        name: user.name || '',
        email: user.email || ''
      }));
    }
  }, [user]);

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setRegError('');
    setRegSuccess('');

    if (!user) {
      navigate('/login');
      return;
    }

    if (!regForm.phone.trim()) {
      setRegError('Please provide a valid contact phone number.');
      return;
    }

    setRegLoading(true);

    try {
      const response = await api.post('/registrations', {
        eventId: event._id || event.id,
        name: regForm.name.trim(),
        email: regForm.email.trim(),
        phone: regForm.phone.trim(),
        members: regForm.members ? regForm.members.trim() : (event.members || '1')
      });

      // Update local event seats count
      if (response.data.remainingSeats !== undefined) {
        setEvent((prev) => ({
          ...prev,
          seats: response.data.remainingSeats
        }));
      }

      // Show pending success screen — stays open so user reads it
      setRegSuccess('pending');
    } catch (err) {
      console.error('Registration submission error:', err);
      const serverMessage = err.response?.data?.error || 'Registration failed. Please try again.';
      setRegError(serverMessage);
    } finally {
      setRegLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container page-container">
        <Loading message="Loading event details..." />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="container page-container" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <div className="alert alert-error" style={{ maxWidth: '600px', margin: '0 auto 1.5rem' }}>
          <span>⚠️ {error || 'Event could not be found.'}</span>
        </div>
        <Link to="/events" className="btn btn-primary">
          ← Back to Events
        </Link>
      </div>
    );
  }

  const isDeadlinePassed = new Date() >= new Date(event.registrationDeadline);
  const isFull = event.seats <= 0;
  const canRegister = !isDeadlinePassed && !isFull;

  const defaultImg = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=80';

  return (
    <div className="container page-container">
      {/* Back button */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/events" className="btn btn-outline btn-sm">
          ← Back to Events
        </Link>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        {/* Banner Media */}
        <div style={{ width: '100%', height: '340px', position: 'relative', overflow: 'hidden' }}>
          <img
            src={event.imageUrl || defaultImg}
            alt={event.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = defaultImg;
            }}
          />
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(11, 15, 25, 0.95) 0%, rgba(11, 15, 25, 0.3) 60%, transparent 100%)'
          }} />

          <div style={{ position: 'absolute', bottom: '2rem', left: '2rem', right: '2rem' }}>
            <span className="status-badge" style={{ background: 'var(--primary)', color: '#fff', marginBottom: '0.75rem' }}>
              {event.category}
            </span>
            <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', color: '#ffffff' }}>
              {event.name}
            </h1>
          </div>
        </div>

        {/* Content Body */}
        <div style={{ padding: '2rem' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '2.5rem'
          }}>
            {/* Left Column: Details & Description */}
            <div>
              <h2 style={{ fontSize: '1.4rem', marginBottom: '1rem', color: '#ffffff' }}>
                About This Event
              </h2>
              <p style={{ color: 'var(--text-muted)', lineHeight: '1.8', whiteSpace: 'pre-line', marginBottom: '2rem' }}>
                {event.description}
              </p>

              <h2 style={{ fontSize: '1.4rem', marginBottom: '1rem', color: '#ffffff' }}>
                Venue & Logistics
              </h2>
              <div className="card" style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1.25rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.95rem' }}>
                  <div>
                    <strong style={{ color: 'var(--text-main)' }}>📍 Venue: </strong>
                    <span style={{ color: 'var(--text-muted)' }}>{event.venue}</span>
                  </div>
                  <div>
                    <strong style={{ color: 'var(--text-main)' }}>🏙️ City: </strong>
                    <span style={{ color: 'var(--text-muted)' }}>{event.location}</span>
                  </div>
                  <div>
                    <strong style={{ color: 'var(--text-main)' }}>📅 Date: </strong>
                    <span style={{ color: 'var(--text-muted)' }}>
                      {new Date(event.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </div>
                  <div>
                    <strong style={{ color: 'var(--text-main)' }}>⏰ Time: </strong>
                    <span style={{ color: 'var(--text-muted)' }}>{event.time}</span>
                  </div>
                  <div>
                    <strong style={{ color: 'var(--text-main)' }}>👥 Allowed Members / Team: </strong>
                    <span style={{ color: 'var(--primary-light)', fontWeight: '600' }}>{event.members || '1'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Registration Card & Scanner Display */}
            <div>
              <div className="card" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                  <div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Ticket Price</span>
                    <div className="event-price" style={{ fontSize: '1.8rem' }}>
                      {event.price === 0 ? 'Free' : `₹${event.price}`}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Available Capacity</span>
                    <div style={{ fontSize: '1.2rem', fontWeight: '700', color: isFull ? 'var(--danger)' : 'var(--text-main)' }}>
                      {event.seats > 0 ? `${event.seats} Seats` : 'Sold Out'}
                    </div>
                  </div>
                </div>

                <div style={{
                  padding: '1rem',
                  background: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1.5rem',
                  fontSize: '0.88rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                    <span>⏳ Registration Deadline:</span>
                    <strong style={{ color: isDeadlinePassed ? 'var(--danger)' : 'var(--warning)' }}>
                      {new Date(event.registrationDeadline).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </strong>
                  </div>
                </div>

                {/* Status Badges */}
                {isDeadlinePassed && (
                  <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>
                    <span>Registration deadline has passed.</span>
                  </div>
                )}

                {isFull && !isDeadlinePassed && (
                  <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>
                    <span>Event is full.</span>
                  </div>
                )}

                {/* Payment QR Scanner Image display if provided by organizer */}
                {event.scannerUrl && (
                  <div style={{
                    marginBottom: '1.5rem',
                    padding: '1.25rem',
                    background: 'rgba(59, 130, 246, 0.08)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontWeight: '700', color: 'var(--primary-light)', marginBottom: '0.5rem', fontSize: '0.95rem' }}>
                      📱 Payment QR Scanner Code
                    </div>
                    <img
                      src={event.scannerUrl}
                      alt="Payment Scanner QR Code"
                      style={{ maxHeight: '200px', maxWidth: '100%', objectFit: 'contain', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: '#fff' }}
                    />
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.5rem', marginBottom: 0 }}>
                      Scan QR code using UPI app (GPay / PhonePe / Paytm) to complete ticket payment
                    </p>
                  </div>
                )}

                {/* Action button */}
                {user ? (
                  canRegister ? (
                    <button
                      id="register-open-modal-btn"
                      type="button"
                      className="btn btn-accent btn-lg"
                      style={{ width: '100%' }}
                      onClick={() => {
                        setRegForm((prev) => ({
                          ...prev,
                          members: prev.members && prev.members !== '1' ? prev.members : (event.members || '1')
                        }));
                        setShowRegModal(true);
                      }}
                    >
                      Register for Event 🎟️
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-outline btn-lg"
                      style={{ width: '100%' }}
                      disabled
                    >
                      {isDeadlinePassed ? 'Registration Closed' : 'Sold Out'}
                    </button>
                  )
                ) : (
                  <Link
                    to="/login"
                    className="btn btn-primary btn-lg"
                    style={{ width: '100%', textAlign: 'center' }}
                  >
                    Log In to Register
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Registration Modal Dialog */}
      {showRegModal && (
        <div className="modal-overlay" onClick={() => { setShowRegModal(false); setRegSuccess(''); setRegError(''); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>

            {/* ─── PENDING SUCCESS SCREEN ─── */}
            {regSuccess === 'pending' ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                {/* Animated success ring */}
                <div style={{
                  width: '90px',
                  height: '90px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(245,158,11,0.2) 0%, rgba(245,158,11,0.05) 100%)',
                  border: '3px solid #f59e0b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.5rem',
                  fontSize: '2.6rem',
                  boxShadow: '0 0 30px rgba(245,158,11,0.3)'
                }}>
                  🎟️
                </div>

                <h3 style={{ fontSize: '1.6rem', color: '#ffffff', marginBottom: '0.5rem', fontWeight: '800' }}>
                  Registration Submitted!
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '2rem', lineHeight: '1.7' }}>
                  Your registration for <strong style={{ color: 'var(--primary-light)' }}>{event.name}</strong> has been received and is currently awaiting approval from the Event Manager.
                </p>

                {/* Status Flow */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '2rem',
                  flexWrap: 'wrap',
                  gap: '0.25rem'
                }}>
                  {/* Step 1: Submitted */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '50%',
                      background: 'rgba(16, 185, 129, 0.2)', border: '2px solid #10b981',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem'
                    }}>✓</div>
                    <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: '700' }}>Submitted</span>
                  </div>

                  {/* Arrow */}
                  <div style={{ width: '40px', height: '2px', background: 'rgba(245,158,11,0.5)', marginBottom: '1.1rem', flexShrink: 0 }} />

                  {/* Step 2: Pending */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '50%',
                      background: 'rgba(245,158,11,0.2)', border: '2px solid #f59e0b',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem',
                      animation: 'pulse 1.5s ease-in-out infinite'
                    }}>🕒</div>
                    <span style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: '700' }}>Pending Approval</span>
                  </div>

                  {/* Arrow */}
                  <div style={{ width: '40px', height: '2px', background: 'rgba(100,100,120,0.4)', marginBottom: '1.1rem', flexShrink: 0 }} />

                  {/* Step 3: Confirmed */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '50%',
                      background: 'rgba(100,100,120,0.1)', border: '2px solid rgba(100,100,120,0.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem',
                      color: 'var(--text-dim)'
                    }}>🎉</div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: '600' }}>Confirmed</span>
                  </div>
                </div>

                {/* Info box */}
                <div style={{
                  background: 'rgba(59, 130, 246, 0.08)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  borderRadius: '10px',
                  padding: '1rem 1.25rem',
                  marginBottom: '1.75rem',
                  textAlign: 'left'
                }}>
                  <div style={{ fontWeight: '700', color: 'var(--primary-light)', marginBottom: '0.5rem', fontSize: '0.88rem' }}>
                    ℹ️ What happens next?
                  </div>
                  <ul style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.7', paddingLeft: '1.1rem', margin: 0 }}>
                    <li>The <strong>Event Manager</strong> will review your registration details.</li>
                    <li>Once approved, your status changes to <strong style={{ color: '#10b981' }}>Registration Successful</strong>.</li>
                    <li>Track your status anytime under <strong style={{ color: 'var(--primary-light)' }}>My Events</strong>.</li>
                  </ul>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ flex: 1 }}
                    onClick={() => { setShowRegModal(false); setRegSuccess(''); }}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                    onClick={() => navigate('/my-events')}
                  >
                    View My Events →
                  </button>
                </div>
              </div>
            ) : (
              /* ─── REGISTRATION FORM ─── */
              <>
                <div className="modal-header">
                  <h3 className="modal-title">Event Registration</h3>
                  <button
                    className="modal-close"
                    onClick={() => { setShowRegModal(false); setRegError(''); }}
                  >
                    ✕
                  </button>
                </div>

                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                  Confirm your registration for <strong>{event.name}</strong>.
                </p>

                {/* Display QR Scanner in modal for paid events if scanner uploaded */}
                {event.scannerUrl && event.price > 0 && (
                  <div style={{
                    marginBottom: '1.25rem',
                    padding: '1rem',
                    background: 'rgba(59, 130, 246, 0.08)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontWeight: '700', color: 'var(--primary-light)', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
                      📱 Scan QR Code to Pay ₹{event.price}
                    </div>
                    <img
                      src={event.scannerUrl}
                      alt="Payment QR Code"
                      style={{ maxHeight: '160px', maxWidth: '100%', objectFit: 'contain', borderRadius: '6px', background: '#fff', padding: '4px' }}
                    />
                  </div>
                )}

                {regError && (
                  <div className="alert alert-error">
                    <span>⚠️ {regError}</span>
                  </div>
                )}

                <form onSubmit={handleRegisterSubmit}>
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={regForm.name}
                      onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                      disabled={regLoading}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input
                      type="email"
                      className="form-control"
                      value={regForm.email}
                      onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                      disabled={regLoading}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input
                      type="tel"
                      className="form-control"
                      placeholder="e.g. +91 9876543210"
                      value={regForm.phone}
                      onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                      disabled={regLoading}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Members / Team Info (Number or Text)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. 1 or 4 or Member Names (John, Alex, Sam)"
                      value={regForm.members}
                      onChange={(e) => setRegForm({ ...regForm, members: e.target.value })}
                      disabled={regLoading}
                      required
                    />
                    <small style={{ color: 'var(--text-dim)', marginTop: '0.3rem', display: 'block' }}>
                      ℹ️ Enter number of members (e.g. 1, 4) or names/details of participating team members.
                    </small>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ flex: 1 }}
                      onClick={() => { setShowRegModal(false); setRegError(''); }}
                      disabled={regLoading}
                    >
                      Cancel
                    </button>
                    <button
                      id="confirm-registration-btn"
                      type="submit"
                      className="btn btn-accent"
                      style={{ flex: 1 }}
                      disabled={regLoading}
                    >
                      {regLoading ? 'Confirming...' : 'Confirm Registration'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EventDetails;
