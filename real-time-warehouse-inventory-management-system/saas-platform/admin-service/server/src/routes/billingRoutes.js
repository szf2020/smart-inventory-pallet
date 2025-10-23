const express = require("express");
const router = express.Router();
const billingController = require("../controllers/billingController");
const {
  verifyAdminToken,
  requireBillingManagement,
} = require("../middleware/authMiddleware");

// All routes require authentication
router.use(verifyAdminToken);

// Get all billing records (super admin only)
router.get("/all", requireBillingManagement, billingController.getAllBilling);

// Tenant-specific billing routes
router.get("/tenant/:tenantId", billingController.getBillingInfo);
router.put(
  "/tenant/:tenantId",
  requireBillingManagement,
  billingController.updateBillingInfo
);
router.put(
  "/tenant/:tenantId/payment-status",
  requireBillingManagement,
  billingController.updatePaymentStatus
);
router.get("/tenant/:tenantId/calculate", billingController.calculateBilling);

module.exports = router;
