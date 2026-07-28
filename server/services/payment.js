const db = require('../config/database');

let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
}

const PLANS = {
  plus: { price: 2500, name: 'Plus' },
  gold: { price: 5000, name: 'Gold' },
  platinum: { price: 10000, name: 'Platinum' },
};

const PLAN_PRICE_IDS = {
  plus: process.env.STRIPE_PRICE_PLUS,
  gold: process.env.STRIPE_PRICE_GOLD,
  platinum: process.env.STRIPE_PRICE_PLATINUM,
};

async function createCheckoutSession(userId, plan, successUrl, cancelUrl) {
  if (!stripe) return { sessionId: null, url: null };
  if (!PLANS[plan]) throw new Error('Invalid plan');
  if (!PLAN_PRICE_IDS[plan]) throw new Error('Stripe price not configured for this plan');

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: PLAN_PRICE_IDS[plan], quantity: 1 }],
    metadata: { userId: String(userId), plan },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  return { sessionId: session.id, url: session.url };
}

function verifyWebhookEvent(payload, signature) {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) return null;
  try {
    return stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[STRIPE WEBHOOK] Signature verification failed:', err.message);
    return null;
  }
}

function getCurrentSubscription(userId) {
  const result = db.query(
    'SELECT * FROM subscriptions WHERE user_id = ? AND is_active = 1 ORDER BY started_at DESC LIMIT 1',
    [userId]
  );
  return result.rows[0] || { plan: 'free' };
}

function activateSubscription(userId, plan, stripeSubscriptionId) {
  if (!PLANS[plan]) return;

  db.query('UPDATE subscriptions SET is_active = 0 WHERE user_id = ?', [userId]);

  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 1);

  db.query(
    'INSERT INTO subscriptions (user_id, plan, expires_at, payment_reference) VALUES (?, ?, ?, ?)',
    [userId, plan, expiresAt.toISOString(), stripeSubscriptionId || null]
  );

  if (plan !== 'free') {
    db.query('UPDATE users SET is_premium = 1 WHERE id = ?', [userId]);
  }
}

module.exports = {
  PLANS,
  createCheckoutSession,
  verifyWebhookEvent,
  getCurrentSubscription,
  activateSubscription,
};
