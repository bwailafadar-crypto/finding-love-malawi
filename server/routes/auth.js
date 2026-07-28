const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/database');
const { sqlite } = require('../config/database');
const auth = require('../middleware/auth');
const { isValidEmail, isValidPassword, isValidDOB, sanitizeString } = require('../middleware/validation');
const emailService = require('../services/email');

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

      try {
        await emailService.sendWelcomeEmail(normalizedEmail, cleanFirstName);
      } catch (_) {}
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
    console.error('Error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const normalizedEmail = email.toLowerCase().trim();
    const result = db.query('SELECT id FROM users WHERE email = ?', [normalizedEmail]);

    // Always return success to prevent email enumeration
    if (result.rows.length === 0) {
      return res.json({ message: 'If an account exists, a reset link has been sent' });
    }

    const userId = result.rows[0].id;
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    // Delete any existing reset tokens for this user
    db.query('DELETE FROM password_resets WHERE user_id = ?', [userId]);

    // Store new token
    db.query('INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)', [userId, token, expiresAt]);

    const resetLink = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
    try {
      await emailService.sendPasswordResetEmail(normalizedEmail, resetLink);
    } catch (_) {}

    res.json({ message: 'If an account exists, a reset link has been sent', _dev_token: process.env.NODE_ENV !== 'production' ? token : undefined });
  } catch (err) {
    console.error('Forgot password error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token and password required' });

    if (!isValidPassword(password)) {
      return res.status(400).json({ error: 'Password must be at least 8 characters with letters and numbers' });
    }

    const result = db.query(
      'SELECT id, user_id, expires_at FROM password_resets WHERE token = ?',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const reset = result.rows[0];
    if (new Date(reset.expires_at) < new Date()) {
      db.query('DELETE FROM password_resets WHERE id = ?', [reset.id]);
      return res.status(400).json({ error: 'Reset token has expired. Please request a new one.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    try {
      sqlite.exec('BEGIN');
      db.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, reset.user_id]);
      db.query('DELETE FROM password_resets WHERE user_id = ?', [reset.user_id]);
      sqlite.exec('COMMIT');
    } catch (err) {
      sqlite.exec('ROLLBACK');
      throw err;
    }

    res.json({ message: 'Password reset successful. You can now log in.' });
  } catch (err) {
    console.error('Reset password error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
