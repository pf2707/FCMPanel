const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const NotificationHistory = sequelize.define('NotificationHistory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  body: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  target: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Pending'
  },
  messageId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  error: {
    type: DataTypes.STRING,
    allowNull: true
  },
  sentBy: {
    type: DataTypes.UUID,
    allowNull: true
  },
  accountId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  accountName: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'Default'
  },
  data: {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('data');
      if (rawValue) {
        try {
          return JSON.parse(rawValue);
        } catch (e) {
          return rawValue;
        }
      }
      return null;
    },
    set(value) {
      if (typeof value === 'object') {
        this.setDataValue('data', JSON.stringify(value));
      } else {
        this.setDataValue('data', value);
      }
    }
  },
  // Virtual fields for UI display
  formattedDate: {
    type: DataTypes.VIRTUAL,
    get() {
      return this.createdAt ? new Date(this.createdAt).toLocaleString() : 'Unknown';
    }
  },
  statusSummary: {
    type: DataTypes.VIRTUAL,
    get() {
      if (this.status === 'Success') {
        const data = this.get('data');
        if (data && data.successCount !== undefined) {
          return `Success (${data.successCount}/${data.successCount + (data.failureCount || 0)})`;
        }
        return 'Success';
      } else {
        return `Failed: ${this.error || 'Unknown error'}`;
      }
    }
  },
  targetShort: {
    type: DataTypes.VIRTUAL,
    get() {
      if (!this.target) return 'Unknown';
      if (this.target.startsWith('Device:')) {
        return 'Single Device';
      } else if (this.target.startsWith('Topic:')) {
        return this.target;
      } else if (this.target.startsWith('All Devices')) {
        return this.target;
      }
      return this.target;
    }
  }
}, {
  timestamps: true,
  indexes: [
    {
      name: 'notification_history_created_at',
      fields: ['createdAt']
    },
    {
      name: 'notification_history_sent_by',
      fields: ['sentBy']
    },
    {
      name: 'notification_history_account_id',
      fields: ['accountId']
    }
  ]
});

module.exports = NotificationHistory; 