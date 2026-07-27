const express = require('express');
const db = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

function parseJsonField(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return []; }
}

router.get('/', auth, async (req, res) => {
  try {
    const result = db.query(
      `SELECT m.id as match_id, m.matched_at,
              CASE WHEN m.user1_id = ? THEN m.user2_id ELSE m.user1_id END as other_user_id,
              p.first_name, p.last_name, p.photos, p.avatar_url,
              (SELECT content FROM messages WHERE match_id = m.id ORDER BY created_at DESC LIMIT 1) as last_message,
              (SELECT created_at FROM messages WHERE match_id = m.id ORDER BY created_at DESC LIMIT 1) as last_message_at,
              (SELECT COUNT(*) FROM messages WHERE match_id = m.id AND sender_id != ? AND is_read = 0) as unread_count
       FROM matches m
       JOIN profiles p ON (
         CASE WHEN m.user1_id = ? THEN m.user2_id ELSE m.user1_id END
       ) = p.user_id
       WHERE (m.user1_id = ? OR m.user2_id = ?)
         AND m.is_active = 1
       ORDER BY COALESCE(
         (SELECT created_at FROM messages WHERE match_id = m.id ORDER BY created_at DESC LIMIT 1),
         m.matched_at
       ) DESC`,
      [req.user.id, req.user.id, req.user.id, req.user.id, req.user.id]
    );

    result.rows.forEach(p => {
      p.photos = parseJsonField(p.photos);
    });

    res.json(result.rows);
  } catch (err) {
    console.error('Get matches error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/new', auth, async (req, res) => {
  try {
    const result = db.query(
      `SELECT m.id as match_id, m.matched_at,
              CASE WHEN m.user1_id = ? THEN m.user2_id ELSE m.user1_id END as other_user_id,
              p.first_name, p.photos, p.avatar_url
       FROM matches m
       JOIN profiles p ON (
         CASE WHEN m.user1_id = ? THEN m.user2_id ELSE m.user1_id END
       ) = p.user_id
       WHERE (m.user1_id = ? OR m.user2_id = ?)
         AND m.is_active = 1
         AND NOT EXISTS (
           SELECT 1 FROM messages WHERE match_id = m.id
         )
       ORDER BY m.matched_at DESC`,
      [req.user.id, req.user.id, req.user.id, req.user.id]
    );

    result.rows.forEach(p => {
      p.photos = parseJsonField(p.photos);
    });

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:matchId', auth, async (req, res) => {
  try {
    db.query(
      `UPDATE matches SET is_active = 0
       WHERE id = ? AND (user1_id = ? OR user2_id = ?)`,
      [req.params.matchId, req.user.id, req.user.id]
    );
    res.json({ message: 'Match removed' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
