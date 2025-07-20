const express = require('express');
const router = express.Router();
const Device = require('../../models/Device');
const Topic = require('../../models/Topic');
const TopicSubscription = require('../../models/TopicSubscription');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

// API key validation middleware
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  
  // Check if API key is provided
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      message: 'API key is missing'
    });
  }
  
  // Get the API key from environment variables or config
  const validApiKey = process.env.DEVICE_REGISTRATION_API_KEY;
  
  // If no valid API key is configured, reject all requests
  if (!validApiKey) {
    console.error('DEVICE_REGISTRATION_API_KEY is not configured');
    return res.status(500).json({
      success: false,
      message: 'Server configuration error'
    });
  }
  
  // Compare API keys using a timing-safe comparison
  if (!crypto.timingSafeEqual(Buffer.from(apiKey), Buffer.from(validApiKey))) {
    return res.status(403).json({
      success: false,
      message: 'Invalid API key'
    });
  }
  
  next();
};

// Rate limiting middleware to prevent abuse
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests, please try again later'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Validation rules
const validateDeviceRegistration = [
  body('token')
    .notEmpty().withMessage('FCM token is required')
    .isString().withMessage('FCM token must be a string')
    .isLength({ min: 32, max: 255 }).withMessage('FCM token must be valid'),
  body('platform')
    .optional()
    .isString().withMessage('Platform must be a string')
    .isIn(['android', 'ios', 'web']).withMessage('Platform must be android, ios, or web'),
  body('name')
    .optional()
    .isString().withMessage('Name must be a string')
    .isLength({ max: 100 }).withMessage('Name must be no more than 100 characters'),
  body('topic')
    .optional()
    .isString().withMessage('Topic must be a string')
    .isLength({ max: 50 }).withMessage('Topic name must be no more than 50 characters')
];

// Helper function to get or create topic by name
async function getOrCreateTopic(topicName) {
  try {
    let topic = await Topic.findOne({ where: { name: topicName } });
    
    if (!topic) {
      // Create topic if it doesn't exist
      topic = await Topic.create({
        name: topicName,
        description: `Automatically created topic for "${topicName}"`,
        isActive: true
      });
    }
    
    return topic;
  } catch (error) {
    console.error(`Error getting or creating topic ${topicName}:`, error);
    throw error;
  }
}

// @route   POST /api/devices/register
// @desc    Register or update a device
// @access  Public (with API key and rate limiting)
router.post('/register', apiLimiter, validateApiKey, validateDeviceRegistration, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }
    
    const { id, name, platform, token, metadata, topic } = req.body;
    const topicName = topic || 'all'; // Default to 'all' if no topic provided
    
    // Enhanced security: Sanitize and validate metadata
    let sanitizedMetadata = null;
    if (metadata) {
      try {
        // If metadata is a string, parse it
        const metadataObj = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
        
        // Only allow specific fields in metadata to prevent abuse
        sanitizedMetadata = {
          appVersion: metadataObj.appVersion || null,
          osVersion: metadataObj.osVersion || null,
          deviceModel: metadataObj.deviceModel || null,
          // Add any other allowed fields
        };
      } catch (e) {
        return res.status(400).json({
          success: false,
          message: 'Invalid metadata format'
        });
      }
    }
    
    // Check if device exists by token
    const existingDevice = await Device.findOne({ where: { token } });
    
    // Generate device ID if not provided
    const deviceId = id || generateDeviceId(token, platform);
    
    let device;
    let isNewDevice = false;
    
    if (existingDevice) {
      // Update existing device
      await existingDevice.update({
        name: name || existingDevice.name,
        platform: platform || existingDevice.platform,
        lastSeen: new Date(),
        isActive: true,
        metadata: metadata ? sanitizedMetadata : existingDevice.metadata
      });
      
      device = existingDevice;
    } else {
      // Create new device
      device = await Device.create({
        id: deviceId,
        name: name || `${platform || 'unknown'}-device`,
        platform: platform || 'unknown',
        token,
        lastSeen: new Date(),
        isActive: true,
        metadata: metadata ? sanitizedMetadata : null
      });
      
      isNewDevice = true;
    }
    
    // Handle topic subscription
    try {
      // Get or create the topic
      const targetTopic = await getOrCreateTopic(topicName);
      
      // Check if device is already subscribed to this topic
      const existingSubscription = await TopicSubscription.findOne({
        where: {
          topicId: targetTopic.id,
          deviceId: device.id
        }
      });
      
      if (!existingSubscription) {
        // Create a new subscription
        await TopicSubscription.create({
          topicId: targetTopic.id,
          deviceId: device.id,
          isActive: true,
          subscribedAt: new Date()
        });
      } else if (!existingSubscription.isActive) {
        // Reactivate inactive subscription
        await existingSubscription.update({
          isActive: true,
          subscribedAt: new Date(),
          unsubscribedAt: null
        });
      }
      
      // Return response with subscription info
      return res.status(isNewDevice ? 201 : 200).json({ 
        success: true, 
        message: isNewDevice ? 'Device registered successfully' : 'Device updated successfully', 
        device: {
          id: device.id,
          name: device.name,
          platform: device.platform,
          lastSeen: device.lastSeen
        },
        subscription: {
          topic: topicName
        }
      });
    } catch (topicError) {
      console.error('Error handling topic subscription:', topicError);
      
      // Still return success for device registration, even if topic subscription failed
      return res.status(isNewDevice ? 201 : 200).json({ 
        success: true, 
        message: isNewDevice ? 'Device registered successfully' : 'Device updated successfully', 
        device: {
          id: device.id,
          name: device.name,
          platform: device.platform,
          lastSeen: device.lastSeen
        },
        subscription: {
          error: 'Topic subscription failed, but device was registered successfully'
        }
      });
    }
  } catch (error) {
    console.error('Error registering device:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: process.env.NODE_ENV === 'production' ? 'Server error' : error.message 
    });
  }
});

// Helper function to generate a deterministic device ID based on token and platform
function generateDeviceId(token, platform = 'unknown') {
  // Create a hash of the token
  const hash = crypto.createHash('sha256')
    .update(token + platform)
    .digest('hex');
  
  // Return first 16 characters of the hash
  return hash.substring(0, 16);
}

module.exports = router; 