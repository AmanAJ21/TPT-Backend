const debug = require('debug');
const logger = require('./logger');

// Create debug namespaces
const debugNamespaces = {
  app: debug('app:main'),
  auth: debug('app:auth'),
  db: debug('app:database'),
  api: debug('app:api'),
  email: debug('app:email'),
  middleware: debug('app:middleware'),
  routes: debug('app:routes'),
  validation: debug('app:validation'),
  security: debug('app:security')
};

// Debug helper class
class Debug {
  constructor() {
    this.enabled = process.env.NODE_ENV === 'development' || process.env.DEBUG;
    this.namespaces = debugNamespaces;
  }

  // Main debug method
  log(namespace, message, data = null) {
    if (!this.enabled) return;

    const debugFn = this.namespaces[namespace] || this.namespaces.app;
    
    if (data) {
      debugFn(`${message}:`, data);
      // Also log to winston in development
      if (process.env.NODE_ENV === 'development') {
        logger.debug(`[${namespace.toUpperCase()}] ${message}`, data);
      }
    } else {
      debugFn(message);
      if (process.env.NODE_ENV === 'development') {
        logger.debug(`[${namespace.toUpperCase()}] ${message}`);
      }
    }
  }

  // Namespace-specific methods
  app(message, data) {
    this.log('app', message, data);
  }

  auth(message, data) {
    this.log('auth', message, data);
  }

  db(message, data) {
    this.log('db', message, data);
  }

  api(message, data) {
    this.log('api', message, data);
  }

  email(message, data) {
    this.log('email', message, data);
  }

  middleware(message, data) {
    this.log('middleware', message, data);
  }

  routes(message, data) {
    this.log('routes', message, data);
  }

  validation(message, data) {
    this.log('validation', message, data);
  }

  security(message, data) {
    this.log('security', message, data);
  }

  // Performance timing
  time(label) {
    if (!this.enabled) return;
    console.time(`DEBUG: ${label}`);
  }

  timeEnd(label) {
    if (!this.enabled) return;
    console.timeEnd(`DEBUG: ${label}`);
  }

  // Memory usage
  memory() {
    if (!this.enabled) return;
    const usage = process.memoryUsage();
    this.app('Memory Usage', {
      rss: `${Math.round(usage.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)} MB`,
      external: `${Math.round(usage.external / 1024 / 1024)} MB`
    });
  }

  // Request debugging
  request(req, message = 'Incoming request') {
    if (!this.enabled) return;
    
    this.api(message, {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      contentType: req.get('Content-Type'),
      userId: req.user ? req.user.id : null,
      query: Object.keys(req.query).length > 0 ? req.query : undefined,
      params: Object.keys(req.params).length > 0 ? req.params : undefined
    });
  }

  // Response debugging
  response(res, message = 'Outgoing response') {
    if (!this.enabled) return;
    
    this.api(message, {
      statusCode: res.statusCode,
      statusMessage: res.statusMessage,
      headers: res.getHeaders()
    });
  }

  // Database operation debugging
  dbOperation(operation, collection, query = null, result = null) {
    if (!this.enabled) return;
    
    const data = {
      operation,
      collection,
      timestamp: new Date().toISOString()
    };

    if (query) data.query = query;
    if (result && typeof result === 'object') {
      if (result.length !== undefined) {
        data.resultCount = result.length;
      } else if (result.modifiedCount !== undefined) {
        data.modifiedCount = result.modifiedCount;
      }
    }

    this.db(`Database ${operation}`, data);
  }

  // Authentication debugging
  authAttempt(email, success, reason = null) {
    if (!this.enabled) return;
    
    this.auth('Authentication attempt', {
      email,
      success,
      reason,
      timestamp: new Date().toISOString()
    });
  }

  // Validation debugging
  validationError(errors, req = null) {
    if (!this.enabled) return;
    
    const data = {
      errors,
      timestamp: new Date().toISOString()
    };

    if (req) {
      data.request = {
        method: req.method,
        url: req.originalUrl,
        body: req.body
      };
    }

    this.validation('Validation failed', data);
  }

  // Environment info
  env() {
    if (!this.enabled) return;
    
    this.app('Environment Info', {
      nodeVersion: process.version,
      platform: process.platform,
      environment: process.env.NODE_ENV,
      port: process.env.PORT,
      mongoUri: process.env.MONGODB_URI ? '[CONFIGURED]' : '[NOT SET]',
      jwtSecret: process.env.JWT_SECRET ? '[CONFIGURED]' : '[NOT SET]',
      emailConfig: process.env.EMAIL_USER ? '[CONFIGURED]' : '[NOT SET]'
    });
  }
}

// Create singleton instance
const debugInstance = new Debug();

// Export both the instance and individual methods for convenience
module.exports = debugInstance;
module.exports.Debug = Debug;