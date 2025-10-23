"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("expiry_returns", {
      expiry_return_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      return_date: {
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
    await queryInterface.addIndex("expiry_returns", ["return_date"]);
    await queryInterface.addIndex("expiry_returns", ["lorry_id"]);
    await queryInterface.addIndex("expiry_returns", [
      "return_date",
      "lorry_id",
    ]); // Composite index

    // Add unique constraint to prevent multiple expiry returns per lorry per day
    await queryInterface.addConstraint("expiry_returns", {
      fields: ["return_date", "lorry_id"],
      type: "unique",
      name: "unique_daily_expiry_return_per_lorry",
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove constraints
    await queryInterface.removeConstraint(
      "expiry_returns",
      "unique_daily_expiry_return_per_lorry"
    );

    // Remove indexes
    await queryInterface.removeIndex("expiry_returns", ["return_date"]);
    await queryInterface.removeIndex("expiry_returns", ["lorry_id"]);
    await queryInterface.removeIndex("expiry_returns", [
      "return_date",
      "lorry_id",
    ]);

    // Drop table
    await queryInterface.dropTable("expiry_returns");
  },
};
