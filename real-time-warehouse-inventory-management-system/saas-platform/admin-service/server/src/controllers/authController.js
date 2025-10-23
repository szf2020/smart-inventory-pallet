const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

// Admin login
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username and password are required" });
    }

    // Find admin by username or email
    const admin = await req.db.SystemAdmin.findOne({
      where: {
        [req.db.Sequelize.Op.or]: [{ username: username }, { email: username }],
      },
    });

    if (!admin) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (admin.status !== "active") {
      return res.status(401).json({ message: "Account is not active" });
    }

    if (admin.isLocked()) {
      return res.status(401).json({ message: "Account is temporarily locked" });
    }

    // Verify password
    const isValidPassword = await admin.validatePassword(password);
    if (!isValidPassword) {
      await admin.incrementLoginAttempts();
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Reset login attempts and update last login
    await admin.resetLoginAttempts();

    // Generate JWT token
    const token = jwt.sign(
      {
        id: admin.id,
        username: admin.username,
        role: admin.role,
      },
      process.env.JWT_SECRET || "default-secret",
      { expiresIn: "24h" }
    );

    res.json({
      success: true,
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        full_name: admin.full_name,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get current admin profile
exports.getProfile = async (req, res) => {
  try {
    const admin = await req.db.SystemAdmin.findByPk(req.admin.id, {
      attributes: { exclude: ["password", "two_factor_secret"] },
    });

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    res.json({ success: true, admin });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
