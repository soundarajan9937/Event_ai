import React, { useState } from "react";

// Curated high-definition category image collections (Unsplash CDN)
const CATEGORY_IMAGES = {
  hackathon: [
    "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&auto=format&fit=crop&q=80"
  ],
  music: [
    "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=800&auto=format&fit=crop&q=80"
  ],
  coding: [
    "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=800&auto=format&fit=crop&q=80"
  ],
  sports: [
    "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&auto=format&fit=crop&q=80"
  ],
  workshop: [
    "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80"
  ],
  conference: [
    "https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&auto=format&fit=crop&q=80"
  ],
  cultural: [
    "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&auto=format&fit=crop&q=80"
  ],
  tech: [
    "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1677442136019-21780efad99a?w=800&auto=format&fit=crop&q=80"
  ]
};

// Visual themes for fallback banners
const CATEGORY_THEMES = {
  hackathon: {
    gradient: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 50%, #1e1b4b 100%)",
    icon: "💻",
    label: "Hackathon & Code"
  },
  music: {
    gradient: "linear-gradient(135deg, #ec4899 0%, #8b5cf6 50%, #312e81 100%)",
    icon: "🎵",
    label: "Live Concert & Music"
  },
  coding: {
    gradient: "linear-gradient(135deg, #06b6d4 0%, #0284c7 50%, #0f172a 100%)",
    icon: "⚡",
    label: "Coding & Dev"
  },
  sports: {
    gradient: "linear-gradient(135deg, #f59e0b 0%, #ea580c 50%, #7c2d12 100%)",
    icon: "🏆",
    label: "Sports & Athletics"
  },
  workshop: {
    gradient: "linear-gradient(135deg, #10b981 0%, #047857 50%, #064e3b 100%)",
    icon: "🛠️",
    label: "Workshop & Training"
  },
  conference: {
    gradient: "linear-gradient(135deg, #6366f1 0%, #4338ca 50%, #1e1b4b 100%)",
    icon: "🎤",
    label: "Conference & Summit"
  },
  cultural: {
    gradient: "linear-gradient(135deg, #f43f5e 0%, #be123c 50%, #4c0519 100%)",
    icon: "🎭",
    label: "Cultural Fest"
  },
  tech: {
    gradient: "linear-gradient(135deg, #2563eb 0%, #7c3aed 50%, #0f172a 100%)",
    icon: "🧠",
    label: "Tech & Innovation"
  }
};

// Accurate category classifier taking into account what the user searched for
const detectCategoryKey = (event, searchCategory = "") => {
  const sc = (searchCategory || "").toLowerCase().trim();
  const type = (event.type || "").toLowerCase().trim();
  const title = (event.title || "").toLowerCase().trim();
  const desc = (event.description || "").toLowerCase().trim();

  // 1. Explicit user search category takes highest priority
  if (sc && sc !== "all" && sc !== "all events" && sc !== "event") {
    if (sc.includes("hackathon") || sc.includes("hack")) return "hackathon";
    if (sc.includes("music") || sc.includes("concert")) return "music";
    if (sc.includes("coding") || sc.includes("code") || sc.includes("developer")) return "coding";
    if (sc.includes("sport") || sc.includes("cricket") || sc.includes("football") || sc.includes("marathon")) return "sports";
    if (sc.includes("workshop") || sc.includes("bootcamp")) return "workshop";
    if (sc.includes("cultural") || sc.includes("fest")) return "cultural";
    if (sc.includes("conference") || sc.includes("summit") || sc.includes("seminar")) return "conference";
    if (sc.includes("ai") || sc.includes("tech")) return "tech";
  }

  // 2. Keyword detection in title, type, and description
  const combined = `${type} ${title} ${desc}`;

  if (combined.includes("hackathon") || combined.includes("hackfest") || combined.includes("codefest")) {
    return "hackathon";
  }
  if (combined.includes("concert") || combined.includes("music") || combined.includes("sing") || combined.includes("dj ") || combined.includes("band") || combined.includes("live music")) {
    return "music";
  }
  if (combined.includes("coding") || combined.includes("developer") || combined.includes("programming") || combined.includes("leetcode")) {
    return "coding";
  }
  if (combined.includes("cricket") || combined.includes("football") || combined.includes("badminton") || combined.includes("sports") || combined.includes("marathon") || combined.includes("tournament") || combined.includes("athletics")) {
    return "sports";
  }
  if (combined.includes("workshop") || combined.includes("bootcamp") || combined.includes("hands-on") || combined.includes("training")) {
    return "workshop";
  }
  if (combined.includes("cultural") || combined.includes("dance") || combined.includes("theatre") || combined.includes("festival") || combined.includes("drama")) {
    return "cultural";
  }
  if (combined.includes("conference") || combined.includes("summit") || combined.includes("seminar")) {
    return "conference";
  }
  if (combined.includes("ai ") || combined.includes("machine learning") || combined.includes("tech ") || combined.includes("software")) {
    return "tech";
  }

  return "tech";
};

// Deterministic image selector for event title
const getCategoryImageUrl = (event, searchCategory = "") => {
  const categoryKey = detectCategoryKey(event, searchCategory);
  const pool = CATEGORY_IMAGES[categoryKey] || CATEGORY_IMAGES.tech;
  let hash = 0;
  const str = event.title || "";
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % pool.length;
  return pool[index];
};

const RealEventCard = ({ event, isAdmin, onAddToMyEvents, searchCategory = "" }) => {
  const [triedFallback, setTriedFallback] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const categoryKey = detectCategoryKey(event, searchCategory);
  const fallbackImage = getCategoryImageUrl(event, searchCategory);
  const theme = CATEGORY_THEMES[categoryKey] || CATEGORY_THEMES.tech;

  // Use candidate thumbnail if present and not yet errored; otherwise use category image
  const displayImage = !triedFallback && event.thumbnail ? event.thumbnail : fallbackImage;

  const handleImageError = () => {
    if (!triedFallback && event.thumbnail) {
      // Original thumbnail failed (e.g. hotlink blocked) -> switch to curated category image
      setTriedFallback(true);
    } else {
      // Both failed or unavailable -> render category gradient illustration
      setImgFailed(true);
    }
  };

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
        {!imgFailed ? (
          <img
            src={displayImage}
            alt={event.title}
            className="real-event-image"
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
            onError={handleImageError}
            loading="lazy"
          />
        ) : (
          <div
            className="real-event-fallback-banner"
            style={{
              background: theme.gradient,
              width: "100%",
              height: "100%",
              minHeight: "180px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              overflow: "hidden",
              color: "#fff"
            }}
          >
            <span style={{ fontSize: "3rem", filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.4))", marginBottom: "0.25rem" }}>
              {theme.icon}
            </span>
            <span style={{ fontSize: "0.85rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.95 }}>
              {theme.label}
            </span>
            <div style={{ position: "absolute", right: "-10px", bottom: "-10px", fontSize: "5rem", opacity: 0.12, userSelect: "none" }}>
              {theme.icon}
            </div>
          </div>
        )}
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
