require('dotenv').config();
const dns = require('dns');
// Ensure reliable SRV resolution on Windows and ISP routers
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {
  console.warn('DNS server override warning:', e.message);
}

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const { router: eventRoutes, createEventHandler, updateEventHandler, deleteEventHandler } = require('./routes/eventRoutes');
const recommendationRoutes = require('./routes/recommendationRoutes');
const registrationRoutes = require('./routes/registrationRoutes');
const authMiddleware = require('./middleware/authMiddleware');
const adminMiddleware = require('./middleware/adminMiddleware');
const organizerMiddleware = require('./middleware/organizerMiddleware');
const { User, Event, Registration } = require('./models');
const { hashPassword } = require('./auth');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Request logger for debugging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Seed default accounts (admin)
const seedDefaultAccounts = async () => {
  try {
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@eventai.com').toLowerCase().trim();
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (!existingAdmin) {
      const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
      const passwordHash = await hashPassword(adminPassword);

      const adminUser = new User({
        name: process.env.ADMIN_NAME || 'System Administrator',
        email: adminEmail,
        passwordHash,
        role: 'admin'
      });

      await adminUser.save();
      console.log(`✓ Default administrator seeded: ${adminEmail}`);
    }
  } catch (err) {
    console.warn('Could not seed initial accounts:', err.message);
  }
};

// Cleanup routine: Remove default sample events without a createdBy field
const cleanDefaultUnassignedEvents = async () => {
  try {
    await Event.deleteMany({ createdBy: { $exists: false } });
    console.log('✓ Cleared unassigned default sample events.');
  } catch (err) {
    console.warn('Could not clean unassigned events:', err.message);
  }
};

// MongoDB connection with automatic local fallback support
const LOCAL_MONGODB_URI = 'mongodb://127.0.0.1:27017/event_recommendation_db';

const connectDB = async () => {
  const configuredUri = process.env.MONGODB_URI || LOCAL_MONGODB_URI;
  const isRemote = !configuredUri.includes('127.0.0.1') && !configuredUri.includes('localhost');

  if (isRemote) {
    try {
      console.log('Connecting to remote MongoDB Atlas cluster...');
      await mongoose.connect(configuredUri, { serverSelectionTimeoutMS: 5000 });
      console.log('✓ Successfully connected to MongoDB Atlas');
      await seedDefaultAccounts();
      await cleanDefaultUnassignedEvents();
      return;
    } catch (atlasErr) {
      console.warn(`⚠️ Could not connect to MongoDB Atlas (${atlasErr.message}).`);
      console.log(`🔄 Automatically falling back to local MongoDB (${LOCAL_MONGODB_URI})...`);
    }
  }

  try {
    const localUri = isRemote ? LOCAL_MONGODB_URI : configuredUri;
    await mongoose.connect(localUri, { serverSelectionTimeoutMS: 5000 });
    console.log(`✓ Successfully connected to MongoDB: ${localUri}`);
    await seedDefaultAccounts();
    await cleanDefaultUnassignedEvents();
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    console.error('Please ensure MongoDB is running (run: net start MongoDB) or check network access.');
  }
};

connectDB();


// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'AI Event Recommendation Backend',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date()
  });
});

// Database availability check: Fail-fast with clear 503 instead of buffering/hanging
app.use((req, res, next) => {
  if (req.path.startsWith('/api') && req.path !== '/api/health') {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: 'Database is initializing or currently unavailable. Please verify MongoDB service is running.'
      });
    }
  }
  next();
});

// Mount Routes according to Section 23 specifications

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api', registrationRoutes);

// Direct Admin event endpoints required by Section 23
app.get('/api/admin/events', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const events = await Event.find().sort({ createdAt: -1 });
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
    console.error('Error in /api/admin/events:', error);
    return res.status(500).json({ error: 'Server error fetching admin events.' });
  }
});
app.post('/api/admin/events', [authMiddleware, adminMiddleware], createEventHandler);
app.put('/api/admin/events/:id', [authMiddleware, adminMiddleware], updateEventHandler);
app.delete('/api/admin/events/:id', [authMiddleware, adminMiddleware], deleteEventHandler);

// Direct Admin User & Event Adder Management Endpoints
app.get('/api/admin/users', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: 'admin' } })
      .select('-passwordHash')
      .sort({ createdAt: -1 });
    return res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching admin users:', error);
    return res.status(500).json({ error: 'Server error fetching user list for admin.' });
  }
});

app.delete('/api/admin/users/:id', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const { id } = req.params;
    if (String(id) === String(req.user._id)) {
      return res.status(400).json({ error: 'Cannot delete current logged-in admin account.' });
    }
    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    return res.status(200).json({ message: `User account '${user.name}' (${user.email}) deleted successfully.` });
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({ error: 'Server error deleting user.' });
  }
});

// Event Manager / Organizer endpoints for Event Adding Page
app.get('/api/organizer/events', [authMiddleware, organizerMiddleware], async (req, res) => {
  try {
    let query = {};
    if (req.user.role !== 'admin') {
      // Event Adder strictly views only events created by their account
      query = { createdBy: req.user._id };
    }
    const events = await Event.find(query).sort({ createdAt: -1 });
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
    console.error('Error in /api/organizer/events:', error);
    return res.status(500).json({ error: 'Server error fetching organizer events.' });
  }
});

app.post('/api/organizer/events', [authMiddleware, organizerMiddleware], createEventHandler);
app.put('/api/organizer/events/:id', [authMiddleware, organizerMiddleware], updateEventHandler);
app.delete('/api/organizer/events/:id', [authMiddleware, organizerMiddleware], deleteEventHandler);

// Global 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Application Error:', err);
  res.status(500).json({ error: 'An unexpected internal server error occurred.' });
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`✓ AI Event Recommendation Backend running on port ${PORT}`);
  console.log(`✓ Health endpoint: http://localhost:${PORT}/api/health`);
  console.log(`=======================================================`);
});

module.exports = app;
