const express = require('express');
const {
  getAllCalls,
  getCallById,
  createCall,
  updateCall,
  deleteCall,
  executeCall,
  cancelCall,
  getCallStats,
  handleWebhook
} = require('../controllers/CallController');
const { asyncHandler } = require('../middleware/errorHandler');
const { 
  validateCallCreation, 
  validateCallUpdate, 
  validatePagination, 
  validateId 
} = require('../middleware/validation');

const router = express.Router();

// GET /api/calls - Get all calls with pagination and filtering
router.get('/', 
  validatePagination, 
  asyncHandler(getAllCalls)
);

// GET /api/calls/:id - Get a specific call with results
router.get('/:id', 
  validateId, 
  asyncHandler(getCallById)
);

// POST /api/calls - Create a new call campaign
router.post('/', 
  validateCallCreation, 
  asyncHandler(createCall)
);

// PUT /api/calls/:id - Update a call
router.put('/:id', 
  validateCallUpdate, 
  asyncHandler(updateCall)
);

// DELETE /api/calls/:id - Delete a call
router.delete('/:id', 
  validateId, 
  asyncHandler(deleteCall)
);

// POST /api/calls/:id/execute - Execute a call campaign
router.post('/:id/execute', 
  validateId, 
  asyncHandler(executeCall)
);

// POST /api/calls/:id/cancel - Cancel a running call
router.post('/:id/cancel', 
  validateId, 
  asyncHandler(cancelCall)
);

// GET /api/calls/:id/stats - Get call statistics
router.get('/:id/stats', 
  validateId, 
  asyncHandler(getCallStats)
);

// POST /api/calls/webhook - Handle webhooks
router.post('/webhook', 
  asyncHandler(handleWebhook)
);

module.exports = router;
