"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("payment_methods", {
      method_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      description: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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
    await queryInterface.addIndex("payment_methods", ["name"]);
    await queryInterface.addIndex("payment_methods", ["is_active"]);

    // Add constraint to validate payment method names
    await queryInterface.addConstraint("payment_methods", {
      fields: ["name"],
      type: "check",
      name: "check_valid_payment_method",
      where: {
        name: {
          [Sequelize.Op.in]: ["cash", "cheque", "credit", "bank_transfer"],
        },
      },
    });

    // Add constraint to ensure name is not empty
    await queryInterface.addConstraint("payment_methods", {
      fields: ["name"],
      type: "check",
      name: "check_name_not_empty",
      where: {
        name: {
          [Sequelize.Op.ne]: "",
        },
      },
    });

    // Add unique constraint on name
    await queryInterface.addConstraint("payment_methods", {
      fields: ["name"],
      type: "unique",
      name: "unique_payment_method_name",
    });

    // Insert default payment methods
    await queryInterface.bulkInsert("payment_methods", [
      {
        name: "cash",
        description: "Cash payment",
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        name: "cheque",
        description: "Cheque payment",
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        name: "credit",
        description: "Credit payment",
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        name: "bank_transfer",
        description: "Bank transfer payment",
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    // Remove constraints
    await queryInterface.removeConstraint(
      "payment_methods",
      "check_valid_payment_method"
    );
    await queryInterface.removeConstraint(
      "payment_methods",
      "check_name_not_empty"
    );
    await queryInterface.removeConstraint(
      "payment_methods",
      "unique_payment_method_name"
    );

    // Remove indexes
    await queryInterface.removeIndex("payment_methods", ["name"]);
    await queryInterface.removeIndex("payment_methods", ["is_active"]);

    // Drop table
    await queryInterface.dropTable("payment_methods");
  },
};
