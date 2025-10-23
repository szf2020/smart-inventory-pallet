const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { verifyAdminToken } = require("../middleware/authMiddleware");

// Public routes
router.post("/login", authController.login);

// Protected routes
router.get("/profile", verifyAdminToken, authController.getProfile);

module.exports = router;
