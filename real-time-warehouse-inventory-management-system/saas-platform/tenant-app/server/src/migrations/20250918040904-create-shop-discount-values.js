"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("ShopDiscountValues", {
      shop_discount_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      shop_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Shops",
          key: "shop_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      sub_discount_type_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "SubDiscountTypes",
          key: "sub_discount_type_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      discount_value: {
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
    await queryInterface.addIndex("ShopDiscountValues", ["shop_id"]);
    await queryInterface.addIndex("ShopDiscountValues", [
      "sub_discount_type_id",
    ]);

    // Add unique constraint to prevent duplicate discount values for same shop and sub-discount type
    await queryInterface.addConstraint("ShopDiscountValues", {
      fields: ["shop_id", "sub_discount_type_id"],
      type: "unique",
      name: "unique_shop_sub_discount_type",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("ShopDiscountValues");
  },
};
