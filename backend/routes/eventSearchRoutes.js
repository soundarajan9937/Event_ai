/**
 * eventSearchRoutes.js
 * --------------------
 * Express router for real-event search via SerpApi Google Search engine.
 *
 * GET /api/events/search?city=Coimbatore&event=Workshop&page=1
 *
 * Server-side security:
 *  - Reads key from process.env.SERPAPI_KEY.
 *  - NEVER exposes or returns key to the browser/frontend.
 *  - Fails safely with informative errors if configuration is missing.
 */

const express = require('express');
const { searchRealEvents } = require('../services/eventSearchService');

const router = express.Router();

// GET /api/events/search
router.get('/search', async (req, res) => {
  const city = (req.query.city || '').trim();
  const eventType = (req.query.event || 'all').trim();
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);

  // Validation: City is required
  if (!city) {
    return res.status(400).json({
      success: false,
      error: 'Please enter a city to search for upcoming events.'
    });
  }

  // Configuration check: SERPAPI_KEY must be present in server environment
  if (!process.env.SERPAPI_KEY) {
    console.error('[eventSearchRoutes] Error: SERPAPI_KEY is not defined in server environment variables.');
    return res.status(500).json({
      success: false,
      error: 'SerpApi configuration error: SERPAPI_KEY is missing in server environment variables.'
    });
  }

  try {
    const events = await searchRealEvents(city, eventType, page);

    return res.status(200).json({
      success: true,
      city,
      event: eventType,
      page,
      count: events.length,
      events,
      hasMore: events.length >= 6 // Indicates possible next page results
    });
  } catch (err) {
    console.error('[eventSearchRoutes] Error during search:', err.message);

    if (err.message.includes('SERPAPI_KEY')) {
      return res.status(500).json({
        success: false,
        error: 'SerpApi configuration error: SERPAPI_KEY is missing in server environment variables.'
      });
    }

    if (err.message.includes('timed out')) {
      return res.status(504).json({
        success: false,
        error: 'Search request timed out while contacting search engine. Please try again.'
      });
    }

    return res.status(502).json({
      success: false,
      error: 'Unable to retrieve real events at the moment. Please try again later.'
    });
  }
});

module.exports = router;
