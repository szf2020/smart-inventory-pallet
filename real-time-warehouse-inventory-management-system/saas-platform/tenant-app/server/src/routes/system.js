const express = require("express");
const router = express.Router();
const adminServiceClient = require("../services/adminServiceClient");

/**
 * Health check endpoint
 */
router.get("/health", async (req, res) => {
  try {
    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      tenant: req.tenant || "unknown",
      database: "connected",
      adminService: "unknown",
    };

    // Check database connection
    try {
      await req.sequelize.authenticate();
      health.database = "connected";
    } catch (error) {
      health.database = "disconnected";
      health.status = "unhealthy";
    }

    // Check admin service connection
    try {
      const adminServiceHealthy = await adminServiceClient.healthCheck();
      health.adminService = adminServiceHealthy ? "connected" : "disconnected";
      if (!adminServiceHealthy && process.env.NODE_ENV === "production") {
        health.status = "degraded";
      }
    } catch (error) {
      health.adminService = "error";
      if (process.env.NODE_ENV === "production") {
        health.status = "degraded";
      }
    }

    const statusCode =
      health.status === "healthy"
        ? 200
        : health.status === "degraded"
          ? 200
          : 503;

    res.status(statusCode).json(health);
  } catch (error) {
    res.status(500).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

/**
 * Tenant info endpoint
 */
router.get("/tenant-info", async (req, res) => {
  try {
    const info = {
      tenant: req.tenant,
      tenantInfo: req.tenantInfo || null,
      environmentVariables: Object.keys(req.tenantEnv || {}).length,
      hostname: req.hostname,
      development: process.env.NODE_ENV === "development",
    };

    res.json(info);
  } catch (error) {
    res.status(500).json({
      error: "Failed to get tenant info",
      message: error.message,
    });
  }
});

/**
 * Admin service status endpoint
 */
router.get("/admin-service-status", async (req, res) => {
  try {
    const isHealthy = await adminServiceClient.healthCheck();
    const status = {
      connected: isHealthy,
      url:
        process.env.ADMIN_SERVICE_URL ||
        "http://localhost:7000/api/super-admin",
      timestamp: new Date().toISOString(),
    };

    res.json(status);
  } catch (error) {
    res.status(500).json({
      connected: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Clear cache endpoint (for development/debugging)
 */
router.post("/clear-cache", async (req, res) => {
  try {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({
        error: "Cache clearing not allowed in production",
      });
    }

    const { tenant } = req.body;
    adminServiceClient.clearCache(tenant);

    res.json({
      message: tenant
        ? `Cache cleared for tenant: ${tenant}`
        : "All cache cleared",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to clear cache",
      message: error.message,
    });
  }
});

module.exports = router;
