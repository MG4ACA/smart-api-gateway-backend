const validator = require('validator');

/**
 * Validate registration data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateRegistration = (req, res, next) => {
  const { name, email, password } = req.body;
  const errors = [];

  // Name validation
  if (!name || name.trim().length === 0) {
    errors.push('Name is required');
  } else if (name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long');
  } else if (name.trim().length > 50) {
    errors.push('Name must be less than 50 characters long');
  }

  // Email validation
  if (!email) {
    errors.push('Email is required');
  } else if (!validator.isEmail(email)) {
    errors.push('Email must be a valid email address');
  }

  // Password validation
  if (!password) {
    errors.push('Password is required');
  } else {
    if (password.length < 6) {
      errors.push('Password must be at least 6 characters long');
    }
    if (password.length > 128) {
      errors.push('Password must be less than 128 characters long');
    }
    if (!/(?=.*[a-z])/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/(?=.*\d)/.test(password)) {
      errors.push('Password must contain at least one number');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'Please fix the following errors',
      details: errors,
    });
  }

  next();
};

/**
 * Validate login data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = [];

  // Email validation
  if (!email) {
    errors.push('Email is required');
  } else if (!validator.isEmail(email)) {
    errors.push('Email must be a valid email address');
  }

  // Password validation
  if (!password) {
    errors.push('Password is required');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'Please fix the following errors',
      details: errors,
    });
  }

  next();
};

/**
 * Validate recipe ID parameter
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateRecipeId = (req, res, next) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'Recipe ID is required',
    });
  }

  if (typeof id !== 'string' || id.trim().length === 0) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'Recipe ID must be a valid string',
    });
  }

  next();
};

/**
 * Validate category parameter
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateCategory = (req, res, next) => {
  const { category } = req.params;

  if (!category) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'Category is required',
    });
  }

  if (typeof category !== 'string' || category.trim().length === 0) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'Category must be a valid string',
    });
  }

  next();
};

module.exports = {
  validateRegistration,
  validateLogin,
  validateRecipeId,
  validateCategory,
};
