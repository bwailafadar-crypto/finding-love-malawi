const express = require('express');
const db = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    // Get unread messages count
    const unread = db.query(
      `SELECT m.match_id, COUNT(*) as count
       FROM messages m
       JOIN matches ma ON m.match_id = ma.id
       WHERE (ma.user1_id = ? OR ma.user2_id = ?)
         AND m.sender_id != ?
         AND m.is_read = 0
       GROUP BY m.match_id`,
      [req.user.id, req.user.id, req.user.id]
    );

    // Get new matches count (no messages exchanged)
    const newMatches = db.query(
      `SELECT COUNT(*) as count FROM matches m
       WHERE (m.user1_id = ? OR m.user2_id = ?)
         AND m.is_active = 1
         AND NOT EXISTS (SELECT 1 FROM messages WHERE match_id = m.id)`,
      [req.user.id, req.user.id]
    );

    // Get new likes count
    const likes = db.query(
      `SELECT COUNT(*) as count FROM swipes s
       WHERE s.swiped_id = ?
         AND s.action IN ('like', 'super_like')
         AND s.swiper_id NOT IN (
           SELECT swiped_id FROM swipes WHERE swiper_id = ?
         )`,
      [req.user.id, req.user.id]
    );

    const totalUnread = unread.rows.reduce((sum, r) => sum + r.count, 0);

    res.json({
      unreadMessages: totalUnread,
      newMatches: newMatches.rows[0]?.count || 0,
      newLikes: likes.rows[0]?.count || 0,
      total: totalUnread + (newMatches.rows[0]?.count || 0) + (likes.rows[0]?.count || 0),
      details: {
        messages: unread.rows,
        matches: newMatches.rows[0]?.count || 0,
        likes: likes.rows[0]?.count || 0,
      },
    });
  } catch (err) {
    console.error('Notifications error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
