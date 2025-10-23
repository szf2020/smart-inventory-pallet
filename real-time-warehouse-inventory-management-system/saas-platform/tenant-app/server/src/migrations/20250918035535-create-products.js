"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("products", {
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      product_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      unit_price: {
        type: Sequelize.FLOAT,
        allowNull: false,
      },
      selling_price: {
        type: Sequelize.FLOAT,
        allowNull: false,
      },
      bottles_per_case: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      size: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      active: {
        type: Sequelize.BOOLEAN,
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
    await queryInterface.addIndex("products", ["product_name"]);
    await queryInterface.addIndex("products", ["active"]);
    await queryInterface.addIndex("products", ["size"]);
    await queryInterface.addIndex("products", ["unit_price"]);
    await queryInterface.addIndex("products", ["selling_price"]);

    // Add constraints
    await queryInterface.addConstraint("products", {
      fields: ["product_name"],
      type: "check",
      name: "check_product_name_not_empty",
      where: {
        product_name: {
          [Sequelize.Op.ne]: "",
        },
      },
    });

    await queryInterface.addConstraint("products", {
      fields: ["unit_price"],
      type: "check",
      name: "check_unit_price_positive",
      where: {
        unit_price: {
          [Sequelize.Op.gt]: 0,
        },
      },
    });

    await queryInterface.addConstraint("products", {
      fields: ["selling_price"],
      type: "check",
      name: "check_selling_price_positive",
      where: {
        selling_price: {
          [Sequelize.Op.gt]: 0,
        },
      },
    });

    await queryInterface.addConstraint("products", {
      fields: ["bottles_per_case"],
      type: "check",
      name: "check_bottles_per_case_positive",
      where: {
        bottles_per_case: {
          [Sequelize.Op.gt]: 0,
        },
      },
    });

    await queryInterface.addConstraint("products", {
      fields: ["size"],
      type: "check",
      name: "check_size_not_empty",
      where: {
        size: {
          [Sequelize.Op.ne]: "",
        },
      },
    });

    // Add unique constraint on product_name
    await queryInterface.addConstraint("products", {
      fields: ["product_name"],
      type: "unique",
      name: "unique_product_name",
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove constraints
    await queryInterface.removeConstraint(
      "products",
      "check_product_name_not_empty"
    );
    await queryInterface.removeConstraint(
      "products",
      "check_unit_price_positive"
    );
    await queryInterface.removeConstraint(
      "products",
      "check_selling_price_positive"
    );
    await queryInterface.removeConstraint(
      "products",
      "check_bottles_per_case_positive"
    );
    await queryInterface.removeConstraint("products", "check_size_not_empty");
    await queryInterface.removeConstraint("products", "unique_product_name");

    // Remove indexes
    await queryInterface.removeIndex("products", ["product_name"]);
    await queryInterface.removeIndex("products", ["active"]);
    await queryInterface.removeIndex("products", ["size"]);
    await queryInterface.removeIndex("products", ["unit_price"]);
    await queryInterface.removeIndex("products", ["selling_price"]);

    // Drop table
    await queryInterface.dropTable("products");
  },
};
