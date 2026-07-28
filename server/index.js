const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const pool = require('./config/database');
require('./setup-db');
const setupSecurity = require('./middleware/security');
const errorHandler = require('./middleware/errorHandler');
const { sanitizeBody } = require('./middleware/validation');

const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profiles');
const swipeRoutes = require('./routes/swipes');
const matchRoutes = require('./routes/matches');
const messageRoutes = require('./routes/messages');
const reportRoutes = require('./routes/reports');
const subscriptionRoutes = require('./routes/subscriptions');
const discoverRoutes = require('./routes/discover');
const verificationRoutes = require('./routes/verification');
const notificationRoutes = require('./routes/notifications');
const adminRoutes = require('./routes/admin');
const storyRoutes = require('./routes/stories');
const uploadRoutes = require('./routes/upload');
const paymentRoutes = require('./routes/payments');
const pushRoutes = require('./routes/push');
const introRoutes = require('./routes/intros');

const app = express();
const server = http.createServer(app);

// Stripe webhook needs raw body before JSON parsing
const paymentService = require('./services/payment');
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'];
    const event = paymentService.verifyWebhookEvent(req.body, signature);
    if (!event) {
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.metadata.userId;
      const plan = session.metadata.plan;
      if (userId && plan) {
        paymentService.activateSubscription(parseInt(userId), plan, session.subscription);
      }
    }
    res.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err.message);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

const io = new Server(server, {
  cors: {
    origin: (() => {
      const o = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',').map(s => s.trim());
      const ext = process.env.RENDER_EXTERNAL_URL;
      if (ext && !o.includes(ext)) o.push(ext);
      return o;
    })(),
    methods: ['GET', 'POST'],
  },
  maxHttpBufferSize: 1e6,
});

app.set('io', io);

setupSecurity(app);
app.use(sanitizeBody);

const authLimiter = app.get('authLimiter');
if (authLimiter) {
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);
  app.use('/api/auth/forgot-password', authLimiter);
}

app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/swipes', swipeRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/discover', discoverRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/intros', introRoutes);
app.use('/uploads', express.static(require('path').join(__dirname, 'uploads')));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Finding Love Malawi',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
  });
});

// In production, serve the built React frontend
const path = require('path');
const fs = require('fs');
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

const onlineUsers = new Map();

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error'));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await pool.query('SELECT id, is_active FROM users WHERE id = ?', [decoded.userId]);
    if (result.rows.length === 0) return next(new Error('User not found'));
    if (!result.rows[0].is_active) return next(new Error('Account deactivated'));
    socket.userId = result.rows[0].id;
    next();
  } catch (err) {
    console.error('Error:', err.message);
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  onlineUsers.set(socket.userId, socket.id);
  socket.join(`user_${socket.userId}`);
  io.emit('online_users', Array.from(onlineUsers.keys()));

  const isMatchParticipant = (matchId) => {
    const mid = parseInt(matchId);
    if (!mid) return false;
    const row = db.query('SELECT id FROM matches WHERE id = ? AND (user1_id = ? OR user2_id = ?) AND is_active = 1',
      [mid, socket.userId, socket.userId]);
    return row.rows.length > 0;
  };

  socket.on('join_chat', (matchId) => {
    if (typeof matchId === 'number' || /^\d+$/.test(matchId)) {
      if (isMatchParticipant(matchId)) socket.join(`chat_${matchId}`);
    }
  });

  socket.on('leave_chat', (matchId) => {
    if (typeof matchId === 'number' || /^\d+$/.test(matchId)) socket.leave(`chat_${matchId}`);
  });

  socket.on('typing', ({ matchId, userId }) => {
    if (userId === socket.userId && isMatchParticipant(matchId)) {
      socket.to(`chat_${matchId}`).emit('user_typing', { matchId, userId });
    }
  });

  socket.on('stop_typing', ({ matchId, userId }) => {
    if (userId === socket.userId && isMatchParticipant(matchId)) {
      socket.to(`chat_${matchId}`).emit('user_stop_typing', { matchId, userId });
    }
  });

  socket.on('video_call_signal', ({ to, signal }) => {
    if (typeof to === 'number' && signal) io.to(`user_${to}`).emit('video_call_signal', { from: socket.userId, signal });
  });

  socket.on('video_call_accept', ({ to, signal }) => {
    if (typeof to === 'number' && signal) io.to(`user_${to}`).emit('video_call_accept', { from: socket.userId, signal });
  });

  socket.on('video_call_end', ({ to }) => {
    if (typeof to === 'number') io.to(`user_${to}`).emit('video_call_end', { from: socket.userId });
  });

  socket.on('disconnect', () => {
    onlineUsers.delete(socket.userId);
    io.emit('online_users', Array.from(onlineUsers.keys()));
  });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Finding Love Malawi running on port ${PORT}`);
});

module.exports = { app, server, io };
