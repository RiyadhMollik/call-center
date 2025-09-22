const { Recording, Call } = require('../models');
const axios = require('axios');
const { createCampaign } = require('../services/VoiceBroadcastService');
const { Op } = require('sequelize');
const validator = require('validator');
const config = {
  apiBaseUrl: process.env.VOICE_BROADCAST_API_URL || 'http://103.174.214.170:7002/broadcast/index.php/api/get_report',
  apiUser: process.env.VOICE_BROADCAST_API_USER || 'brri',
  apiPass: process.env.VOICE_BROADCAST_API_PASS || 'brri@3211'
};

// Initialize axios instance
const api = axios.create({
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});
// Utility functions
const formatPhoneNumber = (phone) => {
  return phone.replace(/\D/g, '');
};

const createResponse = (success = true, message = '', data = null) => {
  return { success, message, data };
};

// Get all calls with pagination and filtering
const getAllCalls = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;

    const whereCondition = {};
    if (status) {
      whereCondition.status = status;
    }

    const calls = await Call.findAndCountAll({
      where: whereCondition,
      include: [{ model: Recording, as: 'recording' }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const totalPages = Math.ceil(calls.count / limit);

    res.json(createResponse(true, 'Calls retrieved successfully', {
      calls: calls.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: calls.count,
        itemsPerPage: parseInt(limit)
      }
    }));
  } catch (error) {
    console.error('Error fetching calls:', error);
    res.status(500).json(createResponse(false, 'Failed to fetch calls'));
  }
};

// Get a specific call by ID
const getCallById = async (req, res) => {
  try {
    const callId = req.params.id;

    const call = await Call.findByPk(callId, {
      include: [{ model: Recording, as: 'recording' }]
    });

    if (!call) {
      return res.status(404).json(createResponse(false, 'Call not found'));
    }

    // Initialize response data with call information
    let responseData = { call };

    // Only fetch API report if blast_id exists (campaign has been executed)
    if (call.blast_id) {
      try {
        const authHeader = `Basic ${Buffer.from(`${config.apiUser}:${config.apiPass}`).toString('base64')}`;
        
        // Create FormData for the API request
        const FormData = require('form-data');
        const formData = new FormData();
        formData.append('blast_id', call.blast_id.toString());
        
        console.log('Fetching call details for blast_id:', call.blast_id);
        console.log('Request body: blast_id =', call.blast_id);
        
        const response = await axios.post(config.apiBaseUrl, formData, {
          headers: {
            'user': config.apiUser,
            'pass': config.apiPass,
            'Authorization': authHeader,
            ...formData.getHeaders()
          },
          timeout: 60000
        });

        responseData.apiResponse = response.data;
      } catch (apiError) {
        console.error('Error fetching API report:', apiError.response?.data || apiError.message);
        responseData.apiError = 'Failed to fetch campaign report from API';
      }
    } else {
      responseData.note = 'Campaign not executed yet - no blast_id available';
    }

    res.json(createResponse(true, 'Call retrieved successfully', responseData));
  } catch (error) {
    console.error('Error fetching call:', error);
    res.status(500).json(createResponse(false, 'Failed to fetch call'));
  }
};

// Create a new call campaign
const createCall = async (req, res) => {
  try {
    const {
      recordingId,
      phoneNumbers,
      title,
      callerId = '',
      retry = 3
    } = req.body;

    // Validate inputs
    if (!recordingId || !phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
      return res.status(400).json(createResponse(false, 'Missing required fields'));
    }

    if (!title || title.trim() === '') {
      return res.status(400).json(createResponse(false, 'Title is required'));
    }

    // Validate retry count
    const retryCount = parseInt(retry);
    if (isNaN(retryCount) || retryCount < 0 || retryCount > 10) {
      return res.status(400).json(createResponse(false, 'Retry count must be between 0 and 10'));
    }

    // Validate caller ID if provided
    if (callerId && !validator.isMobilePhone(callerId)) {
      return res.status(400).json(createResponse(false, 'Invalid caller ID format'));
    }

    // Check if recording exists
    const recording = await Recording.findByPk(recordingId);
    if (!recording) {
      return res.status(400).json(createResponse(false, 'Recording not found'));
    }

    // Validate and format phone numbers
    const validPhoneNumbers = [];
    const invalidNumbers = [];

    for (const phone of phoneNumbers) {
      const formattedPhone = formatPhoneNumber(phone);
      if (validator.isMobilePhone(formattedPhone)) {
        validPhoneNumbers.push(formattedPhone);
      } else {
        invalidNumbers.push(phone);
      }
    }

    if (validPhoneNumbers.length === 0) {
      return res.status(400).json(createResponse(false, 'No valid phone numbers provided'));
    }

    // Create the call campaign
    const call = await Call.create({
      recordingId,
      phoneNumbers: validPhoneNumbers,
      title: title.trim(),
      callerId: callerId ? formatPhoneNumber(callerId) : null,
      retry: retryCount,
      status: 'pending',
      totalNumbers: validPhoneNumbers.length,
      successCount: 0,
      failedCount: 0,
      metadata: {
        invalidNumbers: invalidNumbers.length > 0 ? invalidNumbers : null,
        createdBy: req.user?.id || 'system',
        originalPhoneCount: phoneNumbers.length
      }
    });

    const responseData = {
      call,
      validNumbersCount: validPhoneNumbers.length,
      invalidNumbersCount: invalidNumbers.length
    };

    if (invalidNumbers.length > 0) {
      responseData.invalidNumbers = invalidNumbers;
    }

    res.status(201).json(createResponse(
      true,
      `Call campaign created successfully. ${validPhoneNumbers.length} valid numbers, ${invalidNumbers.length} invalid numbers.`,
      responseData
    ));
  } catch (error) {
    console.error('Error creating call:', error);
    res.status(500).json(createResponse(false, 'Failed to create call campaign'));
  }
};

// Update a call
const updateCall = async (req, res) => {
  try {
    const callId = req.params.id;
    const { title, callerId, retry, status } = req.body;

    const call = await Call.findByPk(callId);
    if (!call) {
      return res.status(404).json(createResponse(false, 'Call not found'));
    }

    // Prevent updating calls that are in progress
    if (call.status === 'in_progress' && status !== 'cancelled') {
      return res.status(400).json(createResponse(false, 'Cannot update call in progress'));
    }

    const updateData = {};

    if (title !== undefined) {
      if (!title || title.trim() === '') {
        return res.status(400).json(createResponse(false, 'Title cannot be empty'));
      }
      updateData.title = title.trim();
    }

    if (callerId !== undefined) {
      if (callerId && !validator.isMobilePhone(callerId)) {
        return res.status(400).json(createResponse(false, 'Invalid caller ID format'));
      }
      updateData.callerId = callerId ? formatPhoneNumber(callerId) : null;
    }

    if (retry !== undefined) {
      const retryCount = parseInt(retry);
      if (isNaN(retryCount) || retryCount < 0 || retryCount > 10) {
        return res.status(400).json(createResponse(false, 'Retry count must be between 0 and 10'));
      }
      updateData.retry = retryCount;
    }

    if (status !== undefined) {
      const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled', 'failed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json(createResponse(false, 'Invalid status'));
      }
      updateData.status = status;
    }

    await call.update(updateData);

    res.json(createResponse(true, 'Call updated successfully', call));
  } catch (error) {
    console.error('Error updating call:', error);
    res.status(500).json(createResponse(false, 'Failed to update call'));
  }
};

// Delete a call
const deleteCall = async (req, res) => {
  try {
    const callId = req.params.id;

    const call = await Call.findByPk(callId);
    if (!call) {
      return res.status(404).json(createResponse(false, 'Call not found'));
    }

    // Prevent deleting calls that are in progress
    if (call.status === 'in_progress') {
      return res.status(400).json(createResponse(false, 'Cannot delete call in progress. Cancel it first.'));
    }

    await call.destroy();

    res.json(createResponse(true, 'Call deleted successfully'));
  } catch (error) {
    console.error('Error deleting call:', error);
    res.status(500).json(createResponse(false, 'Failed to delete call'));
  }
};

// Execute a call campaign
const executeCall = async (req, res) => {
  try {
    const callId = req.params.id;

    const call = await Call.findByPk(callId, {
      include: [{ model: Recording, as: 'recording' }]
    });

    if (!call) {
      return res.status(404).json(createResponse(false, 'Call not found'));
    }

    if (call.status === 'in_progress') {
      return res.status(400).json(createResponse(false, 'Call is already in progress'));
    }

    if (call.status === 'completed') {
      return res.status(400).json(createResponse(false, 'Call has already been completed'));
    }

    if (!call.recording) {
      return res.status(400).json(createResponse(false, 'Recording not found for this call'));
    }

    // Update call status to in progress
    await call.update({
      status: 'in_progress',
      startedAt: new Date()
    });

    try {
      // Execute the voice broadcast
      console.log('Call data:', call);

      // Parse settings JSON to get callerId and retry
      let callerId = null;
      let retry = 1;

      if (call.settings) {
        try {
          const settings = JSON.parse(call.settings);
          callerId = settings.callerId || null;
          retry = settings.retry || 1;
        } catch (parseError) {
          console.error('Error parsing call settings:', parseError);
        }
      }

      // Parse phoneNumbers JSON string to array
      let phoneNumbers = [];
      if (call.phoneNumbers) {
        try {
          // Check if it's already an array or a JSON string
          if (Array.isArray(call.phoneNumbers)) {
            phoneNumbers = call.phoneNumbers;
          } else if (typeof call.phoneNumbers === 'string') {
            phoneNumbers = JSON.parse(call.phoneNumbers);
          }
        } catch (parseError) {
          console.error('Error parsing phone numbers:', parseError);
          phoneNumbers = []; // fallback to empty array
        }
      }

      console.log('Parsed phone numbers:', phoneNumbers);

      const broadcastResult = await createCampaign({
        campaignName: call.title,
        phoneNumbers: phoneNumbers,
        audioFilePath: call.recording.filePath,
        callerId: callerId,
        retry: retry
      });

      // Update call with results
      await call.update({
        status: 'completed',
        completedAt: new Date(),
        successCount: broadcastResult?.successCount || 0,
        failedCount: broadcastResult?.failedCount || 0,
        blast_id: broadcastResult?.apiResponse?.blast_id,
        apiResponse: broadcastResult?.apiResponse
      });

      res.json(createResponse(true, 'Call campaign executed successfully', {
        call,
        broadcastResult
      }));

    } catch (broadcastError) {
      console.error('Voice broadcast failed:', broadcastError);

      // Update call status to failed
      await call.update({
        status: 'failed',
        completedAt: new Date(),
        errorMessage: broadcastError.message || 'Voice broadcast failed'
      });

      res.status(500).json(createResponse(false, `Voice broadcast failed: ${broadcastError.message}`));
    }

  } catch (error) {
    console.error('Error executing call:', error);
    res.status(500).json(createResponse(false, 'Failed to execute call campaign'));
  }
};

// Cancel a running call
const cancelCall = async (req, res) => {
  try {
    const callId = req.params.id;

    const call = await Call.findByPk(callId);
    if (!call) {
      return res.status(404).json(createResponse(false, 'Call not found'));
    }

    if (call.status !== 'in_progress') {
      return res.status(400).json(createResponse(false, 'Call is not in progress'));
    }

    await call.update({
      status: 'cancelled',
      completedAt: new Date()
    });

    res.json(createResponse(true, 'Call cancelled successfully', call));
  } catch (error) {
    console.error('Error cancelling call:', error);
    res.status(500).json(createResponse(false, 'Failed to cancel call'));
  }
};

// Get call statistics
const getCallStats = async (req, res) => {
  try {
    const callId = req.params.id;

    const call = await Call.findByPk(callId);
    if (!call) {
      return res.status(404).json(createResponse(false, 'Call not found'));
    }

    const stats = {
      campaignName: call.campaignName,
      status: call.status,
      totalNumbers: call.totalNumbers,
      successCount: call.successCount,
      failedCount: call.failedCount,
      successRate: call.totalNumbers > 0 ? ((call.successCount / call.totalNumbers) * 100).toFixed(2) : 0,
      createdAt: call.createdAt,
      startedAt: call.startedAt,
      completedAt: call.completedAt,
      duration: call.startedAt && call.completedAt ?
        Math.round((new Date(call.completedAt) - new Date(call.startedAt)) / 1000) : null
    };

    res.json(createResponse(true, 'Call statistics retrieved successfully', stats));
  } catch (error) {
    console.error('Error getting call stats:', error);
    res.status(500).json(createResponse(false, 'Failed to get call statistics'));
  }
};

// Handle webhooks from voice broadcast service
const handleWebhook = async (req, res) => {
  try {
    const { campaignId, status, results } = req.body;

    if (!campaignId) {
      return res.status(400).json(createResponse(false, 'Campaign ID is required'));
    }

    // Find call by blast_id (external campaign ID)
    const call = await Call.findOne({
      where: { blast_id: campaignId }
    });

    if (!call) {
      return res.status(404).json(createResponse(false, 'Call not found for campaign ID'));
    }

    // Update call with webhook data
    const updateData = {
      status: status || call.status,
      results: results || call.results
    };

    if (results) {
      updateData.successCount = results.successCount || 0;
      updateData.failedCount = results.failedCount || 0;
    }

    if (status === 'completed' || status === 'failed') {
      updateData.completedAt = new Date();
    }

    await call.update(updateData);

    res.json(createResponse(true, 'Webhook processed successfully'));
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).json(createResponse(false, 'Failed to process webhook'));
  }
};

module.exports = {
  getAllCalls,
  getCallById,
  createCall,
  updateCall,
  deleteCall,
  executeCall,
  cancelCall,
  getCallStats,
  handleWebhook
};