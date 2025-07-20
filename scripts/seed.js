require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');
const User = require('../models/User');
const FirebaseAccount = require('../models/FirebaseAccount');
const NotificationHistory = require('../models/NotificationHistory');
const Device = require('../models/Device');
const Topic = require('../models/Topic');
const TopicSubscription = require('../models/TopicSubscription');

// Initial admin user
const DEFAULT_ADMIN = {
  username: 'admin',
  email: 'admin@example.com',
  password: 'Admin123!',
  isAdmin: true
};

// Default topics
const DEFAULT_TOPICS = [
  {
    name: 'all',
    description: 'Default topic for broadcasting to all devices',
    isActive: true
  },
  {
    name: 'android',
    description: 'Topic for Android devices',
    isActive: true
  },
  {
    name: 'ios',
    description: 'Topic for iOS devices',
    isActive: true
  },
  {
    name: 'news',
    description: 'Topic for news notifications',
    isActive: true
  },
  {
    name: 'promotions',
    description: 'Topic for promotional notifications',
    isActive: true
  }
];

async function seed() {
  try {
    console.log('Starting database seeding...');
    
    // Sync database models
    await sequelize.sync({ alter: true });
    console.log('Database synchronized successfully');

    // Check if admin user already exists
    const adminExists = await User.findOne({ where: { username: DEFAULT_ADMIN.username } });
    
    if (!adminExists) {
      console.log('Creating default admin user...');
      await User.create(DEFAULT_ADMIN);
      console.log('Default admin user created successfully');
      console.log('Username:', DEFAULT_ADMIN.username);
      console.log('Password:', DEFAULT_ADMIN.password);
    } else {
      console.log('Admin user already exists, skipping creation');
    }

    // Create default topics
    console.log('Setting up default topics...');
    let topicsCreated = 0;
    
    for (const topicData of DEFAULT_TOPICS) {
      // Check if topic already exists
      const existingTopic = await Topic.findOne({ where: { name: topicData.name } });
      
      if (!existingTopic) {
        await Topic.create(topicData);
        topicsCreated++;
        console.log(`Topic '${topicData.name}' created successfully`);
      } else {
        console.log(`Topic '${topicData.name}' already exists, skipping`);
      }
    }
    
    console.log(`${topicsCreated} new topics created`);
    
    // Auto-subscribe existing devices to 'all' topic
    console.log('Checking for existing devices to subscribe to default topic...');
    
    const allTopic = await Topic.findOne({ where: { name: 'all' } });
    if (allTopic) {
      const devices = await Device.findAll({ where: { isActive: true } });
      
      if (devices.length > 0) {
        console.log(`Found ${devices.length} active devices`);
        let subscriptionsCreated = 0;
        
        for (const device of devices) {
          // Check if already subscribed
          const existingSubscription = await TopicSubscription.findOne({
            where: {
              topicId: allTopic.id,
              deviceId: device.id,
              isActive: true
            }
          });
          
          if (!existingSubscription) {
            await TopicSubscription.create({
              topicId: allTopic.id,
              deviceId: device.id,
              isActive: true
            });
            subscriptionsCreated++;
          }
        }
        
        console.log(`${subscriptionsCreated} devices subscribed to 'all' topic`);
      } else {
        console.log('No active devices found to subscribe');
      }
    }

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seed function
seed(); 