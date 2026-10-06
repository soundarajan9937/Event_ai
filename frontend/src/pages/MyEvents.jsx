import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import Loading from '../components/Loading';

const MyEvents = () => {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchMyRegistrations = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.get('/my-registrations');
      setRegistrations(response.data);
    } catch (err) {
      console.error('Error fetching my registrations:', err);
      setError('Failed to load your event registrations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyRegistrations();
  }, []);

  // Counts
  const pendingCount = registrations.filter((r) => r.status === 'pending').length;
  const confirmedCount = registrations.filter((r) => r.status === 'confirmed').length;

  return (
    <div className="container page-container">
      {/* Page Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2.4rem', marginBottom: '0.5rem' }}>
          My Registered <span className="text-gradient">Events</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem' }}>
          View and track the approval status of all your event registrations
        </p>
      </div>

      {error && (
        <div className="alert alert-error">
          <span>⚠️ {error}</span>
        </div>
      )}

      {loading ? (
        <Loading message="Fetching your event registrations..." />
      ) : registrations.length > 0 ? (
        <>
          {/* Summary bar */}
          {pendingCount > 0 && (
            <div style={{
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '12px',
              padding: '0.9rem 1.25rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              fontSize: '0.9rem',
              color: '#f59e0b'
            }}>
              <span style={{ fontSize: '1.2rem' }}>🕒</span>
              <div>
                <strong>{pendingCount} registration{pendingCount > 1 ? 's' : ''} awaiting approval</strong>
                {confirmedCount > 0 && <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>· {confirmedCount} confirmed</span>}
              </div>
            </div>
          )}

          {/* Registration Cards (responsive grid) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1.25rem'
          }}>
            {registrations.map((reg) => {
              const ev = reg.event;
              if (!ev) {
                return (
                  <div key={reg._id} className="card" style={{ padding: '1.25rem', opacity: 0.6 }}>
                    <p style={{ color: 'var(--text-dim)', fontStyle: 'italic', margin: 0 }}>
                      Event details unavailable — this event may have been removed by the admin.
                    </p>
                  </div>
                );
              }

              const isPending   = reg.status === 'pending';
              const isConfirmed = reg.status === 'confirmed';
              const isCancelled = reg.status === 'cancelled';

              const statusColors = {
                pending: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.4)', color: '#f59e0b', label: '🕒 Pending Approval' },
                confirmed: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.4)', color: '#10b981', label: '✅ Registration Successful' },
                cancelled: { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', color: '#ef4444', label: '❌ Cancelled / Rejected' }
              };
              const sc = statusColors[reg.status] || statusColors.pending;

              return (
                <div
                  key={reg._id}
                  className="card"
                  style={{
                    padding: 0,
                    overflow: 'hidden',
                    border: `1px solid ${sc.border}`,
                    transition: 'transform 0.2s, box-shadow 0.2s'
                  }}
                >
                  {/* Event image banner */}
                  <div style={{ position: 'relative', height: '130px', overflow: 'hidden' }}>
                    <img
                      src={ev.imageUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80'}
                      alt={ev.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80'; }}
                    />
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'linear-gradient(to top, rgba(11,15,25,0.95) 0%, rgba(11,15,25,0.2) 100%)'
                    }} />

                    {/* Status badge on image */}
                    <div style={{
                      position: 'absolute', top: '0.75rem', right: '0.75rem',
                      background: sc.bg,
                      border: `1px solid ${sc.border}`,
                      color: sc.color,
                      borderRadius: '999px',
                      padding: '0.25rem 0.65rem',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      backdropFilter: 'blur(8px)'
                    }}>
                      {sc.label}
                    </div>

                    <div style={{ position: 'absolute', bottom: '0.75rem', left: '0.85rem', right: '0.85rem' }}>
                      <span style={{
                        background: 'rgba(59,130,246,0.25)',
                        color: 'var(--primary-light)',
                        borderRadius: '6px',
                        padding: '0.15rem 0.5rem',
                        fontSize: '0.75rem',
                        fontWeight: '600'
                      }}>
                        {ev.category}
                      </span>
                    </div>
                  </div>

                  {/* Card body */}
                  <div style={{ padding: '1.1rem 1.25rem' }}>
                    <h3 style={{ fontSize: '1.05rem', color: '#ffffff', marginBottom: '0.75rem', fontWeight: '700' }}>
                      {ev.name}
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                      <div>📅 {ev.date} · {ev.time}</div>
                      <div>📍 {ev.location} — {ev.venue}</div>
                      <div>👥 Members: <span style={{ color: 'var(--primary-light)', fontWeight: '600' }}>{reg.members || ev.members || '1'}</span></div>
                      <div>📞 Phone: <span style={{ color: 'var(--text-main)' }}>{reg.phone}</span></div>
                      <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                        Registered on {new Date(reg.registeredAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>

                    {/* Display Rejection Reason if registration was rejected */}
                    {isCancelled && (
                      <div style={{
                        marginBottom: '1rem',
                        padding: '0.75rem 0.9rem',
                        borderRadius: '8px',
                        background: 'rgba(239, 68, 68, 0.12)',
                        border: '1px solid rgba(239, 68, 68, 0.35)',
                        fontSize: '0.85rem'
                      }}>
                        <div style={{ color: '#ef4444', fontWeight: '700', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          ⚠️ Rejection Reason:
                        </div>
                        <div style={{ color: '#fca5a5', lineHeight: '1.4' }}>
                          {reg.rejectionReason || 'No specific reason provided by the event adder.'}
                        </div>
                      </div>
                    )}

                    {/* Progress steps */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0',
                      marginBottom: '1.1rem'
                    }}>
                      {/* Step 1 */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem', flex: 1 }}>
                        <div style={{
                          width: '28px', height: '28px', borderRadius: '50%',
                          background: 'rgba(16,185,129,0.2)', border: '2px solid #10b981',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem'
                        }}>✓</div>
                        <span style={{ fontSize: '0.62rem', color: '#10b981', fontWeight: '700', textAlign: 'center' }}>Submitted</span>
                      </div>

                      <div style={{ flex: 1, height: '2px', background: isPending ? 'rgba(245,158,11,0.5)' : isConfirmed ? '#10b981' : 'var(--danger)', marginBottom: '1rem' }} />

                      {/* Step 2 */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem', flex: 1 }}>
                        <div style={{
                          width: '28px', height: '28px', borderRadius: '50%',
                          background: isPending ? 'rgba(245,158,11,0.2)' : isConfirmed ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.15)',
                          border: `2px solid ${isPending ? '#f59e0b' : isConfirmed ? '#10b981' : '#ef4444'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem',
                          animation: isPending ? 'pulse 1.5s ease-in-out infinite' : undefined
                        }}>
                          {isPending ? '🕒' : isConfirmed ? '✓' : '✕'}
                        </div>
                        <span style={{ fontSize: '0.62rem', color: isPending ? '#f59e0b' : isConfirmed ? '#10b981' : '#ef4444', fontWeight: '700', textAlign: 'center' }}>
                          {isPending ? 'Pending' : isConfirmed ? 'Approved' : 'Rejected'}
                        </span>
                      </div>

                      <div style={{ flex: 1, height: '2px', background: isConfirmed ? '#10b981' : 'rgba(100,100,120,0.3)', marginBottom: '1rem' }} />

                      {/* Step 3 */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem', flex: 1 }}>
                        <div style={{
                          width: '28px', height: '28px', borderRadius: '50%',
                          background: isConfirmed ? 'rgba(16,185,129,0.2)' : 'rgba(100,100,120,0.1)',
                          border: `2px solid ${isConfirmed ? '#10b981' : 'rgba(100,100,120,0.3)'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem',
                          color: isConfirmed ? '#10b981' : 'var(--text-dim)'
                        }}>
                          {isConfirmed ? '🎉' : '🎉'}
                        </div>
                        <span style={{ fontSize: '0.62rem', color: isConfirmed ? '#10b981' : 'var(--text-dim)', fontWeight: isConfirmed ? '700' : '500', textAlign: 'center' }}>
                          Confirmed
                        </span>
                      </div>
                    </div>

                    {/* Action button */}
                    <Link
                      to={`/events/${ev._id}`}
                      className="btn btn-outline btn-sm"
                      style={{ width: '100%', textAlign: 'center', display: 'block' }}
                    >
                      View Event Details
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">🎟️</div>
          <h3 className="empty-state-title">No Registrations Yet</h3>
          <p className="empty-state-desc">
            You haven't registered for any campus events yet. Explore open events and reserve your seat today!
          </p>
          <Link to="/events" className="btn btn-primary">
            Explore Events
          </Link>
        </div>
      )}
    </div>
  );
};

export default MyEvents;
