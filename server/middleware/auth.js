const jwt = require('jsonwebtoken');
const db = require('../config/database');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '') || req.cookies?.token;

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = db.query('SELECT id, email, is_active FROM users WHERE id = ?', [decoded.userId]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (!result.rows[0].is_active) {
      return res.status(403).json({ error: 'Account deactivated' });
    }

    req.user = result.rows[0];

    // Track last active (throttled to every 60s)
    const now = Date.now();
    if (!req.user._lastActive || now - req.user._lastActive > 60000) {
      db.query('UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE id = ?', [req.user.id]);
      req.user._lastActive = now;
    }

    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = auth;
