const winston = require('winston');

// Serverless-compatible logger (console only)
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Console format
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      log += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return log;
  })
);

// Create transports (console only for serverless)
const transports = [
  new winston.transports.Console({
    format: process.env.NODE_ENV === 'development' ? consoleFormat : logFormat,
    level: process.env.LOG_LEVEL || 'info'
  })
];

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports,
  exitOnError: false
});

// Custom logging methods
logger.api = (message, meta = {}) => {
  logger.info(message, { ...meta, type: 'API' });
};

logger.auth = (message, meta = {}) => {
  logger.info(message, { ...meta, type: 'AUTH' });
};

logger.db = (message, meta = {}) => {
  logger.info(message, { ...meta, type: 'DATABASE' });
};

logger.email = (message, meta = {}) => {
  logger.info(message, { ...meta, type: 'EMAIL' });
};

logger.security = (message, meta = {}) => {
  logger.warn(message, { ...meta, type: 'SECURITY' });
};

// Request logging helper
logger.logRequest = (req, res, responseTime) => {
  const logData = {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    statusCode: res.statusCode,
    responseTime: `${responseTime}ms`,
    userId: req.user ? req.user.id : null,
    type: 'REQUEST'
  };

  // Log body for POST/PUT requests (excluding sensitive data)
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
    const sanitizedBody = { ...req.body };
    // Remove sensitive fields
    delete sanitizedBody.password;
    delete sanitizedBody.currentPassword;
    delete sanitizedBody.newPassword;
    delete sanitizedBody.token;
    
    if (Object.keys(sanitizedBody).length > 0) {
      logData.body = sanitizedBody;
    }
  }

  if (res.statusCode >= 400) {
    logger.warn('HTTP Request', logData);
  } else {
    logger.api('HTTP Request', logData);
  }
};

// Error logging helper
logger.logError = (error, req = null, additionalInfo = {}) => {
  const errorData = {
    message: error.message,
    stack: error.stack,
    name: error.name,
    ...additionalInfo
  };

  if (req) {
    errorData.request = {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      userId: req.user ? req.user.id : null
    };
  }

  logger.error('Application Error', errorData);
};

module.exports = logger;