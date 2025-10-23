const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

// Login route
router.post("/login", authController.login);

router.get("/verify", authController.verifyToken);

// Profile management routes - all require authentication
router.get("/profile", authMiddleware.verifyToken, authController.getProfile);

router.patch(
  "/profile",
  authMiddleware.verifyToken,
  authController.updateProfile
);

router.put(
  "/profile/change-password",
  authMiddleware.verifyToken,
  authController.changeProfilePassword
);

module.exports = router;
