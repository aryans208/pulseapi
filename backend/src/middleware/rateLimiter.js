const rateLimit = require('express-rate-limit');

// General API Rate Limiter (200 requests per 15 minutes per IP)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again after 15 minutes.'
  }
});

// Stricter Rate Limiter for Authentication endpoints (20 attempts per 15 minutes)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many login/registration attempts. Please wait 15 minutes before trying again.'
  }
});

// Stricter Rate Limiter for Manual "Check Now" triggers (30 per 5 minutes per user/IP)
const manualCheckLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Rate limit exceeded for manual checks. Please wait a few moments.'
  }
});

module.exports = {
  generalLimiter,
  authLimiter,
  manualCheckLimiter
};
