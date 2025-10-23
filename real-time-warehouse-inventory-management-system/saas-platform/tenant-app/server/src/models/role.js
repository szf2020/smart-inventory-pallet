module.exports = (sequelize, DataTypes) => {
  const Role = sequelize.define(
    "Role",
    {
      role_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: true,
          len: [2, 50],
        },
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      tab_permissions: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {
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
        },
        comment: "JSON object storing tab access permissions",
      },
      is_system_role: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: "System roles cannot be deleted (admin, user)",
      },
      status: {
        type: DataTypes.ENUM("active", "inactive"),
        defaultValue: "active",
      },
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "Users",
          key: "user_id",
        },
      },
    },
    {
      tableName: "Roles",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        {
          unique: true,
          fields: ["name"],
        },
      ],
    }
  );

  Role.associate = (models) => {
    // Role belongs to creator (User)
    Role.belongsTo(models.User, {
      foreignKey: "created_by",
      as: "creator",
      onDelete: "SET NULL",
    });

    // Role has many users
    Role.hasMany(models.User, {
      foreignKey: "role_id",
      as: "users",
      onDelete: "RESTRICT",
    });
  };

  // Instance method to check tab access
  Role.prototype.hasTabAccess = function (tabKey) {
    return this.tab_permissions && this.tab_permissions[tabKey] === true;
  };

  // Instance method to grant tab access
  Role.prototype.grantTabAccess = function (tabKey) {
    if (!this.tab_permissions) this.tab_permissions = {};
    this.tab_permissions[tabKey] = true;
    this.changed("tab_permissions", true);
  };

  // Instance method to revoke tab access
  Role.prototype.revokeTabAccess = function (tabKey) {
    if (!this.tab_permissions) this.tab_permissions = {};
    this.tab_permissions[tabKey] = false;
    this.changed("tab_permissions", true);
  };

  return Role;
};
