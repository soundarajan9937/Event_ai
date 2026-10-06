import React, { useEffect, useState } from 'react';
import api from '../api';
import Loading from '../components/Loading';

const INITIAL_EVENT_FORM = {
  name: '',
  category: 'Workshop',
  date: '',
  time: '',
  location: '',
  venue: '',
  price: 0,
  seats: 50,
  members: '1',
  registrationDeadline: '',
  description: '',
  imageUrl: '',
  scannerUrl: ''
};

const CATEGORY_OPTIONS = [
  'Workshop',
  'Tech Talk',
  'Hackathon',
  'Cricket',
  'Football',
  'Kabaddi',
  'Music',
  'Dance',
  'Startup Pitch',
  'Seminar',
  'Esports'
];

const EventDashboard = ({ autoOpenModal = false }) => {
  const [activeTab, setActiveTab] = useState('events'); // 'events' | 'registrations' | 'stats'
  const [events, setEvents] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Add / Edit Modal state
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);
  const [eventForm, setEventForm] = useState(INITIAL_EVENT_FORM);

  // Reject-with-Reason Modal state
  const [rejectModal, setRejectModal] = useState({ open: false, regId: null, regName: '', reason: '' });

  const fetchOrganizerData = async () => {
    setLoading(true);
    setError('');

    try {
      const [eventsRes, regsRes] = await Promise.all([
        api.get('/organizer/events'),
        api.get('/organizer/registrations')
      ]);

      setEvents(eventsRes.data || []);
      setRegistrations(regsRes.data || []);
    } catch (err) {
      console.error('Error fetching event adder data:', err);
      setError('Failed to fetch event data. Verify your event manager credentials.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizerData();

    // Auto open modal if requested via prop or query string
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('add') === 'true' || autoOpenModal) {
      handleOpenAddModal();
    }
  }, [autoOpenModal]);

  const handleOpenAddModal = () => {
    setEditingEventId(null);
    setEventForm(INITIAL_EVENT_FORM);
    setError('');
    setSuccess('');
    setShowEventModal(true);
  };

  const handleOpenEditModal = (ev) => {
    setEditingEventId(ev._id || ev.id);

    // Format deadline for datetime-local input
    let formattedDeadline = '';
    if (ev.registrationDeadline) {
      const d = new Date(ev.registrationDeadline);
      formattedDeadline = d.toISOString().slice(0, 16);
    }

    setEventForm({
      name: ev.name || '',
      category: ev.category || 'Workshop',
      date: ev.date || '',
      time: ev.time || '',
      location: ev.location || '',
      venue: ev.venue || '',
      price: ev.price ?? 0,
      seats: ev.seats ?? 50,
      members: ev.members ?? '1',
      registrationDeadline: formattedDeadline,
      description: ev.description || '',
      imageUrl: ev.imageUrl || '',
      scannerUrl: ev.scannerUrl || ''
    });

    setError('');
    setSuccess('');
    setShowEventModal(true);
  };

  // Image Banner File Upload Handler (converts local file to Base64)
  const handleImageFileUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, JPEG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image file size must be less than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64Data = uploadEvent.target.result;
      setEventForm((prev) => ({
        ...prev,
        imageUrl: base64Data
      }));
      setError('');
    };
    reader.onerror = () => {
      setError('Failed to read selected image file.');
    };
    reader.readAsDataURL(file);
  };

  // Payment Scanner / QR Code File Upload Handler
  const handleScannerFileUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid scanner/QR image file (PNG, JPG, JPEG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Scanner photo size must be less than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64Data = uploadEvent.target.result;
      setEventForm((prev) => ({
        ...prev,
        scannerUrl: base64Data
      }));
      setError('');
    };
    reader.onerror = () => {
      setError('Failed to read selected scanner image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (new Date(eventForm.registrationDeadline) <= new Date()) {
      setError('Registration deadline must be in the future! Setting a past date/time marks the event as expired and hides it from the student event page.');
      return;
    }

    setActionLoading(true);

    try {
      if (editingEventId) {
        await api.put(`/organizer/events/${editingEventId}`, eventForm);
        setSuccess('Event updated successfully! Changes are live for students.');
      } else {
        await api.post('/organizer/events', eventForm);
        setSuccess('New event created successfully! It is now immediately visible on the student events page.');
      }

      setShowEventModal(false);
      await fetchOrganizerData();
    } catch (err) {
      console.error('Error saving event:', err);
      setError(err.response?.data?.error || 'Failed to save event.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId, eventName) => {
    if (!window.confirm(`Are you sure you want to delete '${eventName}' and its registrations?`)) {
      return;
    }

    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.delete(`/organizer/events/${eventId}`);
      setSuccess(`Event '${eventName}' deleted successfully.`);
      await fetchOrganizerData();
    } catch (err) {
      console.error('Error deleting event:', err);
      setError(err.response?.data?.error || 'Failed to delete event.');
    } finally {
      setActionLoading(false);
    }
  };

  // Approval Workflow: Change registration status (approve)
  const handleUpdateRegistrationStatus = async (regId, newStatus, registrantName, rejectionReason = '') => {
    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.put(`/registrations/${regId}/status`, { status: newStatus, rejectionReason });
      const actionLabel = newStatus === 'confirmed' ? 'approved & confirmed' : 'rejected with reason';
      setSuccess(`Registration for '${registrantName}' has been ${actionLabel}! Student status updated.`);
      await fetchOrganizerData();
    } catch (err) {
      console.error('Error updating registration status:', err);
      setError(err.response?.data?.error || 'Failed to update registration status.');
    } finally {
      setActionLoading(false);
    }
  };

  // Open reject-with-reason modal
  const openRejectModal = (regId, regName) => {
    setRejectModal({ open: true, regId, regName, reason: '' });
  };

  // Submit rejection with reason
  const handleConfirmReject = async () => {
    if (!rejectModal.reason.trim()) return;
    await handleUpdateRegistrationStatus(rejectModal.regId, 'cancelled', rejectModal.regName, rejectModal.reason.trim());
    setRejectModal({ open: false, regId: null, regName: '', reason: '' });
  };

  // Compute summary metrics
  const totalEvents = events.length;
  const activeEventsCount = events.filter((e) => !e.isDeadlinePassed && !e.isFull).length;
  const totalRegistrations = registrations.length;
  const pendingRegistrationsCount = registrations.filter((r) => r.status === 'pending').length;
  const confirmedRegistrationsCount = registrations.filter((r) => r.status === 'confirmed').length;

  return (
    <div className="container page-container">
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2.4rem', marginBottom: '0.4rem' }}>
            Event <span className="text-gradient">Control Dashboard</span>
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Real-time management of live MongoDB Atlas events and user registrations
          </p>
        </div>

        <button
          id="organizer-add-event-btn"
          className="btn btn-accent"
          onClick={handleOpenAddModal}
        >
          + Add New Event
        </button>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="alert alert-error">
          <span>⚠️ {error}</span>
        </div>
      )}
      {success && (
        <div className="alert alert-success">
          <span>✓ {success}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs-container">
        <button
          className={`tab-btn ${activeTab === 'events' ? 'active' : ''}`}
          onClick={() => setActiveTab('events')}
        >
          Manage Events ({totalEvents})
        </button>
        <button
          className={`tab-btn ${activeTab === 'registrations' ? 'active' : ''}`}
          onClick={() => setActiveTab('registrations')}
        >
          View Registrations ({totalRegistrations})
          {pendingRegistrationsCount > 0 && (
            <span style={{
              marginLeft: '0.4rem',
              background: 'var(--warning)',
              color: '#000',
              borderRadius: '999px',
              padding: '0.1rem 0.45rem',
              fontSize: '0.75rem',
              fontWeight: '700'
            }}>
              {pendingRegistrationsCount} Pending
            </span>
          )}
        </button>
        <button
          className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          System Overview
        </button>
      </div>

      {loading ? (
        <Loading message="Syncing with MongoDB Atlas..." />
      ) : (
        <>
          {/* TAB 1: MANAGE EVENTS */}
          {activeTab === 'events' && (
            <div>
              {events.length > 0 ? (
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Event Banner</th>
                        <th>Event Name</th>
                        <th>Category</th>
                        <th>Date & Time</th>
                        <th>Location</th>
                        <th>Price</th>
                        <th>Seats Left</th>
                        <th>Members</th>
                        <th>QR Scanner</th>
                        <th>Deadline</th>
                        <th>Registrations</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {events.map((ev) => (
                        <tr key={ev._id || ev.id}>
                          <td>
                            <img
                              src={ev.imageUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1000&q=80'}
                              alt={ev.name}
                              style={{ width: '56px', height: '40px', objectFit: 'cover', borderRadius: '4px' }}
                            />
                          </td>
                          <td>
                            <strong style={{ color: '#ffffff' }}>{ev.name}</strong>
                          </td>
                          <td>
                            <span className="status-badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: 'var(--primary-light)' }}>
                              {ev.category}
                            </span>
                          </td>
                          <td>
                            <div>{ev.date}</div>
                            <small style={{ color: 'var(--text-dim)' }}>{ev.time}</small>
                          </td>
                          <td>{ev.location}</td>
                          <td>{ev.price === 0 ? 'Free' : `₹${ev.price}`}</td>
                          <td>
                            <span style={{ color: ev.isFull ? 'var(--danger)' : 'var(--text-main)', fontWeight: '600' }}>
                              {ev.seats}
                            </span>
                          </td>
                          <td>
                            <span style={{ color: 'var(--primary-light)', fontWeight: '500' }}>
                              👥 {ev.members || '1'}
                            </span>
                          </td>
                          <td>
                            {ev.scannerUrl ? (
                              <span className="status-badge confirmed" title="Payment QR Scanner uploaded">
                                📱 QR Ready
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>None</span>
                            )}
                          </td>
                          <td>
                            <span style={{ color: ev.isDeadlinePassed ? 'var(--danger)' : 'var(--warning)', fontSize: '0.85rem' }}>
                              {new Date(ev.registrationDeadline).toLocaleDateString()}
                            </span>
                            {ev.isDeadlinePassed ? (
                              <div style={{ color: 'var(--danger)', fontSize: '0.72rem', fontWeight: '700', marginTop: '0.2rem' }}>
                                ⚠️ Expired (Hidden)
                              </div>
                            ) : (
                              <div style={{ color: 'var(--accent-green-light)', fontSize: '0.72rem', fontWeight: '700', marginTop: '0.2rem' }}>
                                ✓ Active on Student Page
                              </div>
                            )}
                          </td>
                          <td>
                            <span className="status-badge confirmed">
                              {ev.registrationsCount || 0} Registered
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                              <button
                                className="btn btn-outline btn-sm"
                                onClick={() => handleOpenEditModal(ev)}
                                title="Edit Event"
                              >
                                Edit
                              </button>
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => handleDeleteEvent(ev._id || ev.id, ev.name)}
                                title="Delete Event"
                                disabled={actionLoading}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">📋</div>
                  <h3 className="empty-state-title">No Events Added Yet</h3>
                  <p className="empty-state-desc">
                    Click the "+ Add New Event" button above to create and publish your first event for students.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: VIEW REGISTRATIONS & APPROVAL WORKFLOW */}
          {activeTab === 'registrations' && (
            <div>
              {registrations.length > 0 ? (
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>User Name</th>
                        <th>User Email</th>
                        <th>Event</th>
                        <th>Phone</th>
                        <th>Members Details</th>
                        <th>Registration Date</th>
                        <th>Status</th>
                        <th>Action (Approval)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {registrations.map((reg) => {
                        const isPending = reg.status === 'pending';
                        const isConfirmed = reg.status === 'confirmed';

                        return (
                          <tr key={reg._id}>
                            <td>
                              <strong style={{ color: '#ffffff' }}>
                                {reg.name || reg.user?.name || 'Anonymous'}
                              </strong>
                            </td>
                            <td>{reg.email || reg.user?.email || 'N/A'}</td>
                            <td>
                              <span style={{ color: 'var(--primary-light)', fontWeight: '600' }}>
                                {reg.event?.name || 'Deleted Event'}
                              </span>
                              {reg.event?.category && (
                                <small style={{ display: 'block', color: 'var(--text-dim)' }}>
                                  ({reg.event.category})
                                </small>
                              )}
                            </td>
                            <td>{reg.phone}</td>
                            <td>
                              <span style={{ color: 'var(--text-main)', fontWeight: '600' }}>
                                👥 {reg.members || '1'}
                              </span>
                            </td>
                            <td>
                              {new Date(reg.registeredAt).toLocaleString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>
                            <td>
                              {isPending && (
                                <span className="status-badge" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', border: '1px solid #f59e0b' }}>
                                  🕒 Pending Approval
                                </span>
                              )}
                              {isConfirmed && (
                                <span className="status-badge confirmed">
                                  ✓ Registration Successful
                                </span>
                              )}
                              {reg.status === 'cancelled' && (
                                <span className="status-badge cancelled">
                                  ❌ Cancelled
                                </span>
                              )}
                            </td>
                            <td>
                              {isPending ? (
                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                  <button
                                    className="btn btn-accent btn-sm"
                                    style={{ background: 'var(--accent-green-light)', color: '#000', fontWeight: '700' }}
                                    onClick={() => handleUpdateRegistrationStatus(reg._id, 'confirmed', reg.name || 'User')}
                                    disabled={actionLoading}
                                    title="Approve student registration"
                                  >
                                    ✓ Approve
                                  </button>
                                  <button
                                    className="btn btn-danger btn-sm"
                                    onClick={() => openRejectModal(reg._id, reg.name || 'User')}
                                    disabled={actionLoading}
                                    title="Reject with reason"
                                  >
                                    ✕ Reject
                                  </button>
                                </div>
                              ) : isConfirmed ? (
                                <span style={{ color: 'var(--accent-green-light)', fontSize: '0.82rem', fontWeight: '600' }}>
                                  Approved & Confirmed
                                </span>
                              ) : (
                                <span style={{ color: 'var(--danger)', fontSize: '0.82rem' }}>
                                  Rejected
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">👥</div>
                  <h3 className="empty-state-title">No Registrations Recorded</h3>
                  <p className="empty-state-desc">
                    When students register for your events, their pending registration requests will appear here for your confirmation.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SYSTEM OVERVIEW */}
          {activeTab === 'stats' && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1.5rem'
            }}>
              <div className="card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--primary-light)' }}>
                  {totalEvents}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Total Added Events</div>
              </div>

              <div className="card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--accent-green-light)' }}>
                  {activeEventsCount}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Active / Open Events</div>
              </div>

              <div className="card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#f59e0b' }}>
                  {pendingRegistrationsCount}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Pending Registrations</div>
              </div>

              <div className="card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: '800', color: '#10b981' }}>
                  {confirmedRegistrationsCount}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Confirmed Registrations</div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add / Edit Event Modal */}
      {showEventModal && (
        <div className="modal-overlay" onClick={() => setShowEventModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingEventId ? 'Edit Event' : 'Add New Event'}
              </h3>
              <button className="modal-close" onClick={() => setShowEventModal(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEvent}>
              <div className="form-group">
                <label className="form-label">Event Name *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. AI & Full-Stack Robotics Workshop"
                  value={eventForm.name}
                  onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <select
                    className="form-control"
                    value={eventForm.category}
                    onChange={(e) => setEventForm({ ...eventForm, category: e.target.value })}
                    required
                  >
                    {CATEGORY_OPTIONS.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Location (City) *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Chennai, Bangalore"
                    value={eventForm.location}
                    onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Venue Details *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Mechanical Auditorium, Ground Floor"
                  value={eventForm.venue}
                  onChange={(e) => setEventForm({ ...eventForm, venue: e.target.value })}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Event Date *</label>
                  <input
                    type="date"
                    className="form-control"
                    value={eventForm.date}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      setEventForm((prev) => {
                        const isDeadlinePast = !prev.registrationDeadline || new Date(prev.registrationDeadline) <= new Date();
                        return {
                          ...prev,
                          date: newDate,
                          registrationDeadline: (isDeadlinePast && newDate) ? `${newDate}T23:59` : prev.registrationDeadline
                        };
                      });
                    }}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Event Time *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 10:00 AM - 04:00 PM"
                    value={eventForm.time}
                    onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Ticket Price (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    value={eventForm.price}
                    onChange={(e) => setEventForm({ ...eventForm, price: Number(e.target.value) })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Available Seats *</label>
                  <input
                    type="number"
                    min="1"
                    className="form-control"
                    value={eventForm.seats}
                    onChange={(e) => setEventForm({ ...eventForm, seats: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Members / Allowed Team Size (Number or Text) *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. 1 or 4 or 1-4 members or Individual / Squad (4)"
                  value={eventForm.members}
                  onChange={(e) => setEventForm({ ...eventForm, members: e.target.value })}
                  required
                />
                <small style={{ color: 'var(--text-dim)', marginTop: '0.3rem', display: 'block' }}>
                  ℹ️ Enter team limit or allowed member details as a number (e.g. 4) or text (e.g. "1-4 members").
                </small>
              </div>

              <div className="form-group">
                <label className="form-label">Registration Deadline *</label>
                <input
                  type="datetime-local"
                  className="form-control"
                  min={new Date().toISOString().slice(0, 16)}
                  value={eventForm.registrationDeadline}
                  onChange={(e) => setEventForm({ ...eventForm, registrationDeadline: e.target.value })}
                  required
                />
                <small style={{ color: 'var(--text-dim)', marginTop: '0.3rem', display: 'block' }}>
                  ℹ️ Must be a future date/time. When active, this event will be shown to students on their events page.
                </small>
              </div>

              {/* Upload Event Banner Image Section */}
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Event Banner / Image</span>
                  {eventForm.imageUrl && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--accent-green-light)', fontWeight: '600' }}>
                      ✓ Image Ready
                    </span>
                  )}
                </label>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div
                    style={{
                      border: '2px dashed var(--border-subtle, #334155)',
                      borderRadius: '8px',
                      padding: '1.25rem',
                      textAlign: 'center',
                      background: 'rgba(255, 255, 255, 0.02)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => document.getElementById('event-banner-file-input').click()}
                  >
                    <input
                      id="event-banner-file-input"
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleImageFileUpload}
                    />
                    <div style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>📷</div>
                    <div style={{ color: 'var(--primary-light)', fontWeight: '600', fontSize: '0.95rem' }}>
                      Click or drop file to Upload Image
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                      Supports PNG, JPG, JPEG, WEBP (Max 5MB)
                    </div>
                  </div>

                  {eventForm.imageUrl ? (
                    <div style={{
                      position: 'relative',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: '1px solid var(--border-subtle, #334155)',
                      background: '#000',
                      maxHeight: '200px'
                    }}>
                      <img
                        src={eventForm.imageUrl}
                        alt="Event banner preview"
                        style={{ width: '100%', height: '200px', objectFit: 'cover' }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setEventForm((prev) => ({ ...prev, imageUrl: '' }));
                          const fileInput = document.getElementById('event-banner-file-input');
                          if (fileInput) fileInput.value = '';
                        }}
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          background: 'rgba(220, 38, 38, 0.9)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '0.3rem 0.6rem',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: '600'
                        }}
                      >
                        ✕ Remove Image
                      </button>
                    </div>
                  ) : null}

                  <details style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    <summary style={{ cursor: 'pointer', outline: 'none' }}>
                      Or paste an Image URL link directly
                    </summary>
                    <input
                      type="url"
                      className="form-control"
                      style={{ marginTop: '0.5rem' }}
                      placeholder="https://images.unsplash.com/..."
                      value={eventForm.imageUrl}
                      onChange={(e) => setEventForm({ ...eventForm, imageUrl: e.target.value })}
                    />
                  </details>
                </div>
              </div>

              {/* Upload Payment Scanner / QR Code Section */}
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Payment Scanner / QR Code Photo (Optional)</span>
                  {eventForm.scannerUrl && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--accent-green-light)', fontWeight: '600' }}>
                      ✓ Scanner Photo Ready
                    </span>
                  )}
                </label>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div
                    style={{
                      border: '2px dashed var(--border-subtle, #334155)',
                      borderRadius: '8px',
                      padding: '1.25rem',
                      textAlign: 'center',
                      background: 'rgba(255, 255, 255, 0.02)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => document.getElementById('event-scanner-file-input').click()}
                  >
                    <input
                      id="event-scanner-file-input"
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleScannerFileUpload}
                    />
                    <div style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>📱</div>
                    <div style={{ color: 'var(--primary-light)', fontWeight: '600', fontSize: '0.95rem' }}>
                      Click or drop file to Upload Payment Scanner / QR Code Photo
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                      Upload UPI QR scanner photo so students can scan and pay for tickets
                    </div>
                  </div>

                  {eventForm.scannerUrl ? (
                    <div style={{
                      position: 'relative',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: '1px solid var(--border-subtle, #334155)',
                      background: '#000',
                      textAlign: 'center',
                      padding: '0.5rem'
                    }}>
                      <img
                        src={eventForm.scannerUrl}
                        alt="Payment Scanner QR Code preview"
                        style={{ maxHeight: '200px', maxWidth: '100%', objectFit: 'contain' }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setEventForm((prev) => ({ ...prev, scannerUrl: '' }));
                          const fileInput = document.getElementById('event-scanner-file-input');
                          if (fileInput) fileInput.value = '';
                        }}
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          background: 'rgba(220, 38, 38, 0.9)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '0.3rem 0.6rem',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: '600'
                        }}
                      >
                        ✕ Remove Scanner
                      </button>
                    </div>
                  ) : null}

                  <details style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    <summary style={{ cursor: 'pointer', outline: 'none' }}>
                      Or paste a Scanner / QR Code URL link directly
                    </summary>
                    <input
                      type="url"
                      className="form-control"
                      style={{ marginTop: '0.5rem' }}
                      placeholder="https://..."
                      value={eventForm.scannerUrl}
                      onChange={(e) => setEventForm({ ...eventForm, scannerUrl: e.target.value })}
                    />
                  </details>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Full Description *</label>
                <textarea
                  className="form-control"
                  rows={4}
                  placeholder="Provide comprehensive details about speakers, agenda, prerequisites..."
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                  onClick={() => setShowEventModal(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Saving...' : editingEventId ? 'Update Event' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Reject with Reason Modal ── */}
      {rejectModal.open && (
        <div className="modal-overlay" onClick={() => setRejectModal({ open: false, regId: null, regName: '', reason: '' })}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ color: '#ef4444' }}>✕ Reject Registration</h3>
              <button className="modal-close" onClick={() => setRejectModal({ open: false, regId: null, regName: '', reason: '' })}>✕</button>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginBottom: '1.25rem' }}>
              You are about to <strong style={{ color: '#ef4444' }}>reject</strong> the registration of{' '}
              <strong style={{ color: '#ffffff' }}>{rejectModal.regName}</strong>.
              Please provide a clear reason — this message will be shown to the student.
            </p>

            <div className="form-group">
              <label className="form-label">Rejection Reason <span style={{ color: '#ef4444' }}>*</span></label>
              <textarea
                className="form-control"
                rows={4}
                placeholder="e.g. Registration limit reached for your team size. Only individual participants are allowed for this event."
                value={rejectModal.reason}
                onChange={(e) => setRejectModal((prev) => ({ ...prev, reason: e.target.value }))}
                style={{ resize: 'vertical', minHeight: '100px' }}
                autoFocus
              />
              <small style={{ color: 'var(--text-dim)', marginTop: '0.35rem', display: 'block' }}>
                ℹ️ This reason will be visible to the student on their My Events page.
              </small>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                type="button"
                className="btn btn-outline"
                style={{ flex: 1 }}
                onClick={() => setRejectModal({ open: false, regId: null, regName: '', reason: '' })}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                style={{ flex: 1 }}
                onClick={handleConfirmReject}
                disabled={actionLoading || !rejectModal.reason.trim()}
              >
                {actionLoading ? 'Rejecting...' : '✕ Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventDashboard;
