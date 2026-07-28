const express = require('express');
const auth = require('../middleware/auth');
const pushService = require('../services/push');

const router = express.Router();

router.get('/vapid-public-key', (req, res) => {
  const key = process.env.WEB_PUSH_VAPID_PUBLIC_KEY;
  if (!key) return res.status(501).json({ error: 'Push notifications not configured' });
  res.json({ publicKey: key });
});

router.post('/subscribe', auth, async (req, res) => {
  try {
    const { endpoint, p256dh, auth: authKey } = req.body;
    if (!endpoint || !p256dh || !authKey) {
      return res.status(400).json({ error: 'Invalid subscription data' });
    }
    pushService.subscribe(req.user.id, { endpoint, p256dh, auth: authKey });
    res.json({ message: 'Subscribed to push notifications' });
  } catch (err) {
    console.error('Push subscribe error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/unsubscribe', auth, async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ error: 'Endpoint required' });
    pushService.unsubscribe(req.user.id, endpoint);
    res.json({ message: 'Unsubscribed from push notifications' });
  } catch (err) {
    console.error('Push unsubscribe error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
