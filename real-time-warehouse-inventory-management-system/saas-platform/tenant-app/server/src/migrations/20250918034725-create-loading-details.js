"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("loading_details", {
      loading_detail_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      loading_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "loading_transactions",
          key: "loading_id",
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
      cases_loaded: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      bottles_loaded: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      total_bottles_loaded: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      value: {
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
    await queryInterface.addIndex("loading_details", ["loading_id"]);
    await queryInterface.addIndex("loading_details", ["product_id"]);
    await queryInterface.addIndex("loading_details", [
      "loading_id",
      "product_id",
    ]); // Composite index

    // Add unique constraint to prevent duplicate product entries per loading transaction
    await queryInterface.addConstraint("loading_details", {
      fields: ["loading_id", "product_id"],
      type: "unique",
      name: "unique_loading_product",
    });

    // Add constraints for positive values
    await queryInterface.addConstraint("loading_details", {
      fields: ["cases_loaded"],
      type: "check",
      name: "check_cases_loaded_non_negative",
      where: {
        cases_loaded: {
          [Sequelize.Op.gte]: 0,
        },
      },
    });

    await queryInterface.addConstraint("loading_details", {
      fields: ["bottles_loaded"],
      type: "check",
      name: "check_bottles_loaded_non_negative",
      where: {
        bottles_loaded: {
          [Sequelize.Op.gte]: 0,
        },
      },
    });

    await queryInterface.addConstraint("loading_details", {
      fields: ["total_bottles_loaded"],
      type: "check",
      name: "check_total_bottles_loaded_positive",
      where: {
        total_bottles_loaded: {
          [Sequelize.Op.gt]: 0,
        },
      },
    });

    await queryInterface.addConstraint("loading_details", {
      fields: ["value"],
      type: "check",
      name: "check_value_non_negative",
      where: {
        value: {
          [Sequelize.Op.gte]: 0,
        },
      },
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove constraints
    await queryInterface.removeConstraint(
      "loading_details",
      "unique_loading_product"
    );
    await queryInterface.removeConstraint(
      "loading_details",
      "check_cases_loaded_non_negative"
    );
    await queryInterface.removeConstraint(
      "loading_details",
      "check_bottles_loaded_non_negative"
    );
    await queryInterface.removeConstraint(
      "loading_details",
      "check_total_bottles_loaded_positive"
    );
    await queryInterface.removeConstraint(
      "loading_details",
      "check_value_non_negative"
    );

    // Remove indexes
    await queryInterface.removeIndex("loading_details", ["loading_id"]);
    await queryInterface.removeIndex("loading_details", ["product_id"]);
    await queryInterface.removeIndex("loading_details", [
      "loading_id",
      "product_id",
    ]);

    // Drop table
    await queryInterface.dropTable("loading_details");
  },
};
