"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("purchase_invoices", {
      invoice_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      invoice_number: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true,
      },
      supplier_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "suppliers",
          key: "supplier_id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      invoice_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_DATE"),
      },
      due_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      subtotal: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      total_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      status: {
        type: Sequelize.ENUM(
          "draft",
          "pending",
          "paid",
          "partially_paid",
          "overdue",
          "cancelled"
        ),
        allowNull: false,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_by: {
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

    // Add indexes
    await queryInterface.addIndex("purchase_invoices", ["invoice_number"], {
      unique: true,
    });
    await queryInterface.addIndex("purchase_invoices", ["supplier_id"]);
    await queryInterface.addIndex("purchase_invoices", ["invoice_date"]);
    await queryInterface.addIndex("purchase_invoices", ["due_date"]);
    await queryInterface.addIndex("purchase_invoices", ["status"]);
    await queryInterface.addIndex("purchase_invoices", ["created_by"]);

    // Composite indexes for common queries
    await queryInterface.addIndex("purchase_invoices", [
      "supplier_id",
      "status",
    ]);
    await queryInterface.addIndex("purchase_invoices", [
      "invoice_date",
      "status",
    ]);
    await queryInterface.addIndex("purchase_invoices", ["due_date", "status"]);

    // Add constraints
    await queryInterface.addConstraint("purchase_invoices", {
      fields: ["subtotal"],
      type: "check",
      name: "check_subtotal_non_negative",
      where: {
        subtotal: {
          [Sequelize.Op.gte]: 0,
        },
      },
    });

    await queryInterface.addConstraint("purchase_invoices", {
      fields: ["total_amount"],
      type: "check",
      name: "check_total_amount_non_negative",
      where: {
        total_amount: {
          [Sequelize.Op.gte]: 0,
        },
      },
    });

    // Ensure due_date is after or equal to invoice_date when provided
    await queryInterface.addConstraint("purchase_invoices", {
      fields: ["invoice_date", "due_date"],
      type: "check",
      name: "check_due_date_after_invoice_date",
      where: {
        [Sequelize.Op.or]: [
          { due_date: { [Sequelize.Op.is]: null } },
          Sequelize.where(
            Sequelize.col("due_date"),
            Sequelize.Op.gte,
            Sequelize.col("invoice_date")
          ),
        ],
      },
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove constraints
    await queryInterface.removeConstraint(
      "purchase_invoices",
      "check_subtotal_non_negative"
    );
    await queryInterface.removeConstraint(
      "purchase_invoices",
      "check_total_amount_non_negative"
    );
    await queryInterface.removeConstraint(
      "purchase_invoices",
      "check_due_date_after_invoice_date"
    );

    // Remove indexes (unique indexes removed automatically with table)
    await queryInterface.removeIndex("purchase_invoices", ["supplier_id"]);
    await queryInterface.removeIndex("purchase_invoices", ["invoice_date"]);
    await queryInterface.removeIndex("purchase_invoices", ["due_date"]);
    await queryInterface.removeIndex("purchase_invoices", ["status"]);
    await queryInterface.removeIndex("purchase_invoices", ["created_by"]);
    await queryInterface.removeIndex("purchase_invoices", [
      "supplier_id",
      "status",
    ]);
    await queryInterface.removeIndex("purchase_invoices", [
      "invoice_date",
      "status",
    ]);
    await queryInterface.removeIndex("purchase_invoices", [
      "due_date",
      "status",
    ]);

    // Drop table
    await queryInterface.dropTable("purchase_invoices");

    // Drop ENUM type
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_purchase_invoices_status";'
    );
  },
};
