"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("inventory_transactions", {
      transaction_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "products",
          key: "product_id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      transaction_type: {
        type: Sequelize.ENUM("ADD", "REMOVE", "ADJUST"),
        allowNull: false,
      },
      cases_qty: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      bottles_qty: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      total_bottles: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      total_value: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0,
      },
      notes: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      transaction_date: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
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
    await queryInterface.addIndex("inventory_transactions", ["product_id"]);
    await queryInterface.addIndex("inventory_transactions", [
      "transaction_type",
    ]);
    await queryInterface.addIndex("inventory_transactions", [
      "transaction_date",
    ]);
    await queryInterface.addIndex("inventory_transactions", [
      "product_id",
      "transaction_date",
    ]); // Composite index

    // Add constraints
    await queryInterface.addConstraint("inventory_transactions", {
      fields: ["cases_qty"],
      type: "check",
      name: "check_cases_qty_non_negative",
      where: {
        cases_qty: {
          [Sequelize.Op.gte]: 0,
        },
      },
    });

    await queryInterface.addConstraint("inventory_transactions", {
      fields: ["bottles_qty"],
      type: "check",
      name: "check_bottles_qty_non_negative",
      where: {
        bottles_qty: {
          [Sequelize.Op.gte]: 0,
        },
      },
    });

    await queryInterface.addConstraint("inventory_transactions", {
      fields: ["total_bottles"],
      type: "check",
      name: "check_total_bottles_non_negative",
      where: {
        total_bottles: {
          [Sequelize.Op.gte]: 0,
        },
      },
    });

    await queryInterface.addConstraint("inventory_transactions", {
      fields: ["total_value"],
      type: "check",
      name: "check_total_value_non_negative",
      where: {
        total_value: {
          [Sequelize.Op.gte]: 0,
        },
      },
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove constraints
    await queryInterface.removeConstraint(
      "inventory_transactions",
      "check_cases_qty_non_negative"
    );
    await queryInterface.removeConstraint(
      "inventory_transactions",
      "check_bottles_qty_non_negative"
    );
    await queryInterface.removeConstraint(
      "inventory_transactions",
      "check_total_bottles_non_negative"
    );
    await queryInterface.removeConstraint(
      "inventory_transactions",
      "check_total_value_non_negative"
    );

    // Remove indexes
    await queryInterface.removeIndex("inventory_transactions", ["product_id"]);
    await queryInterface.removeIndex("inventory_transactions", [
      "transaction_type",
    ]);
    await queryInterface.removeIndex("inventory_transactions", [
      "transaction_date",
    ]);
    await queryInterface.removeIndex("inventory_transactions", [
      "product_id",
      "transaction_date",
    ]);

    // Drop table
    await queryInterface.dropTable("inventory_transactions");

    // Drop ENUM type
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_inventory_transactions_transaction_type";'
    );
  },
};
