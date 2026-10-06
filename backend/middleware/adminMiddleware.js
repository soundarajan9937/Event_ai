/**
 * Middleware to enforce administrator authorization.
 * Must be executed AFTER authMiddleware so req.user is populated.
 */
const adminMiddleware = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: Administrator privileges are required.' });
  }

  next();
};

module.exports = adminMiddleware;
