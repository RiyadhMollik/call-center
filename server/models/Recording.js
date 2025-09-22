const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Recording = sequelize.define('Recording', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  customName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 255]
    }
  },
  originalName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  fileName: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  filePath: {
    type: DataTypes.STRING,
    allowNull: false
  },
  fileSize: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  duration: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Duration in seconds'
  },
  mimeType: {
    type: DataTypes.STRING,
    allowNull: false
  },
  trimStart: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 0,
    comment: 'Trim start time in seconds'
  },
  trimEnd: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Trim end time in seconds (null means no end trim)'
  },
  uploadedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'recordings',
  timestamps: true,
  indexes: [
    {
      fields: ['customName']
    },
    {
      fields: ['uploadedAt']
    }
  ]
});

module.exports = Recording;