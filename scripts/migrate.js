require('dotenv').config();
const { sequelize } = require('../config/database');
const User = require('../models/User');
const FirebaseAccount = require('../models/FirebaseAccount');
const Device = require('../models/Device');
const NotificationHistory = require('../models/NotificationHistory');
const Topic = require('../models/Topic');
const TopicSubscription = require('../models/TopicSubscription');

async function migrate() {
  try {
    console.log('Starting database migration...');
    
    // Force true will drop tables and recreate them - BE CAREFUL in production!
    // Only use when you need a complete reset
    const forceMode = process.argv.includes('--force');
    
    if (forceMode) {
      console.log('⚠️ WARNING: Force mode enabled. All existing data will be lost! ⚠️');
      console.log('You have 5 seconds to cancel this operation (Ctrl+C)...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    // Sync all models with database
    await sequelize.sync({ force: forceMode, alter: !forceMode });
    
    console.log(forceMode ? 
      '✅ Database structure recreated from scratch successfully!' : 
      '✅ Database structure updated successfully!');
    
    console.log('\nNext steps:');
    console.log('1. Run "npm run seed" to create initial admin user and default topics');
    console.log('2. Start your application with "npm run dev" or "npm start"');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during migration:', error);
    process.exit(1);
  }
}

migrate(); 