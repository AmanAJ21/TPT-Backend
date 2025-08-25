#!/usr/bin/env node

/**
 * Production startup script
 * This script sets up the production environment and starts the server
 */

const fs = require('fs');
const path = require('path');

// Set production environment
process.env.NODE_ENV = 'production';

console.log('🚀 Starting application in production mode...');

// Load production environment variables
const prodEnvPath = path.join(__dirname, '.env.production');
if (fs.existsSync(prodEnvPath)) {
  console.log('✅ Loading .env.production file');
  require('dotenv').config({ path: prodEnvPath });
} else {
  console.log('⚠️  No .env.production file found, using default .env');
  require('dotenv').config();
}

// Production pre-flight checks
console.log('🔍 Running production pre-flight checks...');

// Check if logs directory exists
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  console.log('📁 Creating logs directory...');
  fs.mkdirSync(logsDir, { recursive: true });
}

// Check required environment variables
const requiredEnvVars = [
  'MONGODB_URI',
  'JWT_SECRET'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  console.error('Please set these variables in your .env.production file');
  process.exit(1);
}

console.log('✅ Pre-flight checks passed');
console.log('🚀 Starting server...');

// Start the server by requiring it directly
require('./src/server.js');