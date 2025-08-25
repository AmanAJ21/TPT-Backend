// Vercel serverless function entry point
try {
  // Set environment for serverless
  process.env.VERCEL = '1';
  
  // Import the app
  const app = require('../src/server.js');
  
  module.exports = app;
} catch (error) {
  console.error('Failed to initialize serverless function:', error);
  
  // Fallback minimal server
  const express = require('express');
  const fallbackApp = express();
  
  fallbackApp.get('/health', (req, res) => {
    res.json({ 
      status: 'error', 
      message: 'Server initialization failed',
      error: error.message 
    });
  });
  
  fallbackApp.use('*', (req, res) => {
    res.status(500).json({ 
      error: 'Server initialization failed',
      message: error.message 
    });
  });
  
  module.exports = fallbackApp;
}