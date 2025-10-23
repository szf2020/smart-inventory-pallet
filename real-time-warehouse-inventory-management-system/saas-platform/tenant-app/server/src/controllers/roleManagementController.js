const { Op } = require("sequelize");

const roleManagementController = {
  // Get all roles
  async getRoles(req, res) {
    try {
      const { page = 1, limit = 10, search = "", status = "" } = req.query;
      const offset = (page - 1) * limit;

      const { Role, User } = req.db; // Use the models from the database instance

      // Build where conditions
      const whereConditions = {};

      if (search) {
        whereConditions[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } },
        ];
      }

      if (status) {
        whereConditions.status = status;
      }

      const { count, rows: roles } = await Role.findAndCountAll({
        where: whereConditions,
        include: [
          {
            model: User,
            as: "creator",
            attributes: ["user_id", "username", "full_name"],
          },
          {
            model: User,
            as: "users",
            attributes: ["user_id", "username", "full_name", "status"],
          },
        ],
        order: [["created_at", "DESC"]],
        limit: parseInt(limit),
        offset: parseInt(offset),
      });

      // Add user count to each role
      const rolesWithCount = roles.map((role) => ({
        ...role.toJSON(),
        user_count: role.users ? role.users.length : 0,
      }));

      res.json({
        roles: rolesWithCount,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit),
        },
      });
    } catch (error) {
      console.error("Get roles error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  // Get single role by ID
  async getRoleById(req, res) {
    try {
      const { id } = req.params;

      const { Role, User } = req.db; // Use the models from the database instance

      const role = await Role.findByPk(id, {
        include: [
          {
            model: User,
            as: "creator",
            attributes: ["user_id", "username", "full_name"],
          },
          {
            model: User,
            as: "users",
            attributes: ["user_id", "username", "full_name", "status"],
          },
        ],
      });

      if (!role) {
        return res.status(404).json({ message: "Role not found" });
      }

      const roleData = {
        ...role.toJSON(),
        user_count: role.users ? role.users.length : 0,
      };

      res.json({ role: roleData });
    } catch (error) {
      console.error("Get role by ID error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  // Get all active roles (for dropdowns)
  async getActiveRoles(req, res) {
    try {
      const { Role } = req.db; // Use the models from the database instance

      const roles = await Role.findAll({
        where: { status: "active" },
        attributes: ["role_id", "name", "description"],
        order: [["name", "ASC"]],
      });

      res.json({ roles });
    } catch (error) {
      console.error("Get active roles error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  // Create new role
  async createRole(req, res) {
    try {
      const {
        name,
        description,
        tab_permissions,
        status = "active",
      } = req.body;
      const created_by = req.user.user_id;

      const { Role, User } = req.db; // Use the models from the database instance

      // Validation
      if (!name) {
        return res.status(400).json({ message: "Role name is required" });
      }

      if (!tab_permissions) {
        return res
          .status(400)
          .json({ message: "Tab permissions are required" });
      }

      // Check if role name already exists
      const existingRole = await Role.findOne({ where: { name } });
      if (existingRole) {
        return res.status(400).json({ message: "Role name already exists" });
      }

      // Default tab permissions structure
      const defaultPermissions = {
        dashboard: true,
        stock: false,
        loading: false,
        discounts: false,
        credits: false,
        expenses: false,
        reports: false,
        manage: false,
        representatives: false,
        users_roles: false,
        help: true,
      };

      // Merge provided permissions with defaults
      const finalPermissions = { ...defaultPermissions, ...tab_permissions };

      // Create role
      const newRole = await Role.create({
        name,
        description,
        tab_permissions: finalPermissions,
        status,
        created_by,
      });

      // Fetch created role with creator info
      const createdRole = await Role.findByPk(newRole.role_id, {
        include: [
          {
            model: User,
            as: "creator",
            attributes: ["user_id", "username", "full_name"],
          },
        ],
      });

      res.status(201).json({
        message: "Role created successfully",
        role: createdRole,
      });
    } catch (error) {
      console.error("Create role error:", error);
      if (error.name === "SequelizeValidationError") {
        return res.status(400).json({
          message: "Validation error",
          errors: error.errors.map((e) => e.message),
        });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  },

  // Update role
  async updateRole(req, res) {
    try {
      const { id } = req.params;
      const { name, description, tab_permissions, status } = req.body;

      const { Role, User } = req.db; // Use the models from the database instance

      // Find role
      const role = await Role.findByPk(id);
      if (!role) {
        return res.status(404).json({ message: "Role not found" });
      }

      // Prevent modification of system roles
      if (role.is_system_role) {
        return res.status(400).json({
          message: "Cannot modify system roles. Create a custom role instead.",
        });
      }

      // Check for duplicate name (excluding current role)
      if (name && name !== role.name) {
        const existingRole = await Role.findOne({
          where: {
            name,
            role_id: { [Op.ne]: id },
          },
        });
        if (existingRole) {
          return res.status(400).json({ message: "Role name already exists" });
        }
      }

      // Update role
      const updateData = {};
      if (name) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (tab_permissions) updateData.tab_permissions = tab_permissions;
      if (status) updateData.status = status;

      await role.update(updateData);

      // Fetch updated role with creator info
      const updatedRole = await Role.findByPk(id, {
        include: [
          {
            model: User,
            as: "creator",
            attributes: ["user_id", "username", "full_name"],
          },
        ],
      });

      res.json({
        message: "Role updated successfully",
        role: updatedRole,
      });
    } catch (error) {
      console.error("Update role error:", error);
      if (error.name === "SequelizeValidationError") {
        return res.status(400).json({
          message: "Validation error",
          errors: error.errors.map((e) => e.message),
        });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  },

  // Update role permissions
  async updateRolePermissions(req, res) {
    try {
      const { id } = req.params;
      const { tab_permissions } = req.body;

      const { Role } = req.db; // Use the models from the database instance

      if (!tab_permissions) {
        return res
          .status(400)
          .json({ message: "Tab permissions are required" });
      }

      // Find role
      const role = await Role.findByPk(id);
      if (!role) {
        return res.status(404).json({ message: "Role not found" });
      }

      // Prevent modification of system roles
      if (role.is_system_role) {
        return res.status(400).json({
          message:
            "Cannot modify system role permissions. Create a custom role instead.",
        });
      }

      // Update permissions
      await role.update({ tab_permissions });

      res.json({
        message: "Role permissions updated successfully",
        role: {
          role_id: role.role_id,
          name: role.name,
          tab_permissions: role.tab_permissions,
        },
      });
    } catch (error) {
      console.error("Update role permissions error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  // Delete role
  async deleteRole(req, res) {
    try {
      const { id } = req.params;

      const { Role, User } = req.db;

      // Find role
      const role = await Role.findByPk(id);
      if (!role) {
        return res.status(404).json({ message: "Role not found" });
      }

      // Prevent deletion of system roles
      if (role.is_system_role) {
        return res.status(400).json({ message: "Cannot delete system roles" });
      }

      // Check if role is assigned to any users
      const userCount = await User.count({ where: { role_id: id } });
      if (userCount > 0) {
        return res.status(400).json({
          message: `Cannot delete role. It is assigned to ${userCount} users.`,
        });
      }

      // Delete role
      await role.destroy();

      res.json({ message: "Role deleted successfully" });
    } catch (error) {
      console.error("Delete role error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  // Get available tab permissions (for frontend to build permission forms)
  async getAvailablePermissions(req, res) {
    try {
      const availablePermissions = {
        dashboard: {
          label: "Dashboard",
          description: "Access to main dashboard",
        },
        stock: { label: "Stock", description: "Inventory management access" },
        loading: { label: "Loading", description: "Loading management access" },
        discounts: {
          label: "Discounts",
          description: "Discount management access",
        },
        credits: { label: "Credits", description: "Credit management access" },
        expenses: {
          label: "Expenses",
          description: "Expense management access",
        },
        reports: {
          label: "Reports",
          description: "Reports and analytics access",
        },
        manage: { label: "Manage", description: "General management access" },
        representatives: {
          label: "Representatives",
          description: "Representative management access",
        },
        users_roles: {
          label: "Users & Roles",
          description: "User and role management access",
        },
        help: { label: "Help", description: "Help and support access" },
      };

      res.json({ permissions: availablePermissions });
    } catch (error) {
      console.error("Get available permissions error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
};

module.exports = roleManagementController;
