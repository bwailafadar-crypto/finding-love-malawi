const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

const VIDEO_DIR = path.join(__dirname, '..', 'uploads', 'videos');
if (!fs.existsSync(VIDEO_DIR)) fs.mkdirSync(VIDEO_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, VIDEO_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `intro-${req.user.id}-${uuidv4()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['video/mp4', 'video/webm', 'video/quicktime'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only MP4, WebM and MOV videos are allowed'), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 },
});

router.post('/', auth, (req, res) => {
  upload.single('video')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'Video must be under 20MB' });
        return res.status(400).json({ error: err.message });
      }
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) return res.status(400).json({ error: 'Video file required' });

    try {
      const videoUrl = `/uploads/videos/${req.file.filename}`;

      const existing = db.query('SELECT id, video_url FROM intros WHERE user_id = ?', [req.user.id]);
      if (existing.rows.length > 0) {
        const oldFile = path.join(__dirname, '..', existing.rows[0].video_url);
        if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
        db.query('UPDATE intros SET video_url = ?, thumbnail_url = ?, duration = ?, created_at = CURRENT_TIMESTAMP WHERE user_id = ?',
          [videoUrl, null, null, req.user.id]);
      } else {
        db.query('INSERT INTO intros (user_id, video_url, thumbnail_url, duration) VALUES (?, ?, ?, ?)',
          [req.user.id, videoUrl, null, null]);
      }

      res.status(201).json({ videoUrl, message: 'Video intro uploaded' });
    } catch (err) {
      console.error('Intro upload error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  });
});

router.get('/:userId', auth, async (req, res) => {
  try {
    const result = db.query('SELECT * FROM intros WHERE user_id = ?', [req.params.userId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'No video intro found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get intro error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/', auth, async (req, res) => {
  try {
    const existing = db.query('SELECT video_url FROM intros WHERE user_id = ?', [req.user.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'No video intro to delete' });

    const videoFile = path.join(__dirname, '..', existing.rows[0].video_url);
    if (fs.existsSync(videoFile)) fs.unlinkSync(videoFile);

    db.query('DELETE FROM intros WHERE user_id = ?', [req.user.id]);
    res.json({ message: 'Video intro deleted' });
  } catch (err) {
    console.error('Delete intro error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
