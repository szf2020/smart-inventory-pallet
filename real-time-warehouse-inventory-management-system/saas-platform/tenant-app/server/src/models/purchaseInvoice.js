"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PurchaseInvoice extends Model {
    static associate(models) {
      // Purchase Invoice belongs to Supplier
      PurchaseInvoice.belongsTo(models.Supplier, {
        foreignKey: "supplier_id",
        as: "supplier",
      });

      // Purchase Invoice belongs to User (creator)
      PurchaseInvoice.belongsTo(models.User, {
        foreignKey: "created_by",
        as: "createdBy",
      });

      // Purchase Invoice has many payments
      PurchaseInvoice.hasMany(models.Payment, {
        foreignKey: "invoice_id",
        as: "payments",
        onDelete: "CASCADE",
      });
    }

    // Instance method to calculate totals
    async calculateTotals() {
      // Since we're not using separate items table, just return stored values
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

  PurchaseInvoice.init(
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
      supplier_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "Suppliers",
          key: "supplier_id",
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
      modelName: "PurchaseInvoice",
      tableName: "PurchaseInvoices",
      timestamps: true,
      underscored: true,
      hooks: {
        beforeCreate: async (invoice) => {
          // Only generate invoice number if not already provided
          if (!invoice.invoice_number) {
            const date = new Date();
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");

            // Get the last invoice to determine next number
            const lastInvoice = await PurchaseInvoice.findOne({
              attributes: ["invoice_id"],
              order: [["invoice_id", "DESC"]],
              limit: 1,
              raw: true,
            });

            const nextNumber = lastInvoice ? lastInvoice.invoice_id + 1 : 1;
            invoice.invoice_number = `PINV-${year}${month}-${String(nextNumber).padStart(4, "0")}`;
          }
        },
      },
    }
  );

  return PurchaseInvoice;
};
