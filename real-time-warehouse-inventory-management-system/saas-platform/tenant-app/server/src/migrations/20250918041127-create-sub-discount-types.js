"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("SubDiscountTypes", {
      sub_discount_type_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      discount_type_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "DiscountTypes",
          key: "discount_type_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      sub_discount_name: {
        type: Sequelize.STRING,
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
    await queryInterface.addIndex("SubDiscountTypes", ["discount_type_id"]);

    // Add unique constraint to prevent duplicate sub-discount names within the same discount type
    await queryInterface.addConstraint("SubDiscountTypes", {
      fields: ["discount_type_id", "sub_discount_name"],
      type: "unique",
      name: "unique_discount_type_sub_discount_name",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("SubDiscountTypes");
  },
};
