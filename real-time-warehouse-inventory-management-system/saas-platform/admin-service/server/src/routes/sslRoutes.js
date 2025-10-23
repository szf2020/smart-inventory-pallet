const express = require("express");
const router = express.Router();
const sslController = require("../controllers/sslController");
const {
  verifyAdminToken,
  requireTenantManagement,
} = require("../middleware/authMiddleware");

// All routes require authentication
router.use(verifyAdminToken);
router.use(requireTenantManagement);

router.get("/tenant/:tenantId", sslController.getSSLCertificates);
router.post("/tenant/:tenantId", sslController.addSSLCertificate);
router.put("/:id", sslController.updateSSLCertificate);
router.delete("/:id", sslController.deleteSSLCertificate);

module.exports = router;
