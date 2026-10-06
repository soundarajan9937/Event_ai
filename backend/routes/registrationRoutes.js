const express = require('express');
const router = express.Router();
const { Registration, Event } = require('../models');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

/**
 * @route   POST /api/registrations
 * @desc    Register logged-in user for an event (enforces deadline & seat limits)
 * @access  Private (User/Admin)
 */
router.post('/registrations', authMiddleware, async (req, res) => {
  try {
    const { eventId, name, email, phone, members } = req.body;

    if (!eventId || !name || !email || !phone) {
      return res.status(400).json({
        error: 'Please provide all registration fields: eventId, name, email, phone.'
      });
    }

    // Phone basic validation
    const cleanPhone = phone.trim();
    if (cleanPhone.length < 7) {
      return res.status(400).json({ error: 'Please enter a valid phone number.' });
    }

    // Email validation
    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    // 1. Verify Event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    const now = new Date();

    // 2. Enforce Registration Deadline (Section 20)
    if (now >= new Date(event.registrationDeadline)) {
      return res.status(400).json({ error: 'Registration deadline has passed.' });
    }

    // 3. Enforce Seat Capacity (Section 21)
    if (event.seats <= 0) {
      return res.status(400).json({ error: 'Event is full.' });
    }

    // 4. Prevent Duplicate Registrations (Section 18 & 27)
    const existingRegistration = await Registration.findOne({
      user: req.user._id,
      event: eventId
    });

    if (existingRegistration) {
      return res.status(400).json({
        error: 'You have already registered for this event.'
      });
    }

    // 5. Atomically decrement seats by 1 and increase popularity
    const updatedEvent = await Event.findOneAndUpdate(
      {
        _id: eventId,
        seats: { $gt: 0 },
        registrationDeadline: { $gt: now }
      },
      {
        $inc: { seats: -1, popularity: 2 }
      },
      { new: true }
    );

    if (!updatedEvent) {
      // Re-check why atomic update failed
      const freshEvent = await Event.findById(eventId);
      if (!freshEvent || freshEvent.seats <= 0) {
        return res.status(400).json({ error: 'Event is full.' });
      }
      return res.status(400).json({ error: 'Registration deadline has passed.' });
    }

    // 6. Create Registration Record (starts as 'pending' for organizer/event adder confirmation)
    const registration = new Registration({
      user: req.user._id,
      event: eventId,
      name: name.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      members: members ? String(members).trim() : (event.members || '1'),
      status: 'pending'
    });

    await registration.save();

    return res.status(201).json({
      message: 'Registration submitted successfully! Your registration is currently pending approval by the event manager.',
      registration,
      remainingSeats: updatedEvent.seats
    });
  } catch (error) {
    console.error('Registration processing error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        error: 'You have already registered for this event.'
      });
    }
    return res.status(500).json({ error: 'Server error processing registration.' });
  }
});

/**
 * @route   GET /api/my-registrations
 * @desc    Get all registrations of the currently logged-in user
 * @access  Private
 */
router.get('/my-registrations', authMiddleware, async (req, res) => {
  try {
    const registrations = await Registration.find({ user: req.user._id })
      .populate('event')
      .sort({ registeredAt: -1 });

    return res.status(200).json(registrations);
  } catch (error) {
    console.error('Error fetching user registrations:', error);
    return res.status(500).json({ error: 'Server error fetching your registrations.' });
  }
});

/**
 * @route   GET /api/admin/registrations
 * @desc    Get all registrations across all events for Admin Dashboard
 * @access  Admin only
 */
router.get('/admin/registrations', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const registrations = await Registration.find()
      .populate('user', 'name email role')
      .populate('event', 'name category date time location venue price members')
      .sort({ registeredAt: -1 });

    return res.status(200).json(registrations);
  } catch (error) {
    console.error('Error fetching admin registrations:', error);
    return res.status(500).json({ error: 'Server error fetching registrations for admin.' });
  }
});

/**
 * @route   GET /api/organizer/registrations
 * @desc    Get registrations for events managed/added by the logged-in Event Manager
 * @access  Organizer / Event Adder / Admin
 */
router.get('/organizer/registrations', authMiddleware, async (req, res) => {
  try {
    let eventQuery = {};
    if (req.user.role !== 'admin') {
      // Get events created by this organizer or find all events if createdBy is not filtered strictly
      const myEvents = await Event.find({ createdBy: req.user._id }).select('_id');
      const eventIds = myEvents.map((e) => e._id);
      eventQuery = { event: { $in: eventIds } };
    }

    const registrations = await Registration.find(eventQuery)
      .populate('user', 'name email role')
      .populate('event', 'name category date time location venue price members createdBy')
      .sort({ registeredAt: -1 });

    return res.status(200).json(registrations);
  } catch (error) {
    console.error('Error fetching organizer registrations:', error);
    return res.status(500).json({ error: 'Server error fetching registrations.' });
  }
});

/**
 * @route   PUT /api/registrations/:id/status
 * @desc    Approve / Reject / Update status of a registration (pending -> confirmed / cancelled)
 *          When rejecting, an optional rejectionReason can be provided and is stored + shown to the user.
 * @access  Organizer / Admin
 */
router.put('/registrations/:id/status', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    if (!status || !['pending', 'confirmed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be pending, confirmed, or cancelled.' });
    }

    const registration = await Registration.findById(id).populate('event');
    if (!registration) {
      return res.status(404).json({ error: 'Registration record not found.' });
    }

    registration.status = status;

    // Store rejection reason when cancelling; clear it when approving
    if (status === 'cancelled') {
      registration.rejectionReason = (rejectionReason || '').trim();
    } else if (status === 'confirmed') {
      registration.rejectionReason = '';
    }

    await registration.save();

    return res.status(200).json({
      message: `Registration status successfully updated to '${status}'.`,
      registration
    });
  } catch (error) {
    console.error('Error updating registration status:', error);
    return res.status(500).json({ error: 'Server error updating registration status.' });
  }
});

module.exports = router;

