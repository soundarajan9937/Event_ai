/**
 * eventSearch.test.js
 * -------------------
 * Unit and integration tests for Real Event Search filtering logic,
 * registration verification, and 12-step workflow adherence (Section 17).
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');

const {
  buildSearchQuery,
  parseEventDate,
  isEventInFuture,
  verifyRegistrationStatus,
  checkCityRelevance,
  removeDuplicates,
  sortEventsByDate,
  isHomepageOrUtilityLink,
  cleanTitle
} = require('../services/eventSearchService');

describe('Real Event Search Test Suite (Section 17 Requirements)', () => {
  // Reference date: October 11, 2026 (matching current environment)
  const referenceDate = new Date('2026-10-11T10:00:00.000Z');

  // ─── Test 1: Any supported city can be searched ──────────────────────────────
  it('1. Supports dynamic searching for any city worldwide', () => {
    const cities = ['Coimbatore', 'Chennai', 'Madurai', 'Bangalore', 'Mumbai', 'London'];
    cities.forEach(city => {
      const query = buildSearchQuery(city, 'Workshop');
      assert.ok(query.includes(city), `Query should contain city: ${city}`);
    });
  });

  // ─── Test 2: City and category search works ──────────────────────────────────
  it('2. Builds proper search query for City + Category', () => {
    const q1 = buildSearchQuery('Coimbatore', 'Workshop');
    assert.ok(q1.includes('Coimbatore') && q1.includes('Workshop'));

    const q2 = buildSearchQuery('Chennai', 'Music');
    assert.ok(q2.includes('Chennai') && q2.includes('Music'));
  });

  // ─── Test 3: City and custom keyword search works ────────────────────────────
  it('3. Builds proper search query for City + Custom Keyword', () => {
    const query = buildSearchQuery('Madurai', 'Cricket Tournament');
    assert.ok(query.includes('Madurai') && query.includes('Cricket Tournament'));
  });

  // ─── Test 4: All Events searches across categories ───────────────────────────
  it('4. Handles "All Events" by searching across categories', () => {
    const query = buildSearchQuery('Bangalore', 'All Events');
    assert.ok(query.includes('Bangalore') && query.includes('upcoming events in Bangalore'));
  });

  // ─── Test 5: Utility links and irrelevant webpages are excluded ──────────────
  it('5 & 16. Excludes homepage root links, PDF downloads, and utility pages', () => {
    assert.strictEqual(isHomepageOrUtilityLink('https://unstop.com'), true);
    assert.strictEqual(isHomepageOrUtilityLink('https://bookmyshow.com/careers'), true);
    assert.strictEqual(isHomepageOrUtilityLink('https://eventbrite.com/about'), true);
    assert.strictEqual(isHomepageOrUtilityLink('https://example.com/rules.pdf'), true);
    assert.strictEqual(isHomepageOrUtilityLink('https://insider.in/events/music-concert-coimbatore-oct-2026'), false);
  });

  // ─── Test 6: Duplicate events are removed ────────────────────────────────────
  it('6 & 19. Removes duplicate events with same normalized title or URL', () => {
    const candidate1 = {
      title: 'AI & Robotics Workshop 2026',
      link: 'https://townscript.com/e/ai-workshop-coimbatore-1',
      parsedDate: { startDate: new Date('2026-11-15T09:00:00Z') }
    };
    const candidate2 = {
      title: 'AI & Robotics Workshop 2026!',
      link: 'https://townscript.com/e/ai-workshop-coimbatore-1',
      parsedDate: { startDate: new Date('2026-11-15T09:00:00Z') }
    };
    const candidate3 = {
      title: 'Different Hackathon',
      link: 'https://unstop.com/hackathons/diff-hack',
      parsedDate: { startDate: new Date('2026-11-20T09:00:00Z') }
    };

    const deduped = removeDuplicates([candidate1, candidate2, candidate3]);
    assert.strictEqual(deduped.length, 2, 'Should remove duplicate event candidate');
  });

  // ─── Test 7: Past events are excluded ─────────────────────────────────────────
  it('7. Excludes past events (past year, past month in current year, past day)', () => {
    // Past year (2025)
    const pastYear = parseEventDate('September 20, 2025', '', referenceDate);
    assert.strictEqual(isEventInFuture(pastYear), false, 'Past year 2025 should be excluded');

    // Past month in current year 2026 (September 2026 when now is Oct 11, 2026)
    const pastMonth = parseEventDate('September 19-20, 2026', '', referenceDate);
    assert.strictEqual(isEventInFuture(pastMonth), false, 'September 2026 should be excluded');

    // Past day in current month (October 5, 2026 when now is Oct 11, 2026)
    const pastDay = parseEventDate('October 5, 2026', '', referenceDate);
    assert.strictEqual(isEventInFuture(pastDay), false, 'October 5, 2026 should be excluded');

    // Future date (November 15, 2026)
    const futureDate = parseEventDate('November 15, 2026', '', referenceDate);
    assert.strictEqual(isEventInFuture(futureDate), true, 'November 15, 2026 should be included');
  });

  // ─── Test 8: Events already in progress are excluded ──────────────────────────
  it('8. Excludes events that have ended or are currently in progress', () => {
    // An event that ran Oct 10 - Oct 11 and ended or is in progress
    const inProgress = parseEventDate('11 October 2026', '', new Date('2026-10-11T12:00:00Z'));
    assert.strictEqual(inProgress.isInProgress, true);
    assert.strictEqual(isEventInFuture(inProgress), false, 'In-progress event should be excluded');
  });

  // ─── Test 9: Cancelled events are excluded ────────────────────────────────────
  it('9. Excludes cancelled or indefinitely postponed events', () => {
    const cancelled = parseEventDate('Nov 20, 2026', 'Event cancelled due to unforeseen circumstances', referenceDate);
    assert.strictEqual(isEventInFuture(cancelled), false, 'Cancelled events must be excluded');
  });

  // ─── Test 10: Closed-registration events are excluded ─────────────────────────
  it('10. Excludes events where registration is closed', () => {
    const candidate = {
      title: 'Web Dev Workshop',
      description: 'Registration closed. All passes allocated.',
      link: 'https://example.com/event'
    };
    const regStatus = verifyRegistrationStatus(candidate);
    assert.strictEqual(regStatus.registrationVerified, false);
    assert.strictEqual(regStatus.registrationStatus, 'closed');
  });

  // ─── Test 11: Sold-out events are excluded ─────────────────────────────────────
  it('11. Excludes events that are sold out or housefull', () => {
    const candidate = {
      title: 'Rock Concert 2026',
      description: 'Tickets are completely sold out.',
      link: 'https://bookmyshow.com/concert'
    };
    const regStatus = verifyRegistrationStatus(candidate);
    assert.strictEqual(regStatus.registrationVerified, false);
    assert.strictEqual(regStatus.registrationStatus, 'closed');
  });

  // ─── Test 12: Expired registration deadlines are excluded ────────────────────
  it('12. Excludes events with expired registration deadlines', () => {
    const candidate = {
      title: 'Coding Championship',
      description: 'Registration deadline: October 5, 2026. Register now.',
      link: 'https://unstop.com/championship'
    };
    const regStatus = verifyRegistrationStatus(candidate);
    assert.strictEqual(regStatus.registrationVerified, false);
  });

  // ─── Test 13: Unverified registration status is excluded ─────────────────────
  it('13. Excludes events with unverified registration status', () => {
    const candidate = {
      title: 'General News Article about Future Trends',
      description: 'Discussion of upcoming technology conferences worldwide.',
      link: 'https://generic-news.com/tech-article'
    };
    const regStatus = verifyRegistrationStatus(candidate);
    assert.strictEqual(regStatus.registrationVerified, false);
    assert.strictEqual(regStatus.registrationStatus, 'unverified');
  });

  // ─── Test 14: Valid open registration is verified ────────────────────────────
  it('14. Confirms verified open registration for authorized ticket sources', () => {
    const candidate = {
      title: 'Tamil Nadu Music Festival',
      description: 'Book tickets online now. Entry passes available for upcoming musical night.',
      link: 'https://bookmyshow.com/events/music-fest/ET001',
      ticketInfo: 'BookMyShow, ₹499 onwards'
    };
    const regStatus = verifyRegistrationStatus(candidate);
    assert.strictEqual(regStatus.registrationVerified, true);
    assert.strictEqual(regStatus.registrationStatus, 'open');
  });

  // ─── Test 15: Invalid or missing dates are excluded ──────────────────────────
  it('15. Excludes candidate events with missing or ambiguous dates', () => {
    const noDate = parseEventDate('', 'A workshop with no specific date announced', referenceDate);
    assert.strictEqual(isEventInFuture(noDate), false);

    const relativeOnly = parseEventDate('', 'Article published 3 weeks ago', referenceDate);
    assert.strictEqual(isEventInFuture(relativeOnly), false);
  });

  // ─── Test 16: City relevance matches target city ─────────────────────────────
  it('16. Validates city relevance and rejects unrelated distant cities', () => {
    // Match Coimbatore
    const validCandidate = {
      title: 'AI Workshop Coimbatore',
      address: 'Coimbatore, Tamil Nadu',
      venue: 'PSG College of Technology',
      link: 'https://eventbrite.com/psg-ai'
    };
    assert.strictEqual(checkCityRelevance(validCandidate, 'Coimbatore'), true);

    // Unrelated city (Delhi when user searched Coimbatore)
    const unrelatedCandidate = {
      title: 'Delhi Tech Summit in Delhi',
      address: 'Delhi NCR, India',
      venue: 'Pragati Maidan',
      link: 'https://eventbrite.com/delhi-summit'
    };
    assert.strictEqual(checkCityRelevance(unrelatedCandidate, 'Coimbatore'), false);
  });

  // ─── Test 17: Sorting eligible events by upcoming date ───────────────────────
  it('17. Sorts eligible events in ascending chronological order', () => {
    const ev1 = { title: 'Later Event', parsedDate: { startDate: new Date('2026-12-01') } };
    const ev2 = { title: 'Earlier Event', parsedDate: { startDate: new Date('2026-10-25') } };
    const ev3 = { title: 'Middle Event', parsedDate: { startDate: new Date('2026-11-10') } };

    const sorted = sortEventsByDate([ev1, ev2, ev3]);
    assert.strictEqual(sorted[0].title, 'Earlier Event');
    assert.strictEqual(sorted[1].title, 'Middle Event');
    assert.strictEqual(sorted[2].title, 'Later Event');
  });

  // ─── Test 18: Title cleanup removes portal noise ─────────────────────────────
  it('18. Cleans portal prefixes and noise from event titles', () => {
    const clean = cleanTitle('Startup Conclave 2026 - BookMyShow');
    assert.strictEqual(clean, 'Startup Conclave 2026');
  });
});
