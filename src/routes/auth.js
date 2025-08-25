const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/User');
const PasswordReset = require('../models/PasswordReset');
const emailService = require('../utils/emailService');
const { generateMemorablePassword } = require('../utils/passwordGenerator');
const logger = require('../utils/logger');
const debug = require('../utils/debug');
const { apiLogger, authLogger, dbLogger, emailLogger } = require('../middleware/requestLogger');

const router = express.Router();

// Generate JWT Token
const generateToken = (user, req = null) => {
  const token = jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET || 'fallback-secret',
    {
      expiresIn: process.env.JWT_EXPIRE || '7d'
    }
  );

  // Log token generation
  if (req) {
    authLogger.tokenGenerated(user._id, user.email, req);
  }

  debug.auth('JWT token generated', {
    userId: user._id,
    email: user.email,
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });

  return token;
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', [
  body('email').isEmail().withMessage('Please include a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('uniqueid').optional().notEmpty().withMessage('Unique ID cannot be empty if provided'),
  body('profile.ownerName').notEmpty().withMessage('Owner name is required'),
  body('profile.companyName').notEmpty().withMessage('Company name is required'),
  body('profile.mobileNumber').notEmpty().withMessage('Mobile number is required'),
  body('profile.address').notEmpty().withMessage('Address is required'),
  // Optional fields with minimal validation
  body('profile.gstNumber').optional({ checkFalsy: true }),
  body('profile.panNumber').optional({ checkFalsy: true }),
  body('bank.accountNumber').optional({ checkFalsy: true }),
  body('bank.ifscCode').optional({ checkFalsy: true }),
  body('bank.bankName').optional({ checkFalsy: true }),
  body('bank.accountHolderName').optional({ checkFalsy: true }),
  body('bank.bankBranchName').optional({ checkFalsy: true })
], async (req, res) => {
  try {
    console.log('Registration request body:', JSON.stringify(req.body, null, 2));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { email, password, uniqueid, profile, bank } = req.body;

    // Clean up profile data - remove empty optional fields
    const cleanProfile = {
      ownerName: profile.ownerName.trim(),
      companyName: profile.companyName.trim(),
      mobileNumber: profile.mobileNumber.trim(),
      address: profile.address.trim()
    };

    // Only add GST and PAN if they have values
    if (profile.gstNumber && profile.gstNumber.trim()) {
      cleanProfile.gstNumber = profile.gstNumber.trim().toUpperCase();
    }
    if (profile.panNumber && profile.panNumber.trim()) {
      cleanProfile.panNumber = profile.panNumber.trim().toUpperCase();
    }

    // Check if user exists by email
    const existingUserByEmail = await User.findByEmail(email);
    if (existingUserByEmail) {
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    // Check if user exists by unique ID (only if provided)
    if (uniqueid) {
      const existingUserByUniqueId = await User.findByUniqueId(uniqueid);
      if (existingUserByUniqueId) {
        return res.status(400).json({
          success: false,
          error: 'User with this unique ID already exists'
        });
      }
    }

    // Check if user exists by mobile number
    const existingUserByMobile = await User.findByMobile(cleanProfile.mobileNumber);
    if (existingUserByMobile) {
      return res.status(400).json({
        success: false,
        error: 'User with this mobile number already exists'
      });
    }

    // Create user (password will be hashed automatically by the model)
    const userData = {
      email: email.trim(),
      password,
      profile: cleanProfile,
      bank: bank || {}
    };

    // Only add uniqueid if provided, otherwise let the model auto-generate it
    if (uniqueid) {
      userData.uniqueid = uniqueid;
    }

    const user = await User.create(userData);

    // Generate token
    const token = generateToken(user);

    // Send welcome email (don't wait for it to complete)
    emailService.sendWelcomeEmail(
      user.email,
      user.profile.ownerName,
      {
        uniqueid: user.uniqueid,
        profile: user.profile
      }
    ).catch(error => {
      console.error('Failed to send welcome email:', error);
    });

    res.status(201).json({
      success: true,
      data: {
        id: user._id,
        uniqueid: user.uniqueid,
        email: user.email,
        profile: user.profile,
        bank: user.bank,
        role: user.role,
        token
      }
    });
  } catch (error) {
    console.error('Registration error:', error);

    // Handle MongoDB validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        error: messages.join(', ')
      });
    }

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'User already exists'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post('/login', [
  apiLogger('User Login'),
  body('email').isEmail().withMessage('Please include a valid email'),
  body('password').exists().withMessage('Password is required')
], async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      debug.validation('Login validation failed', { errors: errors.array(), email });
      authLogger.loginAttempt(email, false, req, 'Validation failed');
      
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    debug.auth('Login attempt', { email });

    // Check for user and include password field
    const user = await User.findByEmail(email).select('+password');
    if (!user) {
      authLogger.loginAttempt(email, false, req, 'User not found');
      debug.auth('Login failed - user not found', { email });
      
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check password using the model method
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      authLogger.loginAttempt(email, false, req, 'Invalid password');
      debug.auth('Login failed - invalid password', { email, userId: user._id });
      
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Log successful database update
    dbLogger.logQuery('User', 'UPDATE', { _id: user._id }, { modifiedCount: 1 });

    // Generate token
    const token = generateToken(user, req);

    // Log successful login
    authLogger.loginAttempt(email, true, req);
    debug.auth('Login successful', { email, userId: user._id });

    res.json({
      success: true,
      data: {
        id: user._id,
        uniqueid: user.uniqueid,
        email: user.email,
        profile: user.profile,
        bank: user.bank,
        role: user.role,
        token
      }
    });
  } catch (error) {
    logger.logError(error, req, { 
      endpoint: 'auth/login',
      email,
      type: 'LOGIN_ERROR'
    });
    debug.auth('Login error', { error: error.message, email });
    
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, apiLogger('Get Current User'), async (req, res) => {
  try {
    debug.auth('Getting current user', { userId: req.user.id });
    
    const user = await User.findById(req.user.id);
    if (!user) {
      debug.auth('User not found in /me route', { userId: req.user.id });
      logger.warn('User not found in /me route', {
        userId: req.user.id,
        ip: req.ip || req.connection.remoteAddress
      });
      
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Log successful user retrieval
    dbLogger.logQuery('User', 'FIND_BY_ID', { _id: req.user.id }, user);
    authLogger.tokenValidated(user._id, user.email, req);

    res.json({
      success: true,
      data: {
        id: user._id,
        uniqueid: user.uniqueid,
        email: user.email,
        profile: user.profile,
        bank: user.bank,
        role: user.role,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

module.exports = router;
// @desc    Request password reset (generates new password and sends via email)
// @route   POST /api/auth/forgot-password
// @access  Public
router.post('/forgot-password', [
  body('email').isEmail().withMessage('Please include a valid email')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const email = req.body.email.trim().toLowerCase();

    // Check if user exists
    const user = await User.findByEmail(email);
    if (!user) {
      // Don't reveal if user exists or not for security
      return res.json({
        success: true,
        message: 'If an account with that email exists, we have sent a new password.'
      });
    }

    // Generate a new secure but memorable password
    const newPassword = generateMemorablePassword(10);

    // Update user's password (will be hashed automatically by the model)
    user.password = newPassword;
    await user.save();

    // Log the password reset for security audit
    console.log(`🔑 Password reset for user: ${email} at ${new Date().toISOString()}`);

    // Send new password via email or notification service
    const emailResult = await emailService.sendPasswordResetWithNewPassword(
      user.email,
      newPassword,
      user.profile.ownerName
    );

    if (emailResult.success) {
      console.log(`✅ New password email sent to: ${email}`);
      if (emailResult.previewUrl) {
        console.log(`📧 Preview URL: ${emailResult.previewUrl}`);
      }
    } else {
      console.error(`❌ Failed to send new password email to: ${email}`, emailResult.error);

      // If email service is disabled, use notification service
      if (emailResult.error.includes('disabled')) {
        const notificationService = require('../utils/notificationService');
        const notificationResult = notificationService.notifyPasswordReset(email, newPassword);
        
        if (notificationResult.success) {
          console.log('📝 Password reset notification created for manual processing');
        }
      }
    }

    // Always return success for security (don't reveal if email exists)
    res.json({
      success: true,
      message: 'If an account with that email exists, we have sent a new password to your email.',
      ...(process.env.NODE_ENV === 'development' && emailResult.previewUrl && {
        previewUrl: emailResult.previewUrl
      })
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
router.post('/reset-password', [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { token, password } = req.body;

    // Find valid reset token
    const resetRecord = await PasswordReset.findValidToken(token);
    if (!resetRecord) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token'
      });
    }

    // Get the user
    const user = resetRecord.userId;
    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'User not found'
      });
    }

    // Update user password (will be hashed automatically by the model)
    user.password = password;
    await user.save();

    // Mark reset token as used
    await resetRecord.markAsUsed();

    // Clean up any other reset tokens for this user
    await PasswordReset.deleteMany({
      userId: user._id,
      _id: { $ne: resetRecord._id }
    });

    console.log(`✅ Password reset successful for user: ${user.email}`);

    res.json({
      success: true,
      message: 'Password has been reset successfully. You can now log in with your new password.'
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});
// @desc    Verify reset token
// @route   GET /api/auth/verify-reset-token/:token
// @access  Public
router.get('/verify-reset-token/:token', async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Reset token is required'
      });
    }

    // Find valid reset token
    const resetRecord = await PasswordReset.findValidToken(token);
    if (!resetRecord) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token'
      });
    }

    // Return user info (without sensitive data)
    res.json({
      success: true,
      data: {
        email: resetRecord.email,
        userName: resetRecord.userId.profile?.ownerName || 'User',
        expiresAt: resetRecord.expiresAt
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// @desc    Cleanup expired reset tokens (admin only)
// @route   DELETE /api/auth/cleanup-reset-tokens
// @access  Private/Admin
router.delete('/cleanup-reset-tokens', protect, async (req, res) => {
  try {
    // Only allow admins to cleanup tokens
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin role required.'
      });
    }

    const result = await PasswordReset.cleanupExpired();

    res.json({
      success: true,
      message: `Cleaned up ${result.deletedCount} expired reset tokens`
    });
  } catch (error) {
    console.error('Token cleanup error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});
// @desc    Change password (for logged-in users)
// @route   PUT /api/auth/change-password
// @access  Private
router.put('/change-password', [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], protect, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Get user with password field
    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.matchPassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Update password (will be hashed automatically by the model)
    user.password = newPassword;
    await user.save();

    console.log(`🔑 Password changed for user: ${user.email} at ${new Date().toISOString()}`);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});