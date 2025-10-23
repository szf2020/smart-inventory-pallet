"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("UnloadingDetails", {
      unloading_detail_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      unloading_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "UnloadingTransactions",
          key: "unloading_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
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
      cases_returned: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      bottles_returned: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      total_bottles_returned: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      value: {
        type: Sequelize.FLOAT,
        allowNull: false,
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
    await queryInterface.addIndex("UnloadingDetails", ["unloading_id"]);
    await queryInterface.addIndex("UnloadingDetails", ["product_id"]);

    // Add unique constraint to prevent duplicate product entries for same unloading transaction
    await queryInterface.addConstraint("UnloadingDetails", {
      fields: ["unloading_id", "product_id"],
      type: "unique",
      name: "unique_unloading_product",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("UnloadingDetails");
  },
};
