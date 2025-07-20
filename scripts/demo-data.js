/**
 * Demo Data Generator Script
 * 
 * This script creates sample data for testing the FCM Dashboard.
 * It generates demo devices, topics, and subscriptions.
 * 
 * Usage: npm run demo-data
 */

require('dotenv').config();
const { faker } = require('@faker-js/faker');
const { sequelize } = require('../config/database');
const User = require('../models/User');
const FirebaseAccount = require('../models/FirebaseAccount');
const Device = require('../models/Device');
const Topic = require('../models/Topic');
const TopicSubscription = require('../models/TopicSubscription');
const crypto = require('crypto');

// Number of demo items to create
const NUM_DEMO_DEVICES = 20;

// Helper to generate fake FCM tokens
function generateFakeToken() {
  return faker.string.alphanumeric(160);
}

// Generate a deterministic device ID based on token
function generateDeviceId(token) {
  const hash = crypto.createHash('sha256')
    .update(token)
    .digest('hex');
  return hash.substring(0, 16);
}

async function generateDemoData() {
  try {
    console.log('Starting demo data generation...');
    
    // Check if database is set up
    await sequelize.authenticate();
    console.log('Database connection verified');
    
    // Get all existing topics
    const topics = await Topic.findAll({ where: { isActive: true } });
    
    if (topics.length === 0) {
      console.error('No topics found in database. Run npm run seed first.');
      process.exit(1);
    }
    
    console.log(`Found ${topics.length} topics in database`);
    
    // Generate demo devices
    console.log(`Generating ${NUM_DEMO_DEVICES} demo devices...`);
    
    const platforms = ['android', 'ios', 'web'];
    const demoDevices = [];
    
    for (let i = 0; i < NUM_DEMO_DEVICES; i++) {
      const platform = platforms[Math.floor(Math.random() * platforms.length)];
      const token = generateFakeToken();
      const deviceId = generateDeviceId(token);
      
      // Create demo device
      const device = await Device.create({
        id: deviceId,
        name: `${faker.person.firstName()}'s ${platform === 'web' ? 'Browser' : faker.commerce.productName()}`,
        platform,
        token,
        lastSeen: faker.date.recent(),
        isActive: Math.random() > 0.1, // 10% inactive
        metadata: {
          appVersion: `1.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`,
          osVersion: platform === 'android' ? 
            `${Math.floor(Math.random() * 5) + 7}.0` : 
            platform === 'ios' ? `${Math.floor(Math.random() * 5) + 12}.0` : 
            'N/A',
          deviceModel: platform === 'web' ? 
            'Browser' : 
            faker.commerce.productName()
        }
      });
      
      demoDevices.push(device);
      console.log(`Created demo device: ${device.name} (${platform})`);
      
      // Subscribe to random topics
      const numTopicsToSubscribe = Math.floor(Math.random() * (topics.length - 1)) + 1;
      const shuffledTopics = [...topics].sort(() => 0.5 - Math.random());
      const topicsToSubscribe = shuffledTopics.slice(0, numTopicsToSubscribe);
      
      for (const topic of topicsToSubscribe) {
        await TopicSubscription.create({
          topicId: topic.id,
          deviceId: device.id,
          isActive: Math.random() > 0.2, // 20% inactive subscriptions
          subscribedAt: faker.date.recent()
        });
        
        console.log(`Subscribed device ${device.name} to topic ${topic.name}`);
      }
    }
    
    console.log('\nDemo data generation complete!');
    console.log(`Generated ${demoDevices.length} devices with topic subscriptions`);
    console.log('\nYou can now start the application with npm run dev');
    
    process.exit(0);
  } catch (error) {
    console.error('Error generating demo data:', error);
    process.exit(1);
  }
}

// Run the demo data generator
generateDemoData(); 