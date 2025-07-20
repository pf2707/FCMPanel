const express = require('express');
const router = express.Router();
const { getFirebaseAdmin } = require('../config/firebase');
const FirebaseAccount = require('../models/FirebaseAccount');
const Device = require('../models/Device');
const { protect } = require('../middleware/auth');
const { Op } = require('sequelize');
const { body, validationResult } = require('express-validator');

// Create notification history model
const NotificationHistory = require('../models/NotificationHistory');

// Input validation
const validateNotification = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ max: 100 }).withMessage('Title cannot exceed 100 characters')
    .escape(),
  body('body')
    .trim()
    .notEmpty().withMessage('Body is required')
    .isLength({ max: 1000 }).withMessage('Body cannot exceed 1000 characters')
    .escape(),
  body('imageUrl')
    .optional({ checkFalsy: true })
    .isURL().withMessage('Image URL must be a valid URL')
];

// GET: Display notification form
router.get('/', protect, async (req, res) => {
  try {
    // Get Firebase accounts for selection
    const accounts = await FirebaseAccount.findAll({
      where: { isActive: true },
      attributes: ['id', 'name', 'isDefault'],
      order: [['name', 'ASC']]
    });
    
    // Get notification history
    const history = await NotificationHistory.findAll({
      order: [['createdAt', 'DESC']],
      limit: 20
    });
    
    // Get all active devices for device selection
    const devices = await Device.findAll({
      where: { isActive: true },
      attributes: ['id', 'name', 'platform', 'token'],
      order: [['name', 'ASC']]
    });
    
    // Get topics from active devices (for now just use platform as topics)
    const topics = [...new Set(devices.map(device => device.platform).filter(Boolean))];
    
    // Check if any Firebase accounts exist
    const hasFirebaseAccounts = accounts.length > 0;
    
    // Find default account
    const defaultAccount = accounts.find(account => account.isDefault);
    
    // Render the notification form
    res.render('notifications/index', {
      title: 'Send Notifications',
      activeTab: 'notifications',
      devices,
      topics,
      accounts,
      defaultAccount,
      hasFirebaseAccounts,
      history,
      user: req.user,
      csrfToken: req.csrfToken()
    });
  } catch (error) {
    console.error('Error loading notification page:', error);
    req.flash('error_msg', 'Failed to load notification page');
    res.redirect('/');
  }
});

// POST: Send a notification
router.post('/', protect, validateNotification, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error_msg', errors.array().map(e => e.msg).join(', '));
    return res.redirect('/notifications');
  }

  // Get form data
  const { 
    title, 
    body, 
    imageUrl, 
    targetType, 
    deviceToken, 
    topic, 
    clickAction, 
    highPriority, 
    silent,
    accountId // Get the selected account ID
  } = req.body;

  try {
    // Find selected Firebase account or use default if not specified
    let firebaseAccount;
    if (accountId) {
      firebaseAccount = await FirebaseAccount.findByPk(accountId);
    } else {
      firebaseAccount = await FirebaseAccount.findOne({ where: { isDefault: true } });
    }

    if (!firebaseAccount) {
      req.flash('error_msg', 'No Firebase account selected or available');
      return res.redirect('/notifications');
    }

    // Create notification payload
    const message = {
      notification: {
        title: title,
        body: body
      },
      data: {
        title: title,
        body: body,
        timestamp: Date.now().toString()
      },
      android: {
        priority: highPriority ? 'high' : 'normal',
        notification: {
          clickAction: clickAction || undefined
        }
      },
      apns: {
        payload: {
          aps: {
            contentAvailable: Boolean(silent)
          }
        },
        fcmOptions: {
          imageUrl: imageUrl || undefined
        }
      },
      webpush: {
        notification: {
          icon: imageUrl || undefined
        }
      }
    };

    // If it's a silent notification, remove the notification object
    if (silent) {
      delete message.notification;
    }

    // Add click action if provided
    if (clickAction) {
      message.webpush.fcmOptions = { link: clickAction };
    }

    // Get Firebase Admin SDK for the selected account
    const firebaseAdmin = await getFirebaseAdmin(firebaseAccount.id);

    if (!firebaseAdmin) {
      throw new Error(`Firebase Admin not initialized for account: ${firebaseAccount.name}`);
    }

    // Get account name for history
    let accountName = 'Default';
    if (firebaseAccount) {
      accountName = firebaseAccount.name;
    }

    let response;
    let targetDescription;
    // Determine target type and send accordingly
    if (targetType === 'device' && deviceToken) {
      // Add the token to the message
      message.token = deviceToken;
      response = await firebaseAdmin.messaging().send(message);
      targetDescription = `Device: ${deviceToken.substring(0, 12)}...`;
    } else if (targetType === 'topic' && topic) {
      // Add the topic to the message
      message.topic = topic;
      response = await firebaseAdmin.messaging().send(message);
      targetDescription = `Topic: ${topic}`;
    } else {
      // Send to all devices (multicast)
      const devices = await Device.findAll({
        where: { isActive: true },
        attributes: ['token']
      });
      
      if (devices.length === 0) {
        throw new Error('No active devices found to send notification');
      }
      
      const tokens = devices.map(device => device.token);
      
      // For multicast, we need to send to each device individually (sendAll isn't available)
      let successCount = 0;
      let failureCount = 0;
      const batchResponse = { successCount: 0, failureCount: 0, responses: [] };
      
      // Send messages in batches of 500 (FCM limit)
      const BATCH_SIZE = 500;
      
      // Process in batches
      for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
        const batch = tokens.slice(i, i + BATCH_SIZE);
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(tokens.length / BATCH_SIZE);
        
        // Create a multicast message
        const multicastMessage = {
          tokens: batch,
          notification: message.notification,
          data: message.data,
          android: message.android,
          webpush: message.webpush,
          apns: message.apns
        };
        
        try {
          // Send the multicast message using sendEachForMulticast instead of sendMulticast
          const batchResult = await firebaseAdmin.messaging().sendEachForMulticast(multicastMessage);
          
          // Add to overall results
          batchResponse.successCount += batchResult.successCount;
          batchResponse.failureCount += batchResult.failureCount;

          // Process and log errors for failed messages
          if (batchResult.responses) {
            const failedMessages = batchResult.responses
              .map((resp, index) => {
                if (!resp.success) {
                  return {
                    token: batch[index],
                    error: resp.error.code,
                    errorMessage: resp.error.message
                  };
                }
                return null;
              })
              .filter(Boolean);

            if (failedMessages.length > 0) {
              // Group errors by error code for efficient logging
              const errorSummary = failedMessages.reduce((acc, curr) => {
                const key = curr.error;
                if (!acc[key]) {
                  acc[key] = {
                    count: 0,
                    message: curr.errorMessage,
                    tokens: []
                  };
                }
                acc[key].count++;
                // Store only first few tokens for each error type to avoid memory issues
                if (acc[key].tokens.length < 5) {
                  acc[key].tokens.push(curr.token.substring(0, 12) + '...');
                }
                return acc;
              }, {});
            }

            batchResponse.responses = [...batchResponse.responses, ...batchResult.responses];
          }
        } catch (batchError) {
          console.error(`Batch ${batchNumber}/${totalBatches} failed completely: ${batchError.message}`);
          batchResponse.failureCount += batch.length;
        }
      }
      
      // Create a detailed response message
      const errorSummary = batchResponse.responses
        .reduce((acc, resp, index) => {
          if (!resp.success) {
            const errorCode = resp.error.code;
            if (!acc[errorCode]) {
              acc[errorCode] = {
                count: 0,
                message: resp.error.message
              };
            }
            acc[errorCode].count++;
          }
          return acc;
        }, {});

      let detailedResponse = `${batchResponse.successCount} sent, ${batchResponse.failureCount} failed`;
      if (batchResponse.failureCount > 0) {
        detailedResponse += '\nError Summary:';
        Object.entries(errorSummary).forEach(([code, data]) => {
          detailedResponse += `\n- ${code} (${data.count} devices): ${data.message}`;
        });
      }

      response = detailedResponse;
      targetDescription = `All Devices (${tokens.length})`;
    }
    
    // Add to notification history
    await NotificationHistory.create({
      title,
      body,
      target: targetDescription,
      status: 'Success',
      messageId: response,
      sentBy: req.user.id,
      accountId: accountId || null,
      accountName,
      data: JSON.stringify({
        imageUrl,
        targetType,
        response
      })
    });
    
    req.flash('success_msg', `Notification sent to ${targetDescription} successfully`);
    res.redirect('/notifications');
  } catch (error) {
    console.error('Error sending notification:', error);
    
    // Add to notification history
    await NotificationHistory.create({
      title: req.body.title || 'Unknown',
      body: req.body.body || 'Unknown',
      target: 'Unknown',
      status: 'Failed',
      error: error.message,
      sentBy: req.user.id,
      accountId: req.body.accountId || null,
      accountName: req.body.accountId ? 'Custom' : 'Default',
      data: JSON.stringify({
        error: error.message,
        imageUrl: req.body.imageUrl
      })
    });
    
    req.flash('error_msg', `Error sending notification: ${error.message}`);
    res.redirect('/notifications');
  }
});

// POST: Send notification to specific devices
router.post('/send-devices', protect, validateNotification, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error_msg', errors.array()[0].msg);
    return res.redirect('/notifications');
  }
  
  try {
    const { title, body, deviceIds, customTokens, imageUrl, accountId } = req.body;
    
    if ((!deviceIds || deviceIds.length === 0) && (!customTokens || customTokens.trim() === '')) {
      req.flash('error_msg', 'At least one device must be selected or tokens must be provided');
      return res.redirect('/notifications');
    }
    
    // Get the appropriate Firebase admin instance
    const firebaseAdmin = await getFirebaseAdmin(accountId);
    
    // Get account name for history
    let accountName = 'Default';
    if (accountId) {
      const account = await FirebaseAccount.findByPk(accountId);
      if (account) {
        accountName = account.name;
      }
    }
    
    // Collect device tokens
    let deviceTokens = [];
    
    // Add tokens from selected devices
    if (deviceIds && deviceIds.length > 0) {
      // Check if deviceIds is an array or a single value
      const deviceIdArray = Array.isArray(deviceIds) ? deviceIds : [deviceIds];
      
      const devices = await Device.findAll({
        where: { 
          id: { [Op.in]: deviceIdArray },
          isActive: true 
        }
      });
      
      deviceTokens = deviceTokens.concat(devices.map(device => device.token));
    }
    
    // Add custom tokens
    if (customTokens && customTokens.trim() !== '') {
      const customTokenArray = customTokens
        .split(',')
        .map(token => token.trim())
        .filter(Boolean);
        
      deviceTokens = deviceTokens.concat(customTokenArray);
    }
    
    // Remove duplicates
    deviceTokens = [...new Set(deviceTokens)];
    
    if (deviceTokens.length === 0) {
      req.flash('error_msg', 'No valid device tokens found');
      return res.redirect('/notifications');
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
        type: 'direct'
      },
      android: {
        notification: {
          icon: 'ic_notification',
          color: '#3c6382',
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
      }
    };

    // Send multicast message
    const response = await firebaseAdmin.messaging().sendEachForMulticast({
      tokens: deviceTokens,
      ...message,
    });
    
    // Add to notification history
    await NotificationHistory.create({
      title,
      body,
      target: `${deviceTokens.length} device(s)`,
      status: `Success: ${response.successCount}, Failed: ${response.failureCount}`,
      sentBy: req.user.id,
      accountId: accountId || null,
      accountName,
      data: JSON.stringify({
        imageUrl,
        deviceCount: deviceTokens.length,
        successCount: response.successCount,
        failureCount: response.failureCount,
        responses: response.responses
      })
    });
    
    req.flash('success_msg', `Notification sent to ${response.successCount} device(s) successfully! Failed: ${response.failureCount}`);
    res.redirect('/notifications');
  } catch (error) {
    console.error('Error sending notification to devices:', error);
    
    // Add to notification history
    await NotificationHistory.create({
      title: req.body.title || 'Unknown',
      body: req.body.body || 'Unknown',
      target: 'Selected devices',
      status: 'Failed',
      error: error.message,
      sentBy: req.user.id,
      accountId: req.body.accountId || null,
      accountName: req.body.accountId ? 'Custom' : 'Default',
      data: JSON.stringify({
        error: error.message,
        imageUrl: req.body.imageUrl
      })
    });
    
    req.flash('error_msg', `Error sending notification: ${error.message}`);
    res.redirect('/notifications');
  }
});

// DELETE: Clear notification history
router.post('/clear-history', protect, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      req.flash('error_msg', 'Admin access required to clear history');
      return res.redirect('/notifications');
    }
    
    await NotificationHistory.destroy({ where: {} });
    
    req.flash('success_msg', 'Notification history cleared successfully');
    res.redirect('/notifications');
  } catch (error) {
    console.error('Error clearing notification history:', error);
    req.flash('error_msg', 'Error clearing notification history');
    res.redirect('/notifications');
  }
});

module.exports = router; 