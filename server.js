require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const flash = require('connect-flash');
const expressLayouts = require('express-ejs-layouts');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const csrf = require('csurf');
const { initializeAllFirebaseAccounts } = require('./config/firebase');
const { initializeDatabase } = require('./config/database');
const { protect } = require('./middleware/auth');

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Database
initializeDatabase()
  .then(() => console.log('Database initialized'))
  .catch(err => console.error('Database initialization error:', err));

// Set EJS as templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());

// Session middleware
app.use(session({
  store: new SQLiteStore({
    db: 'sessions.sqlite',
    dir: path.join(__dirname, 'data'),
    table: 'sessions'
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    // Secure in production
    secure: process.env.NODE_ENV === 'production',
    // HttpOnly to mitigate XSS
    httpOnly: true,
    // SameSite to mitigate CSRF
    sameSite: 'strict',
    // Set max age to 1 day
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// CSRF Protection
const csrfProtection = csrf({ 
  cookie: true,
  value: (req) => {
    // Get the CSRF token from various sources
    return (
      // From request body (form submissions)
      (req.body && req.body._csrf) ||
      // From query parameter
      (req.query && req.query._csrf) ||
      // From headers (AJAX)
      (req.headers['csrf-token'] || req.headers['xsrf-token'] || req.headers['x-csrf-token'] || req.headers['x-xsrf-token']) ||
      // From custom header
      req.headers['csrf-token']
    );
  }
});

// Flash messages middleware
app.use(flash());

// Global variables for flash messages and CSRF token
app.use((req, res, next) => {
  // Ensure flash messages are strings, not arrays
  const success = req.flash('success_msg');
  const error = req.flash('error_msg');
  const info = req.flash('info_msg');
  
  res.locals.success_msg = Array.isArray(success) && success.length > 0 ? success[0] : '';
  res.locals.error_msg = Array.isArray(error) && error.length > 0 ? error[0] : '';
  res.locals.info_msg = Array.isArray(info) && info.length > 0 ? info[0] : '';
  
  // Make CSRF token available to all views if the function exists
  if (typeof req.csrfToken === 'function') {
    res.locals.csrfToken = req.csrfToken();
  }
  
  next();
});

// Initialize Firebase Admin (after database is connected)
initializeAllFirebaseAccounts()
  .then(() => console.log('Firebase accounts initialized'))
  .catch(err => console.error('Firebase initialization error:', err));

// Import Routes
const indexRoutes = require('./routes/index');
const notificationsRoutes = require('./routes/notifications');
const topicsRoutes = require('./routes/topics');
const devicesRoutes = require('./routes/devices');
const accountsRoutes = require('./routes/accounts');
const authRoutes = require('./routes/auth');

// Auth routes
app.use('/auth', (req, res, next) => {
  if (req.method === 'GET' && req.path === '/login') {
    csrfProtection(req, res, () => {
      res.locals.csrfToken = req.csrfToken();
      next();
    });
  } else {
    csrfProtection(req, res, next);
  }
}, authRoutes);

// API routes - no CSRF
app.use('/api/devices', require('./routes/api/devices'));

// Protected routes middleware
const protectedRoutes = (req, res, next) => {
  protect(req, res, () => {
    csrfProtection(req, res, next);
  });
};

// Apply protected routes
app.use('/', protectedRoutes, indexRoutes);
app.use('/notifications', protectedRoutes, notificationsRoutes);
app.use('/topics', protectedRoutes, topicsRoutes);
app.use('/devices', protectedRoutes, devicesRoutes);
app.use('/accounts', protectedRoutes, accountsRoutes);

// Root redirect to login if not authenticated
app.get('/', (req, res, next) => {
  if (!req.cookies.token) {
    res.redirect('/auth/login');
  } else {
    next();
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  // Determine layout based on authentication
  const layout = req.cookies.token ? 'layout' : 'auth/layout';

  // If authenticated, apply CSRF protection
  if (req.cookies.token) {
    return csrfProtection(req, res, () => {
      if (err.code === 'EBADCSRFTOKEN') {
        // Handle CSRF token errors
        return res.status(403).render('error', {
          layout,
          title: 'Forbidden',
          message: 'Invalid or expired form submission. Please try again.',
          error: process.env.NODE_ENV === 'production' ? {} : err,
          activeTab: '',
          user: req.user,
          csrfToken: req.csrfToken()
        });
      }
      
      console.error(err.stack);
      res.status(500).render('error', {
        layout,
        title: 'Server Error',
        message: process.env.NODE_ENV === 'production' ? 
          'Something went wrong' : err.message,
        error: process.env.NODE_ENV === 'production' ? {} : err,
        activeTab: '',
        user: req.user,
        csrfToken: req.csrfToken()
      });
    });
  }

  // Not authenticated, render without CSRF
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).render('error', {
      layout,
      title: 'Forbidden',
      message: 'Invalid or expired form submission. Please try again.',
      error: process.env.NODE_ENV === 'production' ? {} : err,
      activeTab: '',
      user: req.user
    });
  }

  console.error(err.stack);
  res.status(500).render('error', {
    layout,
    title: 'Server Error',
    message: process.env.NODE_ENV === 'production' ? 
      'Something went wrong' : err.message,
    error: process.env.NODE_ENV === 'production' ? {} : err,
    activeTab: '',
    user: req.user
  });
});

// 404 handling
app.use((req, res, next) => {
  // Determine layout based on authentication
  const layout = req.cookies.token ? 'layout' : 'auth/layout';

  // If authenticated, apply CSRF protection
  if (req.cookies.token) {
    return csrfProtection(req, res, () => {
      res.status(404).render('error', {
        layout,
        title: 'Page Not Found',
        message: 'The page you requested does not exist',
        error: {},
        activeTab: '',
        user: req.user,
        csrfToken: req.csrfToken()
      });
    });
  }

  // Not authenticated, render without CSRF
  res.status(404).render('error', {
    layout,
    title: 'Page Not Found',
    message: 'The page you requested does not exist',
    error: {},
    activeTab: '',
    user: req.user
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 