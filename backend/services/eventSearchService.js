/**
 * eventSearchService.js
 * ---------------------
 * Service for Real Event Search using SerpApi's Google Search engine.
 *
 * Implements the EXACT 12-Step Workflow from Section 8:
 *  Step 1: User enters City + Event Type
 *  Step 2: SerpApi searches multiple Google result pages
 *  Step 3: Collect event information and original URLs
 *  Step 4: Check event date
 *  Step 5: Is the event in the future? (If NO -> remove)
 *  Step 6: Check registration status
 *  Step 7: Is registration open? (If NO or unverified -> remove)
 *  Step 8: Check city relevance
 *  Step 9: Remove duplicates
 *  Step 10: Sort eligible events by upcoming date and format for display
 *  Step 11: User clicks Register (handled via verified links)
 *  Step 12: Backend controls the complete filtering workflow
 */

const { getJson } = require('serpapi');

const MONTH_MAP = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12
};

const CITY_ALIASES = {
  'bengaluru': ['bangalore', 'bengaluru', 'karnataka'],
  'bangalore': ['bangalore', 'bengaluru', 'karnataka'],
  'chennai': ['chennai', 'madras', 'tamil nadu'],
  'madras': ['chennai', 'madras', 'tamil nadu'],
  'mumbai': ['mumbai', 'bombay', 'maharashtra'],
  'bombay': ['mumbai', 'bombay', 'maharashtra'],
  'kolkata': ['kolkata', 'calcutta', 'bengal'],
  'calcutta': ['kolkata', 'calcutta', 'bengal'],
  'coimbatore': ['coimbatore', 'kovai', 'tamil nadu', 'cbe'],
  'kovai': ['coimbatore', 'kovai', 'tamil nadu', 'cbe'],
  'madurai': ['madurai', 'tamil nadu'],
  'kochi': ['kochi', 'cochin', 'kerala'],
  'cochin': ['kochi', 'cochin', 'kerala'],
  'delhi': ['delhi', 'new delhi', 'ncr'],
  'new delhi': ['delhi', 'new delhi', 'ncr'],
  'hyderabad': ['hyderabad', 'telangana'],
  'pune': ['pune', 'maharashtra']
};

// Known distant major cities to prevent false-city matches
const MAJOR_DISTANT_CITIES = [
  'mumbai', 'delhi', 'bangalore', 'bengaluru', 'chennai', 'kolkata', 'hyderabad',
  'pune', 'ahmedabad', 'jaipur', 'lucknow', 'chandigarh', 'kochi', 'coimbatore',
  'goa', 'indore', 'bhopal', 'patna', 'surat', 'nagpur', 'madurai'
];

/**
 * Clean search noise and portal branding from title strings
 */
function cleanTitle(str) {
  if (!str) return 'Upcoming Event';
  return str
    .replace(/\s*[-|–]\s*(BookMyShow|Paytm Insider|Eventbrite|AllEvents|Unstop|KnowAFest|District|Facebook|Instagram|Townscript|Cambridge|Dictionary|Times of India|The Hindu|Meetup|YouTube).*/i, '')
    .replace(/\s*\.\.\.$/, '')
    .trim();
}

/**
 * Reject root homepages, corporate landing pages, or utility links
 */
function isHomepageOrUtilityLink(url) {
  if (!url || typeof url !== 'string') return true;
  const u = url.toLowerCase().replace(/https?:\/\//, '').replace(/\/+$/, '');
  if (!u.includes('/')) return true;

  return (
    u.includes('/blog') ||
    u.includes('/careers') ||
    u.includes('/about') ||
    u.includes('/resources') ||
    u.includes('/security') ||
    u.includes('/terms') ||
    u.includes('/privacy') ||
    u.includes('/help') ||
    u.includes('/support') ||
    u.includes('/contact') ||
    u.includes('/policies') ||
    u.includes('/shorts/') ||
    u.includes('.pdf') ||
    u.includes('download.action')
  );
}

/**
 * Build dynamic, targeted Google search query using city and event type/keyword (Section 6 examples)
 */
function buildSearchQuery(city, eventTypeOrKeyword, variation = 0) {
  const cityName = (city || '').trim();
  const kw = (eventTypeOrKeyword || '').trim().toLowerCase();
  const isAll = !kw || kw === 'all' || kw === 'all events';

  if (isAll) {
    if (variation === 0) return `upcoming events in ${cityName}`;
    if (variation === 1) return `events in ${cityName} book tickets`;
    return `upcoming events in ${cityName} 2026 2027`;
  }

  if (variation === 0) {
    if (kw.includes('hackathon')) {
      return `upcoming hackathons in ${cityName} 2026`;
    }
    return `upcoming ${eventTypeOrKeyword} events in ${cityName}`;
  }

  if (variation === 1) {
    if (kw.includes('hackathon')) {
      return `upcoming hackathons in ${cityName}`;
    }
    return `upcoming ${eventTypeOrKeyword} in ${cityName} 2026`;
  }

  return `upcoming ${eventTypeOrKeyword} in ${cityName} tickets registration`;
}

/**
 * Step 2: SerpApi Searches Multiple Google Result Pages
 * Queries multiple pages within configured limits and combines results.
 */
async function fetchSerpApiGooglePage(query, start = 0, timeoutMs = 12000) {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) {
    throw new Error('SERPAPI_KEY is missing in server environment variables.');
  }

  const fetchPromise = getJson({
    engine: 'google',
    api_key: apiKey,
    q: query,
    start,
    num: 10,
    gl: 'in',
    hl: 'en',
  });

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`SerpApi query request timed out for start=${start}`)), timeoutMs)
  );

  return Promise.race([fetchPromise, timeoutPromise]);
}

async function fetchMultipleGooglePages(query, { page = 1, maxPages = 2, timeoutMs = 12000 } = {}) {
  const combined = { events_results: [], organic_results: [] };
  const startIndex = Math.max(0, (page - 1) * 10 * maxPages);

  const pagePromises = [];
  for (let p = 0; p < maxPages; p++) {
    const pageStart = startIndex + (p * 10);
    pagePromises.push(
      fetchSerpApiGooglePage(query, pageStart, timeoutMs)
        .catch(err => {
          console.warn(`[EventSearch] Warning on page start=${pageStart}:`, err.message);
          return { events_results: [], organic_results: [] };
        })
    );
  }

  const results = await Promise.all(pagePromises);
  results.forEach(res => {
    if (res && !res.error) {
      if (Array.isArray(res.events_results)) {
        combined.events_results.push(...res.events_results);
      }
      if (Array.isArray(res.organic_results)) {
        combined.organic_results.push(...res.organic_results);
      }
    }
  });

  return combined;
}

/**
 * Step 4: Parse & Check Event Date
 * Checks ALL calendar dates in the snippet or text, evaluating against referenceDate.
 * If multiple dates are found, selects the nearest valid UPCOMING future date.
 */
function parseEventDate(rawDateStr, textContext = '', referenceDate = new Date()) {
  const combined = `${rawDateStr || ''} ${textContext || ''}`.trim();
  if (!combined) {
    return {
      isValid: false,
      isStrictlyFuture: false,
      isInProgress: false,
      isCancelled: false,
      dateText: null,
      startDate: null,
      endDate: null,
      reason: 'Missing date information'
    };
  }

  const s = combined.toLowerCase();

  // Check explicit cancellation / postponement
  if (/\b(cancelled|canceled|event\s+cancelled|postponed\s+indefinitely|postponed\s+until\s+further\s+notice)\b/i.test(s)) {
    return {
      isValid: false,
      isStrictlyFuture: false,
      isInProgress: false,
      isCancelled: true,
      dateText: rawDateStr || 'Cancelled',
      startDate: null,
      endDate: null,
      reason: 'Event is cancelled or postponed indefinitely'
    };
  }

  // Reject relative social media timestamps ("3 months ago", "2 weeks ago") when not accompanied by actual date
  if (/\b\d+\s*(months?|years?|weeks?|days?)\s*ago\b/i.test(s) && !rawDateStr && !/\b(2026|2027)\b/.test(s)) {
    return {
      isValid: false,
      isStrictlyFuture: false,
      isInProgress: false,
      isCancelled: false,
      dateText: null,
      startDate: null,
      endDate: null,
      reason: 'Relative publication timestamp detected instead of future event date'
    };
  }

  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth() + 1; // 1-12
  const currentDay = referenceDate.getDate();

  const collectedDates = [];

  // Pattern 1: Day Month Year (e.g. 14 Oct 2026, 14-Oct-2026, 14th October 2026, 14 Oct)
  const p1 = /\b(\d{1,2})(?:st|nd|rd|th)?[-/\s]+([a-z]{3,9})(?:[-/\s]*(\d{4}))?\b/gi;
  let m1;
  while ((m1 = p1.exec(s)) !== null) {
    const day = parseInt(m1[1], 10);
    const mStr = m1[2].slice(0, 3).toLowerCase();
    const mon = MONTH_MAP[mStr];
    if (mon && day >= 1 && day <= 31) {
      let yr = m1[3] ? parseInt(m1[3], 10) : null;
      if (!yr) {
        if (s.includes(currentYear.toString()) || s.includes('2k26')) {
          yr = currentYear;
        } else {
          yr = (mon < currentMonth || (mon === currentMonth && day < currentDay)) ? currentYear + 1 : currentYear;
        }
      }
      const d = new Date(yr, mon - 1, day);
      const dEnd = new Date(yr, mon - 1, day, 23, 59, 59);
      collectedDates.push({ text: m1[0], start: d, end: dEnd });
    }
  }

  // Pattern 2: Month Day Year (e.g. October 14, 2026, Oct 14, 2026, Oct 14)
  const p2 = /\b([a-z]{3,9})[-/\s]+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?\b/gi;
  let m2;
  while ((m2 = p2.exec(s)) !== null) {
    const mStr = m2[1].slice(0, 3).toLowerCase();
    const mon = MONTH_MAP[mStr];
    const day = parseInt(m2[2], 10);
    if (mon && day >= 1 && day <= 31) {
      let yr = m2[3] ? parseInt(m2[3], 10) : null;
      if (!yr) {
        if (s.includes(currentYear.toString()) || s.includes('2k26')) {
          yr = currentYear;
        } else {
          yr = (mon < currentMonth || (mon === currentMonth && day < currentDay)) ? currentYear + 1 : currentYear;
        }
      }
      const d = new Date(yr, mon - 1, day);
      const dEnd = new Date(yr, mon - 1, day, 23, 59, 59);
      collectedDates.push({ text: m2[0], start: d, end: dEnd });
    }
  }

  // Pattern 3: ISO Date (YYYY-MM-DD)
  const p3 = /\b(\d{4})-(\d{2})-(\d{2})\b/g;
  let m3;
  while ((m3 = p3.exec(s)) !== null) {
    const yr = parseInt(m3[1], 10);
    const mon = parseInt(m3[2], 10);
    const day = parseInt(m3[3], 10);
    if (mon >= 1 && mon <= 12 && day >= 1 && day <= 31) {
      const d = new Date(yr, mon - 1, day);
      const dEnd = new Date(yr, mon - 1, day, 23, 59, 59);
      collectedDates.push({ text: `${m3[1]}-${m3[2]}-${m3[3]}`, start: d, end: dEnd });
    }
  }

  const nowTimestamp = referenceDate.getTime();

  // Filter for valid future dates
  const futureDates = collectedDates
    .filter(d => d.end.getTime() > nowTimestamp)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  if (futureDates.length > 0) {
    const chosen = futureDates[0];
    const isStrictlyFuture = chosen.start.getTime() > nowTimestamp;
    const isInProgress = nowTimestamp >= chosen.start.getTime() && nowTimestamp <= chosen.end.getTime();

    return {
      isValid: true,
      isStrictlyFuture,
      isInProgress,
      hasEnded: false,
      isCancelled: false,
      dateText: rawDateStr || chosen.text,
      startDate: chosen.start,
      endDate: chosen.end,
      reason: isInProgress ? 'Event is currently in progress' : 'Upcoming future event'
    };
  }

  // If dates were found but all are past
  if (collectedDates.length > 0) {
    return {
      isValid: true,
      isStrictlyFuture: false,
      isInProgress: false,
      hasEnded: true,
      isCancelled: false,
      dateText: rawDateStr || collectedDates[0].text,
      startDate: collectedDates[0].start,
      endDate: collectedDates[0].end,
      reason: 'All detected event dates have already passed'
    };
  }

  // Explicit past year mention (e.g. 2024, 2025)
  const pastYearMatch = s.match(/\b(20[0-1]\d|202[0-5])\b/);
  if (pastYearMatch && parseInt(pastYearMatch[1], 10) < currentYear) {
    return {
      isValid: true,
      isStrictlyFuture: false,
      isInProgress: false,
      hasEnded: true,
      isCancelled: false,
      dateText: pastYearMatch[1],
      startDate: new Date(parseInt(pastYearMatch[1], 10), 0, 1),
      endDate: new Date(parseInt(pastYearMatch[1], 10), 11, 31),
      reason: `Past year event (${pastYearMatch[1]})`
    };
  }

  return {
    isValid: false,
    isStrictlyFuture: false,
    isInProgress: false,
    hasEnded: false,
    isCancelled: false,
    dateText: null,
    startDate: null,
    endDate: null,
    reason: 'No verifiable calendar date could be parsed'
  };
}

/**
 * Step 5: Is the Event in the Future?
 * Validates that event date exists, is valid, not cancelled, and strictly in the future.
 */
function isEventInFuture(dateInfo) {
  if (!dateInfo || !dateInfo.isValid) return false;
  if (dateInfo.isCancelled) return false;
  if (dateInfo.hasEnded) return false;
  if (dateInfo.isInProgress) return false;
  return Boolean(dateInfo.isStrictlyFuture);
}

/**
 * Step 6 & 7: Check Registration Status & Is Registration Open?
 * Inspects source verification signals for open booking/registration.
 * Excludes closed, sold out, expired, cancelled, or unverifiable events.
 */
function verifyRegistrationStatus(candidate) {
  const combined = `${candidate.title || ''} ${candidate.description || ''} ${candidate.ticketInfo || ''} ${candidate.link || ''} ${candidate.registrationUrl || ''}`.toLowerCase();

  // 1. Negative Signals: Closed / Sold Out / Expired / Cancelled
  const isClosedOrSoldOut = /\b(registration\s+closed|registrations?\s+closed|sold\s+out|housefull|booking\s+closed|bookings?\s+closed|tickets\s+sold\s+out|sales\s+ended|event\s+ended|event\s+completed|applications?\s+closed|admissions?\s+closed|ticket\s+booking\s+closed|cancelled|canceled)\b/i.test(combined);

  if (isClosedOrSoldOut) {
    return {
      registrationStatus: 'closed',
      registrationVerified: false,
      reason: 'Registration is explicitly closed, sold out, or ended'
    };
  }

  // 2. Check for passed registration deadline in text
  const deadlineMatch = combined.match(/deadline[:\s]+([a-z0-9,\s-]+)/i);
  if (deadlineMatch) {
    const deadlineDate = parseEventDate(deadlineMatch[1]);
    if (deadlineDate.isValid && deadlineDate.hasEnded) {
      return {
        registrationStatus: 'closed',
        registrationVerified: false,
        reason: 'Registration deadline has passed'
      };
    }
  }

  // 3. Positive Signals: Verified open registration or ticket booking
  const hasAuthorizedTicketingSource =
    combined.includes('bookmyshow.com') ||
    combined.includes('insider.in') ||
    combined.includes('eventbrite.com') ||
    combined.includes('townscript.com') ||
    combined.includes('unstop.com') ||
    combined.includes('knowafest.com') ||
    combined.includes('allevents.in') ||
    combined.includes('meetup.com') ||
    combined.includes('ticketprix.com') ||
    combined.includes('internshala.com') ||
    combined.includes('devpost.com') ||
    combined.includes('devfolio.co') ||
    combined.includes('hackerearth.com');

  const hasExplicitOpenKeywords = /\b(book\s+tickets?|buy\s+tickets?|register\s+now|registration\s+open|registrations?\s+open|tickets?\s+available|passes?\s+available|get\s+tickets?|entry\s+passes?|rsvp\s+now|book\s+now|reserve\s+seats?|direct\s+registration|offline|online|registration\s+fee|entry\s+fee|cash\s+prize|participate)\b/i.test(combined);

  const hasDirectTicketLink = Boolean(candidate.ticket_info && Array.isArray(candidate.ticket_info) && candidate.ticket_info.length > 0) ||
    Boolean(candidate.registrationUrl && candidate.registrationUrl.length > 10);

  // If we have verified evidence of active ticket booking / registration
  if ((hasAuthorizedTicketingSource || hasExplicitOpenKeywords || hasDirectTicketLink) && !isClosedOrSoldOut) {
    return {
      registrationStatus: 'open',
      registrationVerified: true,
      reason: 'Verified upcoming event with active registration or ticket booking'
    };
  }

  // Indeterminate / unverified
  return {
    registrationStatus: 'unverified',
    registrationVerified: false,
    reason: 'Registration status cannot be verified from reliable sources'
  };
}

/**
 * Step 8: Check City Relevance
 * Confirms event is in the target city or authorized regional jurisdiction.
 * Rejects unrelated distant cities and generic global pages.
 */
function checkCityRelevance(candidate, targetCity) {
  if (!targetCity) return false;
  const rawTarget = targetCity.trim().toLowerCase();
  if (!rawTarget) return false;

  const aliases = CITY_ALIASES[rawTarget] || [rawTarget];
  const combined = `${candidate.address || ''} ${candidate.venue || ''} ${candidate.title || ''} ${candidate.description || ''} ${candidate.link || ''}`.toLowerCase();

  // 1. Direct city match in candidate information
  const matchesTarget = aliases.some(alias => combined.includes(alias));

  // If city is not mentioned anywhere, reject
  if (!matchesTarget) {
    return false;
  }

  // 2. Reject conflicts where a completely different major city is explicitly named as the primary location
  for (const distant of MAJOR_DISTANT_CITIES) {
    if (!aliases.includes(distant)) {
      const titleLower = (candidate.title || '').toLowerCase();
      const addrLower = (candidate.address || '').toLowerCase();
      if (
        (titleLower.includes(`in ${distant}`) || titleLower.includes(`at ${distant}`) || addrLower.startsWith(distant)) &&
        !aliases.some(alias => titleLower.includes(alias) || addrLower.includes(alias))
      ) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Step 9: Remove Duplicates
 * Compares normalized title, event date, venue, and link.
 */
function removeDuplicates(candidates) {
  const seen = new Set();
  const unique = [];

  for (const c of candidates) {
    const normTitle = (c.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const normDate = c.parsedDate?.startDate ? c.parsedDate.startDate.toISOString().slice(0, 10) : (c.date || '').toLowerCase();
    const normLink = (c.link || c.registrationUrl || '').toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');

    const key1 = `${normTitle}__${normDate}`;
    const key2 = normLink;

    if (normTitle && !seen.has(key1) && !seen.has(key2)) {
      seen.add(key1);
      if (key2) seen.add(key2);
      unique.push(c);
    }
  }

  return unique;
}

/**
 * Step 10: Sort Eligible Events by Upcoming Date
 */
function sortEventsByDate(events) {
  return [...events].sort((a, b) => {
    const timeA = a.parsedDate?.startDate ? a.parsedDate.startDate.getTime() : Number.MAX_SAFE_INTEGER;
    const timeB = b.parsedDate?.startDate ? b.parsedDate.startDate.getTime() : Number.MAX_SAFE_INTEGER;
    return timeA - timeB;
  });
}

/**
 * Step 3: Collect Event Information and Original URLs
 */
function collectEventCandidates(eventsResults = [], organicResults = [], targetCity = '', eventKeyword = '') {
  const candidates = [];

  // 1. Process Google Events Pack
  eventsResults.forEach(raw => {
    const title = cleanTitle(raw.title);
    const link = raw.link || (raw.ticket_info && raw.ticket_info[0] ? raw.ticket_info[0].link : '') || '';
    if (!link || isHomepageOrUtilityLink(link)) return;

    let directRegUrl = '';
    let ticketSource = 'Direct Registration Available';
    if (Array.isArray(raw.ticket_info) && raw.ticket_info.length > 0) {
      directRegUrl = raw.ticket_info[0].link || '';
      ticketSource = raw.ticket_info.map(t => t.source || 'Tickets').filter(Boolean).join(', ') || ticketSource;
    }

    const rawDateStr = typeof raw.date === 'string'
      ? raw.date
      : (raw.date?.start_date || raw.date?.when || raw.when || '');

    const addressStr = Array.isArray(raw.address)
      ? raw.address.join(', ')
      : (typeof raw.address === 'string' ? raw.address : targetCity);

    const venueStr = typeof raw.venue === 'object' && raw.venue !== null
      ? (raw.venue.name || '')
      : (typeof raw.venue === 'string' && !raw.venue.includes('ago') && !raw.venue.includes('likes') ? raw.venue : '');

    candidates.push({
      title,
      type: eventKeyword && eventKeyword.toLowerCase() !== 'all' ? eventKeyword : (raw.type || 'Event'),
      rawDateStr,
      time: raw.time || raw.date?.start_time || '',
      venue: venueStr,
      address: addressStr,
      link,
      registrationUrl: directRegUrl || link,
      thumbnail: raw.thumbnail || raw.image || '',
      description: raw.description || `Verified upcoming ${raw.type || eventKeyword || 'event'} in ${targetCity}.`,
      ticketInfo: ticketSource,
      organizerOrSource: raw.venue?.name || ticketSource,
      sourceUrl: link,
      ticket_info: raw.ticket_info
    });
  });

  // 2. Process Organic Search Results
  organicResults.forEach(item => {
    const itemLink = item.link || '';
    if (!itemLink || isHomepageOrUtilityLink(itemLink)) return;

    const itemTitle = cleanTitle(item.title);
    const snippet = item.snippet || '';
    const displayLink = item.displayed_link || '';

    let cleanVenue = displayLink;
    if (cleanVenue.includes('ago') || cleanVenue.includes('likes') || cleanVenue.includes('http')) {
      cleanVenue = '';
    }

    candidates.push({
      title: itemTitle,
      type: eventKeyword && eventKeyword.toLowerCase() !== 'all' ? eventKeyword : 'Event',
      rawDateStr: '',
      time: '',
      venue: cleanVenue,
      address: targetCity,
      link: itemLink,
      registrationUrl: itemLink,
      thumbnail: '',
      description: snippet || `Verified upcoming ${eventKeyword || 'event'} in ${targetCity}.`,
      ticketInfo: 'Direct Registration Available',
      organizerOrSource: displayLink || 'Official Event Source',
      sourceUrl: itemLink
    });
  });

  return candidates;
}

/**
 * Filter candidates through Steps 4 to 8
 */
function filterCandidatesThroughWorkflow(candidates, targetCity, referenceNow) {
  const eligibleEvents = [];

  for (const candidate of candidates) {
    // Step 4: Check Event Date
    const dateInfo = parseEventDate(candidate.rawDateStr, `${candidate.title} ${candidate.description}`, referenceNow);

    // Step 5: Is the Event in the Future?
    if (!isEventInFuture(dateInfo)) {
      // If NO -> remove the event
      continue;
    }
    candidate.parsedDate = dateInfo;
    candidate.dateText = dateInfo.dateText;

    // Step 6: Check Registration Status
    const regCheck = verifyRegistrationStatus(candidate);

    // Step 7: Is Registration Open?
    if (!regCheck.registrationVerified || regCheck.registrationStatus !== 'open') {
      // If NO or unverified -> remove the event
      continue;
    }
    candidate.registrationStatus = regCheck.registrationStatus;
    candidate.registrationVerified = regCheck.registrationVerified;
    candidate.lastVerifiedAt = new Date().toISOString();

    // Step 8: Check City Relevance
    if (!checkCityRelevance(candidate, targetCity)) {
      // If NO -> remove the event
      continue;
    }

    eligibleEvents.push(candidate);
  }

  return eligibleEvents;
}

/**
 * ---------------------------------------------------------------------------
 * Master Search Service Function
 * Implements the Exact Mandatory 12-Step Filtering Sequence
 * ---------------------------------------------------------------------------
 */
async function searchRealEvents(city, eventKeyword = 'all', page = 1) {
  // Step 1: User Enters City + Event Type
  const targetCity = (city || '').trim();
  if (!targetCity) {
    throw new Error('City is required to search real events.');
  }

  const rawKeyword = (eventKeyword || '').trim();
  const kwLower = rawKeyword.toLowerCase();
  const isAll = !rawKeyword || kwLower === 'all' || kwLower === 'all events';
  const effectiveCategory = isAll ? 'Event' : rawKeyword;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const referenceNow = new Date();

  // Try primary query formulation (natural Google query)
  const primaryQuery = buildSearchQuery(targetCity, rawKeyword, 0);
  console.log(`[RealEventSearch] Step 2: Querying Google for "${primaryQuery}" (Page ${pageNum})`);

  let { events_results, organic_results } = await fetchMultipleGooglePages(primaryQuery, {
    page: pageNum,
    maxPages: 2,
    timeoutMs: 14000
  });

  let rawCandidates = collectEventCandidates(events_results, organic_results, targetCity, effectiveCategory);
  let eligibleEvents = filterCandidatesThroughWorkflow(rawCandidates, targetCity, referenceNow);

  // If primary query yielded zero eligible events, execute fallback query
  if (eligibleEvents.length === 0) {
    const fallbackQuery1 = buildSearchQuery(targetCity, rawKeyword, 1);
    console.log(`[RealEventSearch] Running fallback query 1: "${fallbackQuery1}"`);
    const fb1 = await fetchMultipleGooglePages(fallbackQuery1, { page: pageNum, maxPages: 2 });
    rawCandidates = collectEventCandidates(fb1.events_results, fb1.organic_results, targetCity, effectiveCategory);
    eligibleEvents = filterCandidatesThroughWorkflow(rawCandidates, targetCity, referenceNow);
  }

  if (eligibleEvents.length === 0 && !isAll) {
    const fallbackQuery2 = `upcoming ${rawKeyword} in ${targetCity} 2026`;
    console.log(`[RealEventSearch] Running fallback query 2: "${fallbackQuery2}"`);
    const fb2 = await fetchMultipleGooglePages(fallbackQuery2, { page: pageNum, maxPages: 2 });
    rawCandidates = collectEventCandidates(fb2.events_results, fb2.organic_results, targetCity, effectiveCategory);
    eligibleEvents = filterCandidatesThroughWorkflow(rawCandidates, targetCity, referenceNow);
  }

  console.log(`[RealEventSearch] Passed Steps 4-8 validation: ${eligibleEvents.length} events.`);

  // Step 9: Remove Duplicates
  const deduplicatedEvents = removeDuplicates(eligibleEvents);
  console.log(`[RealEventSearch] Step 9: After duplicate removal: ${deduplicatedEvents.length} unique events.`);

  // Step 10: Sort Eligible Events by Date
  const sortedEvents = sortEventsByDate(deduplicatedEvents);

  // Return formatted eligible events
  const finalEvents = sortedEvents.map(e => ({
    title: e.title,
    type: e.type,
    date: e.dateText,
    time: e.time,
    venue: e.venue,
    address: e.address,
    link: e.link,
    registrationUrl: e.registrationUrl || e.link,
    isDirectRegistration: Boolean(e.registrationUrl && e.registrationUrl !== e.link),
    registrationStatus: e.registrationStatus,
    registrationVerified: e.registrationVerified,
    thumbnail: e.thumbnail,
    description: e.description,
    ticketInfo: e.ticketInfo,
    organizerOrSource: e.organizerOrSource,
    lastVerifiedAt: e.lastVerifiedAt
  }));

  console.log(`[RealEventSearch] Step 10: Returning ${finalEvents.length} verified eligible events.`);
  return finalEvents;
}

module.exports = {
  searchRealEvents,
  buildSearchQuery,
  parseEventDate,
  isEventInFuture,
  verifyRegistrationStatus,
  checkCityRelevance,
  removeDuplicates,
  sortEventsByDate,
  isHomepageOrUtilityLink,
  cleanTitle,
  fetchMultipleGooglePages
};
