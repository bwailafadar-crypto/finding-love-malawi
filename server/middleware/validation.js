// Input sanitization — strip dangerous characters from all string inputs
function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/[<>]/g, '') // Strip angle brackets (XSS)
    .replace(/javascript:/gi, '') // Strip JS protocol
    .replace(/on\w+\s*=/gi, '') // Strip event handlers
    .trim();
}

function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const clean = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      clean[key] = sanitizeString(value);
    } else if (Array.isArray(value)) {
      clean[key] = value.map((v) => typeof v === 'string' ? sanitizeString(v) : v);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

// Middleware: sanitize all JSON body inputs
function sanitizeBody(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  next();
}

// Validate email format
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Validate password strength
function isValidPassword(password) {
  if (!password || typeof password !== 'string') return false;
  if (password.length < 8) return false;
  if (password.length > 128) return false;
  // Must have at least one letter and one number
  return /[a-zA-Z]/.test(password) && /[0-9]/.test(password);
}

// Validate that a value is a positive integer
function isPositiveInt(val) {
  const n = parseInt(val, 10);
  return !isNaN(n) && n > 0 && n <= 2147483647;
}

// Validate date of birth (must be 18+)
function isValidDOB(dob) {
  const d = new Date(dob);
  if (isNaN(d.getTime())) return false;
  const age = Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  return age >= 18 && age <= 120;
}

module.exports = { sanitizeString, sanitizeObject, sanitizeBody, isValidEmail, isValidPassword, isPositiveInt, isValidDOB };
