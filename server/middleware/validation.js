const { body, param, query, validationResult } = require('express-validator');

// Validation result handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Recording validation rules
const validateRecordingUpload = [
  body('customName')
    .notEmpty()
    .withMessage('Custom name is required')
    .isLength({ max: 255 })
    .withMessage('Custom name must be less than 255 characters'),
  body('duration')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Duration must be a positive number'),
  body('trimStart')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Trim start must be a positive number'),
  body('trimEnd')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Trim end must be a positive number'),
  handleValidationErrors
];

const validateRecordingUpdate = [
  param('id').isInt().withMessage('Invalid recording ID'),
  body('customName')
    .optional()
    .notEmpty()
    .withMessage('Custom name cannot be empty')
    .isLength({ max: 255 })
    .withMessage('Custom name must be less than 255 characters'),
  body('trimStart')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Trim start must be a positive number'),
  body('trimEnd')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Trim end must be a positive number'),
  handleValidationErrors
];

// Call validation rules
const validateCallCreation = [
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 255 })
    .withMessage('Title must be less than 255 characters'),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('recordingId')
    .isInt()
    .withMessage('Recording ID must be a valid integer'),
  body('phoneNumbers')
    .isArray({ min: 1 })
    .withMessage('Phone numbers must be a non-empty array'),
  body('phoneNumbers.*')
    .notEmpty()
    .withMessage('Phone numbers cannot be empty'),
  body('scheduledAt')
    .optional()
    .isISO8601()
    .withMessage('Scheduled date must be in ISO 8601 format'),
  handleValidationErrors
];

const validateCallUpdate = [
  param('id').isInt().withMessage('Invalid call ID'),
  body('title')
    .optional()
    .notEmpty()
    .withMessage('Title cannot be empty')
    .isLength({ max: 255 })
    .withMessage('Title must be less than 255 characters'),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  handleValidationErrors
];

// Pagination validation
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  handleValidationErrors
];

// ID parameter validation
const validateId = [
  param('id').isInt().withMessage('Invalid ID parameter'),
  handleValidationErrors
];

module.exports = {
  validateRecordingUpload,
  validateRecordingUpdate,
  validateCallCreation,
  validateCallUpdate,
  validatePagination,
  validateId,
  handleValidationErrors
};