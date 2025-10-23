const bcrypt = require("bcrypt");

module.exports = (sequelize, DataTypes) => {
  const SystemAdmin = sequelize.define(
    "SystemAdmin",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      username: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        validate: {
          len: [3, 50],
          isAlphanumeric: true,
        },
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
          len: [6, 255],
        },
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      full_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      role: {
        type: DataTypes.ENUM("super_admin", "admin", "support"),
        allowNull: false,
        defaultValue: "admin",
      },
      status: {
        type: DataTypes.ENUM("active", "inactive", "suspended"),
        allowNull: false,
        defaultValue: "active",
      },
      last_login: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      login_attempts: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      locked_until: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      two_factor_enabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      two_factor_secret: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "system_admins",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        {
          unique: true,
          fields: ["username"],
        },
        {
          unique: true,
          fields: ["email"],
        },
        {
          fields: ["role"],
        },
        {
          fields: ["status"],
        },
      ],
      hooks: {
        beforeCreate: async (admin) => {
          if (admin.password) {
            admin.password = await bcrypt.hash(admin.password, 12);
          }
        },
        beforeUpdate: async (admin) => {
          if (admin.changed("password")) {
            admin.password = await bcrypt.hash(admin.password, 12);
          }
        },
      },
    }
  );

  // Instance methods
  SystemAdmin.prototype.validatePassword = async function (password) {
    return await bcrypt.compare(password, this.password);
  };

  SystemAdmin.prototype.incrementLoginAttempts = async function () {
    this.login_attempts += 1;

    // Lock account after 5 failed attempts for 30 minutes
    if (this.login_attempts >= 5) {
      this.locked_until = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    }

    await this.save();
  };

  SystemAdmin.prototype.resetLoginAttempts = async function () {
    this.login_attempts = 0;
    this.locked_until = null;
    this.last_login = new Date();
    await this.save();
  };

  SystemAdmin.prototype.isLocked = function () {
    return this.locked_until && this.locked_until > new Date();
  };

  SystemAdmin.prototype.isSuperAdmin = function () {
    return this.role === "super_admin";
  };

  SystemAdmin.prototype.canManageTenants = function () {
    return ["super_admin", "admin"].includes(this.role);
  };

  SystemAdmin.prototype.canViewReports = function () {
    return ["super_admin", "admin", "support"].includes(this.role);
  };

  SystemAdmin.prototype.canManageBilling = function () {
    return ["super_admin", "admin"].includes(this.role);
  };

  // Class methods
  SystemAdmin.findByUsernameOrEmail = async function (identifier) {
    return await this.findOne({
      where: {
        [sequelize.Sequelize.Op.or]: [
          { username: identifier },
          { email: identifier },
        ],
      },
    });
  };

  return SystemAdmin;
};
