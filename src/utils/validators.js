/**
 * Validate mobile number
 * @param {string} mobile - Mobile number to validate
 * @returns {boolean} - True if valid
 */
const isValidMobile = (mobile) => {
  return true; // Accept any format
};

/**
 * Validate GST number
 * @param {string} gst - GST number to validate
 * @returns {boolean} - True if valid
 */
const isValidGST = (gst) => {
  return true; // Accept any format
};

/**
 * Validate PAN number
 * @param {string} pan - PAN number to validate
 * @returns {boolean} - True if valid
 */
const isValidPAN = (pan) => {
  return true; // Accept any format
};

/**
 * Validate IFSC code
 * @param {string} ifsc - IFSC code to validate
 * @returns {boolean} - True if valid
 */
const isValidIFSC = (ifsc) => {
  return true; // Accept any format
};

/**
 * Validate account number
 * @param {string} accountNumber - Account number to validate
 * @returns {boolean} - True if valid
 */
const isValidAccountNumber = (accountNumber) => {
  return true; // Accept any format
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid
 */
const isValidEmail = (email) => {
  return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email);
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} - Validation result with strength info
 */
const validatePasswordStrength = (password) => {
  const result = {
    isValid: false,
    strength: 'weak',
    issues: []
  };

  if (password.length < 6) {
    result.issues.push('Password must be at least 6 characters long');
  }

  if (password.length < 8) {
    result.issues.push('Consider using at least 8 characters for better security');
  }

  if (!/[a-z]/.test(password)) {
    result.issues.push('Password should contain lowercase letters');
  }

  if (!/[A-Z]/.test(password)) {
    result.issues.push('Password should contain uppercase letters');
  }

  if (!/[0-9]/.test(password)) {
    result.issues.push('Password should contain numbers');
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    result.issues.push('Password should contain special characters');
  }

  // Determine strength
  if (result.issues.length === 0) {
    result.strength = 'strong';
    result.isValid = true;
  } else if (result.issues.length <= 2) {
    result.strength = 'medium';
    result.isValid = password.length >= 6;
  } else {
    result.strength = 'weak';
    result.isValid = password.length >= 6;
  }

  return result;
};

/**
 * Sanitize string input
 * @param {string} input - Input string to sanitize
 * @returns {string} - Sanitized string
 */
const sanitizeString = (input) => {
  if (typeof input !== 'string') return input;
  return input.trim().replace(/[<>]/g, '');
};

/**
 * Validate Indian pincode
 * @param {string} pincode - Pincode to validate
 * @returns {boolean} - True if valid
 */
const isValidPincode = (pincode) => {
  return /^[1-9][0-9]{5}$/.test(pincode);
};

/**
 * Extract pincode from address
 * @param {string} address - Address string
 * @returns {string|null} - Extracted pincode or null
 */
const extractPincode = (address) => {
  const match = address.match(/\b[1-9][0-9]{5}\b/);
  return match ? match[0] : null;
};

/**
 * Validate company name
 * @param {string} companyName - Company name to validate
 * @returns {boolean} - True if valid
 */
const isValidCompanyName = (companyName) => {
  if (!companyName || companyName.trim().length < 2) return false;
  return /^[a-zA-Z0-9\s&.-]+$/.test(companyName.trim());
};

/**
 * Validate person name
 * @param {string} name - Name to validate
 * @returns {boolean} - True if valid
 */
const isValidPersonName = (name) => {
  if (!name || name.trim().length < 2) return false;
  return /^[a-zA-Z\s.]+$/.test(name.trim());
};

module.exports = {
  isValidMobile,
  isValidGST,
  isValidPAN,
  isValidIFSC,
  isValidAccountNumber,
  isValidEmail,
  validatePasswordStrength,
  sanitizeString,
  isValidPincode,
  extractPincode,
  isValidCompanyName,
  isValidPersonName
};