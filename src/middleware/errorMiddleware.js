const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message;

  // Mongoose bad ObjectId
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    statusCode = 404;
    message = 'Resource not found';
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    statusCode = 400;
    message = 'Duplicate field value entered';
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map(val => val.message).join(', ');
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // Rate limit errors
  if (err.status === 429) {
    statusCode = 429;
    message = 'Too many requests, please try again later';
  }

  // CORS errors
  if (err.message && err.message.includes('CORS')) {
    statusCode = 403;
    message = 'CORS policy violation';
  }

  // Log error details
  logger.logError(err, req, {
    statusCode,
    originalMessage: err.message,
    processedMessage: message
  });

  // Production error response (don't expose sensitive information)
  const errorResponse = {
    success: false,
    error: process.env.NODE_ENV === 'production' && statusCode === 500 
      ? 'Internal server error' 
      : message,
    timestamp: new Date().toISOString()
  };

  // Add stack trace only in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
    errorResponse.originalError = err.message;
  }

  // Add request ID for tracking (if available)
  if (req.id) {
    errorResponse.requestId = req.id;
  }

  res.status(statusCode).json(errorResponse);
};

module.exports = {
  notFound,
  errorHandler
};