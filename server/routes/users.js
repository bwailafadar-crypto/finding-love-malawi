const express = require('express');
const db = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

function parseJsonField(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return []; }
}

// GET /api/users/online — all active users with profiles
router.get('/online', auth, async (req, res) => {
  try {
    const result = db.query(
      `SELECT u.id, u.last_active,
              p.first_name, p.last_name, p.photos, p.avatar_url,
              p.date_of_birth, p.gender, p.location_name, p.bio,
              p.occupation, p.is_verified
       FROM users u
       JOIN profiles p ON u.id = p.user_id
       WHERE u.id != ? AND u.is_active = 1
         AND u.id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = ?)
         AND u.id NOT IN (SELECT blocker_id FROM blocks WHERE blocked_id = ?)
       ORDER BY u.last_active DESC
       LIMIT 100`,
      [req.user.id, req.user.id, req.user.id]
    );

    const users = result.rows.map(u => {
      const photos = parseJsonField(u.photos);
      const age = u.date_of_birth
        ? Math.floor((Date.now() - new Date(u.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : null;
      const lastActive = u.last_active ? new Date(u.last_active).getTime() : 0;
      const isOnline = lastActive > Date.now() - 5 * 60 * 1000;
      return {
        id: u.id,
        firstName: u.first_name,
        lastName: u.last_name,
        photos,
        avatarUrl: u.avatar_url,
        age,
        gender: u.gender,
        location: u.location_name,
        bio: u.bio,
        occupation: u.occupation,
        isVerified: !!u.is_verified,
        isOnline,
        lastActive: u.last_active,
      };
    });

    res.json(users);
  } catch (err) {
    console.error('Get online users error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
