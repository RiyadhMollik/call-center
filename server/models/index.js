const { sequelize } = require('../config/database');
const Recording = require('./Recording');
const Call = require('./Call');
const CallResult = require('./CallResult');

// Initialize all models
const models = {
  Recording,
  Call,
  CallResult
};

// Define associations
Call.belongsTo(Recording, { foreignKey: 'recordingId', as: 'recording' });
Recording.hasMany(Call, { foreignKey: 'recordingId', as: 'calls' });

Call.hasMany(CallResult, { foreignKey: 'callId', as: 'results' });
CallResult.belongsTo(Call, { foreignKey: 'callId', as: 'call' });

module.exports = {
  sequelize,
  ...models
};