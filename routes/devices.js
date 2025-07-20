const express = require('express');
const router = express.Router();
const Device = require('../models/Device');
const { getFirebaseAdmin } = require('../config/firebase');
const TopicSubscription = require('../models/TopicSubscription');
const { sequelize } = require('../config/database');
const { 
  deviceOperationsRateLimiter,
  apiRateLimiter,
  sanitizeInput
} = require('../middleware/security');

// Get all devices
router.get('/', async (req, res) => {
  try {
    const devices = await Device.findAll({
      order: [['lastSeen', 'DESC']]
    });
    
    // Construct base URL for API references
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    res.render('devices', {
      title: 'Devices',
      activeTab: 'devices',
      devices,
      baseUrl,
      csrfToken: res.locals.csrfToken || ''
    });
  } catch (error) {
    console.error('Error fetching devices:', error);
    req.flash('error_msg', 'Error fetching devices');
    res.redirect('/');
  }
});

// API to register/update a device
router.post('/register', sanitizeInput, apiRateLimiter, deviceOperationsRateLimiter, async (req, res) => {
  try {
    const { id, name, platform, token, metadata } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'FCM token is required' });
    }
    
    // Check if device exists
    const existingDevice = await Device.findOne({ where: { token } });
    
    if (existingDevice) {
      // Update existing device
      await existingDevice.update({
        name: name || existingDevice.name,
        platform: platform || existingDevice.platform,
        lastSeen: new Date(),
        isActive: true,
        metadata: metadata || existingDevice.metadata
      });
      
      return res.status(200).json({ message: 'Device updated successfully', device: existingDevice });
    } else {
      // Create new device
      const newDevice = await Device.create({
        id: id || (token && typeof token === 'string' ? token.substring(0, 16) : ''), // Use part of token as ID if not provided
        name,
        platform,
        token,
        lastSeen: new Date(),
        isActive: true,
        metadata
      });
      
      return res.status(201).json({ message: 'Device registered successfully', device: newDevice });
    }
  } catch (error) {
    console.error('Error registering device:', error);
    return res.status(500).json({ error: 'Failed to register device' });
  }
});

// Mark device as inactive
router.post('/:id/inactive', deviceOperationsRateLimiter, async (req, res) => {
  try {
    const device = await Device.findByPk(req.params.id);
    
    if (!device) {
      req.flash('error_msg', 'Device not found');
      return res.redirect('/devices');
    }
    
    await device.update({ isActive: false });
    
    req.flash('success_msg', 'Device marked as inactive');
    res.redirect('/devices');
  } catch (error) {
    console.error('Error marking device as inactive:', error);
    req.flash('error_msg', 'Error updating device status');
    res.redirect('/devices');
  }
});

// Send test notification to device
router.post('/:id/test', deviceOperationsRateLimiter, async (req, res) => {
  try {
    const device = await Device.findByPk(req.params.id);
    
    if (!device) {
      req.flash('error_msg', 'Device not found');
      return res.redirect('/devices');
    }
    
    // Get Firebase account
    const firebaseAdmin = await getFirebaseAdmin();
    
    if (!firebaseAdmin) {
      req.flash('error_msg', 'No valid Firebase account available');
      return res.redirect('/devices');
    }
    
    // Create message with timestamp to verify delivery
    const timestamp = new Date().toISOString();
    
    try {
      // Validate FCM token format before sending
      if (!device.token || device.token.length < 100) {
        throw new Error('FCM token appears to be invalid (too short)');
      }
      
      const message = {
        notification: {
          title: 'Test Notification',
          body: `This is a test notification from FCM Dashboard (${timestamp})`
        },
        data: {
          timestamp: timestamp,
          type: 'test',
          deviceId: device.id
        },
        token: device.token
      };
      
      const response = await firebaseAdmin.messaging().send(message);
      
      req.flash('success_msg', `Test notification sent successfully! Message ID: ${response}`);
      
      // Update device's last seen timestamp
      await device.update({ lastSeen: new Date() });
    } catch (fcmError) {
      console.error('Firebase messaging error details:', fcmError);
      
      // Create more detailed error message
      let errorMsg = `Error sending test notification: ${fcmError.message}`;
      
      // Add Firebase specific error details if available
      if (fcmError.errorInfo) {
        errorMsg += ` (Code: ${fcmError.errorInfo.code})`;
        
        // Suggest solutions based on error code
        if (fcmError.errorInfo.code === 'messaging/invalid-argument') {
          errorMsg += '. Token may be invalid or the project may not match.';
        } else if (fcmError.errorInfo.code === 'messaging/registration-token-not-registered') {
          errorMsg += '. Device token is no longer valid.';
          
          // Mark device as inactive if token is invalid
          await device.update({ isActive: false });
        }
      }
      
      throw new Error(errorMsg);
    }
    
    res.redirect('/devices');
  } catch (error) {
    console.error('Error sending test notification:', error);
    
    // Create more detailed error message
    let errorMsg = `Error sending test notification: ${error.message}`;
    
    req.flash('error_msg', errorMsg);
    res.redirect('/devices');
  }
});

// Delete device
router.post('/:id/delete', deviceOperationsRateLimiter, async (req, res) => {
  try {
    const deviceId = req.params.id;
    const device = await Device.findByPk(deviceId);
    
    if (!device) {
      req.flash('error_msg', 'Device not found');
      return res.redirect('/devices');
    }
    
    // Use a transaction to ensure all operations succeed or fail together
    const t = await sequelize.transaction();
    
    try {
      // First delete any topic subscriptions associated with this device
      await TopicSubscription.destroy({
        where: { deviceId: deviceId },
        transaction: t
      });
      
      // Then delete the device
      await device.destroy({ transaction: t });
      
      // Commit the transaction
      await t.commit();
      
      req.flash('success_msg', 'Device deleted successfully');
    } catch (error) {
      // Rollback transaction if there's an error
      await t.rollback();
      throw error;
    }
    
    res.redirect('/devices');
  } catch (error) {
    console.error('Error deleting device:', error);
    req.flash('error_msg', 'Error deleting device');
    res.redirect('/devices');
  }
});

module.exports = router; 