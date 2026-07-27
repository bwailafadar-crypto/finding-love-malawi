// Global error handler — no stack traces in production
module.exports = function errorHandler(err, req, res, _next) {
  const isProd = process.env.NODE_ENV === 'production';

  // Log error internally
  console.error(`[${new Date().toISOString()}] ${req.requestId || 'no-id'} ${req.method} ${req.url}:`, err.message);
  if (!isProd) console.error(err.stack);

  // Handle specific error types
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired' });
  }
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS policy violation' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body too large' });
  }

  // SQL injection attempt detection
  if (err.message && /SQLITE_ERROR|near\s+"|syntax error/i.test(err.message)) {
    console.error(`[SECURITY] Possible injection attempt from ${req.ip} on ${req.url}`);
    return res.status(400).json({ error: 'Invalid request' });
  }

  // Generic error response
  const status = err.status || err.statusCode || 500;
  const message = isProd ? 'Internal server error' : err.message;
  res.status(status).json({ error: message });
};
