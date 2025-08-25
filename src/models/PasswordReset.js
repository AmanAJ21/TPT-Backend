const mongoose = require('mongoose');

const passwordResetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now
  },
  used: {
    type: Boolean,
    default: false
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  }
}, {
  timestamps: true
});

// Index for automatic cleanup of expired tokens
passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index for faster lookups
passwordResetSchema.index({ token: 1 });
passwordResetSchema.index({ email: 1 });
passwordResetSchema.index({ userId: 1 });

// Static method to find valid token
passwordResetSchema.statics.findValidToken = function(token) {
  return this.findOne({
    token,
    used: false,
    expiresAt: { $gt: new Date() }
  }).populate('userId');
};

// Static method to cleanup expired tokens
passwordResetSchema.statics.cleanupExpired = function() {
  return this.deleteMany({
    $or: [
      { expiresAt: { $lt: new Date() } },
      { used: true }
    ]
  });
};

// Instance method to mark token as used
passwordResetSchema.methods.markAsUsed = function() {
  this.used = true;
  return this.save();
};

module.exports = mongoose.model('PasswordReset', passwordResetSchema);