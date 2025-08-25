const mongoose = require('mongoose');

// Serverless-compatible database connection
const connectDB = async () => {
  try {
    // Check if already connected
    if (mongoose.connection.readyState === 1) {
      console.log('✅ MongoDB already connected');
      return;
    }

    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/myapp';
    
    // Serverless-optimized connection options
    const options = {
      maxPoolSize: 5, // Smaller pool for serverless
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxIdleTimeMS: 30000,
      bufferCommands: false, // Disable mongoose buffering in serverless
      bufferMaxEntries: 0
    };

    // Add production options
    if (process.env.NODE_ENV === 'production') {
      options.retryWrites = true;
      options.w = 'majority';
    }
    
    await mongoose.connect(mongoURI, options);

    console.log('✅ MongoDB Connected:', mongoose.connection.host);
    
    // Handle connection events (simplified for serverless)
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️  MongoDB disconnected');
    });

  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    // Don't exit in serverless environment
    throw error;
  }
};

module.exports = connectDB;