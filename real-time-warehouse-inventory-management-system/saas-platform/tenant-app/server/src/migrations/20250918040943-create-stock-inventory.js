"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("StockInventory", {
      inventory_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Products",
          key: "product_id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      cases_qty: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      bottles_qty: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      total_bottles: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      total_value: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      last_updated: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
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
    await queryInterface.addIndex("StockInventory", ["product_id"]);
    await queryInterface.addIndex("StockInventory", ["last_updated"]);
    await queryInterface.addIndex("StockInventory", ["total_bottles"]);
    await queryInterface.addIndex("StockInventory", ["total_value"]);

    // Add unique constraint to ensure one inventory record per product
    await queryInterface.addConstraint("StockInventory", {
      fields: ["product_id"],
      type: "unique",
      name: "unique_product_inventory",
    });

    // Add check constraints to ensure non-negative quantities
    await queryInterface.addConstraint("StockInventory", {
      fields: ["cases_qty"],
      type: "check",
      where: {
        cases_qty: {
          [Sequelize.Op.gte]: 0,
        },
      },
      name: "check_cases_qty_non_negative",
    });

    await queryInterface.addConstraint("StockInventory", {
      fields: ["bottles_qty"],
      type: "check",
      where: {
        bottles_qty: {
          [Sequelize.Op.gte]: 0,
        },
      },
      name: "check_bottles_qty_non_negative",
    });

    await queryInterface.addConstraint("StockInventory", {
      fields: ["total_bottles"],
      type: "check",
      where: {
        total_bottles: {
          [Sequelize.Op.gte]: 0,
        },
      },
      name: "check_total_bottles_non_negative",
    });

    await queryInterface.addConstraint("StockInventory", {
      fields: ["total_value"],
      type: "check",
      where: {
        total_value: {
          [Sequelize.Op.gte]: 0,
        },
      },
      name: "check_total_value_non_negative",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("StockInventory");
  },
};
