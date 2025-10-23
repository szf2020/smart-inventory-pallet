"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("lorries", {
      lorry_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      lorry_number: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      driver_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      contact_number: {
        type: Sequelize.STRING,
        allowNull: true,
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
    await queryInterface.addIndex("lorries", ["lorry_number"], {
      unique: true,
    });
    await queryInterface.addIndex("lorries", ["driver_name"]);
    await queryInterface.addIndex("lorries", ["active"]);
    await queryInterface.addIndex("lorries", ["contact_number"]);

    // Add constraint to ensure lorry_number is not empty
    await queryInterface.addConstraint("lorries", {
      fields: ["lorry_number"],
      type: "check",
      name: "check_lorry_number_not_empty",
      where: {
        lorry_number: {
          [Sequelize.Op.ne]: "",
        },
      },
    });

    // Add constraint to ensure driver_name is not empty
    await queryInterface.addConstraint("lorries", {
      fields: ["driver_name"],
      type: "check",
      name: "check_driver_name_not_empty",
      where: {
        driver_name: {
          [Sequelize.Op.ne]: "",
        },
      },
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove constraints
    await queryInterface.removeConstraint(
      "lorries",
      "check_lorry_number_not_empty"
    );
    await queryInterface.removeConstraint(
      "lorries",
      "check_driver_name_not_empty"
    );

    // Remove indexes (unique index removed automatically with table)
    await queryInterface.removeIndex("lorries", ["driver_name"]);
    await queryInterface.removeIndex("lorries", ["active"]);
    await queryInterface.removeIndex("lorries", ["contact_number"]);

    // Drop table
    await queryInterface.dropTable("lorries");
  },
};
