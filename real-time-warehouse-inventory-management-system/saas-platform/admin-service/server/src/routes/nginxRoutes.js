const express = require("express");
const router = express.Router();
const nginxController = require("../controllers/nginxController");
const { verifyAdminToken } = require("../middleware/authMiddleware");

// Apply authentication middleware to all routes
router.use(verifyAdminToken);

/**
 * @route   POST /api/nginx/setup
 * @desc    Setup domain and SSL for a tenant
 * @access  Private (Admin only)
 * @body    { subdomain: string, generateSSL?: boolean, email?: string }
 */
router.post("/setup", nginxController.setupTenantDomain);

/**
 * @route   DELETE /api/nginx/remove/:subdomain
 * @desc    Remove domain configuration for a tenant
 * @access  Private (Admin only)
 */
router.delete("/remove/:subdomain", nginxController.removeTenantDomain);

/**
 * @route   GET /api/nginx/health/:subdomain
 * @desc    Check domain health status
 * @access  Private (Admin only)
 */
router.get("/health/:subdomain", nginxController.checkDomainHealth);

/**
 * @route   POST /api/nginx/test
 * @desc    Test Nginx configuration
 * @access  Private (Admin only)
 */
router.post("/test", nginxController.testNginxConfig);

/**
 * @route   POST /api/nginx/reload
 * @desc    Reload Nginx service
 * @access  Private (Admin only)
 */
router.post("/reload", nginxController.reloadNginx);

/**
 * @route   POST /api/nginx/ssl
 * @desc    Generate SSL certificate for existing domain
 * @access  Private (Admin only)
 * @body    { subdomain: string, email?: string }
 */
router.post("/ssl", nginxController.generateSSLCertificate);

module.exports = router;
