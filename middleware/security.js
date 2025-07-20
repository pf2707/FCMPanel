const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { body, validationResult } = require('express-validator');
const axios = require('axios');

// Helmet configuration for secure headers
exports.configureHelmet = (app) => {
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net', 'cdnjs.cloudflare.com', 'www.google.com', 'www.gstatic.com', 'cdn.datatables.net', 'code.jquery.com'],
          styleSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net', 'cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com', 'unpkg.com', 'cdn.datatables.net'],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'", 'https://www.google.com', 'https://www.gstatic.com'],
          fontSrc: ["'self'", 'cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net', 'unpkg.com'],
          frameSrc: ['https://www.google.com', 'https://www.gstatic.com'] // Allow reCAPTCHA iframe
        },
      },
      xssFilter: true,
      noSniff: true,
      frameguard: { action: 'deny' }, // X-Frame-Options: DENY
      referrerPolicy: { policy: 'same-origin' }
    })
  );
};

// Rate limiting middleware 
exports.rateLimiter = (windowMs = 1 * 60 * 1000, max = 500) => {
  return rateLimit({
    windowMs, // Default: 1 minute
    max, // Default: 500 requests per minute
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests from this IP, please try again later'
  });
};

// API rate limiting middleware 
exports.apiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 500, // 500 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { 
    success: false, 
    error: 'Too many requests from this IP, please try again later' 
  }
});

// Login rate limiting middleware 
exports.loginRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 50, // limit each IP to 50 requests per minute
  message: 'Too many login attempts, please try again after 1 minute',
  handler: (req, res) => {
    req.flash('error_msg', 'Too many login attempts, please try again after 1 minute');
    res.redirect('/auth/login');
  }
});

// Firebase account operations rate limiting 
exports.accountOperationsRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 operations per minute
  message: 'Too many account operations, please try again later',
  handler: (req, res) => {
    req.flash('error_msg', 'Too many account operations, please try again later');
    res.redirect('/accounts');
  }
});

// Notification sending rate limiting 
exports.notificationRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 200, // 200 notifications per minute
  message: 'Too many notifications sent, please wait before sending more',
  handler: (req, res) => {
    req.flash('error_msg', 'Too many notifications sent, please wait before sending more');
    res.redirect('/notifications');
  }
});

// Topic management rate limiting 
exports.topicOperationsRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 topic operations per minute
  message: 'Too many topic operations, please try again later',
  handler: (req, res) => {
    req.flash('error_msg', 'Too many topic operations, please try again later');
    res.redirect('/topics');
  }
});

// Device operations rate limiting 
exports.deviceOperationsRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 500, // 500 device operations per minute
  message: 'Too many device operations, please try again later',
  handler: (req, res) => {
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.status(429).json({
        success: false,
        error: 'Too many device operations, please try again later'
      });
    }
    req.flash('error_msg', 'Too many device operations, please try again later');
    res.redirect('/devices');
  }
});

// File upload/expensive operations rate limiting 
exports.expensiveOperationsRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 50, // 50 expensive operations per minute
  message: 'Too many expensive operations, please try again later',
  handler: (req, res) => {
    req.flash('error_msg', 'Too many expensive operations, please try again later');
    res.redirect('back');
  }
});

// Note: CSRF Protection is now handled in server.js using csrf-csrf package

// Type validation helpers
const ensureString = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const ensureArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return [value];
  return [];
};

// Middleware to sanitize request body parameters
exports.sanitizeInput = (req, res, next) => {
  if (req.body) {
    // Ensure all body parameters are properly typed before using string methods
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== null && req.body[key] !== undefined) {
        // Convert to string safely if needed
        if (typeof req.body[key] !== 'string' && typeof req.body[key] !== 'object') {
          req.body[key] = String(req.body[key]);
        }
      }
    });
  }
  next();
};

// Input validation middlewares
exports.validateLogin = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 4 }).withMessage('Username must be at least 4 characters'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.flash('error_msg', errors.array()[0].msg);
      return res.redirect('/auth/login');
    }
    next();
  }
];

exports.validateRegister = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 4 }).withMessage('Username must be at least 4 characters')
    .isAlphanumeric().withMessage('Username can only contain letters and numbers')
    .escape(),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{8,}$/)
    .withMessage('Password must include one lowercase character, one uppercase character, a number, and a special character'),
  body('passwordConfirm')
    .notEmpty().withMessage('Password confirmation is required')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Password confirmation does not match password');
      }
      return true;
    }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

exports.validatePasswordChange = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
    .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{8,}$/)
    .withMessage('Password must include one lowercase character, one uppercase character, a number, and a special character'),
  body('confirmPassword')
    .notEmpty().withMessage('Password confirmation is required')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match new password');
      }
      return true;
    }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.flash('error_msg', errors.array()[0].msg);
      return res.redirect('/auth/profile');
    }
    next();
  }
];

// SQL Injection Protection - Validate Firebase Account
exports.validateFirebaseAccount = [
  body('name')
    .trim()
    .notEmpty().withMessage('Account name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Account name must be between 2 and 50 characters')
    .escape(),
  body('projectId')
    .trim()
    .notEmpty().withMessage('Project ID is required')
    .escape(),
  body('clientEmail')
    .trim()
    .notEmpty().withMessage('Client email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('privateKey')
    .notEmpty().withMessage('Private key is required'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.flash('error_msg', errors.array()[0].msg);
      return res.redirect('/accounts');
    }
    next();
  }
];

// Validate reCAPTCHA (conditional based on environment configuration)
exports.validateRecaptcha = async (req, res, next) => {
  // Skip reCAPTCHA validation if not configured
  if (!process.env.RECAPTCHA_SITE_KEY || !process.env.RECAPTCHA_SECRET_KEY) {
    console.log('reCAPTCHA not configured, skipping validation');
    return next();
  }

  const recaptchaResponse = req.body['g-recaptcha-response'];
  
  if (!recaptchaResponse) {
    req.flash('error_msg', 'Please complete the reCAPTCHA verification');
    return res.redirect('/auth/login');
  }

  try {
    const verifyURL = 'https://www.google.com/recaptcha/api/siteverify';
    const response = await axios.post(verifyURL, null, {
      params: {
        secret: process.env.RECAPTCHA_SECRET_KEY,
        response: recaptchaResponse
      }
    });

    if (!response.data.success) {
      req.flash('error_msg', 'reCAPTCHA verification failed. Please try again.');
      return res.redirect('/auth/login');
    }

    next();
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    req.flash('error_msg', 'Error verifying reCAPTCHA. Please try again.');
    return res.redirect('/auth/login');
  }
};

module.exports = {
  configureHelmet: exports.configureHelmet,
  rateLimiter: exports.rateLimiter,
  apiRateLimiter: exports.apiRateLimiter,
  loginRateLimiter: exports.loginRateLimiter,
  accountOperationsRateLimiter: exports.accountOperationsRateLimiter,
  notificationRateLimiter: exports.notificationRateLimiter,
  topicOperationsRateLimiter: exports.topicOperationsRateLimiter,
  deviceOperationsRateLimiter: exports.deviceOperationsRateLimiter,
  expensiveOperationsRateLimiter: exports.expensiveOperationsRateLimiter,
  sanitizeInput: exports.sanitizeInput,
  validateLogin: exports.validateLogin,
  validateRegister: exports.validateRegister,
  validatePasswordChange: exports.validatePasswordChange,
  validateFirebaseAccount: exports.validateFirebaseAccount,
  validateRecaptcha: exports.validateRecaptcha
}; 