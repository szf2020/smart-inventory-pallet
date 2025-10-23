const express = require("express");
const router = express.Router();
const envController = require("../controllers/envController");
const {
  verifyAdminToken,
  requireTenantManagement,
} = require("../middleware/authMiddleware");

// Public route for tenant-app server
router.get("/public/tenant/:tenantId", envController.getEnvironmentVariables);

// Admin routes require authentication
router.use(verifyAdminToken);
router.use(requireTenantManagement);

router.get("/tenant/:tenantId", envController.getEnvironmentVariables);
router.post("/tenant/:tenantId", envController.addEnvironmentVariable);
router.put("/:id", envController.updateEnvironmentVariable);
router.delete("/:id", envController.deleteEnvironmentVariable);

module.exports = router;
