import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`Making ${config.method.toUpperCase()} request to ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Voice Broadcast API Service
export const voiceBroadcastAPI = {
  // This is where you'll integrate with your external voice broadcast API
  // Replace these URLs and methods with your actual API endpoints from the PDF
  
  // Example placeholder methods - replace with actual API calls
  createCall: async (callData) => {
    // This should call your external voice broadcast API
    // For now, it's a placeholder that simulates the call
    return {
      data: {
        callId: `external_${Date.now()}`,
        status: 'initiated',
        message: 'Call initiated successfully'
      }
    };
  },

  getCallStatus: async (externalCallId) => {
    // Get status from external API
    return {
      data: {
        callId: externalCallId,
        status: 'completed',
        results: []
      }
    };
  },

  cancelCall: async (externalCallId) => {
    // Cancel call via external API
    return {
      data: {
        callId: externalCallId,
        status: 'cancelled'
      }
    };
  }
};

// Internal API calls for our application
export const callsAPI = {
  // Get all calls
  getCalls: (params = {}) => api.get('/calls', { params }),

  // Get specific call
  getCall: (id) => api.get(`/calls/${id}`),

  // Create new call
  createCall: (callData) => api.post('/calls', callData),

  // Update call
  updateCall: (id, updateData) => api.put(`/calls/${id}`, updateData),

  // Delete call
  deleteCall: (id) => api.delete(`/calls/${id}`),

  // Execute call
  executeCall: (id) => api.post(`/calls/${id}/execute`),

  // Cancel call
  cancelCall: (id) => api.post(`/calls/${id}/cancel`),

  // Get call statistics
  getCallStats: (id) => api.get(`/calls/${id}/stats`)
};

export const recordingsAPI = {
  // Get all recordings
  getRecordings: () => api.get('/recordings'),

  // Get specific recording
  getRecording: (id) => api.get(`/recordings/${id}`),

  // Delete recording
  deleteRecording: (id) => api.delete(`/recordings/${id}`),

  // Upload recording (multipart form data)
  uploadRecording: (formData) => {
    return api.post('/recordings', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }
};

// Utility functions
export const apiUtils = {
  // Handle API errors consistently
  handleError: (error) => {
    if (error.response) {
      // Server responded with error status
      return error.response.data?.error || error.response.statusText;
    } else if (error.request) {
      // Request was made but no response received
      return 'Network error - please check your connection';
    } else {
      // Something else happened
      return error.message || 'An unexpected error occurred';
    }
  },

  // Format phone numbers
  formatPhoneNumber: (phoneNumber) => {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Add country code if not present
    if (cleaned.length === 10) {
      return `+1${cleaned}`;
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+${cleaned}`;
    }
    
    return phoneNumber; // Return as-is if we can't format
  },

  // Validate phone numbers
  validatePhoneNumbers: (phoneNumbers) => {
    const validNumbers = [];
    const invalidNumbers = [];
    
    phoneNumbers.forEach(number => {
      const cleaned = number.replace(/\D/g, '');
      if (cleaned.length >= 10 && cleaned.length <= 15) {
        validNumbers.push(apiUtils.formatPhoneNumber(number));
      } else {
        invalidNumbers.push(number);
      }
    });
    
    return { validNumbers, invalidNumbers };
  }
};

export default api;