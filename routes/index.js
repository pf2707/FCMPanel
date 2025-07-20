const express = require('express');
const router = express.Router();
const expressLayouts = require('express-ejs-layouts');
const Device = require('../models/Device');
const FirebaseAccount = require('../models/FirebaseAccount');
const NotificationHistory = require('../models/NotificationHistory');
const Topic = require('../models/Topic');
const TopicSubscription = require('../models/TopicSubscription');
const { Sequelize } = require('sequelize');
const { Op } = require('sequelize');
const { protect } = require('../middleware/auth');

// Initialize express-ejs-layouts for main routes
router.use(expressLayouts);

// Home route with dashboard stats
router.get('/', protect, async (req, res) => {
  try {
    // Check if any Firebase accounts exist
    const accountCount = await FirebaseAccount.count();
    const hasFirebaseAccounts = accountCount > 0;
    
    // Get device statistics
    const totalDevices = await Device.count();
    
    // Get active devices - must be marked as active AND seen recently (30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const activeDevices = await Device.count({
      where: {
        isActive: true,
        lastSeen: {
          [Op.gte]: thirtyDaysAgo
        }
      }
    });
    
    // Get inactive devices - directly query for inactive devices
    const inactiveDevices = await Device.count({
      where: {
        [Op.or]: [
          { isActive: false },
          { lastSeen: null },
          { 
            lastSeen: {
              [Op.lt]: thirtyDaysAgo
            }
          }
        ]
      }
    });
    
    // Get platform statistics - include all devices, both active and inactive
    const platformDistribution = await Device.findAll({
      attributes: [
        'platform',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
        [Sequelize.fn('SUM', Sequelize.literal('CASE WHEN "isActive" = true THEN 1 ELSE 0 END')), 'activeCount'],
        [Sequelize.fn('SUM', Sequelize.literal('CASE WHEN "isActive" = false THEN 1 ELSE 0 END')), 'inactiveCount']
      ],
      group: ['platform'],
      order: [[Sequelize.fn('COUNT', Sequelize.col('id')), 'DESC']],
      raw: true
    });
    
    // Recent devices
    const recentDevices = await Device.findAll({
      order: [['lastSeen', 'DESC']],
      limit: 5
    });

    // Additional statistics for dashboard
    const totalAccounts = await FirebaseAccount.count();
    const totalTopics = await Topic.count();
    const totalSubscriptions = await TopicSubscription.count();
    
    // Notifications sent in last 30 days
    const notificationsSent30Days = await NotificationHistory.count({
      where: {
        createdAt: {
          [Op.gte]: thirtyDaysAgo
        }
      }
    });

    // Recent notifications (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentNotifications = await NotificationHistory.count({
      where: {
        createdAt: {
          [Op.gte]: sevenDaysAgo
        }
      }
    });
    
    res.render('home', { 
      layout: 'layout',
      title: 'Dashboard',
      activeTab: 'home',
      hasFirebaseAccounts,
      totalDevices,
      activeDevices,
      inactiveDevices,
      totalAccounts,
      totalTopics,
      totalSubscriptions,
      notificationsSent30Days,
      recentNotifications,
      platformDistribution,
      recentDevices,
      user: req.user,
      csrfToken: res.locals.csrfToken || ''
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).render('error', {
      layout: 'layout',
      title: 'Server Error',
      message: 'Error loading dashboard',
      error: process.env.NODE_ENV === 'production' ? {} : error,
      activeTab: '',
      user: req.user,
      csrfToken: res.locals.csrfToken || ''
    });
  }
});

module.exports = router; 