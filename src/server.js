const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { securityConfig, createRateLimiters, securityHeaders } = require('./config/security');
require('dotenv').config();

// Import logging and debugging utilities
const logger = process.env.VERCEL === '1' 
  ? require('./utils/logger-serverless') 
  : require('./utils/logger');
const debug = require('./utils/debug');
const { requestLogger, errorRequestLogger } = require('./middleware/requestLogger');
const { performanceMonitoring, healthCheck, errorTracking } = require('./middleware/monitoring');

const connectDB = process.env.VERCEL === '1' 
  ? require('./config/database-serverless') 
  : require('./config/database');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const transportEntryRoutes = require('./routes/transportEntries');
const debugRoutes = require('./routes/debug');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');

// Initialize logging
logger.info('🚀 Starting server...', {
  environment: process.env.NODE_ENV,
  nodeVersion: process.version,
  port: process.env.PORT || 5000
});

debug.env(); // Log environment info in debug mode

// Connect to MongoDB (with error handling for serverless)
if (process.env.VERCEL === '1') {
  // Serverless: Connect on first request to avoid cold start issues
  let dbConnected = false;
  
  app.use(async (req, res, next) => {
    if (!dbConnected) {
      try {
        await connectDB();
        dbConnected = true;
      } catch (error) {
        console.error('Database connection failed:', error.message);
        return res.status(500).json({ 
          error: 'Database connection failed',
          message: 'Please try again later'
        });
      }
    }
    next();
  });
} else {
  // Traditional deployment: Connect immediately
  connectDB();
}

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy for production (behind reverse proxy)
app.set('trust proxy', securityConfig.trustProxy);

// Security middleware
app.use(securityHeaders);

// Create rate limiters
const rateLimiters = createRateLimiters();

// Apply general rate limiting
app.use(rateLimiters.general);

// Apply stricter rate limiting for auth endpoints
app.use('/api/auth', rateLimiters.auth);

// CORS configuration
app.use(cors(securityConfig.cors));

// Body parsing middleware with size limits
const maxSize = process.env.MAX_REQUEST_SIZE || '10mb';
app.use(express.json({ 
  limit: maxSize,
  verify: (req, res, buf) => {
    // Store raw body for webhook verification if needed
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: maxSize 
}));

// Request logging and performance monitoring middleware
app.use(requestLogger);
app.use(performanceMonitoring);

// Morgan logging (HTTP requests)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  // Custom morgan format for production
  app.use(morgan('combined', {
    stream: {
      write: (message) => {
        logger.api('HTTP Request', { message: message.trim() });
      }
    }
  }));
}

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const healthData = await healthCheck();
    
    // Set appropriate status code based on health
    const statusCode = healthData.status === 'healthy' ? 200 : 
                      healthData.status === 'degraded' ? 200 : 503;
    
    // Only log health checks in development to avoid log spam
    if (process.env.NODE_ENV === 'development') {
      logger.api('Health check requested', {
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        status: healthData.status
      });
      debug.api('Health check', healthData);
    }

    res.status(statusCode).json(healthData);
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    res.status(503).json({
      status: 'unhealthy',
      message: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/transport-entries', transportEntryRoutes);

// Debug routes (development only)
if (process.env.NODE_ENV === 'development') {
  app.use('/api/debug', debugRoutes);
  logger.info('🐛 Debug routes enabled at /api/debug');
}

// Root endpoint
app.get('/', (req, res) => {
  const endpoints = {
    health: '/health',
    auth: '/api/auth',
    users: '/api/users',
    transportEntries: '/api/transport-entries'
  };

  // Add debug endpoints in development
  if (process.env.NODE_ENV === 'development') {
    endpoints.debug = '/api/debug';
  }

  const response = {
    message: 'Backend API is running',
    version: '1.0.0',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    endpoints
  };

  logger.api('Root endpoint accessed', {
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent')
  });

  res.json(response);
});

// Error handling middleware
app.use(errorRequestLogger); // Log errors with request context
app.use(errorTracking); // Track error patterns
app.use(notFound);
app.use(errorHandler);

// Start server (only if not in serverless environment)
if (process.env.VERCEL !== '1' && require.main === module) {
  const server = app.listen(PORT, () => {
    const serverInfo = {
      port: PORT,
      environment: process.env.NODE_ENV,
      healthCheck: `http://localhost:${PORT}/health`,
      debugEndpoint: process.env.NODE_ENV === 'development' ? `http://localhost:${PORT}/api/debug/info` : null,
      timestamp: new Date().toISOString()
    };

    logger.info('🚀 Server started successfully', serverInfo);
    debug.app('Server listening', serverInfo);

    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`🐛 Debug info: http://localhost:${PORT}/api/debug/info`);
      console.log(`📋 Debug logs: http://localhost:${PORT}/api/debug/logs`);
    }
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    debug.app('Graceful shutdown initiated');
    
    server.close(() => {
      logger.info('Server closed');
      debug.app('Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    debug.app('Graceful shutdown initiated (SIGINT)');
    
    server.close(() => {
      logger.info('Server closed');
      debug.app('Server closed');
      process.exit(0);
    });
  });
}

module.exports = app;