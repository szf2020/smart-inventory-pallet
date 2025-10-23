"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("expiry_returns_details", {
      expiry_return_detail_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      expiry_return_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "expiry_returns",
          key: "expiry_return_id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
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
      bottles_expired: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      expiry_value: {
        type: Sequelize.FLOAT,
        allowNull: false,
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
    await queryInterface.addIndex("expiry_returns_details", [
      "expiry_return_id",
    ]);
    await queryInterface.addIndex("expiry_returns_details", ["product_id"]);
    await queryInterface.addIndex("expiry_returns_details", [
      "expiry_return_id",
      "product_id",
    ]); // Composite index

    // Add unique constraint to prevent duplicate product entries per expiry return
    await queryInterface.addConstraint("expiry_returns_details", {
      fields: ["expiry_return_id", "product_id"],
      type: "unique",
      name: "unique_expiry_return_product",
    });

    // Add constraints for positive values
    await queryInterface.addConstraint("expiry_returns_details", {
      fields: ["bottles_expired"],
      type: "check",
      name: "check_bottles_expired_positive",
      where: {
        bottles_expired: {
          [Sequelize.Op.gt]: 0,
        },
      },
    });

    await queryInterface.addConstraint("expiry_returns_details", {
      fields: ["expiry_value"],
      type: "check",
      name: "check_expiry_value_non_negative",
      where: {
        expiry_value: {
          [Sequelize.Op.gte]: 0,
        },
      },
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove constraints
    await queryInterface.removeConstraint(
      "expiry_returns_details",
      "unique_expiry_return_product"
    );
    await queryInterface.removeConstraint(
      "expiry_returns_details",
      "check_bottles_expired_positive"
    );
    await queryInterface.removeConstraint(
      "expiry_returns_details",
      "check_expiry_value_non_negative"
    );

    // Remove indexes
    await queryInterface.removeIndex("expiry_returns_details", [
      "expiry_return_id",
    ]);
    await queryInterface.removeIndex("expiry_returns_details", ["product_id"]);
    await queryInterface.removeIndex("expiry_returns_details", [
      "expiry_return_id",
      "product_id",
    ]);

    // Drop table
    await queryInterface.dropTable("expiry_returns_details");
  },
};
