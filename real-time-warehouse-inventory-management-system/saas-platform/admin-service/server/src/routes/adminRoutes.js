const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const {
  verifyAdminToken,
  requireSuperAdmin,
} = require("../middleware/authMiddleware");

// All routes require authentication and super admin privileges
router.use(verifyAdminToken);
router.use(requireSuperAdmin);

router.get("/", adminController.getAllAdmins);
router.post("/", adminController.createAdmin);
router.get("/:id", adminController.getAdmin);
router.put("/:id", adminController.updateAdmin);
router.put("/:id/password", adminController.changePassword);
router.delete("/:id", adminController.deleteAdmin);

module.exports = router;
