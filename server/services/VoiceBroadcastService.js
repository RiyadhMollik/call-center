const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const os = require('os');

// Configuration
const config = {
  apiBaseUrl: process.env.VOICE_BROADCAST_API_URL || 'http://103.174.214.170:7002/broadcast/index.php/api/do_blast',
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

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`Voice Broadcast API: ${config.method.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Voice Broadcast API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

/**
 * Setup FFmpeg path for different installation methods
 */
const setupFFmpeg = () => {
    const platform = os.platform();
    let ffmpegPath = null;
    
    try {
      if (platform === 'win32') {
        // Try different Windows installation paths
        const possiblePaths = [
          // Scoop installation path
          path.join(os.homedir(), 'scoop', 'apps', 'ffmpeg', 'current', 'bin', 'ffmpeg.exe'),
          // Chocolatey installation path
          'C:\\ProgramData\\chocolatey\\bin\\ffmpeg.exe',
          // Manual installation paths
          'C:\\ffmpeg\\bin\\ffmpeg.exe',
          'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
          // Try system PATH
          'ffmpeg'
        ];
        
        for (const possiblePath of possiblePaths) {
          if (possiblePath === 'ffmpeg') {
            // Test if ffmpeg is in PATH
            try {
              require('child_process').execSync('ffmpeg -version', { stdio: 'ignore' });
              ffmpegPath = 'ffmpeg';
              break;
            } catch (e) {
              continue;
            }
          } else if (fs.existsSync(possiblePath)) {
            ffmpegPath = possiblePath;
            break;
          }
        }
      } else {
        // For Linux/macOS, try common paths
        const possiblePaths = [
          '/usr/bin/ffmpeg',
          '/usr/local/bin/ffmpeg',
          '/opt/homebrew/bin/ffmpeg', // macOS ARM Homebrew
          'ffmpeg' // Try PATH
        ];
        
        for (const possiblePath of possiblePaths) {
          if (possiblePath === 'ffmpeg') {
            try {
              require('child_process').execSync('which ffmpeg', { stdio: 'ignore' });
              ffmpegPath = 'ffmpeg';
              break;
            } catch (e) {
              continue;
            }
          } else if (fs.existsSync(possiblePath)) {
            ffmpegPath = possiblePath;
            break;
          }
        }
      }
      
      if (ffmpegPath) {
        console.log(`FFmpeg found at: ${ffmpegPath}`);
        ffmpeg.setFfmpegPath(ffmpegPath);
        
        // Also set ffprobe path if possible
        const ffprobePath = ffmpegPath.replace('ffmpeg', 'ffprobe');
        if (fs.existsSync(ffprobePath) || ffmpegPath === 'ffmpeg') {
          ffmpeg.setFfprobePath(ffmpegPath === 'ffmpeg' ? 'ffprobe' : ffprobePath);
        }
      } else {
        console.warn('FFmpeg not found in common installation paths');
      }
    } catch (error) {
      console.warn('Error setting up FFmpeg path:', error.message);
    }
  };

/**
 * Check if FFmpeg is available on the system
 */
const checkFFmpegAvailability = () => {
    ffmpeg.getAvailableFormats((err, formats) => {
      if (err) {
        console.warn('FFmpeg not found or not properly configured. Audio conversion may fail.');
        console.warn('Error details:', err.message);
        console.warn('Please install FFmpeg or check the installation:');
        console.warn('- Windows: scoop install ffmpeg OR choco install ffmpeg');
        console.warn('- Linux: sudo apt install ffmpeg');
        console.warn('- macOS: brew install ffmpeg');
      } else {
        console.log('✅ FFmpeg is available for audio conversion');
        console.log(`📊 ${Object.keys(formats).length} audio/video formats supported`);
      }
    });
  };

/**
 * Create and execute a voice broadcast campaign
 * @param {Object} campaignData - Campaign configuration
 * @param {string} campaignData.campaignName - Campaign name
 * @param {string[]} campaignData.phoneNumbers - Array of phone numbers
 * @param {string} campaignData.audioFilePath - Path to audio file
 * @param {string} campaignData.callerId - Caller ID
 * @param {number} campaignData.retry - Retry count
 * @returns {Promise<Object>} Campaign creation response
 */
const createCampaign = async (campaignData) => {
    try {
      // Convert audio file to WAV format first
      const wavFilePath = await convertToWav(campaignData.audioFilePath);
      
      // For this API, we create and execute in one call
      const formData = new FormData();
      
      // Use provided caller ID or default
      const callerId = campaignData.callerId || '09612010568';
      const retry = campaignData.retry || 1;
      
      formData.append('callerid', callerId);
      formData.append('voice', fs.createReadStream(wavFilePath));
      formData.append('retry', retry.toString());
      formData.append('arr_dst', JSON.stringify(campaignData.phoneNumbers));
      
      // Create authentication header
      const authHeader = `Basic ${Buffer.from(`${config.apiUser}:${config.apiPass}`).toString('base64')}`;
      
      console.log('Creating campaign...');
      console.log('Form Data:', {
        callerId: callerId,
        audioFile: wavFilePath,
        retry: retry,
        phoneNumbers: campaignData.phoneNumbers,
      });
      
      const response = await axios.post(config.apiBaseUrl, formData, {
        headers: {
          'user': config.apiUser,
          'pass': config.apiPass,
          'Authorization': authHeader,
          ...formData.getHeaders(),
        },
        timeout: 60000 // Increase timeout for file upload
      });
      console.log('Campaign created successfully:', response.data);
      
      // Generate a unique campaign ID for tracking
      const campaignId = `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Clean up temporary converted file if it's different from original
      if (wavFilePath !== campaignData.audioFilePath) {
        setTimeout(() => {
          fs.unlink(wavFilePath, (err) => {
            if (err) {
              console.warn('Failed to delete temporary WAV file:', err.message);
            } else {
              console.log('Temporary WAV file deleted:', wavFilePath);
            }
          });
        }, 5000); // Wait 5 seconds before cleanup to ensure upload is complete
      }

      return {
        success: true,
        campaignId: campaignId,
        status: 'created',
        successCount: campaignData.phoneNumbers.length,
        failedCount: 0,
        apiResponse: response.data,
        details: {
          campaignId: campaignId,
          phoneNumbers: campaignData.phoneNumbers,
          callerId: callerId,
          retry: retry,
          audioFormat: 'wav',
          originalFile: campaignData.audioFilePath,
          convertedFile: wavFilePath
        }
      };
    } catch (error) {
      console.error('Voice Broadcast API Error:', error.response?.data || error.message);
      
      // Clean up temporary file on error if conversion was performed
      const wavFilePath = campaignData.audioFilePath.replace(/\.[^/.]+$/, '_converted.wav');
      if (fs.existsSync(wavFilePath) && wavFilePath !== campaignData.audioFilePath) {
        fs.unlink(wavFilePath, (err) => {
          if (err) console.warn('Failed to cleanup temporary file on error:', err.message);
        });
      }

      return {
        success: false,
        error: error.response?.data?.message || error.message,
        details: error.response?.data
      };
    }
  };

/**
 * Execute a campaign (for this API, execution happens during creation)
 * @param {string} campaignId - Internal campaign ID
 * @returns {Promise<Object>} Execution response
 */
const executeCampaign = async (campaignId) => {
    try {
      // Since the API executes immediately during creation,
      // we just return success with the campaign ID
      return {
        success: true,
        status: 'executing',
        campaignId: campaignId,
        data: {
          message: 'Campaign execution started',
          campaignId: campaignId,
          startedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        details: error
      };
    }
  };

/**
 * Get campaign status and results (simplified for this API)
 * @param {string} campaignId - Internal campaign ID
 * @returns {Promise<Object>} Campaign status and results
 */
const getCampaignStatus = async (campaignId) => {
    try {
      // Since this API doesn't provide status checking,
      // we simulate campaign completion after a reasonable time
      const campaignAge = Date.now() - parseInt(campaignId.split('_')[1]);
      const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
      
      if (campaignAge > fiveMinutes) {
        return {
          success: true,
          status: 'completed',
          results: [],
          statistics: {
            total: 0,
            successful: 0,
            failed: 0
          },
          data: {
            campaignId: campaignId,
            completedAt: new Date().toISOString()
          }
        };
      } else {
        return {
          success: true,
          status: 'running',
          results: [],
          statistics: {
            total: 0,
            successful: 0,
            failed: 0
          },
          data: {
            campaignId: campaignId,
            status: 'running'
          }
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        details: error
      };
    }
  };

/**
 * Cancel a running campaign (not supported by this API)
 * @param {string} campaignId - Internal campaign ID
 * @returns {Promise<Object>} Cancellation response
 */
const cancelCampaign = async (campaignId) => {
    try {
      // This API doesn't support campaign cancellation
      // Return success but indicate limitation
      return {
        success: true,
        status: 'cancelled',
        data: {
          campaignId: campaignId,
          message: 'Campaign cancellation requested (API limitation: cannot cancel running campaigns)',
          cancelledAt: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        details: error
      };
    }
  };

/**
 * Handle webhook data (placeholder for future implementation)
 * @param {Object} webhookData - Webhook payload
 * @returns {Promise<Object>} Webhook processing response
 */
const handleWebhook = async (webhookData) => {
    try {
      console.log('Webhook received:', webhookData);
      
      return {
        success: true,
        campaignId: webhookData.campaignId || 'unknown',
        data: webhookData
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        details: error
      };
    }
  };

/**
 * Convert audio file to WAV format
 * @param {string} inputPath - Path to the input audio file
 * @returns {Promise<string>} Path to the converted WAV file
 */
const convertToWav = async (inputPath) => {
    return new Promise((resolve, reject) => {
      // Check if file exists
      if (!fs.existsSync(inputPath)) {
        reject(new Error(`Audio file not found: ${inputPath}`));
        return;
      }

      // Generate output path with .wav extension
      const inputDir = path.dirname(inputPath);
      const inputName = path.basename(inputPath, path.extname(inputPath));
      const outputPath = path.join(inputDir, `${inputName}_converted.wav`);

      // Check if file is already WAV format
      const inputExt = path.extname(inputPath).toLowerCase();
      if (inputExt === '.wav') {
        console.log('✅ File is already in WAV format:', path.basename(inputPath));
        resolve(inputPath);
        return;
      }

      console.log(`🔄 Converting ${path.basename(inputPath)} to WAV format...`);

      ffmpeg(inputPath)
        .toFormat('wav')
        .audioCodec('pcm_s16le') // 16-bit PCM
        .audioFrequency(8000)    // 8kHz sample rate (common for voice)
        .audioChannels(1)        // Mono
        .on('start', (commandLine) => {
          console.log('🎵 FFmpeg command:', commandLine);
        })
        .on('progress', (progress) => {
          const percent = Math.round(progress.percent || 0);
          console.log(`📈 Conversion progress: ${percent}%`);
        })
        .on('end', () => {
          console.log('✅ Audio conversion completed successfully');
          console.log(`📁 Output file: ${path.basename(outputPath)}`);
          resolve(outputPath);
        })
        .on('error', (err) => {
          console.error('Audio conversion error:', err.message);
          
          // Provide helpful error messages
          if (err.message.includes('ffmpeg')) {
            reject(new Error('FFmpeg is not installed or not found in PATH. Please install FFmpeg to convert audio files.'));
          } else if (err.message.includes('Invalid data found')) {
            reject(new Error('Invalid audio file format. Please ensure the file is a valid audio file.'));
          } else {
            reject(new Error(`Failed to convert audio: ${err.message}`));
          }
        })
        .save(outputPath);
    });
  };

/**
 * Format phone numbers according to API requirements
 * @param {string[]} phoneNumbers - Array of phone numbers
 * @returns {string[]} Formatted phone number
 */
const formatPhoneNumbers = (phoneNumbers) => {
    // Ensure we have an array
    if (!Array.isArray(phoneNumbers)) {
      console.error('formatPhoneNumbers received non-array:', typeof phoneNumbers, phoneNumbers);
      throw new Error('Phone numbers must be an array');
    }
    
    return phoneNumbers.map(number => {
      // Remove all non-digit characters
      const cleaned = number.replace(/\D/g, '');
      
      // Add country code if needed (adjust based on your API requirements)
      if (cleaned.length === 10) {
        return `+1${cleaned}`; // US/Canada
      } else if (cleaned.length === 11 && cleaned.startsWith('01')) {
        return `88${cleaned}`;
      }
      
      return number; // Return as-is if already formatted
    });
  };

// Initialize FFmpeg on module load
const initializeFFmpeg = () => {
  setupFFmpeg();
  checkFFmpegAvailability();
};

// Call initialization after all functions are declared
initializeFFmpeg();

module.exports = {
  createCampaign,
  executeCampaign,
  getCampaignStatus,
  cancelCampaign,
  handleWebhook,
  convertToWav,
  formatPhoneNumbers
};