const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const debug = require('../utils/debug');
const { apiLogger } = require('../middleware/requestLogger');
const fs = require('fs');
const path = require('path');

// Debug info endpoint
router.get('/info', apiLogger('Debug Info'), (req, res) => {
  try {
    const debugInfo = {
      server: {
        environment: process.env.NODE_ENV,
        nodeVersion: process.version,
        platform: process.platform,
        uptime: process.uptime(),
        pid: process.pid,
        port: process.env.PORT || 5000,
        timestamp: new Date().toISOString()
      },
      memory: {
        ...process.memoryUsage(),
        formatted: {
          rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`,
          heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)} MB`,
          heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
          external: `${Math.round(process.memoryUsage().external / 1024 / 1024)} MB`
        }
      },
      configuration: {
        mongoUri: process.env.MONGODB_URI ? '[CONFIGURED]' : '[NOT SET]',
        jwtSecret: process.env.JWT_SECRET ? '[CONFIGURED]' : '[NOT SET]',
        emailUser: process.env.EMAIL_USER ? '[CONFIGURED]' : '[NOT SET]',
        corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        logLevel: process.env.LOG_LEVEL || 'info',
        debugEnabled: !!process.env.DEBUG
      },
      features: {
        logging: true,
        debugging: process.env.NODE_ENV === 'development',
        rateLimiting: true,
        cors: true,
        helmet: true,
        validation: true
      }
    };

    logger.api('Debug info requested', {
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      data: debugInfo
    });
  } catch (error) {
    logger.logError(error, req, { endpoint: 'debug/info' });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve debug information'
    });
  }
});

// Logs endpoint (development only)
router.get('/logs', apiLogger('Debug Logs'), (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({
      success: false,
      error: 'Logs endpoint only available in development mode'
    });
  }

  try {
    const logsDir = path.join(__dirname, '../../logs');
    const logType = req.query.type || 'combined';
    const lines = parseInt(req.query.lines) || 100;

    // Get the latest log file for the specified type
    const logFiles = fs.readdirSync(logsDir)
      .filter(file => file.startsWith(logType) && file.endsWith('.log'))
      .sort()
      .reverse();

    if (logFiles.length === 0) {
      return res.json({
        success: true,
        data: {
          logs: [],
          message: `No ${logType} log files found`
        }
      });
    }

    const latestLogFile = path.join(logsDir, logFiles[0]);
    const logContent = fs.readFileSync(latestLogFile, 'utf8');
    const logLines = logContent.split('\n')
      .filter(line => line.trim())
      .slice(-lines)
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return { message: line, timestamp: new Date().toISOString() };
        }
      });

    logger.api('Debug logs requested', {
      type: logType,
      lines,
      file: logFiles[0],
      ip: req.ip || req.connection.remoteAddress
    });

    res.json({
      success: true,
      data: {
        logs: logLines,
        file: logFiles[0],
        totalLines: logLines.length,
        availableTypes: ['combined', 'error', 'api']
      }
    });
  } catch (error) {
    logger.logError(error, req, { endpoint: 'debug/logs' });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve logs'
    });
  }
});

// Test logging endpoint
router.post('/test-log', apiLogger('Test Log'), (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({
      success: false,
      error: 'Test logging endpoint only available in development mode'
    });
  }

  try {
    const { level = 'info', message = 'Test log message', data = {} } = req.body;

    // Log the test message
    logger[level](message, {
      ...data,
      testLog: true,
      requestedBy: req.ip || req.connection.remoteAddress,
      timestamp: new Date().toISOString()
    });

    debug.app('Test log generated', { level, message, data });

    res.json({
      success: true,
      message: `Test ${level} log generated successfully`,
      data: {
        level,
        message,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.logError(error, req, { endpoint: 'debug/test-log' });
    res.status(500).json({
      success: false,
      error: 'Failed to generate test log'
    });
  }
});

// Database connection test
router.get('/db-test', apiLogger('Database Test'), async (req, res) => {
  try {
    const mongoose = require('mongoose');
    
    const dbStatus = {
      connected: mongoose.connection.readyState === 1,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name,
      collections: mongoose.connection.db ? 
        await mongoose.connection.db.listCollections().toArray() : []
    };

    logger.db('Database connection test', dbStatus);
    debug.db('Database test performed', dbStatus);

    res.json({
      success: true,
      data: dbStatus
    });
  } catch (error) {
    logger.logError(error, req, { endpoint: 'debug/db-test' });
    res.status(500).json({
      success: false,
      error: 'Database connection test failed',
      details: error.message
    });
  }
});

// Environment variables (sanitized)
router.get('/env', apiLogger('Environment Variables'), (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({
      success: false,
      error: 'Environment endpoint only available in development mode'
    });
  }

  try {
    // Sanitize environment variables (remove sensitive data)
    const sanitizedEnv = {};
    const sensitiveKeys = ['JWT_SECRET', 'EMAIL_PASS', 'MONGODB_URI', 'PASSWORD'];
    
    Object.keys(process.env).forEach(key => {
      if (sensitiveKeys.some(sensitive => key.includes(sensitive))) {
        sanitizedEnv[key] = '[HIDDEN]';
      } else {
        sanitizedEnv[key] = process.env[key];
      }
    });

    logger.api('Environment variables requested', {
      ip: req.ip || req.connection.remoteAddress,
      keysCount: Object.keys(sanitizedEnv).length
    });

    res.json({
      success: true,
      data: sanitizedEnv
    });
  } catch (error) {
    logger.logError(error, req, { endpoint: 'debug/env' });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve environment variables'
    });
  }
});

// Clear logs endpoint (development only)
router.delete('/logs', apiLogger('Clear Logs'), (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({
      success: false,
      error: 'Clear logs endpoint only available in development mode'
    });
  }

  try {
    const logsDir = path.join(__dirname, '../../logs');
    
    if (fs.existsSync(logsDir)) {
      const files = fs.readdirSync(logsDir);
      let deletedCount = 0;
      
      files.forEach(file => {
        if (file.endsWith('.log')) {
          fs.unlinkSync(path.join(logsDir, file));
          deletedCount++;
        }
      });

      logger.api('Log files cleared', {
        deletedCount,
        requestedBy: req.ip || req.connection.remoteAddress
      });

      res.json({
        success: true,
        message: `Cleared ${deletedCount} log files`
      });
    } else {
      res.json({
        success: true,
        message: 'No logs directory found'
      });
    }
  } catch (error) {
    logger.logError(error, req, { endpoint: 'debug/clear-logs' });
    res.status(500).json({
      success: false,
      error: 'Failed to clear logs'
    });
  }
});

module.exports = router;