"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Users", {
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      username: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      password: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      full_name: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      phone: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      role_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "Roles",
          key: "role_id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      role: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: "user",
      },
      status: {
        type: Sequelize.ENUM("active", "inactive", "suspended"),
        defaultValue: "active",
      },
      last_login: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "Users",
          key: "user_id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    // Add indexes for better performance
    await queryInterface.addIndex("Users", ["username"]);
    await queryInterface.addIndex("Users", ["email"]);
    await queryInterface.addIndex("Users", ["role_id"]);
    await queryInterface.addIndex("Users", ["status"]);
    await queryInterface.addIndex("Users", ["created_by"]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("Users");
  },
};
