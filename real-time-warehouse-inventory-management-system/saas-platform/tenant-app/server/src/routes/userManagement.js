const express = require('express');
const router = express.Router();
const userManagementController = require('../controllers/userManagementController');
const { verifyToken, authorize } = require('../middleware/authMiddleware');

// Apply authentication to all routes
router.use(verifyToken);

// Apply admin authorization to all user management routes
router.use(authorize(['admin']));

// Get all users
router.get('/', userManagementController.getAllUsers);

// Get single user by ID
router.get('/:id', userManagementController.getUserById);

// Create new user
router.post('/', userManagementController.createUser);

// Update user
router.put('/:id', userManagementController.updateUser);

// Update user password
router.put('/:id/password', userManagementController.updateUserPassword);

// Toggle user status (activate/deactivate/suspend)
router.patch('/:id/status', userManagementController.toggleUserStatus);

// Delete user (soft delete)
router.delete('/:id', userManagementController.deleteUser);

// Get user's permissions  
router.get('/:id/permissions', userManagementController.getUserPermissions);

module.exports = router;
