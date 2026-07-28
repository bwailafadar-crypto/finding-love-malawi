const webpush = require('web-push');
const db = require('../config/database');

const VAPID_PUBLIC_KEY = process.env.WEB_PUSH_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.WEB_PUSH_VAPID_PRIVATE_KEY;
const VAPID_EMAIL = process.env.WEB_PUSH_EMAIL || 'mailto:admin@findinglovemalawi.com';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

function generateVapidKeys() {
  return webpush.generateVAPIDKeys();
}

function subscribe(userId, subscription) {
  const { endpoint, p256dh, auth } = subscription;

  const existing = db.query(
    'SELECT id FROM push_subscriptions WHERE user_id = ? AND endpoint = ?',
    [userId, endpoint]
  );

  if (existing.rows.length > 0) {
    db.query(
      'UPDATE push_subscriptions SET p256dh = ?, auth = ?, created_at = CURRENT_TIMESTAMP WHERE user_id = ? AND endpoint = ?',
      [p256dh, auth, userId, endpoint]
    );
  } else {
    db.query(
      'INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) VALUES (?, ?, ?, ?)',
      [userId, endpoint, p256dh, auth]
    );
  }
}

function unsubscribe(userId, endpoint) {
  db.query(
    'DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?',
    [userId, endpoint]
  );
}

async function sendPush(userId, title, body, url) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;

  const result = db.query(
    'SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?',
    [userId]
  );

  const subscriptions = result.rows;
  const invalidEndpoints = [];

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify({ title, body, url: url || '/matches' })
      );
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        invalidEndpoints.push(sub.endpoint);
      } else {
        console.error(`Push notification error for user ${userId}:`, err.message);
      }
    }
  }

  for (const endpoint of invalidEndpoints) {
    db.query('DELETE FROM push_subscriptions WHERE endpoint = ?', [endpoint]);
  }
}

async function sendBulkPush(userIds, title, body, url) {
  for (const userId of userIds) {
    await sendPush(userId, title, body, url);
  }
}

module.exports = { generateVapidKeys, subscribe, unsubscribe, sendPush, sendBulkPush };
