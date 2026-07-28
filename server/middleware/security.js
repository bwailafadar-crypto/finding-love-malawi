const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const cookieParser = require('cookie-parser');

module.exports = function setupSecurity(app) {
  // Helmet — sets ~15 security headers (CSP, HSTS, X-Frame-Options, etc.)
  app.use(helmet({
    contentSecurityPolicy: false, // Disabled for dev; enable in production with proper CSP
    crossOriginEmbedderPolicy: false,
  }));

  // CORS — restrict to known origins
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',').map(o => o.trim());
  const serverHost = process.env.RENDER_EXTERNAL_URL || '';
  if (serverHost && !allowedOrigins.includes(serverHost)) allowedOrigins.push(serverHost);

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  }));

  // Body parsing with size limits
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));
  app.use(cookieParser(process.env.COOKIE_SECRET || 'flm-cookie-secret-change-in-prod'));

  // Global rate limiter — 500 requests per 15 min per IP
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later' },
    keyGenerator: (req) => req.ip || req.headers['x-forwarded-for'] || 'unknown',
  }));

  // Strict rate limiter for auth routes — 30 per 15 min per IP
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many auth attempts, please try again in 15 minutes' },
    skipSuccessfulRequests: true,
  });

  // Message sending limiter — 120 per minute
  const messageLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Sending messages too fast' },
  });

  // Upload limiter — 10 per hour
  const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Upload limit reached, try again later' },
  });

  // Expose limiters to routes
  app.set('authLimiter', authLimiter);
  app.set('messageLimiter', messageLimiter);
  app.set('uploadLimiter', uploadLimiter);

  // Security headers for API responses
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.removeHeader('X-Powered-By');
    next();
  });

  // Request ID for logging
  const { v4: uuidv4 } = require('uuid');
  app.use((req, res, next) => {
    req.requestId = uuidv4();
    res.setHeader('X-Request-ID', req.requestId);
    next();
  });
};
