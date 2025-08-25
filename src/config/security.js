const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// Security configuration for production
const securityConfig = {
  // Helmet configuration
  helmet: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"]
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    }
  },

  // Rate limiting configurations
  rateLimits: {
    // General API rate limit
    general: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 
           (process.env.NODE_ENV === 'production' ? 50 : 100),
      message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => req.path === '/health'
    },

    // Authentication rate limit (stricter)
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: process.env.NODE_ENV === 'production' ? 5 : 10,
      message: {
        error: 'Too many authentication attempts, please try again later.',
        retryAfter: 900
      },
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: true
    },

    // Password reset rate limit (very strict)
    passwordReset: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 3,
      message: {
        error: 'Too many password reset attempts, please try again later.',
        retryAfter: 3600
      },
      standardHeaders: true,
      legacyHeaders: false
    }
  },

  // CORS configuration
  cors: {
    origin: function (origin, callback) {
      const allowedOrigins = process.env.CORS_ORIGIN ? 
        process.env.CORS_ORIGIN.split(',').map(origin => origin.trim()) : 
        ['http://localhost:3000'];
      
      // Allow requests with no origin (mobile apps, etc.)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 86400 // 24 hours
  },

  // Trusted proxy settings
  trustProxy: process.env.NODE_ENV === 'production' ? 1 : false
};

// Create rate limiters
const createRateLimiters = () => {
  return {
    general: rateLimit(securityConfig.rateLimits.general),
    auth: rateLimit(securityConfig.rateLimits.auth),
    passwordReset: rateLimit(securityConfig.rateLimits.passwordReset)
  };
};

// Security headers middleware
const securityHeaders = helmet(securityConfig.helmet);

module.exports = {
  securityConfig,
  createRateLimiters,
  securityHeaders
};