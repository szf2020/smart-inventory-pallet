"use strict";
const { Model } = require("sequelize");
const bcrypt = require("bcrypt");

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      // User belongs to a role
      User.belongsTo(models.Role, {
        foreignKey: "role_id",
        as: "userRole",
        onDelete: "RESTRICT",
      });

      // User belongs to creator (User)
      User.belongsTo(models.User, {
        foreignKey: "created_by",
        as: "creator",
        onDelete: "SET NULL",
      });

      // User has many created users
      User.hasMany(models.User, {
        foreignKey: "created_by",
        as: "createdUsers",
      });

      // User has many created roles
      User.hasMany(models.Role, {
        foreignKey: "created_by",
        as: "createdRoles",
      });

      // Example transaction associations (keeping commented for reference)
      // User.hasMany(models.UnloadingTransaction, {
      //   foreignKey: "unloaded_by",
      //   as: "unloadingTransactions",
      // });
      // User.hasMany(models.LoadingTransaction, {
      //   foreignKey: "loaded_by",
      //   as: "loadingTransactions",
      // });
    }

    // Method to check password validity
    async validatePassword(password) {
      return await bcrypt.compare(password, this.password);
    }
  }

  User.init(
    {
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      username: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      full_name: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      role_id: {
        type: DataTypes.INTEGER,
        allowNull: true, // Allow null for backward compatibility
        references: {
          model: "Roles",
          key: "role_id",
        },
      },
      role: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "user",
      },
      status: {
        type: DataTypes.ENUM("active", "inactive", "suspended"),
        defaultValue: "active",
      },
      last_login: {
        type: DataTypes.DATE,
        allowNull: true,
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
      sequelize,
      modelName: "User",
      tableName: "Users",
      timestamps: true,
      underscored: true,
      hooks: {
        // Hash password before saving
        beforeCreate: async (user) => {
          if (user.password) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(user.password, salt);
          }
        },
        beforeUpdate: async (user) => {
          if (user.changed("password")) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(user.password, salt);
          }
        },
      },
    }
  );

  return User;
};

// INSERT INTO public."Users" (username, password, role, created_at, updated_at)
// VALUES
//     ('admin', '$2b$10$X5mFnNfvMT.l1VMEB7J5i.YRxPJf1bZ7aJaGNAkH2XeBDXzRQJGPy', 'admin', NOW(), NOW()), -- password: admin123
//     ('manager', '$2b$10$lqPqHIoHLUID1SwRnj6cne.bJ.Z.mV1o5hCJx3y92RLaQH9QkKSk', 'manager', NOW(), NOW()); -- password: manager123
