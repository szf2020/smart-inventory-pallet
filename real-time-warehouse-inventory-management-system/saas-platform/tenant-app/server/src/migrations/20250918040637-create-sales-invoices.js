"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("SalesInvoices", {
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
      customer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Customers",
          key: "customer_id",
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
      lorry_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "Lorries",
          key: "lorry_id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
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
      discount_amount: {
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
        defaultValue: "draft",
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Users",
          key: "user_id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
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
    await queryInterface.addIndex("SalesInvoices", ["invoice_number"]);
    await queryInterface.addIndex("SalesInvoices", ["customer_id"]);
    await queryInterface.addIndex("SalesInvoices", ["rep_id"]);
    await queryInterface.addIndex("SalesInvoices", ["lorry_id"]);
    await queryInterface.addIndex("SalesInvoices", ["invoice_date"]);
    await queryInterface.addIndex("SalesInvoices", ["due_date"]);
    await queryInterface.addIndex("SalesInvoices", ["status"]);
    await queryInterface.addIndex("SalesInvoices", ["created_by"]);

    // Composite index for common queries
    await queryInterface.addIndex("SalesInvoices", ["customer_id", "status"]);
    await queryInterface.addIndex("SalesInvoices", ["invoice_date", "status"]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("SalesInvoices");
  },
};
