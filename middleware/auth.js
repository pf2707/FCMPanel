const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { promisify } = require('util');

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRE = process.env.JWT_EXPIRE || '1d';
const JWT_COOKIE_EXPIRE = process.env.JWT_COOKIE_EXPIRE || 1;

// Create JWT Token
exports.createToken = (user) => {
  return jwt.sign({ id: user.id }, JWT_SECRET, {
    expiresIn: JWT_EXPIRE
  });
};

// Send JWT token in cookie
exports.sendTokenResponse = (user, statusCode, req, res) => {
  // Create token
  const token = this.createToken(user);

  const options = {
    expires: new Date(Date.now() + JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https'
  };

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token
    });
};

// Protect routes middleware
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Get token from cookie or authorization header
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Make sure token exists
    if (!token) {
      // Clear any existing token cookie
      res.clearCookie('token');
      req.flash('error_msg', 'Please log in to continue');
      return res.redirect('/auth/login');
    }

    // Verify token
    const decoded = await promisify(jwt.verify)(token, JWT_SECRET);

    // Check if user still exists
    const user = await User.findByPk(decoded.id);

    if (!user) {
      // Clear invalid token cookie
      res.clearCookie('token');
      req.flash('error_msg', 'User no longer exists');
      return res.redirect('/auth/login');
    }

    // Put user in request
    req.user = user;
    res.locals.user = user;
    next();
  } catch (err) {
    // Clear invalid token cookie
    res.clearCookie('token');
    req.flash('error_msg', 'Session expired. Please log in again');
    return res.redirect('/auth/login');
  }
};

// Protect API routes middleware
exports.protectApi = async (req, res, next) => {
  try {
    let token;

    // Get token from cookie or authorization header
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Make sure token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to access this route'
      });
    }

    // Verify token
    const decoded = await promisify(jwt.verify)(token, JWT_SECRET);

    // Check if user still exists
    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User no longer exists'
      });
    }

    // Put user in request
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Not authorized to access this route'
    });
  }
};

// Admin middleware
exports.admin = (req, res, next) => {
  if (!req.user.isAdmin) {
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required for this route'
      });
    }
    req.flash('error_msg', 'Admin access required');
    return res.redirect('/');
  }
  next();
}; 