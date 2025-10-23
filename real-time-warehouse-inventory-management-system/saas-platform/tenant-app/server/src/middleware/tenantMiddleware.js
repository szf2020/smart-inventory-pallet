/**
 * Middleware to validate tenant exists and is active
 */
const validateTenant = async (req, res, next) => {
  try {
    const tenantDomain = req.tenant || req.hostname;

    // Skip validation for localhost in development
    if (
      process.env.NODE_ENV === "development" &&
      (tenantDomain.includes("localhost") || tenantDomain.includes("127.0.0.1"))
    ) {
      return next();
    }

    // For production, you can add tenant validation here if needed
    // For now, just continue
    next();
  } catch (error) {
    console.error("Tenant validation error:", error.message);
    next(); // Continue even if validation fails
  }
};

/**
 * Middleware to load tenant-specific environment variables
 */
const loadTenantEnvironment = async (req, res, next) => {
  try {
    // Skip for now, can be enhanced later
    req.tenantEnv = {};
    next();
  } catch (error) {
    console.error("Error loading tenant environment:", error.message);
    req.tenantEnv = {};
    next();
  }
};

/**
 * Middleware to check tenant billing status
 */
const checkBillingStatus = async (req, res, next) => {
  try {
    // Skip billing check for now
    next();
  } catch (error) {
    console.error("Billing check error:", error.message);
    next();
  }
};

module.exports = {
  validateTenant,
  loadTenantEnvironment,
  checkBillingStatus,
};
