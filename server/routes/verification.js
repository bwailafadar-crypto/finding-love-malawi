const express = require('express');
const db = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

// Pose challenges for verification
const POSES = [
  { id: 'peace', instruction: 'Make a peace sign', emoji: '\u270C\uFE0F' },
  { id: 'wave', instruction: 'Wave at the camera', emoji: '\u{1F44B}' },
  { id: 'smile', instruction: 'Give your biggest smile', emoji: '\u{1F604}' },
  { id: 'wink', instruction: 'Wink at the camera', emoji: '\u{1F609}' },
  { id: 'thumbs', instruction: 'Give a thumbs up', emoji: '\u{1F44D}' },
];

router.get('/challenge', auth, (req, res) => {
  const pose = POSES[Math.floor(Math.random() * POSES.length)];
  res.json({ challenge: pose, expiresIn: 30 });
});

router.post('/submit', auth, async (req, res) => {
  try {
    const { photoUrl, challengeId } = req.body;
    if (!photoUrl || !challengeId) {
      return res.status(400).json({ error: 'Photo and challenge required' });
    }

    // In production, this would use AI/ML to verify:
    // 1. Face matches profile photos
    // 2. Person is making the correct pose
    // 3. Photo is a real selfie (not a screenshot)

    // For demo, we auto-verify
    db.query('UPDATE profiles SET is_verified = 1, verification_photo = ? WHERE user_id = ?', [photoUrl, req.user.id]);
    db.query('UPDATE users SET is_verified = 1 WHERE id = ?', [req.user.id]);

    res.json({ verified: true, message: 'Profile verified!' });
  } catch (err) {
    console.error('Verification error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/status', auth, async (req, res) => {
  try {
    const result = db.query('SELECT is_verified FROM profiles WHERE user_id = ?', [req.user.id]);
    res.json({ verified: result.rows[0]?.is_verified === 1 });
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
