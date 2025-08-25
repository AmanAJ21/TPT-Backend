const logger = require('../utils/logger');
const debug = require('../utils/debug');

// Request logging middleware
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Debug incoming request
  debug.request(req);
  
  // Store original end function
  const originalEnd = res.end;
  
  // Override res.end to capture response time
  res.end = function(chunk, encoding) {
    const responseTime = Date.now() - startTime;
    
    // Log the request
    logger.logRequest(req, res, responseTime);
    
    // Debug response
    debug.response(res, `Response sent in ${responseTime}ms`);
    
    // Call original end function
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

// Error request logger
const errorRequestLogger = (error, req, res, next) => {
  const responseTime = Date.now() - (req.startTime || Date.now());
  
  // Log the error with request context
  logger.logError(error, req, {
    responseTime: `${responseTime}ms`,
    type: 'REQUEST_ERROR'
  });
  
  // Debug error
  debug.api('Request error', {
    error: error.message,
    stack: error.stack,
    method: req.method,
    url: req.originalUrl,
    responseTime: `${responseTime}ms`
  });
  
  next(error);
};

// API endpoint hit logger
const apiLogger = (endpoint) => {
  return (req, res, next) => {
    logger.api(`API Endpoint Hit: ${endpoint}`, {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip || req.connection.remoteAddress,
      userId: req.user ? req.user.id : null,
      timestamp: new Date().toISOString()
    });
    
    debug.routes(`${endpoint} endpoint accessed`, {
      method: req.method,
      params: req.params,
      query: req.query
    });
    
    next();
  };
};

// Database operation logger
const dbLogger = {
  logQuery: (model, operation, query, result) => {
    logger.db(`Database ${operation}`, {
      model,
      operation,
      query: JSON.stringify(query),
      resultCount: Array.isArray(result) ? result.length : (result ? 1 : 0),
      timestamp: new Date().toISOString()
    });
    
    debug.dbOperation(operation, model, query, result);
  },
  
  logError: (model, operation, query, error) => {
    logger.error(`Database ${operation} Error`, {
      model,
      operation,
      query: JSON.stringify(query),
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    debug.db(`Database error in ${operation}`, {
      model,
      error: error.message,
      query
    });
  }
};

// Authentication logger
const authLogger = {
  loginAttempt: (email, success, req, reason = null) => {
    const logData = {
      email,
      success,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    };
    
    if (reason) logData.reason = reason;
    
    if (success) {
      logger.auth('Successful login', logData);
    } else {
      logger.security('Failed login attempt', logData);
    }
    
    debug.authAttempt(email, success, reason);
  },
  
  tokenGenerated: (userId, email, req) => {
    logger.auth('JWT token generated', {
      userId,
      email,
      ip: req.ip || req.connection.remoteAddress,
      timestamp: new Date().toISOString()
    });
    
    debug.auth('Token generated', { userId, email });
  },
  
  tokenValidated: (userId, email, req) => {
    logger.auth('JWT token validated', {
      userId,
      email,
      ip: req.ip || req.connection.remoteAddress,
      endpoint: req.originalUrl,
      timestamp: new Date().toISOString()
    });
    
    debug.auth('Token validated', { userId, email, endpoint: req.originalUrl });
  },
  
  passwordReset: (email, req) => {
    logger.auth('Password reset requested', {
      email,
      ip: req.ip || req.connection.remoteAddress,
      timestamp: new Date().toISOString()
    });
    
    debug.auth('Password reset requested', { email });
  }
};

// Email logger
const emailLogger = {
  sent: (to, subject, type = 'general') => {
    logger.email('Email sent successfully', {
      to,
      subject,
      type,
      timestamp: new Date().toISOString()
    });
    
    debug.email('Email sent', { to, subject, type });
  },
  
  failed: (to, subject, error, type = 'general') => {
    logger.error('Email sending failed', {
      to,
      subject,
      type,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    debug.email('Email failed', { to, subject, type, error: error.message });
  }
};

module.exports = {
  requestLogger,
  errorRequestLogger,
  apiLogger,
  dbLogger,
  authLogger,
  emailLogger
};