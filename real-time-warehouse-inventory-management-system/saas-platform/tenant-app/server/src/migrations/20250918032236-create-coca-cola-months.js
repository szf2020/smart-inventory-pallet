"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("coca_cola_months", {
      month_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      start_date: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      end_date: {
        type: Sequelize.DATE,
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
    await queryInterface.addIndex("coca_cola_months", ["start_date"]);
    await queryInterface.addIndex("coca_cola_months", ["end_date"]);

    // Add unique constraint to prevent overlapping date ranges
    await queryInterface.addConstraint("coca_cola_months", {
      fields: ["start_date", "end_date"],
      type: "unique",
      name: "unique_date_range",
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove constraints first
    await queryInterface.removeConstraint(
      "coca_cola_months",
      "unique_date_range"
    );

    // Remove indexes
    await queryInterface.removeIndex("coca_cola_months", ["start_date"]);
    await queryInterface.removeIndex("coca_cola_months", ["end_date"]);

    // Drop the table
    await queryInterface.dropTable("coca_cola_months");
  },
};
