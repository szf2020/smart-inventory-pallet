const express = require("express");
const router = express.Router();
const tenantController = require("../controllers/tenantController");
const {
  verifyAdminToken,
  requireTenantManagement,
} = require("../middleware/authMiddleware");

// Public routes for tenant-app to get tenant info (no auth required)
router.get("/public/domain/:domain", tenantController.getTenantByDomain);
router.get(
  "/public/:domain/database-config",
  tenantController.getDatabaseConfig
);

// Public route for tenant-app to get CORS origins
router.get("/:subdomain/cors-origins", tenantController.getCorsOrigins);

// Protected routes (require admin authentication)
router.use(verifyAdminToken);

router.get("/", tenantController.getAllTenants);
router.get("/:id", tenantController.getTenant);
router.post("/", requireTenantManagement, tenantController.createTenant);
router.put("/:id", requireTenantManagement, tenantController.updateTenant);

module.exports = router;
