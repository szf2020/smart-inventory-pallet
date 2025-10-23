"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("discounts", {
      discount_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      shop_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "shops",
          key: "shop_id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      selling_date: {
        type: Sequelize.DATE,
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
      sub_discount_type_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "sub_discount_types",
          key: "sub_discount_type_id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      discounted_cases: {
        type: Sequelize.FLOAT,
        allowNull: false,
      },
      invoice_number: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      total_discount: {
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
    await queryInterface.addIndex("discounts", ["shop_id"]);
    await queryInterface.addIndex("discounts", ["lorry_id"]);
    await queryInterface.addIndex("discounts", ["sub_discount_type_id"]);
    await queryInterface.addIndex("discounts", ["selling_date"]);
    await queryInterface.addIndex("discounts", ["invoice_number"]);
    await queryInterface.addIndex("discounts", ["selling_date", "lorry_id"]); // Composite index

    // Add unique constraint on invoice_number to prevent duplicates
    await queryInterface.addConstraint("discounts", {
      fields: ["invoice_number"],
      type: "unique",
      name: "unique_invoice_number",
    });

    // Add constraints
    await queryInterface.addConstraint("discounts", {
      fields: ["discounted_cases"],
      type: "check",
      name: "check_discounted_cases_positive",
      where: {
        discounted_cases: {
          [Sequelize.Op.gt]: 0,
        },
      },
    });

    await queryInterface.addConstraint("discounts", {
      fields: ["total_discount"],
      type: "check",
      name: "check_total_discount_positive",
      where: {
        total_discount: {
          [Sequelize.Op.gt]: 0,
        },
      },
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove constraints
    await queryInterface.removeConstraint("discounts", "unique_invoice_number");
    await queryInterface.removeConstraint(
      "discounts",
      "check_discounted_cases_positive"
    );
    await queryInterface.removeConstraint(
      "discounts",
      "check_total_discount_positive"
    );

    // Remove indexes
    await queryInterface.removeIndex("discounts", ["shop_id"]);
    await queryInterface.removeIndex("discounts", ["lorry_id"]);
    await queryInterface.removeIndex("discounts", ["sub_discount_type_id"]);
    await queryInterface.removeIndex("discounts", ["selling_date"]);
    await queryInterface.removeIndex("discounts", ["invoice_number"]);
    await queryInterface.removeIndex("discounts", ["selling_date", "lorry_id"]);

    // Drop table
    await queryInterface.dropTable("discounts");
  },
};
