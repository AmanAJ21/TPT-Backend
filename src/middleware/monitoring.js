const logger = require('../utils/logger');

// Performance monitoring middleware
const performanceMonitoring = (req, res, next) => {
  const startTime = Date.now();
  
  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(...args) {
    const responseTime = Date.now() - startTime;
    
    // Log slow requests (>1000ms)
    if (responseTime > 1000) {
      logger.warn('Slow request detected', {
        method: req.method,
        url: req.originalUrl,
        responseTime: `${responseTime}ms`,
        statusCode: res.statusCode,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
    }
    
    // Log request metrics
    logger.logRequest(req, res, responseTime);
    
    originalEnd.apply(this, args);
  };
  
  next();
};

// Memory usage monitoring
const memoryMonitoring = () => {
  const memUsage = process.memoryUsage();
  const memInfo = {
    rss: Math.round(memUsage.rss / 1024 / 1024), // MB
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
    external: Math.round(memUsage.external / 1024 / 1024), // MB
    uptime: Math.round(process.uptime())
  };
  
  // Log memory warning if heap usage is high
  if (memInfo.heapUsed > 512) { // 512MB threshold
    logger.warn('High memory usage detected', memInfo);
  }
  
  return memInfo;
};

// System health check
const healthCheck = async () => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: memoryMonitoring(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0'
  };
  
  // Check database connection
  const mongoose = require('mongoose');
  health.database = {
    status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    readyState: mongoose.connection.readyState
  };
  
  // Overall health status
  if (health.database.status !== 'connected') {
    health.status = 'unhealthy';
  }
  
  if (health.memory.heapUsed > 800) { // 800MB critical threshold
    health.status = 'degraded';
  }
  
  return health;
};

// Error tracking middleware
const errorTracking = (error, req, res, next) => {
  // Track error patterns
  const errorInfo = {
    message: error.message,
    name: error.name,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  };
  
  // Log critical errors
  if (res.statusCode >= 500) {
    logger.error('Critical error occurred', errorInfo);
  } else {
    logger.warn('Client error occurred', errorInfo);
  }
  
  next(error);
};

module.exports = {
  performanceMonitoring,
  memoryMonitoring,
  healthCheck,
  errorTracking
};