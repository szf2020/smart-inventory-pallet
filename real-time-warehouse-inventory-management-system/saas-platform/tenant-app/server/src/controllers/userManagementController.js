const { Op } = require("sequelize");

const userManagementController = {
  // Get all users with their roles
  async getAllUsers(req, res) {
    try {
      const { page = 1, limit = 10, search = "", status = "" } = req.query;
      const offset = (page - 1) * limit;

      const { User, Role } = req.db; // Use the models from the database instance

      // Build where clause
      const whereClause = {};

      if (search) {
        whereClause[Op.or] = [
          { username: { [Op.iLike]: `%${search}%` } },
          { full_name: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } },
        ];
      }

      if (status) {
        whereClause.status = status;
      }

      const { count, rows: users } = await User.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Role,
            as: "userRole",
          },
          {
            model: User,
            as: "creator",
            attributes: ["user_id", "username", "full_name"],
          },
        ],
        attributes: { exclude: ["password"] },
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [["created_at", "DESC"]],
      });

      res.json({
        success: true,
        data: {
          users,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / limit),
          },
        },
      });
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch users",
        error: error.message,
      });
    }
  },

  // Get single user by ID
  async getUserById(req, res) {
    try {
      const { id } = req.params;

      const { User, Role } = req.db; // Use the models from the database instance

      const user = await User.findByPk(id, {
        include: [
          {
            model: Role,
            as: "userRole",
          },
          {
            model: User,
            as: "creator",
            attributes: ["user_id", "username", "full_name"],
          },
        ],
        attributes: { exclude: ["password"] },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch user",
        error: error.message,
      });
    }
  },

  // Create new user
  async createUser(req, res) {
    try {
      const {
        username,
        email,
        password,
        full_name,
        phone,
        role_id,
        status = "active",
      } = req.body;
      const creatorId = req.user.id;

      const { User, Role } = req.db; // Use the models from the database instance

      // Validate required fields
      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: "Username and password are required",
        });
      }

      // Check if username already exists
      const existingUser = await User.findOne({
        where: { username },
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Username already exists",
        });
      }

      // Check if email already exists (if provided)
      if (email) {
        const existingEmail = await User.findOne({
          where: { email },
        });

        if (existingEmail) {
          return res.status(400).json({
            success: false,
            message: "Email already exists",
          });
        }
      }

      // Validate role exists
      if (role_id) {
        const role = await Role.findByPk(role_id);
        if (!role) {
          return res.status(400).json({
            success: false,
            message: "Invalid role specified",
          });
        }
      }

      // Create user
      const user = await User.create({
        username,
        email,
        password, // Will be hashed by the model hook
        full_name,
        phone,
        role_id,
        role: "user", // Default legacy role
        status,
        created_by: creatorId,
      });

      // Fetch created user with role information
      const createdUser = await User.findByPk(user.user_id, {
        include: [
          {
            model: Role,
            as: "userRole",
          },
          {
            model: User,
            as: "creator",
            attributes: ["user_id", "username", "full_name"],
          },
        ],
        attributes: { exclude: ["password"] },
      });

      res.status(201).json({
        success: true,
        message: "User created successfully",
        data: createdUser,
      });
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create user",
        error: error.message,
      });
    }
  },

  // Update user
  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { username, email, full_name, phone, role_id, status } = req.body;

      const { User, Role } = req.db; // Use the models from the database instance

      const user = await User.findByPk(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Check if new username already exists (excluding current user)
      if (username && username !== user.username) {
        const existingUser = await User.findOne({
          where: {
            username,
            user_id: { [Op.ne]: id },
          },
        });

        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: "Username already exists",
          });
        }
      }

      // Check if new email already exists (excluding current user)
      if (email && email !== user.email) {
        const existingEmail = await User.findOne({
          where: {
            email,
            user_id: { [Op.ne]: id },
          },
        });

        if (existingEmail) {
          return res.status(400).json({
            success: false,
            message: "Email already exists",
          });
        }
      }

      // Validate role exists (if provided)
      if (role_id && role_id !== user.role_id) {
        const role = await Role.findByPk(role_id);
        if (!role) {
          return res.status(400).json({
            success: false,
            message: "Invalid role specified",
          });
        }
      }

      // Update user
      const updateData = {};
      if (username) updateData.username = username;
      if (email !== undefined) updateData.email = email;
      if (full_name !== undefined) updateData.full_name = full_name;
      if (phone !== undefined) updateData.phone = phone;
      if (role_id !== undefined) updateData.role_id = role_id;
      if (status) updateData.status = status;

      await user.update(updateData);

      // Fetch updated user with role information
      const updatedUser = await User.findByPk(id, {
        include: [
          {
            model: Role,
            as: "userRole",
          },
          {
            model: User,
            as: "creator",
            attributes: ["user_id", "username", "full_name"],
          },
        ],
        attributes: { exclude: ["password"] },
      });

      res.json({
        success: true,
        message: "User updated successfully",
        data: updatedUser,
      });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update user",
        error: error.message,
      });
    }
  },

  // Update user password
  async updateUserPassword(req, res) {
    try {
      const { id } = req.params;
      const { newPassword, currentPassword } = req.body;
      const requesterId = req.user.id;

      const { User } = req.db;

      if (!newPassword) {
        return res.status(400).json({
          success: false,
          message: "New password is required",
        });
      }

      const user = await User.findByPk(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // If user is updating their own password, verify current password
      if (parseInt(id) === requesterId && currentPassword) {
        const isCurrentPasswordValid =
          await user.validatePassword(currentPassword);
        if (!isCurrentPasswordValid) {
          return res.status(400).json({
            success: false,
            message: "Current password is incorrect",
          });
        }
      }

      // Update password (will be hashed by model hook)
      await user.update({ password: newPassword });

      res.json({
        success: true,
        message: "Password updated successfully",
      });
    } catch (error) {
      console.error("Error updating password:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update password",
        error: error.message,
      });
    }
  },

  // Deactivate/Activate user
  async toggleUserStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const { User } = req.db; // Use the models from the database instance

      if (!["active", "inactive", "suspended"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status. Must be active, inactive, or suspended",
        });
      }

      const user = await User.findByPk(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      await user.update({ status });

      res.json({
        success: true,
        message: `User ${status === "active" ? "activated" : status} successfully`,
        data: { user_id: user.user_id, status: user.status },
      });
    } catch (error) {
      console.error("Error toggling user status:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update user status",
        error: error.message,
      });
    }
  },

  // Delete user (soft delete by setting status to inactive)
  async deleteUser(req, res) {
    try {
      const { id } = req.params;

      const { User } = req.db; // Use the models from the database instance

      const user = await User.findByPk(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // hard delete
      await user.destroy();

      res.json({
        success: true,
        message: "User deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete user",
        error: error.message,
      });
    }
  },

  // Get user's permissions (for checking access)
  async getUserPermissions(req, res) {
    try {
      const { id } = req.params;

      const { User, Role } = req.db; // Use the models from the database instance

      const user = await User.findByPk(id, {
        include: [
          {
            model: Role,
            as: "userRole",
          },
        ],
        attributes: ["user_id", "username", "status"],
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // For now, return role permissions from the JSONB field
      const permissions = user.userRole ? user.userRole.permissions : {};

      res.json({
        success: true,
        data: {
          user_id: user.user_id,
          username: user.username,
          role: user.userRole,
          permissions,
        },
      });
    } catch (error) {
      console.error("Error fetching user permissions:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch user permissions",
        error: error.message,
      });
    }
  },
};

module.exports = userManagementController;
