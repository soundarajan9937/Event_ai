const express = require('express');
const router = express.Router();
const { Event, Registration } = require('../models');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

/**
 * @route   GET /api/events
 * @desc    Get all active/current events (deadline in future, seats > 0)
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const { category, search, location } = req.query;
    const now = new Date();

    // Normal users ONLY see active events with future deadlines and available seats
    const query = {
      registrationDeadline: { $gt: now },
      seats: { $gt: 0 }
    };

    if (category && category !== 'All') {
      query.category = { $regex: new RegExp(`^${category}$`, 'i') };
    }

    if (location) {
      query.location = { $regex: new RegExp(location, 'i') };
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }

    const events = await Event.find(query).sort({ registrationDeadline: 1 });
    return res.status(200).json(events);
  } catch (error) {
    console.error('Error fetching active events:', error);
    return res.status(500).json({ error: 'Server error while fetching events.' });
  }
});

/**
 * @route   GET /api/events/:id
 * @desc    Get single event by ID with deadline and seat status
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    const now = new Date();
    const isDeadlinePassed = now >= new Date(event.registrationDeadline);
    const isFull = event.seats <= 0;

    return res.status(200).json({
      ...event.toObject(),
      isDeadlinePassed,
      isFull,
      isActive: !isDeadlinePassed && !isFull
    });
  } catch (error) {
    console.error('Error fetching event details:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ error: 'Event not found with provided ID.' });
    }
    return res.status(500).json({ error: 'Server error fetching event details.' });
  }
});

/**
 * ADMIN ENDPOINTS
 * Mounted under /api/admin/events or directly accessible with adminMiddleware
 */

/**
 * @route   GET /api/admin/events
 * @desc    Get all events (including expired and full) for Admin Dashboard
 * @access  Admin only
 */
router.get('/admin/all', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const events = await Event.find().sort({ createdAt: -1 });

    // Attach registration count to each event
    const eventsWithStats = await Promise.all(
      events.map(async (ev) => {
        const regCount = await Registration.countDocuments({ event: ev._id });
        const now = new Date();
        const isDeadlinePassed = now >= new Date(ev.registrationDeadline);
        return {
          ...ev.toObject(),
          registrationsCount: regCount,
          isDeadlinePassed,
          isFull: ev.seats <= 0
        };
      })
    );

    return res.status(200).json(eventsWithStats);
  } catch (error) {
    console.error('Error fetching admin events:', error);
    return res.status(500).json({ error: 'Server error fetching admin events.' });
  }
});

/**
 * @route   POST /api/admin/events
 * @desc    Create a new event
 * @access  Admin only
 */
const createEventHandler = async (req, res) => {
  try {
    const {
      name,
      category,
      date,
      time,
      location,
      venue,
      price,
      seats,
      members,
      registrationDeadline,
      description,
      imageUrl,
      scannerUrl
    } = req.body;

    // Validate required fields
    if (
      !name ||
      !category ||
      !date ||
      !time ||
      !location ||
      !venue ||
      price === undefined ||
      seats === undefined ||
      !registrationDeadline ||
      !description
    ) {
      return res.status(400).json({
        error: 'Please fill out all required fields: name, category, date, time, location, venue, price, seats, registrationDeadline, description.'
      });
    }

    if (Number(price) < 0) {
      return res.status(400).json({ error: 'Event price cannot be negative.' });
    }

    if (Number(seats) < 0) {
      return res.status(400).json({ error: 'Seats cannot be negative.' });
    }

    const deadlineDate = new Date(registrationDeadline);
    if (isNaN(deadlineDate.getTime())) {
      return res.status(400).json({ error: 'Invalid registration deadline date format.' });
    }

    if (deadlineDate <= new Date()) {
      return res.status(400).json({
        error: 'Registration deadline must be a future date and time. If set in the past, the event is immediately expired and will not appear on the user events page.'
      });
    }

    const newEvent = new Event({
      name: name.trim(),
      category: category.trim(),
      date,
      time: time.trim(),
      location: location.trim(),
      venue: venue.trim(),
      price: Number(price),
      seats: Number(seats),
      members: members ? String(members).trim() : '1',
      registrationDeadline: deadlineDate,
      description: description.trim(),
      imageUrl: imageUrl && imageUrl.trim() ? imageUrl.trim() : undefined,
      scannerUrl: scannerUrl && scannerUrl.trim() ? scannerUrl.trim() : undefined,
      popularity: 50,
      createdBy: req.user?._id
    });

    await newEvent.save();
    return res.status(201).json({
      message: 'Event created successfully!',
      event: newEvent
    });
  } catch (error) {
    console.error('Error creating event:', error);
    return res.status(500).json({ error: 'Server error while creating event.' });
  }
};

/**
 * @route   PUT /api/admin/events/:id
 * @desc    Update existing event
 * @access  Admin only
 */
const updateEventHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      category,
      date,
      time,
      location,
      venue,
      price,
      seats,
      members,
      registrationDeadline,
      description,
      imageUrl,
      popularity
    } = req.body;

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    if (name) event.name = name.trim();
    if (category) event.category = category.trim();
    if (date) event.date = date;
    if (time) event.time = time.trim();
    if (location) event.location = location.trim();
    if (venue) event.venue = venue.trim();
    if (price !== undefined) event.price = Number(price);
    if (seats !== undefined) event.seats = Number(seats);
    if (members !== undefined) event.members = String(members).trim();
    if (registrationDeadline) {
      const deadlineDate = new Date(registrationDeadline);
      if (isNaN(deadlineDate.getTime())) {
        return res.status(400).json({ error: 'Invalid registration deadline.' });
      }
      event.registrationDeadline = deadlineDate;
    }
    if (description) event.description = description.trim();
    if (imageUrl !== undefined) event.imageUrl = imageUrl.trim();
    if (scannerUrl !== undefined) event.scannerUrl = scannerUrl.trim();
    if (popularity !== undefined) event.popularity = Number(popularity);

    await event.save();
    return res.status(200).json({
      message: 'Event updated successfully!',
      event
    });
  } catch (error) {
    console.error('Error updating event:', error);
    return res.status(500).json({ error: 'Server error while updating event.' });
  }
};

/**
 * @route   DELETE /api/admin/events/:id
 * @desc    Delete event and remove related registrations
 * @access  Admin only
 */
const deleteEventHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    await Event.findByIdAndDelete(id);
    await Registration.deleteMany({ event: id });

    return res.status(200).json({
      message: `Event '${event.name}' and all associated registrations were deleted successfully.`
    });
  } catch (error) {
    console.error('Error deleting event:', error);
    return res.status(500).json({ error: 'Server error while deleting event.' });
  }
};

// Admin routes exposed on both /api/events/admin/* and /api/admin/events
router.post('/admin', [authMiddleware, adminMiddleware], createEventHandler);
router.put('/admin/:id', [authMiddleware, adminMiddleware], updateEventHandler);
router.delete('/admin/:id', [authMiddleware, adminMiddleware], deleteEventHandler);

module.exports = {
  router,
  createEventHandler,
  updateEventHandler,
  deleteEventHandler
};
