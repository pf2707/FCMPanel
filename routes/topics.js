const express = require('express');
const router = express.Router();
const { getFirebaseAdmin, initializeFirebaseAccount } = require('../config/firebase');
const Topic = require('../models/Topic');
const Device = require('../models/Device');
const TopicSubscription = require('../models/TopicSubscription');
const NotificationHistory = require('../models/NotificationHistory');
const FirebaseAccount = require('../models/FirebaseAccount');

// Helper function to initialize default topic
const initializeDefaultTopic = async () => {
  try {
    // Check if 'all' topic exists
    const allTopic = await Topic.findOne({ where: { name: 'all' } });
    if (!allTopic) {
      // Create default 'all' topic
      await Topic.create({
        name: 'all',
        description: 'Default topic for broadcasting to all devices',
        isActive: true
      });
      console.log('Default "all" topic created successfully');
    }
  } catch (error) {
    console.error('Error initializing default topic:', error);
  }
};

// Initialize default topic on module load
initializeDefaultTopic();

// GET: Display topics management page
router.get('/', async (req, res) => {
  try {
    // Get all active topics
    const topics = await Topic.findAll({ 
      where: { isActive: true },
      order: [['name', 'ASC']] 
    });
    
    // Get recent topic subscriptions with limit
    const recentSubscriptions = await TopicSubscription.findAll({
      include: [
        { model: Topic },
        { model: Device }
      ],
      order: [['createdAt', 'DESC']],
      limit: 10
    });
    
    // Format subscriptions for display
    const formattedSubscriptions = recentSubscriptions.map(subscription => {
      return {
        id: subscription.id,
        topic: subscription.Topic.name,
        deviceName: subscription.Device.name || 'Unnamed Device',
        deviceToken: subscription.Device.token.substring(0, 20) + '...',
        subscribedAt: subscription.subscribedAt.toLocaleString(),
        isActive: subscription.isActive,
        deviceId: subscription.deviceId
      };
    });
    
    res.render('topics', {
      title: 'Manage Topics',
      activeTab: 'topics',
      topics: topics.map(topic => topic.name),
      topicsData: topics,
      subscriptions: formattedSubscriptions,
      csrfToken: req.csrfToken()
    });
  } catch (error) {
    console.error('Error fetching topics data:', error);
    req.flash('error_msg', 'Error loading topics data');
    res.render('topics', {
      title: 'Manage Topics',
      activeTab: 'topics',
      topics: [],
      topicsData: [],
      subscriptions: [],
      csrfToken: req.csrfToken()
    });
  }
});

// POST: Create a new topic
router.post('/create', async (req, res) => {
  try {
    const { topicName, description } = req.body;
    
    if (!topicName) {
      req.flash('error_msg', 'Topic name is required');
      return res.redirect('/topics');
    }

    // Check if topic already exists
    const existingTopic = await Topic.findOne({ where: { name: topicName } });
    if (existingTopic) {
      req.flash('error_msg', 'A topic with that name already exists');
      return res.redirect('/topics');
    }
    
    // Create new topic
    await Topic.create({
      name: topicName,
      description: description || null,
      isActive: true
    });
    
    req.flash('success_msg', `Topic "${topicName}" created successfully`);
    res.redirect('/topics');
  } catch (error) {
    console.error('Error creating topic:', error);
    req.flash('error_msg', `Error creating topic: ${error.message}`);
    res.redirect('/topics');
  }
});

// POST: Send notification to a specific topic
router.post('/send-notification', async (req, res) => {
  try {
    const { title, body, topic, imageUrl, accountId } = req.body;
    
    if (!title || !body || !topic) {
      req.flash('error_msg', 'Title, body, and topic are required');
      return res.redirect('/topics');
    }
    
    // Check if topic exists
    const existingTopic = await Topic.findOne({ where: { name: topic, isActive: true } });
    if (!existingTopic) {
      req.flash('error_msg', 'Topic does not exist or is inactive');
      return res.redirect('/topics');
    }
    
    // Get Firebase Admin instance - use specified account or default
    const firebaseAdmin = accountId 
      ? await getFirebaseAdmin(accountId) 
      : await getFirebaseAdmin();
    
    if (!firebaseAdmin) {
      req.flash('error_msg', 'No valid Firebase account available for sending notifications');
      return res.redirect('/topics');
    }
    
    // Prepare notification message
    const message = {
      notification: {
        title,
        body,
      },
      data: {
        timestamp: Date.now().toString(),
        title,
        body,
        topic,
        type: 'topic'
      },
      android: {
        notification: {
          icon: 'ic_notification',
          color: '#3498db',
          clickAction: 'FLUTTER_NOTIFICATION_CLICK',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
        fcmOptions: {
          imageUrl: imageUrl || undefined,
        },
      },
      webpush: {
        notification: {
          icon: '/img/icon.png',
          badge: '/img/badge.png',
        },
      },
      topic // Target topic
    };

    // Send the message using the same method used for normal notifications
    const response = await firebaseAdmin.messaging().send(message);
    
    // Add to notification history if model exists
    if (typeof NotificationHistory !== 'undefined') {
      try {
        await NotificationHistory.create({
          title,
          body,
          target: `Topic: ${topic}`,
          status: 'Sent',
          sentBy: req.user ? req.user.id : null,
          accountId: accountId || null,
          accountName: accountId ? (await FirebaseAccount.findByPk(accountId))?.name || 'Unknown' : 'Default',
          data: JSON.stringify({
            imageUrl,
            topic,
            messageId: response
          })
        });
      } catch (historyError) {
        console.error('Failed to record notification history:', historyError);
      }
    }
    
    req.flash('success_msg', `Notification sent to topic "${topic}" successfully`);
    res.redirect('/topics');
  } catch (error) {
    console.error('Error sending topic notification:', error);
    req.flash('error_msg', `Error sending notification: ${error.message}`);
    res.redirect('/topics');
  }
});

// POST: Subscribe tokens to a topic
router.post('/subscribe', async (req, res) => {
  try {
    const { tokens, topic } = req.body;
    
    if (!tokens || !topic) {
      req.flash('error_msg', 'Tokens and topic are required');
      return res.redirect('/topics');
    }
    
    // Check if topic exists
    const existingTopic = await Topic.findOne({ where: { name: topic, isActive: true } });
    if (!existingTopic) {
      req.flash('error_msg', 'Topic does not exist or is inactive');
      return res.redirect('/topics');
    }
    
    // Convert tokens string to array
    const deviceTokens = tokens.split(',').map(token => token.trim()).filter(Boolean);
    
    if (deviceTokens.length === 0) {
      req.flash('error_msg', 'No valid device tokens provided');
      return res.redirect('/topics');
    }
    
    // Get Firebase Admin instance
    let firebaseAdmin;
    try {
      firebaseAdmin = await getFirebaseAdmin();
    } catch (error) {
      console.error('Error getting Firebase admin instance:', error);
      req.flash('error_msg', 'No Firebase accounts configured. Please add a Firebase account first.');
      return res.redirect('/topics');
    }
    
    if (!firebaseAdmin) {
      req.flash('error_msg', 'No Firebase accounts configured. Please add a Firebase account first.');
      return res.redirect('/topics');
    }
    
    // Subscribe tokens to topic using Firebase
    const response = await firebaseAdmin.messaging().subscribeToTopic(deviceTokens, topic);
    
    // Find devices by tokens and create subscriptions in the database
    const successfulTokens = [];
    const failedTokens = [];
    
    for (let i = 0; i < deviceTokens.length; i++) {
      try {
        const token = deviceTokens[i];
        const device = await Device.findOne({ where: { token } });
        
        if (device) {
          // Create subscription record
          await TopicSubscription.create({
            topicId: existingTopic.id,
            deviceId: device.id,
            isActive: true
          });
          successfulTokens.push(token);
        } else {
          failedTokens.push(token);
        }
      } catch (err) {
        console.error(`Error processing token ${deviceTokens[i]}:`, err);
        failedTokens.push(deviceTokens[i]);
      }
    }
    
    req.flash('success_msg', `Subscribed ${response.successCount} devices to topic "${topic}" successfully! Failed: ${response.failureCount}`);
    res.redirect('/topics');
  } catch (error) {
    console.error('Error subscribing to topic:', error);
    req.flash('error_msg', `Error subscribing to topic: ${error.message}`);
    res.redirect('/topics');
  }
});

// POST: Unsubscribe tokens from a topic
router.post('/unsubscribe', async (req, res) => {
  try {
    const { tokens, topic } = req.body;
    
    if (!tokens || !topic) {
      req.flash('error_msg', 'Tokens and topic are required');
      return res.redirect('/topics');
    }
    
    // Check if topic exists
    const existingTopic = await Topic.findOne({ where: { name: topic, isActive: true } });
    if (!existingTopic) {
      req.flash('error_msg', 'Topic does not exist or is inactive');
      return res.redirect('/topics');
    }
    
    // Convert tokens string to array
    const deviceTokens = tokens.split(',').map(token => token.trim()).filter(Boolean);
    
    if (deviceTokens.length === 0) {
      req.flash('error_msg', 'No valid device tokens provided');
      return res.redirect('/topics');
    }
    
    // Get Firebase Admin instance
    let firebaseAdmin;
    try {
      firebaseAdmin = await getFirebaseAdmin();
    } catch (error) {
      console.error('Error getting Firebase admin instance:', error);
      req.flash('error_msg', 'No Firebase accounts configured. Please add a Firebase account first.');
      return res.redirect('/topics');
    }
    
    if (!firebaseAdmin) {
      req.flash('error_msg', 'No Firebase accounts configured. Please add a Firebase account first.');
      return res.redirect('/topics');
    }
    
    // Unsubscribe tokens from topic using Firebase
    const response = await firebaseAdmin.messaging().unsubscribeFromTopic(deviceTokens, topic);
    
    // Update subscription records in the database
    for (const token of deviceTokens) {
      const device = await Device.findOne({ where: { token } });
      if (device) {
        const subscription = await TopicSubscription.findOne({
          where: {
            topicId: existingTopic.id,
            deviceId: device.id,
            isActive: true
          }
        });
        
        if (subscription) {
          // Update subscription to inactive
          await subscription.update({
            isActive: false,
            unsubscribedAt: new Date()
          });
        }
      }
    }
    
    req.flash('success_msg', `Unsubscribed ${response.successCount} devices from topic "${topic}" successfully! Failed: ${response.failureCount}`);
    res.redirect('/topics');
  } catch (error) {
    console.error('Error unsubscribing from topic:', error);
    req.flash('error_msg', `Error unsubscribing from topic: ${error.message}`);
    res.redirect('/topics');
  }
});

module.exports = router; 