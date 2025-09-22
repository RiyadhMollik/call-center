const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CallResult = sequelize.define('CallResult', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  callId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Calls',
      key: 'id'
    }
  },
  phoneNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Phone number that was called'
  },
  status: {
    type: DataTypes.ENUM('pending', 'calling', 'connected', 'completed', 'failed', 'busy', 'no_answer', 'invalid'),
    defaultValue: 'pending',
    comment: 'Individual call status'
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Call duration in seconds'
  },
  startTime: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When this specific call started'
  },
  endTime: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When this specific call ended'
  },
  callSid: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'External API call identifier'
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Error message if call failed'
  },
  apiResponse: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Raw API response for this call'
  },
  cost: {
    type: DataTypes.DECIMAL(10, 4),
    allowNull: true,
    comment: 'Cost of the call'
  },
  retryCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Number of retry attempts'
  }
}, {
  tableName: 'call_results',
  timestamps: true
});

module.exports = CallResult;