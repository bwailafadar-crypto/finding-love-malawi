const express = require('express');
const db = require('../config/database');
const auth = require('../middleware/auth');
const pushService = require('../services/push');

const router = express.Router();

function parseJsonField(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return []; }
}

router.get('/discover', auth, async (req, res) => {
  try {
    const profile = db.query('SELECT * FROM profiles WHERE user_id = ?', [req.user.id]);
    if (profile.rows.length === 0) {
      return res.status(400).json({ error: 'Complete your profile first' });
    }

    const p = profile.rows[0];
    const ageMin = p.age_min || 18;
    const ageMax = p.age_max || 50;

    const blockList = db.query(
      'SELECT blocked_id as id FROM blocks WHERE blocker_id = ? UNION SELECT blocker_id as id FROM blocks WHERE blocked_id = ?',
      [req.user.id, req.user.id]
    );
    const blockedIds = blockList.rows.map(r => r.id);

    let genderFilter = '';
    let genderParams = [];
    if (p.looking_for === 'men') { genderFilter = 'AND p.gender = ?'; genderParams = ['male']; }
    else if (p.looking_for === 'women') { genderFilter = 'AND p.gender = ?'; genderParams = ['female']; }

    const minDate = new Date();
    minDate.setFullYear(minDate.getFullYear() - ageMax - 1);
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() - ageMin);

    const result = db.query(
      `SELECT p.user_id, p.first_name, p.last_name, p.date_of_birth, p.gender,
              p.bio, p.occupation, p.photos, p.avatar_url, p.location_name,
              p.is_verified, p.interests, p.height, p.prompts,
              u.last_active,
              CASE WHEN u.boost_active = 1 AND u.boost_expires > datetime('now') THEN 1 ELSE 0 END as is_boosted
       FROM profiles p
       JOIN users u ON p.user_id = u.id
       WHERE p.user_id != ?
         AND u.is_active = 1
         AND p.photos != '[]'
         AND p.date_of_birth <= ?
         AND p.date_of_birth >= ?
         ${genderFilter}
         AND p.user_id NOT IN (
           SELECT swiped_id FROM swipes WHERE swiper_id = ?
           UNION
           SELECT blocked_id FROM blocks WHERE blocker_id = ?
           UNION
           SELECT blocker_id FROM blocks WHERE blocked_id = ?
         )
       ORDER BY is_boosted DESC, RANDOM()
       LIMIT 20`,
      [req.user.id, maxDate.toISOString().split('T')[0], minDate.toISOString().split('T')[0], ...genderParams, req.user.id, req.user.id, req.user.id]
    );

    const profiles = result.rows.map(p => {
      const age = p.date_of_birth ? Math.floor((Date.now() - new Date(p.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null;
      return {
        ...p,
        id: p.user_id,
        name: p.first_name,
        age,
        location: p.location_name,
        photos: parseJsonField(p.photos),
        interests: parseJsonField(p.interests),
      };
    });

    res.json(profiles);
  } catch (err) {
    console.error('Discover error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { swipedId, action } = req.body;

    const validActions = ['like', 'dislike', 'super_like', 'boost'];
    if (!swipedId || !validActions.includes(action)) {
      return res.status(400).json({ error: 'Invalid swipe data' });
    }

    const existing = db.query(
      'SELECT id FROM swipes WHERE swiper_id = ? AND swiped_id = ?',
      [req.user.id, swipedId]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Already swiped on this user' });
    }

    // Boost: just activate boost for 30 min, don't create a swipe
    if (action === 'boost') {
      db.query(
        'UPDATE users SET boost_active = 1, boost_expires = datetime("now", "+30 minutes") WHERE id = ?',
        [req.user.id]
      );
      return res.json({ isMatch: false, action: 'boost', boosted: true });
    }

    db.query(
      'INSERT INTO swipes (swiper_id, swiped_id, action) VALUES (?, ?, ?)',
      [req.user.id, swipedId, action === 'dislike' ? 'dislike' : action]
    );

    if (action === 'super_like') {
      db.query(
        'INSERT OR IGNORE INTO super_likes (sender_id, receiver_id) VALUES (?, ?)',
        [req.user.id, swipedId]
      );
    }

    let isMatch = false;
    let matchedUser = null;
    if (action === 'like' || action === 'super_like') {
      const reverseSwipe = db.query(
        'SELECT id FROM swipes WHERE swiper_id = ? AND swiped_id = ? AND action IN (?, ?)',
        [swipedId, req.user.id, 'like', 'super_like']
      );

      if (reverseSwipe.rows.length > 0) {
        const minId = Math.min(req.user.id, swipedId);
        const maxId = Math.max(req.user.id, swipedId);
        const existingMatch = db.query(
          'SELECT id FROM matches WHERE user1_id = ? AND user2_id = ?',
          [minId, maxId]
        );

        if (existingMatch.rows.length === 0) {
          db.query(
            'INSERT INTO matches (user1_id, user2_id) VALUES (?, ?)',
            [minId, maxId]
          );
          isMatch = true;

          const swiperProfile = db.query('SELECT first_name FROM profiles WHERE user_id = ?', [req.user.id]);
          const swipedProfile = db.query('SELECT first_name FROM profiles WHERE user_id = ?', [swipedId]);
          const swiperName = swiperProfile.rows[0]?.first_name || 'Someone';
          const swipedName = swipedProfile.rows[0]?.first_name || 'Someone';

          pushService.sendPush(swipedId, "It's a Match! 🎉", `You matched with ${swiperName}!`, '/matches').catch(() => {});
          pushService.sendPush(req.user.id, "It's a Match! 🎉", `You matched with ${swipedName}!`, '/matches').catch(() => {});

          // Get matched user info for the popup
          const matched = db.query(
            `SELECT p.first_name, p.photos, p.user_id
             FROM profiles p WHERE p.user_id = ?`,
            [swipedId]
          );
          if (matched.rows.length > 0) {
            const mp = matched.rows[0];
            matchedUser = {
              id: mp.user_id,
              name: mp.first_name,
              photos: parseJsonField(mp.photos),
            };
          }
        }
      }
    }

    res.json({ isMatch, action, matchedUser });
  } catch (err) {
    console.error('Swipe error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/likes', auth, async (req, res) => {
  try {
    const result = db.query(
      `SELECT u.id, p.first_name, p.last_name, p.photos, p.avatar_url,
              p.date_of_birth, p.location_name
       FROM swipes s
       JOIN users u ON s.swiper_id = u.id
       JOIN profiles p ON s.swiper_id = p.user_id
       WHERE s.swiped_id = ? AND s.action IN ('like', 'super_like')
         AND s.swiper_id NOT IN (
           SELECT swiped_id FROM swipes WHERE swiper_id = ?
         )
       ORDER BY s.created_at DESC`,
      [req.user.id, req.user.id]
    );

    result.rows.forEach(p => {
      p.photos = parseJsonField(p.photos);
      p.name = p.first_name;
      p.age = p.date_of_birth ? Math.floor((Date.now() - new Date(p.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null;
      p.location = p.location_name;
    });

    res.json(result.rows);
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/rewind', auth, async (req, res) => {
  try {
    const lastSwipe = db.query(
      'DELETE FROM swipes WHERE id = (SELECT id FROM swipes WHERE swiper_id = ? ORDER BY created_at DESC LIMIT 1) RETURNING *',
      [req.user.id]
    );

    if (lastSwipe.rows.length === 0) {
      return res.status(400).json({ error: 'No swipes to rewind' });
    }

    res.json({ message: 'Swipe rewound', swipedId: lastSwipe.rows[0].swiped_id });
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
