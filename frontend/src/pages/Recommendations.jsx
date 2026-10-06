import React, { useState } from 'react';
import api from '../api';
import EventCard from '../components/EventCard';
import Loading from '../components/Loading';

const POPULAR_INTERESTS = ['Technology', 'Sports', 'Music', 'Business', 'Art & Culture', 'Gaming'];
const POPULAR_CATEGORIES = ['Workshop', 'Tech Talk', 'Hackathon', 'Cricket', 'Football', 'Kabaddi', 'Music', 'Startup Pitch'];
const POPULAR_LOCATIONS = ['Chennai', 'Bangalore', 'Mumbai', 'Delhi', 'Hyderabad', 'Online'];

const Recommendations = () => {
  const [formData, setFormData] = useState({
    user_interest: 'Technology',
    location: 'Chennai',
    budget: 1000,
    event_category: 'Workshop'
  });

  const [recommendations, setRecommendations] = useState([]);
  const [resultMeta, setResultMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

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
    setLoading(true);
    setHasSearched(true);

    try {
      const response = await api.post('/recommendations', {
        user_interest: formData.user_interest,
        location: formData.location,
        budget: Number(formData.budget),
        event_category: formData.event_category
      });

      setRecommendations(response.data.recommendations || []);
      setResultMeta({
        exact_match: response.data.exact_match,
        message: response.data.message,
        requested_category: response.data.requested_category
      });
    } catch (err) {
      console.error('Recommendation request error:', err);
      const serverMsg = err.response?.data?.error || 'Unable to generate recommendations. Please try again.';
      setError(serverMsg);
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container page-container">
      {/* Page Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2.4rem', marginBottom: '0.5rem' }}>
          AI <span className="text-gradient">Event Recommendations</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem' }}>
          Specify your preferences and let our machine learning engine rank the best active campus events
        </p>
      </div>

      {/* Input Preference Card */}
      <div className="card" style={{ marginBottom: '2.5rem' }}>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            {/* Interest */}
            <div className="form-group">
              <label className="form-label" htmlFor="pref-interest">Your Interest</label>
              <input
                id="pref-interest"
                type="text"
                name="user_interest"
                className="form-control"
                placeholder="e.g. Technology, Sports, Music"
                value={formData.user_interest}
                onChange={handleChange}
                required
              />
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                {POPULAR_INTERESTS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
                    onClick={() => setFormData({ ...formData, user_interest: item })}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            {/* Event Category */}
            <div className="form-group">
              <label className="form-label" htmlFor="pref-category">Preferred Category</label>
              <input
                id="pref-category"
                type="text"
                name="event_category"
                className="form-control"
                placeholder="e.g. Workshop, Hackathon, Kabaddi"
                value={formData.event_category}
                onChange={handleChange}
                required
              />
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                {POPULAR_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
                    onClick={() => setFormData({ ...formData, event_category: cat })}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Location */}
            <div className="form-group">
              <label className="form-label" htmlFor="pref-location">Location</label>
              <input
                id="pref-location"
                type="text"
                name="location"
                className="form-control"
                placeholder="e.g. Chennai, Bangalore"
                value={formData.location}
                onChange={handleChange}
                required
              />
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                {POPULAR_LOCATIONS.map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}
                    onClick={() => setFormData({ ...formData, location: loc })}
                  >
                    {loc}
                  </button>
                ))}
              </div>
            </div>

            {/* Budget */}
            <div className="form-group">
              <label className="form-label" htmlFor="pref-budget">
                Budget Limit: ₹{formData.budget}
              </label>
              <input
                id="pref-budget"
                type="number"
                name="budget"
                className="form-control"
                placeholder="1000"
                min="0"
                step="50"
                value={formData.budget}
                onChange={handleChange}
                required
              />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '0.3rem' }}>
                Events priced at or below your budget score higher match priority.
              </span>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            marginTop: '1.25rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border-subtle)'
          }}>
            <button
              id="recommendations-submit-btn"
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Analyzing with ML Model...' : 'Calculate AI Matches ⚡'}
            </button>
          </div>
        </form>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="alert alert-error">
          <span>⚠️ {error}</span>
        </div>
      )}

      {/* Category Fallback Notice Banner */}
      {resultMeta && resultMeta.exact_match === false && (
        <div className="category-notice-box">
          <div className="category-notice-icon">💡</div>
          <div>
            <div className="category-notice-title">
              No {resultMeta.requested_category} events are currently available.
            </div>
            <div className="category-notice-desc">
              Here are related active events available right now in MongoDB Atlas that match your interests:
            </div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <Loading message="ML Model ranking active MongoDB events..." />
      )}

      {/* Recommendations Results List */}
      {!loading && hasSearched && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.5rem' }}>
              Recommended Events ({recommendations.length})
            </h2>
            {resultMeta?.exact_match && (
              <span className="status-badge confirmed">
                ✓ Exact Category Match
              </span>
            )}
          </div>

          {recommendations.length > 0 ? (
            <div className="events-grid">
              {recommendations.map((ev) => (
                <EventCard key={ev._id || ev.id} event={ev} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">🔍</div>
              <h3 className="empty-state-title">No Events Available</h3>
              <p className="empty-state-desc">
                No active events matching your criteria or related categories were found in MongoDB Atlas.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Recommendations;
