const crypto = require('crypto');

/**
 * Generate a secure random password
 * @param {number} length - Password length (default: 12)
 * @param {Object} options - Password generation options
 * @returns {string} - Generated password
 */
const generateSecurePassword = (length = 12, options = {}) => {
  const defaults = {
    includeUppercase: true,
    includeLowercase: true,
    includeNumbers: true,
    includeSymbols: true,
    excludeSimilar: true, // Exclude similar looking characters like 0, O, l, 1, I
    excludeAmbiguous: true // Exclude ambiguous characters like {, }, [, ], (, ), /, \, ', ", `, ~, ,, ;, ., <, >
  };

  const config = { ...defaults, ...options };

  let charset = '';
  
  if (config.includeLowercase) {
    charset += config.excludeSimilar ? 'abcdefghijkmnopqrstuvwxyz' : 'abcdefghijklmnopqrstuvwxyz';
  }
  
  if (config.includeUppercase) {
    charset += config.excludeSimilar ? 'ABCDEFGHJKLMNPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  }
  
  if (config.includeNumbers) {
    charset += config.excludeSimilar ? '23456789' : '0123456789';
  }
  
  if (config.includeSymbols) {
    charset += config.excludeAmbiguous ? '!@#$%^&*+-=' : '!@#$%^&*()_+-=[]{}|;:,.<>?';
  }

  if (charset === '') {
    throw new Error('At least one character type must be included');
  }

  let password = '';
  const charsetLength = charset.length;

  // Ensure at least one character from each selected type
  const requiredChars = [];
  
  if (config.includeLowercase) {
    const lowerChars = config.excludeSimilar ? 'abcdefghijkmnopqrstuvwxyz' : 'abcdefghijklmnopqrstuvwxyz';
    requiredChars.push(lowerChars[crypto.randomInt(lowerChars.length)]);
  }
  
  if (config.includeUppercase) {
    const upperChars = config.excludeSimilar ? 'ABCDEFGHJKLMNPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    requiredChars.push(upperChars[crypto.randomInt(upperChars.length)]);
  }
  
  if (config.includeNumbers) {
    const numberChars = config.excludeSimilar ? '23456789' : '0123456789';
    requiredChars.push(numberChars[crypto.randomInt(numberChars.length)]);
  }
  
  if (config.includeSymbols) {
    const symbolChars = config.excludeAmbiguous ? '!@#$%^&*+-=' : '!@#$%^&*()_+-=[]{}|;:,.<>?';
    requiredChars.push(symbolChars[crypto.randomInt(symbolChars.length)]);
  }

  // Fill the rest of the password length with random characters
  const remainingLength = length - requiredChars.length;
  for (let i = 0; i < remainingLength; i++) {
    password += charset[crypto.randomInt(charsetLength)];
  }

  // Add required characters
  password += requiredChars.join('');

  // Shuffle the password to avoid predictable patterns
  return shuffleString(password);
};

/**
 * Shuffle a string randomly
 * @param {string} str - String to shuffle
 * @returns {string} - Shuffled string
 */
const shuffleString = (str) => {
  const array = str.split('');
  for (let i = array.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array.join('');
};

/**
 * Generate a memorable password (easier to type but still secure)
 * @param {number} length - Password length (default: 10)
 * @returns {string} - Generated memorable password
 */
const generateMemorablePassword = (length = 10) => {
  return generateSecurePassword(length, {
    includeUppercase: true,
    includeLowercase: true,
    includeNumbers: true,
    includeSymbols: false,
    excludeSimilar: true,
    excludeAmbiguous: true
  });
};

/**
 * Generate a PIN (numbers only)
 * @param {number} length - PIN length (default: 6)
 * @returns {string} - Generated PIN
 */
const generatePIN = (length = 6) => {
  let pin = '';
  for (let i = 0; i < length; i++) {
    pin += crypto.randomInt(10).toString();
  }
  return pin;
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} - Validation result
 */
const validatePasswordStrength = (password) => {
  const result = {
    score: 0,
    strength: 'Very Weak',
    feedback: []
  };

  if (password.length < 6) {
    result.feedback.push('Password should be at least 6 characters long');
    return result;
  }

  // Length scoring
  if (password.length >= 8) result.score += 1;
  if (password.length >= 12) result.score += 1;
  if (password.length >= 16) result.score += 1;

  // Character type scoring
  if (/[a-z]/.test(password)) result.score += 1;
  if (/[A-Z]/.test(password)) result.score += 1;
  if (/[0-9]/.test(password)) result.score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) result.score += 1;

  // Determine strength
  if (result.score <= 2) {
    result.strength = 'Weak';
    result.feedback.push('Consider adding more character types');
  } else if (result.score <= 4) {
    result.strength = 'Fair';
    result.feedback.push('Good, but could be stronger');
  } else if (result.score <= 6) {
    result.strength = 'Good';
    result.feedback.push('Strong password');
  } else {
    result.strength = 'Excellent';
    result.feedback.push('Very strong password');
  }

  return result;
};

module.exports = {
  generateSecurePassword,
  generateMemorablePassword,
  generatePIN,
  validatePasswordStrength
};