const mongoose = require('mongoose');

/**
 * Check if a string is a valid MongoDB ObjectId
 * @param {string} id - The ID to validate
 * @returns {boolean} - True if valid ObjectId
 */
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

/**
 * Convert string to ObjectId
 * @param {string} id - The ID string to convert
 * @returns {mongoose.Types.ObjectId} - MongoDB ObjectId
 */
const toObjectId = (id) => {
  return new mongoose.Types.ObjectId(id);
};

/**
 * Generate a unique ID for users
 * @param {string} prefix - Prefix for the ID (e.g., 'USER', 'ADMIN')
 * @returns {string} - Generated unique ID
 */
const generateUniqueId = (prefix = 'USER') => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substr(2, 5).toUpperCase();
  return `${prefix}${timestamp}${random}`;
};

/**
 * Sanitize user input by removing sensitive fields
 * @param {Object} user - User object
 * @returns {Object} - Sanitized user object
 */
const sanitizeUser = (user) => {
  const userObj = user.toObject ? user.toObject() : user;
  delete userObj.password;
  return userObj;
};

/**
 * Build search query for users
 * @param {Object} searchParams - Search parameters
 * @returns {Object} - MongoDB query object
 */
const buildUserSearchQuery = (searchParams) => {
  const query = {};
  
  if (searchParams.search) {
    query.$or = [
      { 'profile.ownerName': { $regex: searchParams.search, $options: 'i' } },
      { 'profile.companyName': { $regex: searchParams.search, $options: 'i' } },
      { email: { $regex: searchParams.search, $options: 'i' } },
      { uniqueid: { $regex: searchParams.search, $options: 'i' } },
      { 'profile.mobileNumber': { $regex: searchParams.search, $options: 'i' } }
    ];
  }
  
  if (searchParams.role) {
    query.role = searchParams.role;
  }
  
  if (searchParams.isActive !== undefined) {
    query.isActive = searchParams.isActive === 'true';
  }
  
  if (searchParams.city) {
    query['profile.address'] = { $regex: searchParams.city, $options: 'i' };
  }
  
  if (searchParams.gstNumber) {
    query['profile.gstNumber'] = searchParams.gstNumber.toUpperCase();
  }
  
  if (searchParams.panNumber) {
    query['profile.panNumber'] = searchParams.panNumber.toUpperCase();
  }
  
  return query;
};

/**
 * Get pagination parameters
 * @param {Object} query - Request query parameters
 * @returns {Object} - Pagination object
 */
const getPaginationParams = (query) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;
  const skip = (page - 1) * limit;
  
  return { page, limit, skip };
};

/**
 * Format pagination response
 * @param {Array} data - Data array
 * @param {number} total - Total count
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {Object} - Formatted response
 */
const formatPaginationResponse = (data, total, page, limit) => {
  return {
    success: true,
    count: data.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    data
  };
};

/**
 * Handle MongoDB errors and return appropriate response
 * @param {Error} error - MongoDB error
 * @returns {Object} - Error response object
 */
const handleMongoError = (error) => {
  console.error('MongoDB Error:', error);
  
  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map(err => err.message);
    return {
      status: 400,
      success: false,
      error: messages.join(', ')
    };
  }
  
  if (error.name === 'CastError') {
    return {
      status: 400,
      success: false,
      error: 'Invalid ID format'
    };
  }
  
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    return {
      status: 400,
      success: false,
      error: `${field} already exists`
    };
  }
  
  return {
    status: 500,
    success: false,
    error: 'Database error occurred'
  };
};

module.exports = {
  isValidObjectId,
  toObjectId,
  generateUniqueId,
  sanitizeUser,
  buildUserSearchQuery,
  getPaginationParams,
  formatPaginationResponse,
  handleMongoError
};