const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/myapp';
    
    // Production-ready connection options (using only supported options)
    const options = {
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
      family: 4 // Use IPv4, skip trying IPv6
    };

    // Add authentication options for production
    if (process.env.NODE_ENV === 'production') {
      options.retryWrites = true;
      options.w = 'majority';
      options.readPreference = 'primary';
    }
    
    const conn = await mongoose.connect(mongoURI, options);

    const connectionInfo = {
      host: conn.connection.host,
      database: conn.connection.name,
      port: conn.connection.port,
      readyState: conn.connection.readyState
    };

    logger.db('MongoDB Connected', connectionInfo);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
      console.log(`📊 Database: ${conn.connection.name}`);
    }
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error', { error: err.message, stack: err.stack });
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ MongoDB connection error:', err);
      }
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
      if (process.env.NODE_ENV === 'development') {
        console.log('⚠️  MongoDB disconnected');
      }
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ MongoDB reconnected');
      }
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} received, closing MongoDB connection`);
      try {
        await mongoose.connection.close();
        logger.info('MongoDB connection closed through app termination');
        if (process.env.NODE_ENV === 'development') {
          console.log('🔌 MongoDB connection closed through app termination');
        }
      } catch (error) {
        logger.error('Error closing MongoDB connection', { error: error.message });
      }
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  } catch (error) {
    logger.error('MongoDB connection failed', { 
      error: error.message, 
      stack: error.stack,
      mongoURI: process.env.MONGODB_URI ? 'Set' : 'Not set'
    });
    
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ MongoDB connection failed:', error.message);
    }
    
    process.exit(1);
  }
};

module.exports = connectDB;