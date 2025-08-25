#!/usr/bin/env node

/**
 * Deployment setup script
 * Helps prepare the project for Git and Vercel deployment
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Setting up project for deployment...\n');

// Check if this is a git repository
function isGitRepo() {
  try {
    execSync('git rev-parse --git-dir', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

// Initialize git if needed
if (!isGitRepo()) {
  console.log('📁 Initializing Git repository...');
  try {
    execSync('git init', { stdio: 'inherit' });
    console.log('✅ Git repository initialized\n');
  } catch (error) {
    console.error('❌ Failed to initialize Git repository');
    process.exit(1);
  }
} else {
  console.log('✅ Git repository already exists\n');
}

// Check if .env.production exists and has required variables
console.log('🔍 Checking environment configuration...');
const envProdPath = path.join(__dirname, '.env.production');
if (fs.existsSync(envProdPath)) {
  const envContent = fs.readFileSync(envProdPath, 'utf8');
  const requiredVars = ['MONGODB_URI', 'JWT_SECRET'];
  const missingVars = requiredVars.filter(varName => 
    !envContent.includes(`${varName}=`) || 
    envContent.includes(`${varName}=your-`) ||
    envContent.includes(`${varName}=mongodb://localhost`)
  );
  
  if (missingVars.length > 0) {
    console.log('⚠️  Please update these variables in .env.production:');
    missingVars.forEach(varName => console.log(`   - ${varName}`));
    console.log('');
  } else {
    console.log('✅ Environment variables configured\n');
  }
} else {
  console.log('⚠️  .env.production file not found\n');
}

// Check if package.json has correct scripts
console.log('🔍 Checking package.json scripts...');
const packagePath = path.join(__dirname, 'package.json');
if (fs.existsSync(packagePath)) {
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  if (packageJson.scripts && packageJson.scripts.start) {
    console.log('✅ Package.json scripts configured\n');
  } else {
    console.log('⚠️  Package.json scripts may need updating\n');
  }
}

// Display deployment instructions
console.log('📋 Next Steps for Deployment:\n');

console.log('1. 📝 Update .env.production with your actual values:');
console.log('   - MONGODB_URI (your MongoDB connection string)');
console.log('   - JWT_SECRET (generate with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))")');
console.log('   - CORS_ORIGIN (your frontend domain)\n');

console.log('2. 🔄 Commit and push to Git:');
console.log('   git add .');
console.log('   git commit -m "Production-ready backend"');
console.log('   git push origin main\n');

console.log('3. 🚀 Deploy to Vercel:');
console.log('   Option A: Install Vercel CLI and run "vercel"');
console.log('   Option B: Import repository at vercel.com\n');

console.log('4. ⚙️  Set environment variables in Vercel Dashboard:');
console.log('   - Go to Project Settings → Environment Variables');
console.log('   - Add all variables from .env.production\n');

console.log('5. ✅ Test your deployment:');
console.log('   - Health check: https://your-project.vercel.app/health');
console.log('   - API endpoints: https://your-project.vercel.app/api/auth/login\n');

console.log('📚 For detailed instructions, see:');
console.log('   - VERCEL_DEPLOYMENT.md');
console.log('   - DEPLOYMENT.md');
console.log('   - PRODUCTION_CHECKLIST.md\n');

console.log('🎉 Your project is ready for production deployment!');