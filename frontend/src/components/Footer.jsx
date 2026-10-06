import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <div className="navbar-brand" style={{ marginBottom: '0.5rem' }}>
              <div className="brand-icon">✨</div>
              <span className="brand-text">
                Event<span>AI</span>
              </span>
            </div>
            <p className="footer-brand-desc">
              Next-generation college event recommendation system powered by scikit-learn machine learning and MongoDB Atlas.
            </p>
          </div>

          <div>
            <h4 className="footer-heading">Quick Links</h4>
            <ul className="footer-links">
              <li>
                <Link to="/" className="footer-link">Home</Link>
              </li>
              <li>
                <Link to="/events" className="footer-link">Explore Events</Link>
              </li>
              <li>
                <Link to="/recommendations" className="footer-link">AI Recommendations</Link>
              </li>
              <li>
                <Link to="/login" className="footer-link">User Login</Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="footer-heading">Platform Highlights</h4>
            <ul className="footer-links">
              <li className="footer-link">✓ Real-time MongoDB Atlas</li>
              <li className="footer-link">✓ Lightweight ML Ranking (512MB RAM)</li>
              <li className="footer-link">✓ Automatic Deadline Enforcement</li>
              <li className="footer-link">✓ Atomic Seat Capacity Tracking</li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <div>
            © {new Date().getFullYear()} AI Event Recommendation System. All rights reserved.
          </div>
          <div>
            College Capstone Project • Production Full-Stack Architecture
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
