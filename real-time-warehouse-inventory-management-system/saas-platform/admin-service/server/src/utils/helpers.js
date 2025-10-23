const crypto = require("crypto");

/**
 * Generate a secure random string
 * @param {number} length - Length of the random string
 * @returns {string} Random string
 */
exports.generateSecureRandom = (length = 32) => {
  return crypto.randomBytes(length).toString("hex");
};

/**
 * Generate a subdomain-safe string from company name
 * @param {string} companyName - Company name
 * @returns {string} Subdomain-safe string
 */
exports.generateSubdomain = (companyName) => {
  return companyName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .substring(0, 20);
};

/**
 * Generate database name from subdomain
 * @param {string} subdomain - Subdomain
 * @returns {string} Database name
 */
exports.generateDatabaseName = (subdomain) => {
  const prefix = "cnh_";
  const suffix = "_" + Date.now().toString().slice(-6);
  return prefix + subdomain + suffix;
};

/**
 * Validate email format
 * @param {string} email - Email address
 * @returns {boolean} Is valid email
 */
exports.isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate subdomain format
 * @param {string} subdomain - Subdomain
 * @returns {boolean} Is valid subdomain
 */
exports.isValidSubdomain = (subdomain) => {
  const subdomainRegex = /^[a-z0-9]([a-z0-9-]{1,48}[a-z0-9])?$/;
  return subdomainRegex.test(subdomain);
};

/**
 * Calculate trial end date
 * @param {number} trialDays - Number of trial days (default: 14)
 * @returns {Date} Trial end date
 */
exports.calculateTrialEndDate = (trialDays = 14) => {
  const date = new Date();
  date.setDate(date.getDate() + trialDays);
  return date;
};

/**
 * Calculate next billing date
 * @param {string} cycle - Billing cycle ('monthly' or 'yearly')
 * @param {Date} startDate - Start date (default: now)
 * @returns {Date} Next billing date
 */
exports.calculateNextBillingDate = (
  cycle = "monthly",
  startDate = new Date()
) => {
  const date = new Date(startDate);

  if (cycle === "yearly") {
    date.setFullYear(date.getFullYear() + 1);
  } else {
    date.setMonth(date.getMonth() + 1);
  }

  return date;
};

/**
 * Sanitize string for database use
 * @param {string} str - Input string
 * @returns {string} Sanitized string
 */
exports.sanitizeString = (str) => {
  if (!str) return "";
  return str
    .toString()
    .trim()
    .replace(/[<>\"']/g, "");
};

/**
 * Format currency amount
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: USD)
 * @returns {string} Formatted currency
 */
exports.formatCurrency = (amount, currency = "USD") => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(amount);
};

/**
 * Check if date is expired
 * @param {Date} date - Date to check
 * @returns {boolean} Is expired
 */
exports.isExpired = (date) => {
  return new Date() > new Date(date);
};

/**
 * Get days until date
 * @param {Date} date - Target date
 * @returns {number} Days until date (negative if past)
 */
exports.getDaysUntil = (date) => {
  const now = new Date();
  const target = new Date(date);
  const diffTime = target - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Generate API key
 * @returns {string} API key
 */
exports.generateApiKey = () => {
  const prefix = "cnh_";
  const key = crypto.randomBytes(32).toString("hex");
  return prefix + key;
};

/**
 * Hash API key for storage
 * @param {string} apiKey - API key to hash
 * @returns {string} Hashed API key
 */
exports.hashApiKey = (apiKey) => {
  return crypto.createHash("sha256").update(apiKey).digest("hex");
};

/**
 * Generate temporary password
 * @param {number} length - Password length (default: 12)
 * @returns {string} Temporary password
 */
exports.generateTempPassword = (length = 12) => {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {object} Validation result
 */
exports.validatePasswordStrength = (password) => {
  const result = {
    isValid: false,
    score: 0,
    feedback: [],
  };

  if (!password) {
    result.feedback.push("Password is required");
    return result;
  }

  if (password.length < 8) {
    result.feedback.push("Password must be at least 8 characters long");
  } else {
    result.score += 1;
  }

  if (!/[a-z]/.test(password)) {
    result.feedback.push("Password must contain at least one lowercase letter");
  } else {
    result.score += 1;
  }

  if (!/[A-Z]/.test(password)) {
    result.feedback.push("Password must contain at least one uppercase letter");
  } else {
    result.score += 1;
  }

  if (!/[0-9]/.test(password)) {
    result.feedback.push("Password must contain at least one number");
  } else {
    result.score += 1;
  }

  if (!/[^a-zA-Z0-9]/.test(password)) {
    result.feedback.push(
      "Password must contain at least one special character"
    );
  } else {
    result.score += 1;
  }

  result.isValid = result.score >= 4;

  return result;
};
