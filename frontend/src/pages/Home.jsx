import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import EventCard from '../components/EventCard';
import Loading from '../components/Loading';

const Home = ({ user }) => {
  const [featuredEvents, setFeaturedEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentEvents = async () => {
      try {
        const response = await api.get('/events');
        setFeaturedEvents(response.data.slice(0, 3));
      } catch (err) {
        console.warn('Could not load featured events for home:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentEvents();
  }, []);

  const handleProtectedAction = (e) => {
    if (!user) {
      e.preventDefault(); // Do nothing when clicked by non-logged in user
    }
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="hero-section">
        <div className="container">
          <div className="hero-badge">
            ⚡ Powered by Scikit-Learn ML & MongoDB Atlas
          </div>
          <h1 className="hero-title">
            Discover All Events & Manage with <span className="text-gradient">Intelligent AI</span>
          </h1>
          <p className="hero-description">
            Experience real-time smart recommendations based on your interests, location, budget, and category. Never miss workshops, hackathons, sports tournaments, and college fests again.
          </p>

          <div className="hero-cta">
            <Link
              to={user ? "/events" : "#"}
              className="btn btn-primary btn-lg"
              onClick={handleProtectedAction}
            >
              Explore Events 🚀
            </Link>
            <Link
              to={user ? "/recommendations" : "#"}
              className="btn btn-accent btn-lg"
              onClick={handleProtectedAction}
            >
              Get Recommendations 🎯
            </Link>
            {!user && (
              <Link to="/login" className="btn btn-outline btn-lg">
                Sign In
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Featured Upcoming Events Preview */}
      <section className="container page-container" style={{ paddingTop: '1rem', paddingBottom: '3rem' }}>
        <div className="section-header">
          <h2 className="section-title">Happening Soon</h2>
          <p className="section-subtitle">
            Curated active college events currently open for registration
          </p>
        </div>

        {loading ? (
          <Loading message="Fetching upcoming events..." />
        ) : featuredEvents.length > 0 ? (
          <div className="events-grid">
            {featuredEvents.map((ev) => (
              <EventCard key={ev._id || ev.id} event={ev} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">🎟️</div>
            <h3 className="empty-state-title">No Active Events Right Now</h3>
            <p className="empty-state-desc">
              Check back soon or ask the system administrator to post new college events!
            </p>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
          <Link
            to={user ? "/events" : "#"}
            className="btn btn-outline"
            onClick={handleProtectedAction}
          >
            View All Active Events →
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section" style={{ background: 'rgba(15, 23, 42, 0.4)' }}>
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Built for Modern Campus Life</h2>
            <p className="section-subtitle">
              Comprehensive event intelligence architecture bridging students and campus leaders
            </p>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon-wrapper">🤖</div>
              <h3 className="feature-title">AI Recommendations</h3>
              <p className="feature-desc">
                Logistic Regression pipeline dynamically scores real MongoDB active events against your preferences and budget.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-wrapper">🔍</div>
              <h3 className="feature-title">Event Discovery</h3>
              <p className="feature-desc">
                Easily filter by category, campus location, and date to discover workshops, hackathons, sports, and cultural summits.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-wrapper">⚡</div>
              <h3 className="feature-title">Easy Registration</h3>
              <p className="feature-desc">
                Single-click reservation with automated duplicate prevention, real-time seat decrement, and instant confirmations.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-wrapper">🎯</div>
              <h3 className="feature-title">Personalized Results</h3>
              <p className="feature-desc">
                Intelligent fallback category taxonomy ensures you always receive relevant alternatives even if exact categories are unavailable.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
