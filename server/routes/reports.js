const express = require('express');
const db = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const result = db.query('SELECT * FROM reports WHERE reporter_id = ? ORDER BY created_at DESC', [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error:', err.message);
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
    console.error('Error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/block', auth, async (req, res) => {
  try {
    const { blockedId } = req.body;

    if (!blockedId) return res.status(400).json({ error: 'User ID required' });
    if (parseInt(blockedId) === req.user.id) return res.status(400).json({ error: 'Cannot block yourself' });

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
    console.error('Error:', err.message);
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
    console.error('Error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
