const config = {
  development: {
    server: {
      port: process.env.PORT || 5000,
      host: process.env.HOST || 'localhost',
      cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        credentials: true
      }
    },
    database: {
      dialect: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      database: process.env.DB_NAME || 'callcenter_voice',
      username: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      logging: console.log,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    },
    upload: {
      maxFileSize: 50 * 1024 * 1024, // 50MB
      allowedMimeTypes: ['audio/mpeg', 'audio/wav', 'audio/webm', 'audio/ogg'],
      uploadPath: './uploads'
    },
    voiceBroadcast: {
      apiUrl: process.env.VOICE_BROADCAST_API_URL || 'https://api.voicebroadcast.com/v1',
      apiKey: process.env.VOICE_BROADCAST_API_KEY || 'your-api-key',
      apiSecret: process.env.VOICE_BROADCAST_API_SECRET || 'your-api-secret',
      timeout: 30000,
      retryAttempts: 3,
      monitoringInterval: 30000,
      maxMonitoringTime: 7200000 // 2 hours
    }
  },

  production: {
    server: {
      port: process.env.PORT || 5000,
      host: process.env.HOST || '0.0.0.0',
      cors: {
        origin: process.env.CORS_ORIGIN,
        credentials: true
      }
    },
    database: {
      dialect: 'mysql',
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      database: process.env.DB_NAME,
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      logging: false,
      pool: {
        max: 20,
        min: 5,
        acquire: 30000,
        idle: 10000
      },
      dialectOptions: {
        ssl: process.env.DB_SSL === 'true' ? {
          require: true,
          rejectUnauthorized: false
        } : false
      }
    },
    upload: {
      maxFileSize: 100 * 1024 * 1024, // 100MB
      allowedMimeTypes: ['audio/mpeg', 'audio/wav', 'audio/webm', 'audio/ogg'],
      uploadPath: process.env.UPLOAD_PATH || './uploads'
    },
    voiceBroadcast: {
      apiUrl: process.env.VOICE_BROADCAST_API_URL,
      apiKey: process.env.VOICE_BROADCAST_API_KEY,
      apiSecret: process.env.VOICE_BROADCAST_API_SECRET,
      timeout: 30000,
      retryAttempts: 5,
      monitoringInterval: 30000,
      maxMonitoringTime: 7200000 // 2 hours
    }
  },

  test: {
    server: {
      port: process.env.PORT || 5001,
      host: process.env.HOST || 'localhost',
      cors: {
        origin: 'http://localhost:3000',
        credentials: true
      }
    },
    database: {
      dialect: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      database: process.env.DB_NAME_TEST || 'callcenter_voice_test',
      username: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      logging: false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    },
    upload: {
      maxFileSize: 10 * 1024 * 1024, // 10MB for testing
      allowedMimeTypes: ['audio/mpeg', 'audio/wav', 'audio/webm', 'audio/ogg'],
      uploadPath: './test-uploads'
    },
    voiceBroadcast: {
      apiUrl: 'http://localhost:3001/mock-api',
      apiKey: 'test-api-key',
      apiSecret: 'test-api-secret',
      timeout: 5000,
      retryAttempts: 1,
      monitoringInterval: 5000,
      maxMonitoringTime: 60000 // 1 minute for testing
    }
  }
};

const environment = process.env.NODE_ENV || 'development';

module.exports = config[environment];