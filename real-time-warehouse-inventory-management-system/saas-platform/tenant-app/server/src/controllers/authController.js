// const db = require("../models");
// const User = db.User;
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

// Handle user login
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Input validation
    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username and password are required" });
    }

    // Find user by username including role information
    const { User, Role } = req.db;
    const user = await User.findOne({
      where: { username: username },
      include: [
        {
          model: Role,
          as: "userRole",
          attributes: [
            "role_id",
            "name",
            "description",
            "tab_permissions",
            "is_system_role",
          ],
        },
      ],
    });

    if (!user) {
      console.log("Invalid credentials");
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Compare passwords using bcrypt
    const isPasswordValid = await user.validatePassword(password);
    console.log("Password valid: ", isPasswordValid);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Update last login
    await user.update({ last_login: new Date() });

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.user_id,
        username: user.username,
        role: user.userRole?.name || user.role,
      },
      process.env.JWT_SECRET || "jwtsecretkey",
      { expiresIn: process.env.JWT_EXPIRES || "6h" }
    );

    // Return token and user info (excluding password)
    const userWithoutPassword = {
      user_id: user.user_id,
      username: user.username,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      role_id: user.role_id,
      status: user.status,
      userRole: user.userRole,
      last_login: user.last_login,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };

    console.log("Login successful");

    res.status(200).json({
      message: "Login successful",
      token,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

// Verify token and return user data
exports.verifyToken = async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    // decode JWT token into token, secret_key, user_data & exp_time
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch complete user information including role
    const { User, Role } = req.db;
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ["password"] },
      include: [
        {
          model: Role,
          as: "userRole",
          attributes: [
            "role_id",
            "name",
            "description",
            "tab_permissions",
            "is_system_role",
          ],
        },
      ],
    });

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    res.status(200).json({ valid: true, user: user });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      res.status(401).json({ message: "Token expired" });
    } else {
      res.status(401).json({ message: "Invalid token" });
    }
  }
};

// Register new user
exports.register = async (req, res) => {
  try {
    const { username, password, role } = req.body;

    // Check if username already exists
    const User = req.db.User; // Use the User model from the database instance
    const existingUser = await User.findOne({
      where: { username: username },
    });

    if (existingUser) {
      return res.status(400).json({ message: "Username already exists" });
    }

    // Create new user
    const newUser = await User.create({
      username,
      password, // Will be hashed by model hooks
      role: role || "user", // Default to user role if not specified
    });

    // Generate token for new user
    const token = jwt.sign(
      { id: newUser.user_id, username: newUser.username, role: newUser.role },
      process.env.JWT_SECRET || "jwtsecretkey",
      { expiresIn: process.env.JWT_EXPIRES || "6h" }
    );

    // Return without password
    const userWithoutPassword = {
      user_id: newUser.user_id,
      username: newUser.username,
      role: newUser.role,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt,
    };

    res.status(201).json({
      message: "Registration successful",
      token,
      user: userWithoutPassword,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      message: "Registration failed",
    });
  }
};

// Get user profile
// Get all users (admin only)
exports.getAllUsers = async (req, res) => {
  try {
    // Check if requesting user has admin role
    if (req.userRole !== "admin") {
      return res.status(403).json({ message: "Permission denied" });
    }
    const User = req.db.User; // Use the User model from the database instance
    const users = await User.findAll({
      attributes: { exclude: ["password"] },
    });

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update user
exports.updateUser = async (req, res) => {
  try {
    const id = req.user.id;
    console.log("User : ###############", req.user);

    // Check permissions - only admins can update other users
    if (req.userRole !== "admin" && req.userId != id) {
      return res.status(403).json({ message: "Permission denied" });
    }

    // Don't allow role changes unless admin
    if (req.body.role && req.userRole !== "admin") {
      delete req.body.role;
    }
    const User = req.db.User; // Use the User model from the database instance
    const [updated] = await User.update(req.body, {
      where: { user_id: id },
    });

    if (updated) {
      const updatedUser = await User.findOne({
        where: { user_id: id },
        attributes: { exclude: ["password"] },
      });

      return res.status(200).json(updatedUser);
    }

    throw new Error("User not found");
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Delete user (admin only or self-delete)
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Check permissions - only admins can delete other users
    if (req.userRole !== "admin" && req.userId != id) {
      return res.status(403).json({ message: "Permission denied" });
    }
    const User = req.db.User; // Use the User model from the database instance
    const deleted = await User.destroy({
      where: { user_id: id },
    });

    if (deleted) {
      return res.status(204).send("User deleted");
    }

    throw new Error("User not found");
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const userId = req.userId;
    const { currentPassword, newPassword } = req.body;

    const User = req.db.User; // Use the User model from the database instance
    // Find the user
    const user = await User.findOne({
      where: { user_id: userId },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify current password
    const isPasswordValid = await user.validatePassword(currentPassword);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      message: "Failed to change password",
    });
  }
};

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { User, Role } = req.db;

    console.log(
      "Fetching profile for user ID:********************************",
      userId
    );

    const user = await User.findByPk(userId, {
      attributes: { exclude: ["password"] },
      include: [
        {
          model: Role,
          as: "userRole",
          attributes: [
            "role_id",
            "name",
            "description",
            "tab_permissions",
            "is_system_role",
          ],
        },
      ],
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({
      error: error.message,
      message: "Failed to fetch profile",
    });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id; // Changed from req.userId to req.user.id
    const { username, email, name, first_name, last_name, phone } = req.body;
    const { User } = req.db;

    // Handle name field - if name is provided, use it as full_name
    let updateData = { username, email, phone };

    if (name) {
      updateData.full_name = name;
    } else {
      if (first_name) updateData.first_name = first_name;
      if (last_name) updateData.last_name = last_name;
    }

    // Check if username is already taken by another user
    if (username) {
      const existingUser = await User.findOne({
        where: {
          username: username,
          user_id: { [req.db.Sequelize.Op.ne]: userId },
        },
      });

      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
    }

    // Update user profile
    const [updatedRowsCount] = await User.update(updateData, {
      where: { user_id: userId },
    });

    if (updatedRowsCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // Fetch updated user data
    const updatedUser = await User.findByPk(userId, {
      attributes: { exclude: ["password"] },
      include: [
        {
          model: req.db.Role,
          as: "userRole",
          attributes: [
            "role_id",
            "name",
            "description",
            "tab_permissions",
            "is_system_role",
          ],
        },
      ],
    });

    res.status(200).json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      message: "Failed to update profile",
    });
  }
};

// Change user password (profile specific endpoint)
exports.changeProfilePassword = async (req, res) => {
  try {
    const userId = req.user.id; // Changed from req.userId to req.user.id
    const { currentPassword, newPassword } = req.body;

    // Input validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Current password and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: "New password must be at least 6 characters long",
      });
    }

    const { User } = req.db;

    // Find the user
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify current password
    const isPasswordValid = await user.validatePassword(currentPassword);

    if (!isPasswordValid) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      message: "Failed to change password",
    });
  }
};
