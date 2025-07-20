const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const FirebaseAccount = require('../models/FirebaseAccount');
const { protect, admin: adminMiddleware } = require('../middleware/auth');
const { validateFirebaseAccount } = require('../middleware/security');
const { 
  initializeFirebaseAccount, 
  removeFirebaseAccount 
} = require('../config/firebase');
const { Op } = require('sequelize');

// @route   GET /accounts
// @desc    List all firebase accounts
// @access  Private/Admin
router.get('/', protect, adminMiddleware, async (req, res) => {
  try {
    const accounts = await FirebaseAccount.findAll({
      attributes: ['id', 'name', 'projectId', 'clientEmail', 'isDefault', 'isActive', 'lastUsed', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });

    res.render('accounts/index', {
      title: 'Firebase Accounts',
      activeTab: 'accounts',
      accounts,
      csrfToken: req.csrfToken()
    });
  } catch (err) {
    console.error('List accounts error:', err);
    req.flash('error_msg', 'Failed to fetch accounts');
    res.redirect('/');
  }
});

// @route   GET /accounts/add
// @desc    Show add account form
// @access  Private/Admin
router.get('/add', protect, adminMiddleware, (req, res) => {
  res.render('accounts/add', {
    title: 'Add Firebase Account',
    activeTab: 'accounts',
    csrfToken: req.csrfToken()
  });
});

// @route   POST /accounts/add
// @desc    Add a new Firebase account
// @access  Private/Admin
router.post('/add', protect, adminMiddleware, validateFirebaseAccount, async (req, res) => {
  const { name, projectId, clientEmail, privateKey, isDefault } = req.body;

  try {
    // Check if account with the same name exists
    const accountExists = await FirebaseAccount.findOne({ where: { name } });

    if (accountExists) {
      req.flash('error_msg', 'An account with that name already exists');
      return res.redirect('/accounts/add');
    }

    // If this is set as default, unset any existing defaults
    if (isDefault === 'on') {
      await FirebaseAccount.update(
        { isDefault: false },
        { where: { isDefault: true } }
      );
    }

    // Create the account
    const account = await FirebaseAccount.create({
      name,
      projectId,
      clientEmail,
      privateKey,
      isDefault: isDefault === 'on',
      isActive: true,
      createdBy: req.user.id
    });

    // Try to initialize the Firebase account
    try {
      await initializeFirebaseAccount(account);
      req.flash('success_msg', 'Firebase account added and initialized successfully');
    } catch (initError) {
      req.flash('error_msg', `Account saved but initialization failed: ${initError.message}`);
    }

    res.redirect('/accounts');
  } catch (err) {
    console.error('Add account error:', err);
    req.flash('error_msg', 'Failed to add account');
    res.redirect('/accounts/add');
  }
});

// @route   GET /accounts/edit/:id
// @desc    Show edit account form
// @access  Private/Admin
router.get('/edit/:id', protect, adminMiddleware, async (req, res) => {
  try {
    const account = await FirebaseAccount.findByPk(req.params.id);

    if (!account) {
      req.flash('error_msg', 'Account not found');
      return res.redirect('/accounts');
    }

    res.render('accounts/edit', {
      title: 'Edit Firebase Account',
      activeTab: 'accounts',
      account,
      csrfToken: req.csrfToken()
    });
  } catch (err) {
    console.error('Edit account error:', err);
    req.flash('error_msg', 'Failed to fetch account');
    res.redirect('/accounts');
  }
});

// @route   POST /accounts/edit/:id
// @desc    Update a Firebase account
// @access  Private/Admin
router.post('/edit/:id', protect, adminMiddleware, async (req, res) => {
  const { name, projectId, clientEmail, privateKey, isDefault, isActive } = req.body;

  try {
    let account = await FirebaseAccount.findByPk(req.params.id);

    if (!account) {
      req.flash('error_msg', 'Account not found');
      return res.redirect('/accounts');
    }

    // Check if name is being changed and if new name already exists
    if (name !== account.name) {
      const nameExists = await FirebaseAccount.findOne({
        where: {
          name,
          id: { [Op.ne]: req.params.id }
        }
      });

      if (nameExists) {
        req.flash('error_msg', 'An account with that name already exists');
        return res.redirect(`/accounts/edit/${req.params.id}`);
      }
    }

    // If this is set as default, unset any existing defaults
    if (isDefault === 'on' && !account.isDefault) {
      await FirebaseAccount.update(
        { isDefault: false },
        { 
          where: { 
            isDefault: true,
            id: { [Op.ne]: req.params.id }
          } 
        }
      );
    }

    // Update the account
    const updateData = {
      name,
      projectId,
      clientEmail,
      isDefault: isDefault === 'on',
      isActive: isActive === 'on'
    };

    // Only update private key if provided
    if (privateKey && privateKey.trim() !== '') {
      updateData.privateKey = privateKey;
    }

    await account.update(updateData);

    // If account is no longer active, remove it from Firebase admin
    if (isActive !== 'on') {
      removeFirebaseAccount(account.id);
    } else {
      // Otherwise try to reinitialize with new config
      try {
        account = await FirebaseAccount.findByPk(req.params.id);
        await initializeFirebaseAccount(account);
      } catch (initError) {
        req.flash('error_msg', `Account updated but initialization failed: ${initError.message}`);
        return res.redirect('/accounts');
      }
    }

    req.flash('success_msg', 'Firebase account updated successfully');
    res.redirect('/accounts');
  } catch (err) {
    console.error('Update account error:', err);
    req.flash('error_msg', 'Failed to update account');
    res.redirect(`/accounts/edit/${req.params.id}`);
  }
});

// @route   POST /accounts/delete/:id
// @desc    Delete a Firebase account
// @access  Private/Admin
router.post('/delete/:id', protect, adminMiddleware, async (req, res) => {
  try {
    const account = await FirebaseAccount.findByPk(req.params.id);

    if (!account) {
      req.flash('error_msg', 'Account not found');
      return res.redirect('/accounts');
    }

    // Remove Firebase admin instance
    removeFirebaseAccount(account.id);

    // Delete the account
    await account.destroy();

    req.flash('success_msg', 'Firebase account deleted successfully');
    res.redirect('/accounts');
  } catch (err) {
    console.error('Delete account error:', err);
    req.flash('error_msg', 'Failed to delete account');
    res.redirect('/accounts');
  }
});

// @route   POST /accounts/default/:id
// @desc    Set an account as default
// @access  Private/Admin
router.post('/default/:id', protect, adminMiddleware, async (req, res) => {
  try {
    const account = await FirebaseAccount.findByPk(req.params.id);

    if (!account) {
      req.flash('error_msg', 'Account not found');
      return res.redirect('/accounts');
    }

    // Unset any existing defaults
    await FirebaseAccount.update(
      { isDefault: false },
      { where: { isDefault: true } }
    );

    // Set this account as default
    await account.update({ isDefault: true });

    req.flash('success_msg', `${account.name} is now the default Firebase account`);
    res.redirect('/accounts');
  } catch (err) {
    console.error('Set default account error:', err);
    req.flash('error_msg', 'Failed to set default account');
    res.redirect('/accounts');
  }
});

// @route   POST /accounts/test-credentials
// @desc    Test Firebase credentials before saving
// @access  Private/Admin
router.post('/test-credentials', protect, adminMiddleware, async (req, res) => {
  try {
    const { projectId, clientEmail, privateKey } = req.body;

    // Validate required fields
    if (!projectId || !clientEmail || !privateKey) {
      return res.status(400).json({
        success: false,
        message: 'Missing required credentials',
        detail: {
          error: 'Project ID, Client Email, and Private Key are all required'
        }
      });
    }

    let success = false;
    let message = '';
    let detail = {};
    
    try {
      // Create a temporary Firebase app to test credentials
      const testAppName = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const testCredentials = {
        projectId: projectId.trim(),
        clientEmail: clientEmail.trim(),
        privateKey: privateKey.replace(/\\n/g, '\n'),
      };

      // Initialize test Firebase app
      const testApp = admin.initializeApp({
        credential: admin.credential.cert(testCredentials),
      }, testAppName);
      
      // Test if the app is properly initialized
      if (testApp) {
        // Try to get messaging service to verify connectivity
        const messaging = testApp.messaging();
        
        // Additional validation: try to get app configuration
        const appName = testApp.name;
        
        detail = {
          projectId: projectId,
          appName: appName,
          serviceAccountEmail: clientEmail,
          initialized: true,
          messagingAvailable: !!messaging,
          testSuccessful: true
        };
        
        success = true;
        message = 'Firebase credentials are valid and connection successful!';
      } else {
        throw new Error('Failed to initialize Firebase Admin SDK with provided credentials');
      }
      
      // Clean up test app
      await testApp.delete();
      
    } catch (testError) {
      success = false;
      message = 'Invalid Firebase credentials or connection failed';
      detail = {
        error: testError.message,
        errorCode: testError.code || 'INVALID_CREDENTIALS',
        projectId: projectId,
        serviceAccountEmail: clientEmail,
        suggestions: [
          'Verify that the Project ID is correct',
          'Ensure the Service Account Email is valid',
          'Check that the Private Key is properly formatted',
          'Confirm the service account has appropriate permissions'
        ]
      };
      
      console.error('Firebase credentials test error:', testError);
    }
    
    return res.json({ success, message, detail });
    
  } catch (err) {
    console.error('Test credentials error:', err);
    
    return res.status(500).json({
      success: false,
      message: 'Internal server error during credentials test',
      detail: {
        error: err.message,
        errorType: err.name
      }
    });
  }
});

// @route   POST /accounts/test/:id
// @desc    Test a Firebase account connection
// @access  Private/Admin
router.post('/test/:id', protect, adminMiddleware, async (req, res) => {
  try {
    // Check if we have a CSRF token in the body (JSON) or req.body
    const token = req.body._csrf || (req.body && req.body._csrf);
    
    const account = await FirebaseAccount.findByPk(req.params.id);

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    // Try to initialize the account to test the connection
    let success = false;
    let message = '';
    let detail = {};
    
    try {
      const firebase = await initializeFirebaseAccount(account);
      
      // Test if the Firebase Admin SDK is properly initialized
      if (firebase) {
        // Try to get app configuration to verify connectivity
        const projectId = account.projectId;
        const appName = firebase.name;
        
        // Check if messaging service is available
        const messaging = firebase.messaging();
        
        // Get Firebase project information if possible
        detail = {
          projectId: projectId,
          appName: appName,
          serviceAccountEmail: account.clientEmail,
          initialized: true,
          messagingAvailable: !!messaging,
          lastUsed: account.lastUsed ? new Date(account.lastUsed).toLocaleString() : 'Never'
        };
        
        success = true;
        message = 'Firebase account connection test successful!';
      } else {
        throw new Error('Failed to initialize Firebase Admin SDK');
      }
    } catch (initError) {
      success = false;
      message = `Connection test failed`;
      detail = {
        error: initError.message,
        errorCode: initError.code || 'UNKNOWN',
        errorStack: initError.stack ? initError.stack.split('\n')[0] : 'No stack trace',
        serviceAccountEmail: account.clientEmail,
        projectId: account.projectId
      };
      
      console.error('Firebase connection test error:', initError);
    }
    
    // Check if it's an AJAX request
    if (req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest') {
      return res.json({ success, message, detail });
    }
    
    // Normal form submission flow
    if (success) {
      req.flash('success_msg', message);
    } else {
      req.flash('error_msg', `${message}: ${detail.error || 'Unknown error'}`);
    }
    
    res.redirect('/accounts');
  } catch (err) {
    console.error('Test account error:', err);
    
    // For AJAX requests
    if (req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest') {
      return res.status(500).json({
        success: false,
        message: 'Internal server error during connection test',
        detail: {
          error: err.message,
          errorType: err.name
        }
      });
    }
    
    req.flash('error_msg', 'Failed to test account connection');
    res.redirect('/accounts');
  }
});

module.exports = router; 