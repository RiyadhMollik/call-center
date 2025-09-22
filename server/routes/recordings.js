const express = require('express');
const { 
  getAllRecordings,
  getRecordingById,
  uploadRecording,
  updateRecording,
  deleteRecording,
  downloadRecording,
  streamRecording
} = require('../controllers/RecordingController');
const upload = require('../middleware/upload');
const { asyncHandler } = require('../middleware/errorHandler');
const { 
  validateRecordingUpload, 
  validateRecordingUpdate, 
  validateId 
} = require('../middleware/validation');

const router = express.Router();

// GET /api/recordings - Get all recordings
router.get('/', asyncHandler(getAllRecordings));

// GET /api/recordings/:id - Get a specific recording
router.get('/:id', validateId, asyncHandler(getRecordingById));

// POST /api/recordings/upload - Upload a new recording
router.post('/upload', 
  upload.single('audio'), 
  validateRecordingUpload, 
  asyncHandler(uploadRecording)
);

// PUT /api/recordings/:id - Update recording metadata
router.put('/:id', 
  validateRecordingUpdate, 
  asyncHandler(updateRecording)
);

// DELETE /api/recordings/:id - Delete a recording
router.delete('/:id', 
  validateId, 
  asyncHandler(deleteRecording)
);

// GET /api/recordings/:id/download - Download a recording file
router.get('/:id/download', 
  validateId, 
  asyncHandler(downloadRecording)
);

// GET /api/recordings/:id/stream - Stream a recording file
router.get('/:id/stream', 
  validateId, 
  asyncHandler(streamRecording)
);

module.exports = router;