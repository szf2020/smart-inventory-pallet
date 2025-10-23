"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("loading_transactions", {
      loading_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
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
      loading_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      loading_time: {
        type: Sequelize.TIME,
        allowNull: false,
      },
      loaded_by: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "pending",
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
    await queryInterface.addIndex("loading_transactions", ["lorry_id"]);
    await queryInterface.addIndex("loading_transactions", ["loading_date"]);
    await queryInterface.addIndex("loading_transactions", ["status"]);
    await queryInterface.addIndex("loading_transactions", ["loaded_by"]);
    await queryInterface.addIndex("loading_transactions", [
      "loading_date",
      "lorry_id",
    ]); // Composite index
    await queryInterface.addIndex("loading_transactions", [
      "loading_date",
      "status",
    ]); // Composite index

    // Add constraint to ensure loaded_by is not empty
    await queryInterface.addConstraint("loading_transactions", {
      fields: ["loaded_by"],
      type: "check",
      name: "check_loaded_by_not_empty",
      where: {
        loaded_by: {
          [Sequelize.Op.ne]: "",
        },
      },
    });

    // Add constraint to ensure status is not empty
    await queryInterface.addConstraint("loading_transactions", {
      fields: ["status"],
      type: "check",
      name: "check_status_not_empty",
      where: {
        status: {
          [Sequelize.Op.ne]: "",
        },
      },
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove constraints
    await queryInterface.removeConstraint(
      "loading_transactions",
      "check_loaded_by_not_empty"
    );
    await queryInterface.removeConstraint(
      "loading_transactions",
      "check_status_not_empty"
    );

    // Remove indexes
    await queryInterface.removeIndex("loading_transactions", ["lorry_id"]);
    await queryInterface.removeIndex("loading_transactions", ["loading_date"]);
    await queryInterface.removeIndex("loading_transactions", ["status"]);
    await queryInterface.removeIndex("loading_transactions", ["loaded_by"]);
    await queryInterface.removeIndex("loading_transactions", [
      "loading_date",
      "lorry_id",
    ]);
    await queryInterface.removeIndex("loading_transactions", [
      "loading_date",
      "status",
    ]);

    // Drop table
    await queryInterface.dropTable("loading_transactions");
  },
};
