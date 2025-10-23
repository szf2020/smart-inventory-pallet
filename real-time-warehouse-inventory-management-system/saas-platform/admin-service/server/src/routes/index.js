const express = require("express");
const router = express.Router();

// Import route modules
const authRoutes = require("./authRoutes");
const tenantRoutes = require("./tenantRoutes");
const corsRoutes = require("./corsRoutes");
const sslRoutes = require("./sslRoutes");
const envRoutes = require("./envRoutes");
const billingRoutes = require("./billingRoutes");
const adminRoutes = require("./adminRoutes");
const nginxRoutes = require("./nginxRoutes");

// Health check for API
router.get("/", (req, res) => {
  res.json({
    message: "CNH Distributors Admin Service API",
    version: "1.0.0",
    status: "Active",
  });
});

// Health check route
router.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    service: "admin-service",
  });
});

// Mount route modules
router.use("/auth", authRoutes);
router.use("/tenants", tenantRoutes);
router.use("/ssl", sslRoutes);
router.use("/billing", billingRoutes);
router.use("/admins", adminRoutes);
router.use("/cors", corsRoutes);
router.use("/env", envRoutes);
router.use("/nginx", nginxRoutes);

module.exports = router;
