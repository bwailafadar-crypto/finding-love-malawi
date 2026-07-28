const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

const AUDIO_DIR = path.join(__dirname, '..', 'uploads', 'audio');
const fs = require('fs');
if (!fs.existsSync(AUDIO_DIR)) fs.mkdirSync(AUDIO_DIR, { recursive: true });

const audioStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, AUDIO_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.webm';
    cb(null, `audio-${req.user.id}-${uuidv4()}${ext}`);
  },
});

const audioUpload = multer({
  storage: audioStorage,
  fileFilter: (req, file, cb) => {
    const allowed = ['audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/wav'];
    if (allowed.includes(file.mimetype) || file.mimetype.startsWith('audio/')) cb(null, true);
    else cb(new Error('Only audio files are allowed'), false);
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.post('/photo', auth, (req, res) => {
  const uploadSingle = upload.single('photo');
  uploadSingle(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File too large (max 5MB)' });
        }
        return res.status(400).json({ error: err.message });
      }
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No photo provided' });
    }

    const photoUrl = `/uploads/photos/${req.file.filename}`;
    res.status(201).json({ url: photoUrl, filename: req.file.filename });
  });
});

router.post('/photos', auth, (req, res) => {
  const uploadMultiple = upload.array('photos', 9);
  uploadMultiple(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'One or more files exceed 5MB limit' });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({ error: 'Maximum 9 photos allowed' });
        }
        return res.status(400).json({ error: err.message });
      }
      return res.status(400).json({ error: err.message });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No photos provided' });
    }

    const urls = req.files.map((f) => `/uploads/photos/${f.filename}`);
    res.status(201).json({ photos: urls });
  });
});

router.post('/audio', auth, (req, res) => {
  audioUpload.single('audio')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'Audio too large (max 5MB)' });
        return res.status(400).json({ error: err.message });
      }
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) return res.status(400).json({ error: 'No audio provided' });
    const audioUrl = `/uploads/audio/${req.file.filename}`;
    res.status(201).json({ url: audioUrl });
  });
});

module.exports = router;
