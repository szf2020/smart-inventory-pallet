"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("daily_sales_details", {
      sales_detail_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      sales_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "daily_sales",
          key: "sales_id",
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
      units_sold: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      sales_income: {
        type: Sequelize.FLOAT,
        allowNull: false,
      },
      gross_profit: {
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
    await queryInterface.addIndex("daily_sales_details", ["sales_id"]);
    await queryInterface.addIndex("daily_sales_details", ["product_id"]);
    await queryInterface.addIndex("daily_sales_details", [
      "sales_id",
      "product_id",
    ]); // Composite index

    // Add unique constraint to prevent duplicate product entries per sales record
    await queryInterface.addConstraint("daily_sales_details", {
      fields: ["sales_id", "product_id"],
      type: "unique",
      name: "unique_sales_product",
    });

    // Add constraints
    await queryInterface.addConstraint("daily_sales_details", {
      fields: ["units_sold"],
      type: "check",
      name: "check_detail_units_sold_positive",
      where: {
        units_sold: {
          [Sequelize.Op.gt]: 0,
        },
      },
    });

    await queryInterface.addConstraint("daily_sales_details", {
      fields: ["sales_income"],
      type: "check",
      name: "check_detail_sales_income_non_negative",
      where: {
        sales_income: {
          [Sequelize.Op.gte]: 0,
        },
      },
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove constraints
    await queryInterface.removeConstraint(
      "daily_sales_details",
      "unique_sales_product"
    );
    await queryInterface.removeConstraint(
      "daily_sales_details",
      "check_detail_units_sold_positive"
    );
    await queryInterface.removeConstraint(
      "daily_sales_details",
      "check_detail_sales_income_non_negative"
    );

    // Remove indexes
    await queryInterface.removeIndex("daily_sales_details", ["sales_id"]);
    await queryInterface.removeIndex("daily_sales_details", ["product_id"]);
    await queryInterface.removeIndex("daily_sales_details", [
      "sales_id",
      "product_id",
    ]);

    // Drop table
    await queryInterface.dropTable("daily_sales_details");
  },
};
