"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Payment extends Model {
    static associate(models) {
      // Polymorphic relationship - no constraints, manual validation
      // Payment.belongsTo(models.SalesInvoice, {
      //   foreignKey: "reference_id",
      //   constraints: false, // Important: no DB constraints
      //   as: "salesInvoice",
      // });

      // Payment.belongsTo(models.PurchaseInvoice, {
      //   foreignKey: "reference_id",
      //   constraints: false, // Important: no DB constraints
      //   as: "purchaseInvoice",
      // });

      // Payment belongs to Customer or Supplier based on type
      // Payment.belongsTo(models.Customer, {
      //   foreignKey: "party_id",
      //   constraints: false,
      //   as: "customer",
      // });

      // Payment.belongsTo(models.Supplier, {
      //   foreignKey: "party_id",
      //   constraints: false,
      //   as: "supplier",
      // });

      // Payment belongs to User (who recorded it)
      Payment.belongsTo(models.User, {
        foreignKey: "recorded_by",
        as: "recordedBy",
      });

      // Payment belongs to PaymentMethod
      Payment.belongsTo(models.PaymentMethod, {
        foreignKey: "method_id",
        as: "paymentMethod",
      });
    }

    // Get the payment direction (inflow/outflow)
    getPaymentDirection() {
      switch (this.payment_type) {
        case "sales_payment":
        case "advance_payment":
          return "inflow";
        case "purchase_payment":
        case "refund":
          return "outflow";
        default:
          return "neutral";
      }
    }

    // Get the signed amount based on direction
    getSignedAmount() {
      const direction = this.getPaymentDirection();
      const amount = parseFloat(this.amount);

      switch (direction) {
        case "inflow":
          return amount;
        case "outflow":
          return -amount;
        default:
          return amount;
      }
    }

    // Get payment type description
    getPaymentTypeDescription() {
      const descriptions = {
        sales_payment: "Payment received from customer",
        purchase_payment: "Payment made to supplier",
        advance_payment: "Advance payment received",
        refund: "Refund issued",
      };
      return descriptions[this.payment_type] || "Payment transaction";
    }

    // Get the related invoice based on payment type and reference_type
    async getRelatedInvoice() {
      if (
        this.payment_type === "sales_payment" &&
        this.reference_type === "SalesInvoice"
      ) {
        return await this.getSalesInvoice();
      } else if (
        this.payment_type === "purchase_payment" &&
        this.reference_type === "PurchaseInvoice"
      ) {
        return await this.getPurchaseInvoice();
      }
      return null;
    }

    // Get the related party (customer/supplier)
    async getRelatedParty() {
      if (this.party_type === "customer") {
        return await this.getCustomer();
      } else if (this.party_type === "supplier") {
        return await this.getSupplier();
      }
      return null;
    }

    // Check if payment affects cash balance positively or negatively
    isIncomePayment() {
      return this.getPaymentDirection() === "inflow";
    }

    isExpensePayment() {
      return this.getPaymentDirection() === "outflow";
    }
  }

  Payment.init(
    {
      payment_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      payment_type: {
        type: DataTypes.ENUM(
          "sales_payment",
          "purchase_payment",
          "advance_payment",
          "refund"
        ),
        allowNull: false,
      },
      reference_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      reference_type: {
        type: DataTypes.ENUM(
          "SalesInvoice",
          "PurchaseInvoice",
          "Expense",
          "Advance"
        ),
        allowNull: true,
      },
      party_type: {
        type: DataTypes.ENUM("customer", "supplier", "expense"),
        allowNull: false,
      },
      party_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      method_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "PaymentMethods",
          key: "method_id",
        },
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          min: 0.01,
        },
      },
      payment_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      status: {
        type: DataTypes.ENUM("pending", "completed", "failed", "cancelled"),
        allowNull: false,
        defaultValue: "completed",
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      recorded_by: {
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
      modelName: "Payment",
      tableName: "Payments",
      timestamps: true,
      underscored: true,
      indexes: [
        {
          fields: ["payment_type"],
        },
        {
          fields: ["party_type", "party_id"],
        },
        {
          fields: ["reference_id", "reference_type"],
        },
        {
          fields: ["payment_date"],
        },
        {
          fields: ["status"],
        },
      ],
      hooks: {
        beforeCreate: async (payment) => {
          // Set reference_type and party_type based on payment_type
          if (payment.payment_type === "sales_payment") {
            payment.reference_type = payment.reference_type || "SalesInvoice";
            payment.party_type = "customer";
          } else if (payment.payment_type === "purchase_payment") {
            payment.reference_type =
              payment.reference_type || "PurchaseInvoice";
            payment.party_type = "supplier";
          } else if (payment.payment_type === "advance_payment") {
            payment.reference_type = "Advance";
            payment.party_type = "customer";
          } else if (payment.payment_type === "refund") {
            payment.reference_type = payment.reference_type || "SalesInvoice";
            payment.party_type = "customer";
          }
        },
      },
    }
  );

  return Payment;
};
