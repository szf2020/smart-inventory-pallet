"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("payments", {
      payment_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      payment_type: {
        type: Sequelize.ENUM(
          "sales_payment",
          "purchase_payment",
          "advance_payment",
          "refund"
        ),
        allowNull: false,
      },
      reference_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      reference_type: {
        type: Sequelize.ENUM(
          "SalesInvoice",
          "PurchaseInvoice",
          "Expense",
          "Advance"
        ),
        allowNull: true,
      },
      party_type: {
        type: Sequelize.ENUM("customer", "supplier", "expense"),
        allowNull: false,
      },
      party_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      method_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "payment_methods",
          key: "method_id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      payment_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_DATE"),
      },
      status: {
        type: Sequelize.ENUM("pending", "completed", "failed", "cancelled"),
        allowNull: false,
        defaultValue: "completed",
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      recorded_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "user_id",
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

    // Add indexes for better performance
    await queryInterface.addIndex("payments", ["payment_type"]);
    await queryInterface.addIndex("payments", ["party_type", "party_id"]);
    await queryInterface.addIndex("payments", [
      "reference_id",
      "reference_type",
    ]);
    await queryInterface.addIndex("payments", ["payment_date"]);
    await queryInterface.addIndex("payments", ["status"]);
    await queryInterface.addIndex("payments", ["method_id"]);
    await queryInterface.addIndex("payments", ["recorded_by"]);

    // Composite indexes for common queries
    await queryInterface.addIndex("payments", ["payment_date", "payment_type"]);
    await queryInterface.addIndex("payments", [
      "party_type",
      "party_id",
      "status",
    ]);

    // Add constraints
    await queryInterface.addConstraint("payments", {
      fields: ["amount"],
      type: "check",
      name: "check_amount_positive",
      where: {
        amount: {
          [Sequelize.Op.gt]: 0,
        },
      },
    });

    // Ensure party_id is provided for customer/supplier party types
    await queryInterface.addConstraint("payments", {
      fields: ["party_type", "party_id"],
      type: "check",
      name: "check_party_id_required_for_party_types",
      where: {
        [Sequelize.Op.or]: [
          { party_type: "expense" },
          {
            [Sequelize.Op.and]: [
              { party_type: { [Sequelize.Op.in]: ["customer", "supplier"] } },
              { party_id: { [Sequelize.Op.ne]: null } },
            ],
          },
        ],
      },
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove constraints
    await queryInterface.removeConstraint("payments", "check_amount_positive");
    await queryInterface.removeConstraint(
      "payments",
      "check_party_id_required_for_party_types"
    );

    // Remove indexes
    await queryInterface.removeIndex("payments", ["payment_type"]);
    await queryInterface.removeIndex("payments", ["party_type", "party_id"]);
    await queryInterface.removeIndex("payments", [
      "reference_id",
      "reference_type",
    ]);
    await queryInterface.removeIndex("payments", ["payment_date"]);
    await queryInterface.removeIndex("payments", ["status"]);
    await queryInterface.removeIndex("payments", ["method_id"]);
    await queryInterface.removeIndex("payments", ["recorded_by"]);
    await queryInterface.removeIndex("payments", [
      "payment_date",
      "payment_type",
    ]);
    await queryInterface.removeIndex("payments", [
      "party_type",
      "party_id",
      "status",
    ]);

    // Drop table
    await queryInterface.dropTable("payments");

    // Drop ENUM types
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_payments_payment_type";'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_payments_reference_type";'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_payments_party_type";'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_payments_status";'
    );
  },
};
