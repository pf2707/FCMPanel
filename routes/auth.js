const express = require('express');
const router = express.Router();
const expressLayouts = require('express-ejs-layouts');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { loginRateLimiter, validateLogin, validateRegister, validatePasswordChange, validateRecaptcha } = require('../middleware/security');
const { createToken } = require('../middleware/auth');
const { Op } = require('sequelize');

// Initialize express-ejs-layouts for auth routes
router.use(expressLayouts);

// @route   GET /auth/login
// @desc    Show login page
// @access  Public
router.get('/login', (req, res) => {
  if (req.cookies.token) {
    return res.redirect('/');
  }
  
  res.render('auth/login', {
    layout: 'auth/layout',
    title: 'Login',
    activeTab: 'login',
    csrfToken: req.csrfToken ? req.csrfToken() : null
  });
});

// @route   POST /auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', 
  loginRateLimiter,
  validateRecaptcha,
  validateLogin,
  async (req, res) => {
    const { username, password } = req.body;

    try {
      // Check if user exists
      const user = await User.findOne({ where: { username } });

      if (!user) {
        req.flash('error_msg', 'Invalid credentials');
        return res.redirect('/auth/login');
      }

      // Check if password matches
      const isMatch = await user.comparePassword(password);

      if (!isMatch) {
        req.flash('error_msg', 'Invalid credentials');
        return res.redirect('/auth/login');
      }

      // Update last login time
      await user.update({ lastLogin: new Date() });

      // Create token
      const token = createToken(user);

      // Set cookie options
      const cookieOptions = {
        expires: new Date(
          Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000 || 1 * 24 * 60 * 60 * 1000
        ),
        httpOnly: true,
        secure: req.secure || req.headers['x-forwarded-proto'] === 'https'
      };

      // Set cookie and redirect
      res.cookie('token', token, cookieOptions);
      req.flash('success_msg', 'Login successful');
      res.redirect('/');
    } catch (err) {
      console.error('Login error:', err);
      req.flash('error_msg', 'An error occurred during login');
      res.redirect('/auth/login');
    }
  }
);

// @route   POST /auth/logout (changed from GET to POST for CSRF)
// @desc    Logout user / clear cookie
// @access  Private
router.post('/logout', protect, (req, res) => {
  res.clearCookie('token');
  req.flash('success_msg', 'You have been logged out');
  res.redirect('/auth/login');
});

// For backward compatibility - redirect GET logout to home with a message
router.get('/logout', protect, (req, res) => {
  req.flash('info_msg', 'Please use the logout button to log out');
  res.redirect('/');
});

// @route   GET /auth/profile
// @desc    User profile page
// @access  Private
router.get('/profile', protect, (req, res) => {
  const error_msg = req.flash('error_msg');
  const success_msg = req.flash('success_msg');
  
  res.render('auth/profile', {
    title: 'Change Password',
    activeTab: 'profile',
    user: req.user,
    csrfToken: req.csrfToken(),
    messages: {
      error: error_msg && error_msg !== '' ? error_msg : null,
      success: success_msg && success_msg !== '' ? success_msg : null
    }
  });
});

// @route   POST /auth/profile
// @desc    Update user profile
// @access  Private
router.post('/profile', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Check if password change fields are provided
    if (!currentPassword || !newPassword || !confirmPassword) {
      req.flash('error_msg', 'All password fields are required');
      return res.redirect('/auth/profile');
    }

    // Verify current password
    const isMatch = await req.user.comparePassword(currentPassword);
    if (!isMatch) {
      req.flash('error_msg', 'Current password is incorrect');
      return res.redirect('/auth/profile');
    }

    // Verify new password matches confirmation
    if (newPassword !== confirmPassword) {
      req.flash('error_msg', 'New passwords do not match');
      return res.redirect('/auth/profile');
    }

    // Update password
    req.user.password = newPassword;
    await req.user.save();
    
    req.flash('success_msg', 'Password updated successfully');
    
    // Get the flash messages
    const error_msg = req.flash('error_msg');
    const success_msg = req.flash('success_msg');
    
    // Render the profile page with updated data and messages
    res.render('auth/profile', {
      title: 'Change Password',
      activeTab: 'profile',
      user: req.user,
      csrfToken: req.csrfToken(),
      messages: {
        error: error_msg && error_msg !== '' ? error_msg : null,
        success: success_msg && success_msg !== '' ? success_msg : null
      }
    });
  } catch (err) {
    console.error('Password update error:', err);
    req.flash('error_msg', 'Failed to update password');
    res.redirect('/auth/profile');
  }
});

// @route   GET /auth/change-password
// @desc    Show change password form
// @access  Private
router.get('/change-password', protect, (req, res) => {
  res.render('auth/change-password', {
    title: 'Change Password',
    activeTab: 'profile',
    csrfToken: req.csrfToken()
  });
});

// @route   POST /auth/change-password
// @desc    Change user password
// @access  Private
router.post('/change-password', protect, validatePasswordChange, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    // Check current password
    const isMatch = await req.user.comparePassword(currentPassword);

    if (!isMatch) {
      req.flash('error_msg', 'Current password is incorrect');
      return res.redirect('/auth/change-password');
    }

    // Update password
    req.user.password = newPassword;
    await req.user.save();

    req.flash('success_msg', 'Password updated successfully');
    res.redirect('/auth/profile');
  } catch (err) {
    console.error('Change password error:', err);
    req.flash('error_msg', 'Failed to update password');
    res.redirect('/auth/change-password');
  }
});

// ADMIN ONLY ROUTES
// @route   GET /auth/users
// @desc    List all users (admin only)
// @access  Private/Admin
router.get('/users', protect, async (req, res) => {
  // Check if user is admin
  if (!req.user.isAdmin) {
    req.flash('error_msg', 'Admin access required');
    return res.redirect('/');
  }

  try {
    const users = await User.findAll({
      attributes: ['id', 'username', 'email', 'isAdmin', 'lastLogin', 'createdAt']
    });

    res.render('auth/users', {
      title: 'User Management',
      activeTab: 'admin',
      users,
      currentUser: req.user,
      messages: {
        error: req.flash('error_msg'),
        success: req.flash('success_msg')
      },
      csrfToken: req.csrfToken()
    });
  } catch (err) {
    console.error('List users error:', err);
    req.flash('error_msg', 'Failed to fetch users');
    res.redirect('/');
  }
});

// @route   POST /auth/users
// @desc    Create a new user (admin only)
// @access  Private/Admin
router.post('/users', protect, async (req, res) => {
  // Check if user is admin
  if (!req.user.isAdmin) {
    return res.status(403).json({ 
      success: false, 
      error: 'Admin access required' 
    });
  }

  try {
    const { name, username, email, password, isAdmin } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ 
      where: { 
        [Op.or]: [
          { username },
          { email }
        ]
      }
    });

    if (userExists) {
      return res.status(400).json({
        success: false,
        error: 'User already exists with that username or email'
      });
    }

    // Create user
    const user = await User.create({
      name,
      username,
      email,
      password,
      isAdmin: isAdmin === 'true' || isAdmin === true
    });

    // Return success without password
    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin
      }
    });
  } catch (err) {
    console.error('Create user error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to create user'
    });
  }
});

// @route   GET /auth/register
// @desc    Show register form (admin only)
// @access  Private/Admin
router.get('/register', protect, (req, res) => {
  // Check if user is admin
  if (!req.user.isAdmin) {
    req.flash('error_msg', 'Admin access required');
    return res.redirect('/');
  }

  res.render('auth/register', {
    title: 'Register User',
    activeTab: 'admin',
    csrfToken: req.csrfToken()
  });
});

// @route   POST /auth/register
// @desc    Register a user (admin only)
// @access  Private/Admin
router.post('/register', protect, validateRegister, async (req, res) => {
  // Check if user is admin
  if (!req.user.isAdmin) {
    req.flash('error_msg', 'Admin access required');
    return res.redirect('/');
  }

  const { username, email, password, isAdmin } = req.body;

  try {
    // Check if user exists
    const userExists = await User.findOne({ 
      where: { 
        [User.sequelize.Op.or]: [
          { username },
          { email }
        ]
      }
    });

    if (userExists) {
      req.flash('error_msg', 'User already exists with that username or email');
      return res.redirect('/auth/register');
    }

    // Create user
    await User.create({
      username,
      email,
      password,
      isAdmin: isAdmin === 'on'
    });

    req.flash('success_msg', 'User registered successfully');
    res.redirect('/auth/users');
  } catch (err) {
    console.error('Register error:', err);
    req.flash('error_msg', 'Failed to register user');
    res.redirect('/auth/register');
  }
});

// @route   POST /auth/delete/:id
// @desc    Delete user (admin only)
// @access  Private/Admin
router.post('/delete/:id', protect, async (req, res) => {
  // Check if user is admin
  if (!req.user.isAdmin) {
    req.flash('error_msg', 'Admin access required');
    return res.redirect('/');
  }

  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      req.flash('error_msg', 'User not found');
      return res.redirect('/auth/users');
    }

    // Prevent deleting self
    if (user.id === req.user.id) {
      req.flash('error_msg', 'You cannot delete your own account');
      return res.redirect('/auth/users');
    }

    await user.destroy();

    req.flash('success_msg', 'User deleted successfully');
    res.redirect('/auth/users');
  } catch (err) {
    console.error('Delete user error:', err);
    req.flash('error_msg', 'Failed to delete user');
    res.redirect('/auth/users');
  }
});

module.exports = router; 