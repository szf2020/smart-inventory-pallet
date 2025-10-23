"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PaymentMethod extends Model {
    static associate(models) {
      PaymentMethod.hasMany(models.Payment, {
        // Fixed: was models.Payments
        foreignKey: "method_id",
        as: "payments",
      });
    }
  }

  PaymentMethod.init(
    {
      method_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(50),
        allowNull: false,
        validate: {
          isIn: [["cash", "cheque", "credit", "bank_transfer"]], // Fixed: "check" to "cheque", added underscore to "bank_transfer"
        },
      },
      description: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      is_active: {
        // Added: to enable/disable payment methods
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "PaymentMethod",
      tableName: "PaymentMethods",
      timestamps: true,
      underscored: true,
    }
  );

  return PaymentMethod;
};
