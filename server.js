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
const { doubleCsrf } = require('csrf-csrf');
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
// app.use(session({
//   store: new SQLiteStore({
//     db: 'sessions.sqlite',
//     dir: path.join(__dirname, 'data'),
//     table: 'sessions'
//   }),
//   secret: process.env.SESSION_SECRET,
//   resave: false,
//   saveUninitialized: false,
//   cookie: {
//     // Secure in production
//     secure: process.env.NODE_ENV === 'production',
//     // HttpOnly to mitigate XSS
//     httpOnly: true,
//     // SameSite to mitigate CSRF
//     sameSite: 'strict',
//     // Set max age to 1 day
//     maxAge: 24 * 60 * 60 * 1000
//   }
// }));
// Temporary Memory Store:
const MemoryStore = require('express-session').MemoryStore;
app.use(session({
  store: new MemoryStore(),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: process.env.NODE_ENV === 'production', maxAge: 24 * 60 * 60 * 1000 }
}));

// CSRF Protection using csrf-csrf for enhanced security
const {
  invalidCsrfTokenError,
  generateCsrfToken,
  validateRequest,
  doubleCsrfProtection,
} = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET || process.env.SESSION_SECRET,
  getSessionIdentifier: (req) => req.sessionID || req.session?.id || 'anonymous',
  cookieName: process.env.NODE_ENV === 'production' ? '__Host-csrf-token' : 'csrf-token',
  cookieOptions: {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
  },
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  getCsrfTokenFromRequest: (req) => {
    return (
      // From request body (form submissions)
      (req.body && req.body._csrf) ||
      (req.body && req.body.csrf_token) ||
      // From headers (AJAX)
      req.headers['x-csrf-token'] ||
      req.headers['csrf-token']
    );
  },
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
  
  // Make CSRF token available to all views
  try {
    res.locals.csrfToken = generateCsrfToken(req, res);
  } catch (err) {
    res.locals.csrfToken = '';
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

// Auth routes - simplified CSRF handling
app.use('/auth', doubleCsrfProtection, authRoutes);

// API routes - no CSRF
app.use('/api/devices', require('./routes/api/devices'));

// Protected routes middleware
const protectedRoutes = (req, res, next) => {
  protect(req, res, () => {
    doubleCsrfProtection(req, res, next);
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
    return doubleCsrfProtection(req, res, () => {
      if (err.message === 'invalid csrf token' || err.code === 'EBADCSRFTOKEN') {
        // Handle CSRF token errors
        return res.status(403).render('error', {
          layout,
          title: 'Forbidden',
          message: 'Invalid or expired form submission. Please try again.',
          error: process.env.NODE_ENV === 'production' ? {} : err,
          activeTab: '',
          user: req.user,
          csrfToken: generateCsrfToken(req, res)
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
        csrfToken: generateCsrfToken(req, res)
      });
    });
  }

  // Not authenticated, render without CSRF
  if (err.message === 'invalid csrf token' || err.code === 'EBADCSRFTOKEN') {
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
    return doubleCsrfProtection(req, res, () => {
      res.status(404).render('error', {
        layout,
        title: 'Page Not Found',
        message: 'The page you requested does not exist',
        error: {},
        activeTab: '',
        user: req.user,
        csrfToken: generateCsrfToken(req, res)
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