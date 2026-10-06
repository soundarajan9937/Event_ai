const express = require('express');
const router = express.Router();
const axios = require('axios');
const { Event } = require('../models');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// Taxonomy of related categories across domains
const CATEGORY_TAXONOMY = {
  technology: [
    'workshop',
    'tech talk',
    'hackathon',
    'coding contest',
    'seminar',
    'webinar',
    'bootcamp',
    'conference',
    'ai summit',
    'developer meetup'
  ],
  sports: [
    'kabaddi',
    'cricket',
    'football',
    'athletics',
    'badminton',
    'basketball',
    'volleyball',
    'tennis',
    'chess',
    'marathon'
  ],
  cultural: [
    'music',
    'dance',
    'theatre',
    'concert',
    'art exhibition',
    'drama',
    'standup comedy',
    'cultural fest',
    'painting'
  ],
  business: [
    'startup pitch',
    'networking',
    'career fair',
    'expo',
    'summit',
    'finance workshop',
    'marketing summit',
    'investor meet'
  ],
  gaming: [
    'esports',
    'lan party',
    'game dev jam',
    'board games',
    'gaming tournament'
  ]
};

/**
 * Finds related categories for a given requested category
 */
const getRelatedCategories = (requestedCategory) => {
  const normCategory = requestedCategory.trim().toLowerCase();

  for (const [groupName, categories] of Object.entries(CATEGORY_TAXONOMY)) {
    const isMember = categories.some((c) => normCategory.includes(c) || c.includes(normCategory));
    if (isMember) {
      // Return other categories in this group excluding exact match
      return categories.filter((c) => !normCategory.includes(c) && !c.includes(normCategory));
    }
  }

  return [];
};

/**
 * @route   POST /api/recommendations
 * @desc    Get AI recommendations for active MongoDB events based on user preferences
 * @access  Public
 */
router.post('/', async (req, res) => {
  try {
    const { user_interest, location, budget, event_category } = req.body;

    // Validate inputs
    if (!user_interest || !location || budget === undefined || !event_category) {
      return res.status(400).json({
        error: 'Please provide user_interest, location, budget, and event_category.'
      });
    }

    const numericBudget = Number(budget);
    const now = new Date();

    // 1. Retrieve ONLY active events from MongoDB Atlas (deadline in future, seats > 0)
    const allActiveEvents = await Event.find({
      registrationDeadline: { $gt: now },
      seats: { $gt: 0 }
    }).lean();

    if (allActiveEvents.length === 0) {
      return res.status(200).json({
        exact_match: false,
        message: 'No events are currently available.',
        requested_category: event_category,
        recommendations: []
      });
    }

    // 2. Exact category matching logic (Section 14)
    const requestedCategoryNorm = event_category.trim().toLowerCase();
    const exactMatches = allActiveEvents.filter(
      (ev) => ev.category.trim().toLowerCase() === requestedCategoryNorm
    );

    let candidateEvents = [];
    let isExactMatch = false;
    let message = '';

    if (exactMatches.length > 0) {
      // Exact category events found!
      isExactMatch = true;
      candidateEvents = exactMatches;
      message = `Found ${exactMatches.length} ${event_category} event(s) matching your profile.`;
    } else {
      // Exact category unavailable: Fallback to related active events
      isExactMatch = false;
      const relatedCategoryList = getRelatedCategories(event_category);

      let relatedEvents = [];
      if (relatedCategoryList.length > 0) {
        relatedEvents = allActiveEvents.filter((ev) =>
          relatedCategoryList.some((relCat) => ev.category.trim().toLowerCase().includes(relCat))
        );
      }

      // If no related taxonomy matches, fall back to matching user_interest or remaining active events
      if (relatedEvents.length === 0) {
        relatedEvents = allActiveEvents.filter(
          (ev) =>
            ev.category.toLowerCase().includes(user_interest.toLowerCase()) ||
            user_interest.toLowerCase().includes(ev.category.toLowerCase())
        );
      }

      // If still empty, use all active events so the user still discovers real events
      if (relatedEvents.length === 0) {
        relatedEvents = allActiveEvents;
      }

      candidateEvents = relatedEvents;
      message = `No ${event_category} events are currently available.`;
    }

    // 3. Call ML Recommendation Service to calculate match scores
    let recommendations = [];
    try {
      const mlPayload = {
        user_interest,
        location,
        budget: numericBudget,
        event_category,
        events: candidateEvents.map((ev) => ({
          event_id: ev._id.toString(),
          name: ev.name,
          category: ev.category,
          location: ev.location,
          price: ev.price,
          popularity: ev.popularity || 50
        }))
      };

      const mlResponse = await axios.post(`${ML_SERVICE_URL}/recommend`, mlPayload, {
        timeout: 5000
      });

      const mlScores = mlResponse.data.recommendations || [];
      const scoreMap = new Map();
      mlScores.forEach((item) => {
        scoreMap.set(item.event_id, item.match_score);
      });

      // Merge match_score into the actual active MongoDB events
      recommendations = candidateEvents.map((ev) => {
        const score = scoreMap.get(ev._id.toString()) ?? 70.0;
        return {
          ...ev,
          match_score: score
        };
      });

      // Rank in descending order of match_score
      recommendations.sort((a, b) => b.match_score - a.match_score);
    } catch (mlErr) {
      console.warn(
        `ML Service call to ${ML_SERVICE_URL}/recommend failed or timed out (${mlErr.message}). Using fallback scoring.`
      );

      // Heuristic fallback matching so application stays resilient
      recommendations = candidateEvents.map((ev) => {
        let score = 55.0;
        if (ev.category.toLowerCase().includes(event_category.toLowerCase())) score += 25;
        if (ev.location.toLowerCase().includes(location.toLowerCase())) score += 15;
        if (ev.price <= numericBudget) score += 10;
        score += (ev.popularity || 50) / 10;
        score = Math.min(Math.max(score, 20), 98.5);

        return {
          ...ev,
          match_score: Math.round(score * 10) / 10
        };
      });

      recommendations.sort((a, b) => b.match_score - a.match_score);
    }

    return res.status(200).json({
      exact_match: isExactMatch,
      message,
      requested_category: event_category,
      recommendations
    });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return res.status(500).json({ error: 'Server error generating recommendations.' });
  }
});

module.exports = router;
