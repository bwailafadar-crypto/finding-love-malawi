const express = require('express');
const auth = require('../middleware/auth');
const paymentService = require('../services/payment');

const router = express.Router();

router.post('/create-checkout', auth, async (req, res) => {
  try {
    const { plan } = req.body;
    if (!plan || !paymentService.PLANS[plan]) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    const baseUrl = process.env.CLIENT_URL || req.headers.origin || 'http://localhost:3000';
    const successUrl = `${baseUrl}/premium?success=true&plan=${plan}`;
    const cancelUrl = `${baseUrl}/premium?cancelled=true`;

    const { sessionId, url } = await paymentService.createCheckoutSession(
      req.user.id, plan, successUrl, cancelUrl
    );

    if (!sessionId) {
      return res.json({ message: 'Payment not configured', comingSoon: true });
    }

    res.json({ sessionId, url });
  } catch (err) {
    console.error('Create checkout error:', err.message);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

router.get('/status', auth, async (req, res) => {
  try {
    const subscription = paymentService.getCurrentSubscription(req.user.id);
    res.json(subscription);
  } catch (err) {
    console.error('Payment status error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
