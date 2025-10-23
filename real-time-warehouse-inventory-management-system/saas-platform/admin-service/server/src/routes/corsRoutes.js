const express = require("express");
const router = express.Router();
const corsController = require("../controllers/corsController");
const {
  verifyAdminToken,
  requireTenantManagement,
} = require("../middleware/authMiddleware");

// Public route for tenant-app server
router.get("/public/tenant/:tenantId", corsController.getCorsOrigins);

// Admin routes require authentication
router.use(verifyAdminToken);
router.use(requireTenantManagement);

router.get("/tenant/:tenantId", corsController.getCorsOrigins);
router.post("/tenant/:tenantId", corsController.addCorsOrigin);
router.put("/:id", corsController.updateCorsOrigin);
router.delete("/:id", corsController.deleteCorsOrigin);

module.exports = router;
