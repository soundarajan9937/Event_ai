/**
 * Middleware to enforce Event Organizer / Event Manager authorization.
 * Must be executed AFTER authMiddleware so req.user is populated.
 * Permits users with role 'organizer', 'event', or 'admin'.
 */
const organizerMiddleware = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const role = req.user.role;
  if (role !== 'organizer' && role !== 'event' && role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: Event Manager privileges are required.' });
  }

  next();
};

module.exports = organizerMiddleware;
