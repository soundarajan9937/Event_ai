import React, { useEffect, useState } from 'react';
import api from '../api';
import Loading from '../components/Loading';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [registrations, setRegistrations] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [regFilter, setRegFilter] = useState('all'); // all | pending | confirmed | cancelled

  // Reject-with-Reason Modal state
  const [rejectModal, setRejectModal] = useState({ open: false, regId: null, regName: '', reason: '' });

  const fetchAdminData = async () => {
    setLoading(true);
    setError('');

    try {
      const [regsRes, usersRes] = await Promise.all([
        api.get('/admin/registrations'),
        api.get('/admin/users')
      ]);

      setRegistrations(regsRes.data || []);
      setUsers(usersRes.data || []);
    } catch (err) {
      console.error('Error fetching admin data:', err);
      setError('Failed to fetch administrative data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to delete user account '${userName}'?`)) {
      return;
    }

    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.delete(`/admin/users/${userId}`);
      setSuccess(`User account '${userName}' deleted successfully.`);
      await fetchAdminData();
    } catch (err) {
      console.error('Error deleting user account:', err);
      setError(err.response?.data?.error || 'Failed to delete user account.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateRegistrationStatus = async (regId, newStatus, registrantName, rejectionReason = '') => {
    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.put(`/registrations/${regId}/status`, { status: newStatus, rejectionReason });
      const actionLabel =
        newStatus === 'confirmed' ? 'approved & confirmed' :
        newStatus === 'cancelled' ? 'rejected with reason' : 'updated';
      setSuccess(`Registration for '${registrantName}' has been ${actionLabel}! Student status updated in real-time.`);
      await fetchAdminData();
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

  // Compute metrics
  const totalUsersCount = users.filter((u) => u.role === 'user').length;
  const totalEventAddersCount = users.filter((u) => u.role === 'organizer' || u.role === 'event').length;
  const totalRegistrations = registrations.length;
  const pendingCount = registrations.filter((r) => r.status === 'pending').length;
  const confirmedCount = registrations.filter((r) => r.status === 'confirmed').length;
  const cancelledCount = registrations.filter((r) => r.status === 'cancelled').length;

  const filteredRegistrations = regFilter === 'all'
    ? registrations
    : registrations.filter((r) => r.status === regFilter);

  return (
    <div className="container page-container">
      {/* Page Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.4rem', marginBottom: '0.4rem' }}>
          Admin <span className="text-gradient">Control Dashboard</span>
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>
          System-wide management of students, Event Adders, and all event registrations
        </p>
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

      {loading ? (
        <Loading message="Fetching system data..." />
      ) : (
        <>
          {/* Stat Summary Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1.25rem',
            marginBottom: '2.5rem'
          }}>
            <div className="card" style={{ padding: '1.5rem', textAlign: 'center', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
              <div style={{ fontSize: '2.6rem', fontWeight: '800', color: 'var(--primary-light)' }}>
                {totalUsersCount}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '600', marginTop: '0.25rem' }}>
                👤 Registered Students
              </div>
            </div>

            <div className="card" style={{ padding: '1.5rem', textAlign: 'center', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              <div style={{ fontSize: '2.6rem', fontWeight: '800', color: 'var(--accent-green-light)' }}>
                {totalEventAddersCount}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '600', marginTop: '0.25rem' }}>
                ⚙️ Event Adders
              </div>
            </div>

            <div className="card" style={{ padding: '1.5rem', textAlign: 'center', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
              <div style={{ fontSize: '2.6rem', fontWeight: '800', color: '#f59e0b' }}>
                {pendingCount}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '600', marginTop: '0.25rem' }}>
                🕒 Pending Approvals
              </div>
            </div>

            <div className="card" style={{ padding: '1.5rem', textAlign: 'center', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
              <div style={{ fontSize: '2.6rem', fontWeight: '800', color: '#10b981' }}>
                {confirmedCount}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '600', marginTop: '0.25rem' }}>
                ✓ Confirmed Registrations
              </div>
            </div>

            <div className="card" style={{ padding: '1.5rem', textAlign: 'center', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
              <div style={{ fontSize: '2.6rem', fontWeight: '800', color: '#ef4444' }}>
                {cancelledCount}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '600', marginTop: '0.25rem' }}>
                ❌ Cancelled
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="tabs-container" style={{ marginBottom: '1.5rem' }}>
            <button
              className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              👤 User Management ({users.length})
            </button>
            <button
              className={`tab-btn ${activeTab === 'registrations' ? 'active' : ''}`}
              onClick={() => setActiveTab('registrations')}
            >
              🎟️ All Registrations ({totalRegistrations})
              {pendingCount > 0 && (
                <span style={{
                  marginLeft: '0.4rem',
                  background: 'var(--warning)',
                  color: '#000',
                  borderRadius: '999px',
                  padding: '0.1rem 0.45rem',
                  fontSize: '0.75rem',
                  fontWeight: '700'
                }}>
                  {pendingCount} Pending
                </span>
              )}
            </button>
          </div>

          {/* TAB: USER MANAGEMENT */}
          {activeTab === 'overview' && (
            <div className="card">
              <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', color: '#ffffff', marginBottom: '0.25rem' }}>
                  Manage System Accounts ({users.length})
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  List of registered students and Event Adders who can log in to the system
                </p>
              </div>

              {users.length > 0 ? (
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>User Name</th>
                        <th>Email Address</th>
                        <th>Account Role</th>
                        <th>Registered On</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => {
                        const isEventAdder = u.role === 'organizer' || u.role === 'event';
                        return (
                          <tr key={u._id}>
                            <td>
                              <strong style={{ color: '#ffffff' }}>{u.name}</strong>
                            </td>
                            <td>{u.email}</td>
                            <td>
                              {isEventAdder ? (
                                <span className="status-badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
                                  ⚙️ Event Adder
                                </span>
                              ) : (
                                <span className="status-badge" style={{ background: 'rgba(59, 130, 246, 0.2)', color: 'var(--primary-light)', border: '1px solid rgba(59, 130, 246, 0.4)' }}>
                                  👤 Student / User
                                </span>
                              )}
                            </td>
                            <td>
                              {new Date(u.createdAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </td>
                            <td>
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => handleDeleteUser(u._id, u.name)}
                                disabled={actionLoading}
                              >
                                Delete Account
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">👤</div>
                  <h3 className="empty-state-title">No Registered Users Yet</h3>
                  <p className="empty-state-desc">
                    When users or Event Adders register on the system, their login details will be displayed here.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB: ALL REGISTRATIONS */}
          {activeTab === 'registrations' && (
            <div>
              {/* Filter bar */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                {[
                  { key: 'all', label: `All (${totalRegistrations})`, color: 'var(--primary-light)' },
                  { key: 'pending', label: `⏳ Pending (${pendingCount})`, color: '#f59e0b' },
                  { key: 'confirmed', label: `✓ Confirmed (${confirmedCount})`, color: '#10b981' },
                  { key: 'cancelled', label: `❌ Cancelled (${cancelledCount})`, color: '#ef4444' }
                ].map(({ key, label, color }) => (
                  <button
                    key={key}
                    onClick={() => setRegFilter(key)}
                    style={{
                      padding: '0.45rem 1rem',
                      borderRadius: '999px',
                      border: `1px solid ${regFilter === key ? color : 'rgba(255,255,255,0.1)'}`,
                      background: regFilter === key ? `${color}22` : 'transparent',
                      color: regFilter === key ? color : 'var(--text-muted)',
                      fontWeight: regFilter === key ? '700' : '500',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {filteredRegistrations.length > 0 ? (
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Student Name</th>
                        <th>Email</th>
                        <th>Event</th>
                        <th>Phone</th>
                        <th>Members</th>
                        <th>Registered On</th>
                        <th>Status</th>
                        <th>Action (Approval)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRegistrations.map((reg) => {
                        const isPending = reg.status === 'pending';
                        const isConfirmed = reg.status === 'confirmed';

                        return (
                          <tr key={reg._id}>
                            <td>
                              <strong style={{ color: '#ffffff' }}>
                                {reg.name || reg.user?.name || 'Anonymous'}
                              </strong>
                            </td>
                            <td style={{ fontSize: '0.85rem' }}>{reg.email || reg.user?.email || 'N/A'}</td>
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
                            <td style={{ fontSize: '0.85rem' }}>
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
                                  🕒 Pending
                                </span>
                              )}
                              {isConfirmed && (
                                <span className="status-badge confirmed">
                                  ✓ Confirmed
                                </span>
                              )}
                              {reg.status === 'cancelled' && (
                                <div>
                                  <span className="status-badge cancelled">
                                    ❌ Rejected
                                  </span>
                                  {reg.rejectionReason && (
                                    <div style={{
                                      marginTop: '0.35rem',
                                      fontSize: '0.78rem',
                                      color: '#fca5a5',
                                      background: 'rgba(239,68,68,0.08)',
                                      border: '1px solid rgba(239,68,68,0.2)',
                                      borderRadius: '6px',
                                      padding: '0.3rem 0.5rem',
                                      maxWidth: '200px',
                                      lineHeight: '1.4'
                                    }}>
                                      <strong>Reason:</strong> {reg.rejectionReason}
                                    </div>
                                  )}
                                </div>
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
                                    title="Approve registration"
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
                                  Approved ✓
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
                  <div className="empty-state-icon">🎟️</div>
                  <h3 className="empty-state-title">
                    {regFilter === 'all' ? 'No Registrations Yet' : `No ${regFilter.charAt(0).toUpperCase() + regFilter.slice(1)} Registrations`}
                  </h3>
                  <p className="empty-state-desc">
                    {regFilter === 'pending'
                      ? 'No registrations are currently awaiting approval.'
                      : 'No registrations match the selected filter.'}
                  </p>
                </div>
              )}
            </div>
          )}
        </>
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
                placeholder="e.g. Registration limit reached for your team size. Only individual participants are allowed."
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

export default AdminDashboard;
