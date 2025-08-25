const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { generateUniqueId } = require('../utils/dbUtils');
const { 
  isValidMobile, 
  isValidGST, 
  isValidPAN, 
  isValidIFSC, 
  isValidAccountNumber,
  isValidPersonName,
  isValidCompanyName
} = require('../utils/validators');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  uniqueid: {
    type: String,
    unique: true,
    trim: true,
    uppercase: true
  },
  profile: {
    ownerName: {
      type: String,
      required: [true, 'Owner name is required'],
      trim: true,
      maxlength: [100, 'Owner name cannot be more than 100 characters'],
      validate: {
        validator: isValidPersonName,
        message: 'Please enter a valid owner name'
      }
    },
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      maxlength: [200, 'Company name cannot be more than 200 characters'],
      validate: {
        validator: isValidCompanyName,
        message: 'Please enter a valid company name'
      }
    },
    mobileNumber: {
      type: String,
      required: [true, 'Mobile number is required'],
      unique: true,

    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
      maxlength: [500, 'Address cannot be more than 500 characters']
    },
    gstNumber: {
      type: String,
      trim: true,
      uppercase: true,
      sparse: true,

    },
    panNumber: {
      type: String,
      trim: true,
      uppercase: true,
      sparse: true,
      validate: {
        validator: isValidPAN,
        message: 'Please enter a valid PAN number (format: AAAAA0000A)'
      }
    }
  },
  bank: {
    bankName: {
      type: String,
      trim: true,
      maxlength: [100, 'Bank name cannot be more than 100 characters']
    },
    accountHolderName: {
      type: String,
      trim: true,
      maxlength: [100, 'Account holder name cannot be more than 100 characters']
    },
    accountNumber: {
      type: String,
      trim: true,
      validate: {
        validator: isValidAccountNumber,
        message: 'Account number must be between 9-18 digits'
      }
    },
    ifscCode: {
      type: String,
      trim: true,
      uppercase: true,
      validate: {
        validator: isValidIFSC,
        message: 'Please enter a valid IFSC code (format: ABCD0123456)'
      }
    },
    bankBranchName: {
      type: String,
      trim: true,
      maxlength: [200, 'Bank branch name cannot be more than 200 characters']
    }
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true // Adds createdAt and updatedAt fields
});

// Index for better query performance
userSchema.index({ email: 1 });
userSchema.index({ uniqueid: 1 });
userSchema.index({ 'profile.mobileNumber': 1 });
userSchema.index({ 'profile.gstNumber': 1 });
userSchema.index({ 'profile.panNumber': 1 });
userSchema.index({ createdAt: -1 });

// Pre-save middleware
userSchema.pre('save', async function(next) {
  try {
    // Generate unique ID if not provided
    if (!this.uniqueid) {
      const prefix = this.role === 'admin' ? 'ADMIN' : 'USER';
      this.uniqueid = generateUniqueId(prefix);
    }

    // Only hash the password if it has been modified (or is new)
    if (this.isModified('password')) {
      const salt = await bcrypt.genSalt(12);
      this.password = await bcrypt.hash(this.password, salt);
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to check password
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Static method to find user by email
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to find user by unique ID
userSchema.statics.findByUniqueId = function(uniqueid) {
  return this.findOne({ uniqueid });
};

// Static method to find user by mobile number
userSchema.statics.findByMobile = function(mobileNumber) {
  return this.findOne({ 'profile.mobileNumber': mobileNumber });
};

// Transform JSON output (remove sensitive fields)
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

module.exports = mongoose.model('User', userSchema);