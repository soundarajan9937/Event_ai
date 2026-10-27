import React, { useState } from "react";
import { searchRealEvents } from "../api";
import RealEventCard from "../components/RealEventCard";

// ─── Event Categories (Section 5.B) ──────────────────────────────────────────
const EVENT_TYPES = [
  "All Events",
  "Workshop",
  "Hackathon",
  "Technology",
  "Education",
  "Sports",
  "Music",
  "Concert",
  "Dance",
  "Cultural Events",
  "Business",
  "Conference",
  "Gaming",
  "Arts",
  "Photography",
  "Competition",
  "Festival",
  "Exhibition",
  "Other"
];

const RealEventSearch = ({ user }) => {
  const [city, setCity] = useState("");
  const [eventType, setEventType] = useState("All Events");
  const [customKeyword, setCustomKeyword] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [lastQuery, setLastQuery] = useState({ city: "", event: "" });

  const isOther = eventType === "Other";

  const getEffectiveKeyword = () => {
    const trimmedCustom = customKeyword.trim();
    if (trimmedCustom) return trimmedCustom;
    if (isOther) return "Event";
    if (eventType === "All Events") return "all";
    return eventType;
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();

    const trimmedCity = city.trim();
    if (!trimmedCity) {
      setError("Please enter a city to search for upcoming events.");
      return;
    }

    if (isOther && !customKeyword.trim()) {
      setError("Please enter a custom keyword when selecting 'Other'.");
      return;
    }

    const keyword = getEffectiveKeyword();

    setError("");
    setLoading(true);
    setSearched(false);
    setResults(null);
    setCurrentPage(1);
    setHasMore(false);

    try {
      const res = await searchRealEvents(trimmedCity, keyword, 1);
      const events = res.data?.events || [];
      setResults(events);
      setLastQuery({ city: trimmedCity, event: keyword });
      setSearched(true);
      setCurrentPage(1);
      setHasMore(Boolean(res.data?.hasMore && events.length > 0));
    } catch (err) {
      console.error("RealEventSearch error:", err);
      setError(
        err?.response?.data?.error ||
          "Unable to search events right now. Please verify your network connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (loadingMore || !lastQuery.city) return;

    const nextPage = currentPage + 1;
    setLoadingMore(true);

    try {
      const res = await searchRealEvents(lastQuery.city, lastQuery.event, nextPage);
      const newEvents = res.data?.events || [];

      if (newEvents.length > 0) {
        setResults((prevResults) => {
          const current = prevResults || [];
          // Avoid duplicate events between pages
          const existingLinks = new Set(current.map((e) => (e.link || e.registrationUrl || "").toLowerCase()));
          const existingTitles = new Set(current.map((e) => (e.title || "").toLowerCase()));

          const filteredNew = newEvents.filter((item) => {
            const itemLink = (item.link || item.registrationUrl || "").toLowerCase();
            const itemTitle = (item.title || "").toLowerCase();
            return !existingLinks.has(itemLink) && !existingTitles.has(itemTitle);
          });

          return [...current, ...filteredNew];
        });
        setCurrentPage(nextPage);
        setHasMore(Boolean(res.data?.hasMore && newEvents.length >= 6));
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error("Load more events error:", err);
      setError("Unable to load more events. Please try again.");
    } finally {
      setLoadingMore(false);
    }
  };

  const handleAddToMyEvents = (event) => {
    alert(
      `"${event.title}" noted. As an Administrator, you can add this verified event to the platform registry.`
    );
  };

  const isAdmin = user && user.role === "admin";

  return (
    <div className="page-container real-events-page">
      <div className="container">
        {/* ── Hero Header ── */}
        <div className="real-events-hero">
          <div className="real-events-hero-icon">🌐</div>
          <h1 className="real-events-hero-title">Real Event Search</h1>
          <p className="real-events-hero-subtitle">
            Search real upcoming events with verified open registration across any city.
            All links redirect directly to official organizer websites and authorized booking platforms.
          </p>
        </div>

        {/* ── Search Form ── */}
        <div className="card real-events-form-card">
          <form onSubmit={handleSearch} noValidate>
            <div className="real-events-form-grid">
              {/* City Input */}
              <div className="form-group">
                <label htmlFor="re-city" className="form-label">
                  📍 City *
                </label>
                <input
                  id="re-city"
                  type="text"
                  className="form-control"
                  placeholder="e.g. Coimbatore, Chennai, Bangalore, Mumbai, Delhi"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  disabled={loading || loadingMore}
                  autoComplete="off"
                />
              </div>

              {/* Event Type Dropdown */}
              <div className="form-group">
                <label htmlFor="re-type" className="form-label">
                  🎯 Event Category
                </label>
                <select
                  id="re-type"
                  className="form-control"
                  value={eventType}
                  onChange={(e) => {
                    setEventType(e.target.value);
                  }}
                  disabled={loading || loadingMore}
                >
                  {EVENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Keyword Input */}
              <div className="form-group real-events-custom-keyword">
                <label htmlFor="re-custom" className="form-label">
                  ✏️ Custom Keyword {isOther ? "*" : "(optional)"}
                </label>
                <input
                  id="re-custom"
                  type="text"
                  className="form-control"
                  placeholder={
                    isOther
                      ? "e.g. AI Workshop, Robotics Exhibition, Coding Contest"
                      : "e.g. AI, Cricket Tournament, Music Festival, Hackathon"
                  }
                  value={customKeyword}
                  onChange={(e) => setCustomKeyword(e.target.value)}
                  disabled={loading || loadingMore}
                  autoComplete="off"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && <p className="real-events-error">{error}</p>}

            {/* Search Button */}
            <button
              type="submit"
              id="re-search-btn"
              className="btn btn-primary btn-lg real-events-search-btn"
              disabled={loading || loadingMore}
            >
              {loading ? (
                <>
                  <span className="spinner-sm" /> Searching Verified Events…
                </>
              ) : (
                <>🔍 Search Verified Upcoming Events</>
              )}
            </button>
          </form>
        </div>

        {/* ── Results Section ── */}
        {searched && !loading && (
          <div className="real-events-results-section">
            <div className="real-events-results-header">
              <h2 className="real-events-results-title">
                {results && results.length > 0
                  ? `Verified Upcoming Events in ${lastQuery.city}`
                  : `No Upcoming Events Found`}
              </h2>
              {results && results.length > 0 && (
                <span className="real-events-count-badge">
                  {results.length} verified event{results.length !== 1 ? "s" : ""} found
                </span>
              )}
            </div>

            <p className="real-events-disclaimer">
              ℹ️ Displaying only upcoming events whose registration or ticket booking is verified as currently open.
            </p>

            {results && results.length === 0 ? (
              <div className="real-events-empty">
                <div className="real-events-empty-icon">🔍</div>
                <h3>No upcoming events found</h3>
                <p>
                  No upcoming events with verified open registration were found for this city and event type. Try another city or category.
                </p>
              </div>
            ) : (
              <>
                <div className="real-events-grid">
                  {results.map((event, i) => (
                    <RealEventCard
                      key={`${event.title}-${event.date}-${i}`}
                      event={event}
                      isAdmin={isAdmin}
                      onAddToMyEvents={handleAddToMyEvents}
                    />
                  ))}
                </div>

                {/* Load More Pagination */}
                {hasMore && (
                  <div className="real-events-load-more" style={{ textAlign: "center", marginTop: "2rem" }}>
                    <button
                      type="button"
                      id="re-load-more-btn"
                      className="btn btn-outline btn-lg"
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                    >
                      {loadingMore ? (
                        <>
                          <span className="spinner-sm" /> Loading More Results…
                        </>
                      ) : (
                        <>⬇️ Load More Events</>
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Welcome Walkthrough (Before Search) ── */}
        {!searched && !loading && (
          <div className="real-events-welcome">
            <div className="real-events-welcome-grid">
              {[
                { icon: "🏙️", label: "1. Enter Any City", desc: "Coimbatore, Chennai, Madurai, Bangalore & beyond" },
                { icon: "🎯", label: "2. Select Event Type", desc: "Workshops, Hackathons, Sports, Concerts & more" },
                { icon: "⚡", label: "3. Verified Registration", desc: "Strictly filters upcoming events with open booking" },
                { icon: "🎟️", label: "4. Register Directly", desc: "Direct redirect to official ticketing websites" },
              ].map((step) => (
                <div key={step.label} className="real-events-step">
                  <div className="real-events-step-icon">{step.icon}</div>
                  <h4>{step.label}</h4>
                  <p>{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RealEventSearch;
