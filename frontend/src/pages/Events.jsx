import React, { useEffect, useState } from 'react';
import api from '../api';
import EventCard from '../components/EventCard';
import Loading from '../components/Loading';

const CATEGORIES = [
  'All',
  'Workshop',
  'Tech Talk',
  'Hackathon',
  'Cricket',
  'Football',
  'Kabaddi',
  'Music',
  'Dance',
  'Startup Pitch'
];

const Events = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [locationFilter, setLocationFilter] = useState('');

  const fetchEvents = async () => {
    setLoading(true);
    setError('');

    try {
      const params = {};
      if (selectedCategory && selectedCategory !== 'All') {
        params.category = selectedCategory;
      }
      if (search.trim()) {
        params.search = search.trim();
      }
      if (locationFilter.trim()) {
        params.location = locationFilter.trim();
      }

      const response = await api.get('/events', { params });
      setEvents(response.data);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Unable to load events at this moment. Please check server connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [selectedCategory]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchEvents();
  };

  const handleClearFilters = () => {
    setSearch('');
    setSelectedCategory('All');
    setLocationFilter('');
  };

  return (
    <div className="container page-container">
      {/* Page Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2.4rem', marginBottom: '0.5rem' }}>
          Explore <span className="text-gradient">Active Events</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem' }}>
          Real-time events fetched live from MongoDB Atlas with verified deadlines and available seats
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ marginBottom: '2rem', padding: '1.25rem' }}>
        <form onSubmit={handleSearchSubmit} className="form-row" style={{ alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0, flex: 2 }}>
            <label className="form-label" htmlFor="events-search">Keyword Search</label>
            <input
              id="events-search"
              type="text"
              className="form-control"
              placeholder="Search event name, description, or keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
            <label className="form-label" htmlFor="events-location">Location</label>
            <input
              id="events-location"
              type="text"
              className="form-control"
              placeholder="e.g. Chennai, Bangalore"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button id="events-filter-btn" type="submit" className="btn btn-primary">
              Filter
            </button>
            <button
              id="events-clear-btn"
              type="button"
              className="btn btn-outline"
              onClick={handleClearFilters}
            >
              Reset
            </button>
          </div>
        </form>

        {/* Category Pills */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`btn btn-sm ${selectedCategory === cat ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="alert alert-error">
          <span>⚠️ {error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <Loading message="Fetching active events from MongoDB Atlas..." />
      ) : events.length > 0 ? (
        <div className="events-grid">
          {events.map((ev) => (
            <EventCard key={ev._id || ev.id} event={ev} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">🎟️</div>
          <h3 className="empty-state-title">No Active Events Found</h3>
          <p className="empty-state-desc">
            No events match your current filter criteria or all deadlines have expired.
          </p>
          <button onClick={handleClearFilters} className="btn btn-outline btn-sm">
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
};

export default Events;
