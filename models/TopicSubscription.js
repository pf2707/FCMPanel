const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Topic = require('./Topic');
const Device = require('./Device');

const TopicSubscription = sequelize.define('TopicSubscription', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  topicId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: Topic,
      key: 'id'
    }
  },
  deviceId: {
    type: DataTypes.STRING,
    allowNull: false,
    references: {
      model: Device,
      key: 'id'
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  subscribedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  unsubscribedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  timestamps: true
});

// Define associations
TopicSubscription.belongsTo(Topic, { 
  foreignKey: 'topicId'
});

TopicSubscription.belongsTo(Device, {
  foreignKey: 'deviceId'
});

Topic.hasMany(TopicSubscription, {
  foreignKey: 'topicId'
});

Device.hasMany(TopicSubscription, {
  foreignKey: 'deviceId'
});

// Many-to-many association through the junction table
Topic.belongsToMany(Device, { 
  through: TopicSubscription,
  foreignKey: 'topicId'
});

Device.belongsToMany(Topic, {
  through: TopicSubscription,
  foreignKey: 'deviceId'
});

module.exports = TopicSubscription; 