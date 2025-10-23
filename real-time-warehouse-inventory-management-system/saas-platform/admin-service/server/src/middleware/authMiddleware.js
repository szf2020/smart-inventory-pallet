const jwt = require("jsonwebtoken");
const { SystemAdmin } = require("../models");

// API Key authentication for service-to-service communication
exports.verifyServiceApiKey = (req, res, next) => {
  try {
    const apiKey =
      req.headers["x-api-key"] ||
      req.headers["authorization"]?.replace("Bearer ", "");
    const expectedApiKey =
      process.env.SERVICE_API_KEY || "tenant-app-service-key-2024";

    if (!apiKey || apiKey !== expectedApiKey) {
      return res.status(401).json({
        error: "Invalid or missing API key for service access.",
      });
    }

    req.isServiceRequest = true;
    next();
  } catch (error) {
    return res.status(500).json({
      error: "Service authentication error.",
    });
  }
};

// Verify JWT token for admin authentication
exports.verifyAdminToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN format

    if (!token) {
      return res.status(401).json({
        error: "Access denied. No token provided.",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find admin user
    const admin = await SystemAdmin.findByPk(decoded.id, {
      attributes: { exclude: ["password", "two_factor_secret"] },
    });

    if (!admin) {
      return res.status(401).json({
        error: "Invalid token. Admin not found.",
      });
    }

    if (admin.status !== "active") {
      return res.status(401).json({
        error: "Account is not active.",
      });
    }

    if (admin.isLocked()) {
      return res.status(401).json({
        error:
          "Account is temporarily locked due to multiple failed login attempts.",
      });
    }

    req.admin = admin;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(403).json({
        error: "Invalid token.",
      });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(403).json({
        error: "Token expired.",
      });
    }

    console.error("Auth middleware error:", error);
    return res.status(500).json({
      error: "Internal server error during authentication.",
    });
  }
};

// Role-based authorization middleware
exports.requireRole = (roles = []) => {
  if (typeof roles === "string") {
    roles = [roles];
  }

  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        error: "Authentication required.",
      });
    }

    if (roles.length && !roles.includes(req.admin.role)) {
      return res.status(403).json({
        error: "Insufficient permissions for this operation.",
      });
    }

    next();
  };
};

// Super admin only middleware
exports.requireSuperAdmin = (req, res, next) => {
  if (!req.admin || !req.admin.isSuperAdmin()) {
    return res.status(403).json({
      error: "Super admin access required.",
    });
  }
  next();
};

// Tenant management permission middleware
exports.requireTenantManagement = (req, res, next) => {
  if (!req.admin || !req.admin.canManageTenants()) {
    return res.status(403).json({
      error: "Tenant management permission required.",
    });
  }
  next();
};

// Billing management permission middleware
exports.requireBillingManagement = (req, res, next) => {
  if (!req.admin || !req.admin.canManageBilling()) {
    return res.status(403).json({
      error: "Billing management permission required.",
    });
  }
  next();
};
