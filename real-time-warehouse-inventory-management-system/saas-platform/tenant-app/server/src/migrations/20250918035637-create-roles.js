"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("roles", {
      role_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      tab_permissions: {
        type: Sequelize.JSONB,
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
      },
      is_system_role: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      status: {
        type: Sequelize.ENUM("active", "inactive"),
        defaultValue: "active",
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "users",
          key: "user_id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    // Add indexes
    await queryInterface.addIndex("roles", ["name"], { unique: true });
    await queryInterface.addIndex("roles", ["status"]);
    await queryInterface.addIndex("roles", ["is_system_role"]);
    await queryInterface.addIndex("roles", ["created_by"]);

    // Add constraints
    await queryInterface.addConstraint("roles", {
      fields: ["name"],
      type: "check",
      name: "check_name_length",
      where: {
        [Sequelize.Op.and]: [
          Sequelize.where(
            Sequelize.fn("LENGTH", Sequelize.col("name")),
            Sequelize.Op.gte,
            2
          ),
          Sequelize.where(
            Sequelize.fn("LENGTH", Sequelize.col("name")),
            Sequelize.Op.lte,
            50
          ),
        ],
      },
    });

    await queryInterface.addConstraint("roles", {
      fields: ["name"],
      type: "check",
      name: "check_name_not_empty",
      where: {
        name: {
          [Sequelize.Op.ne]: "",
        },
      },
    });

    // Insert default system roles
    await queryInterface.bulkInsert("roles", [
      {
        name: "admin",
        description: "System administrator with full access",
        tab_permissions: JSON.stringify({
          dashboard: true,
          stock: true,
          loading: true,
          discounts: true,
          credits: true,
          expenses: true,
          reports: true,
          manage: true,
          representatives: true,
          users_roles: true,
          help: true,
        }),
        is_system_role: true,
        status: "active",
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        name: "user",
        description: "Standard user with limited access",
        tab_permissions: JSON.stringify({
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
        }),
        is_system_role: true,
        status: "active",
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        name: "manager",
        description: "Manager with extended permissions",
        tab_permissions: JSON.stringify({
          dashboard: true,
          stock: true,
          loading: true,
          discounts: true,
          credits: true,
          expenses: true,
          reports: true,
          manage: false,
          representatives: true,
          users_roles: false,
          help: true,
        }),
        is_system_role: false,
        status: "active",
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    // Remove constraints
    await queryInterface.removeConstraint("roles", "check_name_length");
    await queryInterface.removeConstraint("roles", "check_name_not_empty");

    // Remove indexes (unique indexes removed automatically with table)
    await queryInterface.removeIndex("roles", ["status"]);
    await queryInterface.removeIndex("roles", ["is_system_role"]);
    await queryInterface.removeIndex("roles", ["created_by"]);

    // Drop table
    await queryInterface.dropTable("roles");

    // Drop ENUM type
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_roles_status";'
    );
  },
};
