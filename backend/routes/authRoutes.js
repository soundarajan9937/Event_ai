const express = require('express');
const router = express.Router();
const { User } = require('../models');
const { hashPassword, comparePassword, generateToken } = require('../auth');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user (role can be 'user', 'organizer', or 'admin')
 * @access  Public
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, confirmPassword, role } = req.body;

    // Field validation
    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({ error: 'Please provide all required fields (name, email, password, confirmPassword).' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match. Please verify your password.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    // Email format validation
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email address already exists. Please log in.' });
    }

    // Determine assigned role
    let assignedRole = 'user';
    if (role === 'organizer' || role === 'event') {
      assignedRole = 'organizer';
    } else if (role === 'admin') {
      assignedRole = 'admin';
    }

    // Hash password & save user
    const passwordHash = await hashPassword(password);
    const newUser = new User({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: assignedRole
    });

    await newUser.save();

    return res.status(201).json({
      message: 'Account created successfully! Please log in to continue.',
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Server error during registration. Please try again later.' });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user, verify password, return JWT
 * @access  Public
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password, isEventLogin } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Please enter both email and password.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // If logging in through Event Adding Page, grant Event Adder ('organizer') role if user
    if (isEventLogin && user.role === 'user') {
      user.role = 'organizer';
      await user.save();
    }

    // Generate JWT
    const token = generateToken(user);

    return res.status(200).json({
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Server error during login. Please try again later.' });
  }
});

/**
 * @route   POST /api/auth/upgrade-role
 * @desc    Upgrade current logged in user account to Event Adder ('organizer')
 * @access  Private
 */
router.post('/upgrade-role', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    user.role = 'organizer';
    await user.save();

    const token = generateToken(user);

    return res.status(200).json({
      message: 'Account role upgraded to Event Adder successfully!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Role upgrade error:', error);
    return res.status(500).json({ error: 'Server error upgrading account role.' });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get currently logged in user profile
 * @access  Private
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    return res.status(200).json({
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        createdAt: req.user.createdAt
      }
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return res.status(500).json({ error: 'Server error fetching user profile.' });
  }
});

module.exports = router;
