const express = require('express');
const db = require('../config/database');
const auth = require('../middleware/auth');
const { sanitizeString, isPositiveInt } = require('../middleware/validation');

const router = express.Router();

function parseJsonField(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return []; }
}

router.get('/me', auth, async (req, res) => {
  try {
    const result = db.query(
      `SELECT p.*, s.plan FROM profiles p
       LEFT JOIN subscriptions s ON p.user_id = s.user_id AND s.is_active = 1
       WHERE p.user_id = ?`,
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    const p = result.rows[0];
    p.photos = parseJsonField(p.photos);
    p.interests = parseJsonField(p.interests);
    p.languages = parseJsonField(p.languages);
    res.json(p);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/me', auth, async (req, res) => {
  try {
    const {
      firstName, lastName, bio, occupation, education, height,
      interests, languages, religion, lifestyle, locationName,
      latitude, longitude, maxDistance, ageMin, ageMax, lookingFor, photos
    } = req.body;

    // Sanitize string inputs
    const cleanBio = bio ? sanitizeString(bio).substring(0, 1000) : null;
    const cleanFirstName = firstName ? sanitizeString(firstName).substring(0, 50) : null;
    const cleanLastName = lastName ? sanitizeString(lastName).substring(0, 50) : null;
    const cleanOccupation = occupation ? sanitizeString(occupation).substring(0, 100) : null;
    const cleanEducation = education ? sanitizeString(education).substring(0, 100) : null;

    // Validate numeric fields
    if (ageMin && (ageMin < 18 || ageMin > 100)) return res.status(400).json({ error: 'Invalid age preference' });
    if (ageMax && (ageMax < 18 || ageMax > 100)) return res.status(400).json({ error: 'Invalid age preference' });
    if (maxDistance && (maxDistance < 1 || maxDistance > 500)) return res.status(400).json({ error: 'Invalid distance' });
    if (height && (height < 100 || height > 250)) return res.status(400).json({ error: 'Invalid height' });
    if (lookingFor && !['men', 'women', 'everyone'].includes(lookingFor)) {
      return res.status(400).json({ error: 'Invalid looking_for value' });
    }

    // Validate interests array
    if (interests && (!Array.isArray(interests) || interests.length > 20)) {
      return res.status(400).json({ error: 'Interests must be an array with max 20 items' });
    }

    // Validate photos array
    if (photos && (!Array.isArray(photos) || photos.length > 9)) {
      return res.status(400).json({ error: 'Photos must be an array with max 9 items' });
    }

    const result = db.query(
      `UPDATE profiles SET
        first_name = COALESCE(?, first_name),
        last_name = COALESCE(?, last_name),
        bio = COALESCE(?, bio),
        occupation = COALESCE(?, occupation),
        education = COALESCE(?, education),
        height = COALESCE(?, height),
        interests = COALESCE(?, interests),
        languages = COALESCE(?, languages),
        religion = COALESCE(?, religion),
        lifestyle = COALESCE(?, lifestyle),
        location_name = COALESCE(?, location_name),
        latitude = COALESCE(?, latitude),
        longitude = COALESCE(?, longitude),
        max_distance = COALESCE(?, max_distance),
        age_min = COALESCE(?, age_min),
        age_max = COALESCE(?, age_max),
        looking_for = COALESCE(?, looking_for),
        photos = COALESCE(?, photos),
        updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ?
       RETURNING *`,
      [
        cleanFirstName, cleanLastName, cleanBio, cleanOccupation, cleanEducation, height,
        interests ? JSON.stringify(interests) : null,
        languages ? JSON.stringify(languages) : null,
        religion,
        lifestyle ? JSON.stringify(lifestyle) : null,
        locationName, latitude, longitude, maxDistance, ageMin, ageMax, lookingFor,
        photos ? JSON.stringify(photos) : null,
        req.user.id
      ]
    );

    const p = result.rows[0];
    if (!p) return res.status(404).json({ error: 'Profile not found. Complete onboarding first.' });
    p.photos = parseJsonField(p.photos);
    p.interests = parseJsonField(p.interests);
    p.languages = parseJsonField(p.languages);
    res.json(p);
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/photos', auth, async (req, res) => {
  try {
    const { photos } = req.body;
    if (!photos || !Array.isArray(photos)) {
      return res.status(400).json({ error: 'Photos array required' });
    }

    // Limit photo count
    if (photos.length > 9) {
      return res.status(400).json({ error: 'Maximum 9 photos allowed' });
    }

    // Validate each photo URL
    for (const photo of photos) {
      if (typeof photo !== 'string' || photo.length > 2000) {
        return res.status(400).json({ error: 'Invalid photo URL' });
      }
    }

    const result = db.query(
      'UPDATE profiles SET photos = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? RETURNING photos',
      [JSON.stringify(photos), req.user.id]
    );

    res.json({ photos: parseJsonField(result.rows[0]?.photos) });
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:userId', auth, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId) || userId <= 0) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const result = db.query(
      `SELECT p.first_name, p.last_name, p.date_of_birth, p.gender,
              p.bio, p.occupation, p.education, p.height, p.interests,
              p.languages, p.religion, p.photos, p.avatar_url,
              p.location_name, p.is_verified, p.user_id
       FROM profiles p
       WHERE p.user_id = ?`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const p = result.rows[0];
    p.photos = parseJsonField(p.photos);
    p.interests = parseJsonField(p.interests);
    res.json(p);
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
