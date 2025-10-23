"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("daily_sales", {
      sales_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      sales_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      lorry_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "lorries",
          key: "lorry_id",
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

    // Add indexes for better performance
    await queryInterface.addIndex("daily_sales", ["sales_date"]);
    await queryInterface.addIndex("daily_sales", ["lorry_id"]);
    await queryInterface.addIndex("daily_sales", ["sales_date", "lorry_id"]); // Composite index

    // Add constraints
    await queryInterface.addConstraint("daily_sales", {
      fields: ["units_sold"],
      type: "check",
      name: "check_units_sold_positive",
      where: {
        units_sold: {
          [Sequelize.Op.gt]: 0,
        },
      },
    });

    await queryInterface.addConstraint("daily_sales", {
      fields: ["sales_income"],
      type: "check",
      name: "check_sales_income_non_negative",
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
      "daily_sales",
      "check_units_sold_positive"
    );
    await queryInterface.removeConstraint(
      "daily_sales",
      "check_sales_income_non_negative"
    );

    // Remove indexes
    await queryInterface.removeIndex("daily_sales", ["sales_date"]);
    await queryInterface.removeIndex("daily_sales", ["lorry_id"]);
    await queryInterface.removeIndex("daily_sales", ["sales_date", "lorry_id"]);

    // Drop table
    await queryInterface.dropTable("daily_sales");
  },
};
