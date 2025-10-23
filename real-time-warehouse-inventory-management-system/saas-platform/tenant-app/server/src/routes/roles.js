const express = require("express");
const router = express.Router();
const roleManagementController = require("../controllers/roleManagementController");
const { verifyToken, authorize } = require("../middleware/authMiddleware");

// Apply authentication to all routes
router.use(verifyToken);

// Get all roles with pagination and search
router.get("/", roleManagementController.getRoles);

// Get single role by ID
router.get("/:id", roleManagementController.getRoleById);

// Get active roles (for dropdowns)
router.get("/active/list", roleManagementController.getActiveRoles);

// Get available permissions (for building permission forms)
router.get(
  "/permissions/available",
  roleManagementController.getAvailablePermissions
);

// Create new role
router.post("/", roleManagementController.createRole);

// Update role
router.put("/:id", roleManagementController.updateRole);

// Update role permissions only
router.put("/:id/permissions", roleManagementController.updateRolePermissions);

// Delete role
router.delete("/:id", roleManagementController.deleteRole);

module.exports = router;
