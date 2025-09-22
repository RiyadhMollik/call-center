// Phone number utilities
const formatPhoneNumber = (phoneNumber) => {
  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Add country code if missing (assuming US +1)
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  }
  
  return cleaned.startsWith('+') ? phoneNumber : `+${cleaned}`;
};

const validatePhoneNumber = (phoneNumber) => {
  const cleaned = phoneNumber.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 15;
};

// File utilities
const getFileExtension = (filename) => {
  return filename.split('.').pop().toLowerCase();
};

const generateUniqueFilename = (originalName) => {
  const timestamp = Date.now();
  const random = Math.round(Math.random() * 1E9);
  const extension = getFileExtension(originalName);
  return `${timestamp}-${random}.${extension}`;
};

// Date utilities
const formatDuration = (seconds) => {
  if (!seconds || seconds === 0) return '0:00';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const isValidDate = (dateString) => {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
};

// Array utilities
const chunkArray = (array, size) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

const removeDuplicates = (array) => {
  return [...new Set(array)];
};

// String utilities
const sanitizeString = (str) => {
  if (!str) return '';
  return str.trim().replace(/[<>]/g, '');
};

const truncateString = (str, maxLength) => {
  if (!str || str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
};

// Response utilities
const createSuccessResponse = (data, message = 'Success') => {
  return {
    success: true,
    message,
    data
  };
};

const createErrorResponse = (error, statusCode = 500) => {
  return {
    success: false,
    error: error.message || error,
    statusCode
  };
};

// Pagination utilities
const calculatePagination = (page, limit, total) => {
  const offset = (page - 1) * limit;
  const totalPages = Math.ceil(total / limit);
  
  return {
    page: parseInt(page),
    limit: parseInt(limit),
    total,
    totalPages,
    offset,
    hasNext: page < totalPages,
    hasPrev: page > 1
  };
};

module.exports = {
  // Phone utilities
  formatPhoneNumber,
  validatePhoneNumber,
  
  // File utilities
  getFileExtension,
  generateUniqueFilename,
  
  // Date utilities
  formatDuration,
  isValidDate,
  
  // Array utilities
  chunkArray,
  removeDuplicates,
  
  // String utilities
  sanitizeString,
  truncateString,
  
  // Response utilities
  createSuccessResponse,
  createErrorResponse,
  
  // Pagination utilities
  calculatePagination
};