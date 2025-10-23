"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Shops", {
      shop_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      customer_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "Customers",
          key: "customer_id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      shop_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      max_discounted_cases: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      discount_type_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "DiscountTypes",
          key: "discount_type_id",
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
    await queryInterface.addIndex("Shops", ["customer_id"]);
    await queryInterface.addIndex("Shops", ["discount_type_id"]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("Shops");
  },
};
