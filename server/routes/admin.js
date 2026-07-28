const express = require('express');
const db = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

// Admin middleware (simple role check)
const adminOnly = (req, res, next) => {
  if (req.user.id !== 1) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

router.get('/users', auth, adminOnly, async (req, res) => {
  try {
    const result = db.query(
      `SELECT u.id, u.email, u.is_active, u.created_at,
              p.first_name, p.last_name, p.is_verified
       FROM users u
       LEFT JOIN profiles p ON u.id = p.user_id
       ORDER BY u.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/ban/:userId', auth, adminOnly, async (req, res) => {
  try {
    db.query('UPDATE users SET is_active = 0 WHERE id = ? AND id != 1', [req.params.userId]);
    res.json({ message: 'User banned' });
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/unban/:userId', auth, adminOnly, async (req, res) => {
  try {
    db.query('UPDATE users SET is_active = 1 WHERE id = ?', [req.params.userId]);
    res.json({ message: 'User unbanned' });
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/resolve-report/:reportId', auth, adminOnly, async (req, res) => {
  try {
    db.query('UPDATE reports SET status = ? WHERE id = ?', ['resolved', req.params.reportId]);
    res.json({ message: 'Report resolved' });
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all reports
router.get('/reports', auth, adminOnly, async (req, res) => {
  try {
    const result = db.query(
      'SELECT * FROM reports ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
