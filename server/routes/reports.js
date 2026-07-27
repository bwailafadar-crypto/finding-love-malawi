const express = require('express');
const db = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const result = db.query('SELECT * FROM reports ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { reportedId, reason, description } = req.body;

    if (!reportedId || !reason) {
      return res.status(400).json({ error: 'Report reason required' });
    }

    db.query(
      'INSERT INTO reports (reporter_id, reported_id, reason, description) VALUES (?, ?, ?, ?)',
      [req.user.id, reportedId, reason, description || null]
    );

    res.status(201).json({ message: 'Report submitted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/block', auth, async (req, res) => {
  try {
    const { blockedId } = req.body;

    if (!blockedId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    db.query(
      'INSERT OR IGNORE INTO blocks (blocker_id, blocked_id) VALUES (?, ?)',
      [req.user.id, blockedId]
    );

    db.query(
      `UPDATE matches SET is_active = 0
       WHERE ((user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?))`,
      [req.user.id, blockedId, blockedId, req.user.id]
    );

    res.json({ message: 'User blocked' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/block/:blockedId', auth, async (req, res) => {
  try {
    db.query(
      'DELETE FROM blocks WHERE blocker_id = ? AND blocked_id = ?',
      [req.user.id, req.params.blockedId]
    );
    res.json({ message: 'User unblocked' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
