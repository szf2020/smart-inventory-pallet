"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("empty_returns_details", {
      empty_return_detail_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      empty_return_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "empty_returns",
          key: "empty_return_id",
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
      empty_bottles_returned: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      empty_cases_returned: {
        type: Sequelize.INTEGER,
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
    await queryInterface.addIndex("empty_returns_details", ["empty_return_id"]);
    await queryInterface.addIndex("empty_returns_details", ["product_id"]);
    await queryInterface.addIndex("empty_returns_details", [
      "empty_return_id",
      "product_id",
    ]); // Composite index

    // Add unique constraint to prevent duplicate product entries per return record
    await queryInterface.addConstraint("empty_returns_details", {
      fields: ["empty_return_id", "product_id"],
      type: "unique",
      name: "unique_empty_return_product",
    });

    // Add constraints for positive values
    await queryInterface.addConstraint("empty_returns_details", {
      fields: ["empty_bottles_returned"],
      type: "check",
      name: "check_empty_bottles_non_negative",
      where: {
        empty_bottles_returned: {
          [Sequelize.Op.gte]: 0,
        },
      },
    });

    await queryInterface.addConstraint("empty_returns_details", {
      fields: ["empty_cases_returned"],
      type: "check",
      name: "check_empty_cases_non_negative",
      where: {
        empty_cases_returned: {
          [Sequelize.Op.gte]: 0,
        },
      },
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove constraints
    await queryInterface.removeConstraint(
      "empty_returns_details",
      "unique_empty_return_product"
    );
    await queryInterface.removeConstraint(
      "empty_returns_details",
      "check_empty_bottles_non_negative"
    );
    await queryInterface.removeConstraint(
      "empty_returns_details",
      "check_empty_cases_non_negative"
    );

    // Remove indexes
    await queryInterface.removeIndex("empty_returns_details", [
      "empty_return_id",
    ]);
    await queryInterface.removeIndex("empty_returns_details", ["product_id"]);
    await queryInterface.removeIndex("empty_returns_details", [
      "empty_return_id",
      "product_id",
    ]);

    // Drop table
    await queryInterface.dropTable("empty_returns_details");
  },
};
