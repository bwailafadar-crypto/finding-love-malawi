const express = require('express');
const db = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

const plans = {
  free: { price: 0, swipes: 50, superLikes: 1, boosts: 0, rewind: false, seeLikes: false, passport: false },
  plus: { price: 2500, swipes: -1, superLikes: 5, boosts: 1, rewind: true, seeLikes: true, passport: false },
  gold: { price: 5000, swipes: -1, superLikes: 10, boosts: 3, rewind: true, seeLikes: true, passport: true },
  platinum: { price: 10000, swipes: -1, superLikes: 20, boosts: 5, rewind: true, seeLikes: true, passport: true },
};

router.get('/plans', (req, res) => {
  res.json(plans);
});

router.get('/current', auth, async (req, res) => {
  try {
    const result = db.query(
      'SELECT * FROM subscriptions WHERE user_id = ? AND is_active = 1 ORDER BY started_at DESC LIMIT 1',
      [req.user.id]
    );

    const plan = result.rows[0] || { plan: 'free' };
    res.json({ ...plan, features: plans[plan.plan] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/subscribe', auth, async (req, res) => {
  try {
    const { plan, paymentReference } = req.body;

    if (!plans[plan]) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    db.query(
      'UPDATE subscriptions SET is_active = 0 WHERE user_id = ?',
      [req.user.id]
    );

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    db.query(
      'INSERT INTO subscriptions (user_id, plan, expires_at, payment_reference) VALUES (?, ?, ?, ?)',
      [req.user.id, plan, expiresAt.toISOString(), paymentReference || null]
    );

    if (plan !== 'free') {
      db.query('UPDATE users SET is_premium = 1 WHERE id = ?', [req.user.id]);
    }

    res.json({ message: `Subscribed to ${plan} plan`, features: plans[plan] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/boost', auth, async (req, res) => {
  try {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30);

    db.query(
      'INSERT INTO boosts (user_id, expires_at) VALUES (?, ?)',
      [req.user.id, expiresAt.toISOString()]
    );

    res.json({ message: 'Profile boosted for 30 minutes' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
