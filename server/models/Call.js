const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Call = sequelize.define('Call', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Campaign title/name'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Campaign description'
  },
  recordingId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Recordings',
      key: 'id'
    },
    comment: 'Voice recording to be used for calls'
  },
  phoneNumbers: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
    comment: 'Array of phone numbers to call'
  },
  status: {
    type: DataTypes.ENUM('pending', 'scheduled', 'running', 'completed', 'failed', 'cancelled'),
    defaultValue: 'pending',
    comment: 'Call campaign status'
  },
  scheduledAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When to execute the calls'
  },
  startedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When execution actually started'
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When execution completed'
  },
  totalCalls: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Total number of calls in campaign'
  },
  successfulCalls: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Number of successful calls'
  },
  failedCalls: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Number of failed calls'
  },
  settings: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'Call settings (retry count, delay, etc.)'
  },
  apiResponse: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Response from voice broadcast API'
  },
  blast_id: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'External API campaign identifier'
  }
}, {
  tableName: 'calls',
  timestamps: true
});

module.exports = Call;