const admin = require('firebase-admin');
const FirebaseAccount = require('../models/FirebaseAccount');

// Store active Firebase admin instances
const firebaseAdmins = new Map();

// Initialize default Firebase Admin instance from .env
const initializeDefaultFirebase = () => {
  try {
    // Initialize using environment variables (legacy support)
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      const defaultApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      }, 'default');
      
      firebaseAdmins.set('default', defaultApp);
      console.log('Default Firebase Admin initialized from environment variables');
      
      return true;
    } else {
      console.log('No default Firebase configuration found in environment variables');
      return false;
    }
  } catch (error) {
    console.error('Error initializing default Firebase Admin:', error);
    return false;
  }
};

// Initialize a specific Firebase account 
const initializeFirebaseAccount = async (account) => {
  try {
    if (!account || !account.projectId || !account.clientEmail || !account.privateKey) {
      throw new Error('Invalid Firebase account configuration');
    }
    
    // Check if app is already initialized
    if (firebaseAdmins.has(account.id)) {
      return firebaseAdmins.get(account.id);
    }
    
    // Initialize new app instance
    const firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: account.projectId,
        clientEmail: account.clientEmail,
        privateKey: account.privateKey.replace(/\\n/g, '\n'),
      }),
    }, account.id);
    
    // Store in our map
    firebaseAdmins.set(account.id, firebaseApp);
    
    // Update last used timestamp
    await FirebaseAccount.update(
      { lastUsed: new Date() },
      { where: { id: account.id } }
    );
    
    console.log(`Firebase Admin initialized for account: ${account.name}`);
    return firebaseApp;
  } catch (error) {
    console.error(`Error initializing Firebase account ${account?.name || 'unknown'}:`, error);
    throw error;
  }
};

// Initialize all Firebase accounts from database
const initializeAllFirebaseAccounts = async () => {
  try {
    // First initialize the default one from env variables
    const defaultInitialized = initializeDefaultFirebase();
    
    // Then initialize from database
    const accounts = await FirebaseAccount.findAll({ where: { isActive: true } });
    
    if (accounts && accounts.length > 0) {
      for (const account of accounts) {
        await initializeFirebaseAccount(account);
      }
      console.log(`Initialized ${accounts.length} Firebase accounts from database`);
    } else {
      console.log('No Firebase accounts found in database');
      
      // If no database accounts and no default from env, warn user
      if (!defaultInitialized) {
        console.warn('⚠️  No Firebase accounts configured. Add accounts via /accounts/add or set environment variables.');
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error initializing Firebase accounts:', error);
    return false;
  }
};

// Get a Firebase admin instance
const getFirebaseAdmin = async (accountId = null) => {
  try {
    let adminInstance = null;
    
    // If specific account ID provided, return that instance
    if (accountId && firebaseAdmins.has(accountId)) {
      adminInstance = firebaseAdmins.get(accountId);
    } else {
      // If no specific account requested, find the default account
      let defaultAccount = null;
      
      // Check if there's a default in database
      defaultAccount = await FirebaseAccount.findOne({ where: { isDefault: true, isActive: true } });
      if (defaultAccount) {
        // Initialize if not already initialized
        if (!firebaseAdmins.has(defaultAccount.id)) {
          await initializeFirebaseAccount(defaultAccount);
        }
        adminInstance = firebaseAdmins.get(defaultAccount.id);
      } else {
        // Fallback to environment variable based default
        if (firebaseAdmins.has('default')) {
          adminInstance = firebaseAdmins.get('default');
        }
        
        // If no defaults, use the first available account
        if (!adminInstance && firebaseAdmins.size > 0) {
          const firstKey = Array.from(firebaseAdmins.keys())[0];
          adminInstance = firebaseAdmins.get(firstKey);
        }
      }
    }
    
    if (!adminInstance) {
      console.warn('No Firebase admin instances available');
      return null;
    }
    
    // Return the admin instance that has the messaging() function
    return adminInstance;
  } catch (error) {
    console.error('Error getting Firebase admin instance:', error);
    throw error;
  }
};

// Clean up method for removing Firebase admin instances
const removeFirebaseAccount = (accountId) => {
  if (firebaseAdmins.has(accountId)) {
    const app = firebaseAdmins.get(accountId);
    app.delete()
      .then(() => {
        firebaseAdmins.delete(accountId);
        console.log(`Firebase account ${accountId} removed`);
      })
      .catch(error => {
        console.error(`Error removing Firebase account ${accountId}:`, error);
      });
  }
};

module.exports = { 
  initializeDefaultFirebase,
  initializeFirebaseAccount,
  initializeAllFirebaseAccounts,
  getFirebaseAdmin,
  removeFirebaseAccount
}; 