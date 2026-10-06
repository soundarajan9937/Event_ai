import React from 'react';
import { Link } from 'react-router-dom';

const EventCard = ({ event }) => {
  const {
    _id,
    id,
    name,
    category,
    date,
    time,
    location,
    price,
    seats,
    registrationDeadline,
    imageUrl,
    match_score
  } = event;

  const eventId = _id || id;
  const formattedDate = date ? new Date(date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }) : 'TBD';

  const formattedDeadline = registrationDeadline ? new Date(registrationDeadline).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }) : 'TBD';

  const defaultImg = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1000&q=80';

  return (
    <div className="event-card">
      <div className="event-card-media">
        <img
          src={imageUrl || defaultImg}
          alt={name}
          className="event-card-img"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = defaultImg;
          }}
        />
        <span className="event-card-category">{category}</span>

        {match_score !== undefined && (
          <span className="event-card-match">
            ⚡ {match_score}% Match
          </span>
        )}
      </div>

      <div className="event-card-body">
        <h3 className="event-card-title" title={name}>
          {name}
        </h3>

        <div className="event-meta-grid">
          <div className="event-meta-item" title={formattedDate}>
            <span className="event-meta-icon">📅</span>
            <span>{formattedDate}</span>
          </div>

          <div className="event-meta-item" title={time}>
            <span className="event-meta-icon">⏰</span>
            <span>{time}</span>
          </div>

          <div className="event-meta-item" title={location}>
            <span className="event-meta-icon">📍</span>
            <span>{location}</span>
          </div>

          <div className="event-meta-item" title={`Members: ${event.members || '1'}`}>
            <span className="event-meta-icon">👥</span>
            <span>{event.members || '1'}</span>
          </div>

          <div className="event-meta-item" title={`Deadline: ${formattedDeadline}`}>
            <span className="event-meta-icon">⏳</span>
            <span>Due {formattedDeadline}</span>
          </div>
        </div>

        <div className="event-card-footer">
          <div>
            <div className={`event-price ${price === 0 ? 'free' : ''}`}>
              {price === 0 ? 'Free' : `₹${price}`}
            </div>
            <div className="event-card-seats">
              {seats > 0 ? `${seats} seats left` : 'Sold Out'}
            </div>
          </div>

          <Link to={`/events/${eventId}`} className="btn btn-primary btn-sm">
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
};

export default EventCard;
