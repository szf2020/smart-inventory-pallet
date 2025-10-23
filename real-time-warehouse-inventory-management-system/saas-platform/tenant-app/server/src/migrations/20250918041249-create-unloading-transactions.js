"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("UnloadingTransactions", {
      unloading_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      lorry_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Lorries",
          key: "lorry_id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      rep_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "Reps",
          key: "rep_id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      unloading_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      unloading_time: {
        type: Sequelize.TIME,
        allowNull: false,
      },
      unloaded_by: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "pending",
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
    await queryInterface.addIndex("UnloadingTransactions", ["lorry_id"]);
    await queryInterface.addIndex("UnloadingTransactions", ["rep_id"]);
    await queryInterface.addIndex("UnloadingTransactions", ["unloading_date"]);
    await queryInterface.addIndex("UnloadingTransactions", ["status"]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("UnloadingTransactions");
  },
};
