const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { sqlite } = require('../config/database');
const auth = require('../middleware/auth');
const { isValidEmail, isValidPassword, isValidDOB, sanitizeString } = require('../middleware/validation');

const router = express.Router();
const authLimiter = router.parent ? router.parent.get('authLimiter') : null;
const BCRYPT_ROUNDS = 12;

// POST /register
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, dateOfBirth, gender } = req.body;

    // Required fields
    if (!email || !password || !firstName || !dateOfBirth || !gender) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Email validation
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Password strength
    if (!isValidPassword(password)) {
      return res.status(400).json({ error: 'Password must be at least 8 characters with letters and numbers' });
    }

    // Date of birth validation (18+)
    if (!isValidDOB(dateOfBirth)) {
      return res.status(400).json({ error: 'You must be at least 18 years old' });
    }

    // Gender validation
    if (!['male', 'female', 'non-binary', 'other'].includes(gender)) {
      return res.status(400).json({ error: 'Invalid gender value' });
    }

    // Sanitize names
    const cleanFirstName = sanitizeString(firstName).substring(0, 50);
    const cleanLastName = lastName ? sanitizeString(lastName).substring(0, 50) : null;

    // Check duplicate
    const existing = db.query('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password with 12 rounds
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    try {
      sqlite.exec('BEGIN');

      const userResult = db.query(
        'INSERT INTO users (email, password_hash) VALUES (?, ?)',
        [normalizedEmail, passwordHash]
      );
      const userId = userResult.rows[0].id;

      db.query(
        'INSERT INTO profiles (user_id, first_name, last_name, date_of_birth, gender) VALUES (?, ?, ?, ?, ?)',
        [userId, cleanFirstName, cleanLastName, dateOfBirth, gender]
      );

      db.query(
        'INSERT INTO subscriptions (user_id, plan, expires_at) VALUES (?, ?, ?)',
        [userId, 'free', null]
      );

      sqlite.exec('COMMIT');

      const token = jwt.sign({ userId, iat: Math.floor(Date.now() / 1000) }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      });

      res.status(201).json({
        token,
        user: { id: userId, email: normalizedEmail, firstName: cleanFirstName, lastName: cleanLastName },
      });
    } catch (err) {
      sqlite.exec('ROLLBACK');
      throw err;
    }
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// POST /login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const result = db.query(
      'SELECT id, email, password_hash, is_active FROM users WHERE email = ?',
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      // Always return same error to prevent email enumeration
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account deactivated' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last active
    db.query('UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

    const token = jwt.sign({ userId: user.id, iat: Math.floor(Date.now() / 1000) }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// GET /me
router.get('/me', auth, async (req, res) => {
  try {
    const result = db.query(
      `SELECT u.id, u.email, u.is_verified, u.is_premium, u.created_at,
              p.first_name, p.last_name, p.date_of_birth, p.gender, p.looking_for,
              p.bio, p.occupation, p.photos, p.avatar_url, p.location_name,
              p.latitude, p.longitude, p.is_verified as profile_verified,
              s.plan
       FROM users u
       LEFT JOIN profiles p ON u.id = p.user_id
       LEFT JOIN subscriptions s ON u.id = s.user_id AND s.is_active = 1
       WHERE u.id = ?`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get me error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /logout
router.post('/logout', auth, async (req, res) => {
  try {
    db.query('UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE id = ?', [req.user.id]);
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
