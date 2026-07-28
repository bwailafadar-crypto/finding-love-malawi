const express = require('express');
const db = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

// Get stories feed (all active stories from users, ordered by most recent)
router.get('/', auth, async (req, res) => {
  try {
    const result = db.query(
      `SELECT s.*, u.id as user_id, p.first_name, p.photos,
              CASE WHEN sv.id IS NOT NULL THEN 1 ELSE 0 END as viewed
       FROM stories s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN profiles p ON s.user_id = p.user_id
       LEFT JOIN story_views sv ON s.id = sv.story_id AND sv.viewer_id = ?
       WHERE s.expires_at > datetime('now')
       ORDER BY s.created_at DESC
       LIMIT 50`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) { console.error('Error:', err.message); res.status(500).json({ error: 'Server error' }); }
});

// Get stories for a specific user
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const result = db.query(
      `SELECT s.*, u.id as user_id, p.first_name, p.photos
       FROM stories s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN profiles p ON s.user_id = p.user_id
       WHERE s.user_id = ? AND s.expires_at > datetime('now')
       ORDER BY s.created_at ASC`,
      [req.params.userId]
    );
    res.json(result.rows);
  } catch (err) { console.error('Error:', err.message); res.status(500).json({ error: 'Server error' }); }
});

// Post a story
router.post('/', auth, async (req, res) => {
  try {
    const { content, contentType = 'image' } = req.body;
    if (!content) return res.status(400).json({ error: 'Content required' });
    if (content.length > 2000) return res.status(400).json({ error: 'Content too long' });
    if (!['image', 'text'].includes(contentType)) return res.status(400).json({ error: 'Invalid content type' });

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const result = db.query(
      'INSERT INTO stories (user_id, content, content_type, expires_at) VALUES (?, ?, ?, ?)',
      [req.user.id, content, contentType, expiresAt]
    );

    res.status(201).json({ id: result.rows[0].id, content, contentType, expires_at: expiresAt });
  } catch (err) { console.error('Error:', err.message); res.status(500).json({ error: 'Server error' }); }
});

// View a story
router.post('/:storyId/view', auth, async (req, res) => {
  try {
    db.query('INSERT OR IGNORE INTO story_views (story_id, viewer_id) VALUES (?, ?)',
      [req.params.storyId, req.user.id]);
    res.json({ viewed: true });
  } catch (err) { console.error('Error:', err.message); res.status(500).json({ error: 'Server error' }); }
});

// Delete a story
router.delete('/:storyId', auth, async (req, res) => {
  try {
    db.query('DELETE FROM stories WHERE id = ? AND user_id = ?', [req.params.storyId, req.user.id]);
    res.json({ deleted: true });
  } catch (err) { console.error('Error:', err.message); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
