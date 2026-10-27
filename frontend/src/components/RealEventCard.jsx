import React, { useState } from "react";

// Category-specific high-definition fallback images
const getCategoryImageUrl = (event) => {
  const type = (event.type || "").toLowerCase();
  const title = (event.title || "").toLowerCase();

  if (type.includes("cricket") || title.includes("cricket") || title.includes("ipl") || title.includes("t20")) {
    return "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=500&h=260&fit=crop&auto=format";
  }
  if (type.includes("football") || title.includes("football") || title.includes("soccer")) {
    return "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=500&h=260&fit=crop&auto=format";
  }
  if (type.includes("badminton") || title.includes("badminton")) {
    return "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=500&h=260&fit=crop&auto=format";
  }
  if (type.includes("tennis") || title.includes("tennis")) {
    return "https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=500&h=260&fit=crop&auto=format";
  }
  if (type.includes("basketball") || title.includes("basketball")) {
    return "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=500&h=260&fit=crop&auto=format";
  }
  if (type.includes("sports") || title.includes("sports") || title.includes("marathon") || title.includes("run") || title.includes("tournament")) {
    return "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=500&h=260&fit=crop&auto=format";
  }
  if (type.includes("hackathon") || title.includes("hackathon") || title.includes("hack")) {
    return "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=500&h=260&fit=crop&auto=format";
  }
  if (type.includes("coding") || title.includes("coding") || title.includes("developer") || title.includes("code")) {
    return "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500&h=260&fit=crop&auto=format";
  }
  if (type.includes("ai") || title.includes("ai") || title.includes("machine learning") || title.includes("intelligence")) {
    return "https://images.unsplash.com/photo-1677442136019-21780efad99a?w=500&h=260&fit=crop&auto=format";
  }
  if (type.includes("tech") || title.includes("tech") || title.includes("software")) {
    return "https://images.unsplash.com/photo-1518770660439-4636190af475?w=500&h=260&fit=crop&auto=format";
  }
  if (type.includes("workshop") || title.includes("workshop")) {
    return "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=500&h=260&fit=crop&auto=format";
  }
  if (type.includes("seminar") || title.includes("seminar")) {
    return "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=500&h=260&fit=crop&auto=format";
  }
  if (type.includes("conference") || title.includes("conference") || title.includes("summit")) {
    return "https://images.unsplash.com/photo-1511578314322-379afb476865?w=500&h=260&fit=crop&auto=format";
  }
  if (type.includes("music") || type.includes("concert") || title.includes("music") || title.includes("concert") || title.includes("sing") || title.includes("dj")) {
    return "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&h=260&fit=crop&auto=format";
  }
  if (type.includes("dance") || title.includes("dance")) {
    return "https://images.unsplash.com/photo-1547153760-18fc86324498?w=500&h=260&fit=crop&auto=format";
  }
  if (type.includes("cultural") || type.includes("festival") || title.includes("festival") || title.includes("expo")) {
    return "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&h=260&fit=crop&auto=format";
  }
  if (type.includes("business") || type.includes("startup") || title.includes("business") || title.includes("startup")) {
    return "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=500&h=260&fit=crop&auto=format";
  }
  if (type.includes("gaming") || title.includes("gaming") || title.includes("esports")) {
    return "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500&h=260&fit=crop&auto=format";
  }
  if (type.includes("arts") || title.includes("photo") || title.includes("art")) {
    return "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=500&h=260&fit=crop&auto=format";
  }
  if (type.includes("food") || title.includes("food") || title.includes("dining")) {
    return "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500&h=260&fit=crop&auto=format";
  }
  return "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=500&h=260&fit=crop&auto=format";
};

const RealEventCard = ({ event, isAdmin, onAddToMyEvents }) => {
  const [imgError, setImgError] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const fallbackImage = getCategoryImageUrl(event);
  const displayImage = !imgError && event.thumbnail ? event.thumbnail : fallbackImage;

  const registrationLink = event.registrationUrl || event.link;
  const isValidUrl = Boolean(registrationLink && (registrationLink.startsWith('http://') || registrationLink.startsWith('https://')));

  const isDirectBooking = Boolean(
    event.isDirectRegistration ||
    (event.ticketInfo && event.ticketInfo.toLowerCase().includes('ticket')) ||
    (event.ticketInfo && event.ticketInfo.toLowerCase().includes('registration')) ||
    (registrationLink && (registrationLink.includes('/event') || registrationLink.includes('/tickets') || registrationLink.includes('/booking') || registrationLink.includes('unstop.com')))
  );

  const buttonLabel = isDirectBooking ? "Register / Book Tickets" : "View Event Website";

  const handleRegister = () => {
    if (isValidUrl) {
      window.open(registrationLink, "_blank", "noopener,noreferrer");
    }
  };

  const handleCopyLink = async () => {
    if (!isValidUrl) return;
    try {
      await navigator.clipboard.writeText(registrationLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  const isValidVenue =
    event.venue &&
    typeof event.venue === "string" &&
    !event.venue.toLowerCase().includes("ago") &&
    !event.venue.toLowerCase().includes("likes") &&
    !event.venue.startsWith("http");

  const qrImageUrl = isValidUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(registrationLink)}`
    : "";

  return (
    <div className="real-event-card">
      {/* Image */}
      <div className="real-event-image-wrap">
        <img
          src={displayImage}
          alt={event.title}
          className="real-event-image"
          onError={() => setImgError(true)}
          loading="lazy"
        />
        {/* Badges */}
        <span className="badge badge-live">🔴 REAL UPCOMING EVENT</span>
        {event.registrationVerified && (
          <span className="badge badge-verified" style={{ background: '#059669', color: '#fff' }}>
            ✓ Registration Open
          </span>
        )}
        {event.type && event.type.toLowerCase() !== "event" && (
          <span className="badge badge-type">{event.type}</span>
        )}
      </div>

      {/* Body */}
      <div className="real-event-body">
        <h3 className="real-event-title">{event.title}</h3>

        <div className="real-event-meta">
          {event.date && (
            <div className="real-event-meta-item">
              <span className="meta-icon">📅</span>
              <span>{event.date}{event.time ? ` — ${event.time}` : ""}</span>
            </div>
          )}
          {isValidVenue && (
            <div className="real-event-meta-item">
              <span className="meta-icon">🏛️</span>
              <span>{event.venue}</span>
            </div>
          )}
          {event.address && (
            <div className="real-event-meta-item">
              <span className="meta-icon">📍</span>
              <span>{event.address}</span>
            </div>
          )}
          {event.organizerOrSource && (
            <div className="real-event-meta-item">
              <span className="meta-icon">🏢</span>
              <span>{event.organizerOrSource}</span>
            </div>
          )}
          {event.ticketInfo && (
            <div className="real-event-meta-item">
              <span className="meta-icon">🎟️</span>
              <span className="ticket-info-text">{event.ticketInfo}</span>
            </div>
          )}
        </div>

        {event.description && (
          <p className="real-event-description">{event.description}</p>
        )}

        {/* Action Buttons */}
        <div className="real-event-actions">
          <button
            className="btn btn-primary btn-sm"
            onClick={handleRegister}
            disabled={!isValidUrl}
            title={isValidUrl ? buttonLabel : "Registration link not available"}
          >
            🎟️ {buttonLabel}
          </button>

          {isValidUrl && (
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setShowQRModal(true)}
              title="Scan QR Code with mobile phone camera"
            >
              📱 QR Code
            </button>
          )}

          {/* Admin-only: Import to Platform */}
          {isAdmin && (
            <button
              className="btn btn-accent btn-sm"
              onClick={() => onAddToMyEvents && onAddToMyEvents(event)}
              title="Import this event to platform database"
            >
              ➕ Add to My Events
            </button>
          )}
        </div>

        {/* External event disclaimer */}
        <p className="external-disclaimer">
          ⚡ Registration link verified. Clicking opens official event registration website in a new tab.
        </p>
      </div>

      {/* ── QR CODE SCANNER MODAL ── */}
      {showQRModal && (
        <div className="qr-modal-overlay" onClick={() => setShowQRModal(false)}>
          <div className="qr-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="qr-modal-header">
              <h4 className="qr-modal-title">📱 Scan QR Code to Register</h4>
              <button
                className="qr-modal-close"
                onClick={() => setShowQRModal(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="qr-modal-body">
              <p className="qr-event-title">{event.title}</p>
              <div className="qr-code-wrapper">
                <img
                  src={qrImageUrl}
                  alt={`QR Code for ${event.title}`}
                  className="qr-code-image"
                />
              </div>

              <p className="qr-instructions">
                📷 Open your smartphone camera or any QR scanner app and point it at this QR code to open the registration page directly on your phone!
              </p>

              <div className="qr-url-box">
                <input
                  type="text"
                  readOnly
                  value={registrationLink}
                  className="qr-url-input"
                />
                <button
                  className={`btn btn-sm ${copied ? "btn-success" : "btn-outline"}`}
                  onClick={handleCopyLink}
                >
                  {copied ? "✓ Copied!" : "📋 Copy Link"}
                </button>
              </div>
            </div>

            <div className="qr-modal-footer">
              <button
                className="btn btn-primary btn-sm"
                onClick={handleRegister}
              >
                🎟️ Open Registration Page Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RealEventCard;
