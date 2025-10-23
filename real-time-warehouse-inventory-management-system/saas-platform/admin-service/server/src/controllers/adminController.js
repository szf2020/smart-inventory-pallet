const { SystemAdmin } = require("../models");
const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");

const adminController = {
  // Get all system admins
  getAllAdmins: async (req, res) => {
    try {
      const { page = 1, limit = 20, search } = req.query;
      const offset = (page - 1) * limit;

      const whereClause = {};
      if (search) {
        whereClause[Op.or] = [
          { username: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } },
          { fullName: { [Op.iLike]: `%${search}%` } },
        ];
      }

      const { count, rows: admins } = await SystemAdmin.findAndCountAll({
        where: whereClause,
        attributes: { exclude: ["password"] },
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [["created_at", "DESC"]],
      });

      res.json({
        admins,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit),
        },
      });
    } catch (error) {
      console.error("Get all admins error:", error);
      res.status(500).json({ message: "Failed to get system admins" });
    }
  },

  // Create new system admin
  createAdmin: async (req, res) => {
    try {
      const { username, email, password, fullName, role, permissions } =
        req.body;

      // Check if admin already exists
      const existingAdmin = await SystemAdmin.findOne({
        where: {
          [Op.or]: [{ username }, { email }],
        },
      });

      if (existingAdmin) {
        return res.status(400).json({
          message: "Admin with this username or email already exists",
        });
      }

      const admin = await SystemAdmin.create({
        username,
        email,
        password, // Will be automatically hashed
        fullName,
        role: role || "admin",
        permissions: permissions || [],
      });

      res.status(201).json({
        message: "System admin created successfully",
        admin: {
          id: admin.id,
          username: admin.username,
          email: admin.email,
          fullName: admin.fullName,
          role: admin.role,
          permissions: admin.permissions,
          isActive: admin.isActive,
          createdAt: admin.createdAt,
        },
      });
    } catch (error) {
      console.error("Create admin error:", error);
      res.status(500).json({ message: "Failed to create system admin" });
    }
  },

  // Update system admin
  updateAdmin: async (req, res) => {
    try {
      const { id } = req.params;
      const { email, fullName, role, permissions, isActive } = req.body;

      const admin = await SystemAdmin.findByPk(id);
      if (!admin) {
        return res.status(404).json({ message: "System admin not found" });
      }

      // Check if email is being changed and already exists
      if (email && email !== admin.email) {
        const existingAdmin = await SystemAdmin.findOne({
          where: {
            email,
            id: { [Op.ne]: id },
          },
        });

        if (existingAdmin) {
          return res.status(400).json({
            message: "Email already exists",
          });
        }
      }

      await admin.update({
        ...(email && { email }),
        ...(fullName && { fullName }),
        ...(role && { role }),
        ...(permissions && { permissions }),
        ...(typeof isActive === "boolean" && { isActive }),
      });

      res.json({
        message: "System admin updated successfully",
        admin: {
          id: admin.id,
          username: admin.username,
          email: admin.email,
          fullName: admin.fullName,
          role: admin.role,
          permissions: admin.permissions,
          isActive: admin.isActive,
          updatedAt: admin.updatedAt,
        },
      });
    } catch (error) {
      console.error("Update admin error:", error);
      res.status(500).json({ message: "Failed to update system admin" });
    }
  },

  // Change admin password
  changePassword: async (req, res) => {
    try {
      const { id } = req.params;
      const { currentPassword, newPassword } = req.body;

      const admin = await SystemAdmin.findByPk(id);
      if (!admin) {
        return res.status(404).json({ message: "System admin not found" });
      }

      // Verify current password (only if changing own password)
      if (req.admin.id === admin.id) {
        const isValidPassword = await bcrypt.compare(
          currentPassword,
          admin.password
        );
        if (!isValidPassword) {
          return res
            .status(400)
            .json({ message: "Current password is incorrect" });
        }
      }

      await admin.update({ password: newPassword }); // Will be automatically hashed

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  },

  // Delete system admin
  deleteAdmin: async (req, res) => {
    try {
      const { id } = req.params;

      // Prevent deleting self
      if (req.admin.id === parseInt(id)) {
        return res
          .status(400)
          .json({ message: "Cannot delete your own account" });
      }

      const admin = await SystemAdmin.findByPk(id);
      if (!admin) {
        return res.status(404).json({ message: "System admin not found" });
      }

      await admin.destroy();

      res.json({ message: "System admin deleted successfully" });
    } catch (error) {
      console.error("Delete admin error:", error);
      res.status(500).json({ message: "Failed to delete system admin" });
    }
  },

  // Get single admin details
  getAdmin: async (req, res) => {
    try {
      const { id } = req.params;

      const admin = await SystemAdmin.findByPk(id, {
        attributes: { exclude: ["password"] },
      });

      if (!admin) {
        return res.status(404).json({ message: "System admin not found" });
      }

      res.json(admin);
    } catch (error) {
      console.error("Get admin error:", error);
      res.status(500).json({ message: "Failed to get system admin" });
    }
  },
};

module.exports = adminController;
