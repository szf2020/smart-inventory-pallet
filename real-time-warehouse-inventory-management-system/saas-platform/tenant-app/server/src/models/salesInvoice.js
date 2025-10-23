"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class SalesInvoice extends Model {
    static associate(models) {
      // Invoice belongs to Customer
      SalesInvoice.belongsTo(models.Customer, {
        foreignKey: "customer_id",
        as: "customer",
      });

      // Invoice belongs to User (creator)
      SalesInvoice.belongsTo(models.User, {
        foreignKey: "created_by",
        as: "createdBy",
      });

      // Invoice belongs to Rep (optional)
      SalesInvoice.belongsTo(models.Rep, {
        foreignKey: "rep_id",
        as: "rep",
        constraints: false,
      });

      // Invoice has many payments (polymorphic relationship - no DB constraints)
      SalesInvoice.hasMany(models.Payment, {
        foreignKey: "reference_id",
        as: "payments",
        scope: {
          reference_type: "SalesInvoice",
        },
        constraints: false, // Explicitly disable foreign key constraints
        foreignKeyConstraints: false, // Additional safeguard
        onDelete: "NO ACTION", // Change from CASCADE to NO ACTION since no constraint
      });

      // Invoice belongs to Lorry (optional)
      SalesInvoice.belongsTo(models.Lorry, {
        foreignKey: "lorry_id",
        as: "lorry",
        constraints: false,
      });
    }

    // Instance method to calculate totals
    async calculateTotals() {
      return {
        subtotal: parseFloat(this.subtotal || 0),
        totalDiscount: parseFloat(this.discount_amount || 0),
        total: parseFloat(this.total_amount || 0),
      };
    }

    // Instance method to calculate payment summary
    async getPaymentSummary() {
      const payments = await this.getPayments({
        where: { status: "completed" },
      });

      let cashPaid = 0;
      let chequePaid = 0;

      for (const payment of payments) {
        const method = await payment.getPaymentMethod();
        if (method) {
          switch (method.name) {
            case "cash":
              cashPaid += parseFloat(payment.amount);
              break;
            case "cheque":
              chequePaid += parseFloat(payment.amount);
              break;
          }
        }
      }

      const totalPaid = cashPaid + chequePaid;
      const balance = parseFloat(this.total_amount) - totalPaid;

      return {
        cashPaid: parseFloat(cashPaid.toFixed(2)),
        chequePaid: parseFloat(chequePaid.toFixed(2)),
        totalPaid: parseFloat(totalPaid.toFixed(2)),
        balance: parseFloat(balance.toFixed(2)),
      };
    }
  }

  SalesInvoice.init(
    {
      invoice_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      invoice_number: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
      },
      customer_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "Customers",
          key: "customer_id",
        },
      },
      rep_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "Reps",
          key: "rep_id",
        },
      },
      lorry_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "Lorries",
          key: "lorry_id",
        },
      },
      invoice_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      due_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      subtotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      total_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      status: {
        type: DataTypes.ENUM(
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
        type: DataTypes.TEXT,
        allowNull: true,
      },
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "Users",
          key: "user_id",
        },
      },
    },
    {
      sequelize,
      modelName: "SalesInvoice",
      tableName: "SalesInvoices",
      timestamps: true,
      underscored: true,
    }
  );

  return SalesInvoice;
};
