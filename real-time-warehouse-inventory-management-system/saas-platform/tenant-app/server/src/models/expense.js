module.exports = (sequelize, DataTypes) => {
  const Expense = sequelize.define(
    "Expense",
    {
      expense_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      expense_number: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
      date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      expense_category: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      amount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        validate: {
          min: 0,
        },
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      supplier_name: {
        type: DataTypes.STRING(200),
        allowNull: true,
      },
      reference_number: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM("pending", "paid", "partially_paid", "cancelled"),
        allowNull: false,
        defaultValue: "pending",
      },
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "Users",
          key: "user_id",
        },
      },
      approved_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "Users",
          key: "user_id",
        },
      },
      approved_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "Expenses",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      underscored: true,
    }
  );

  Expense.associate = function (models) {
    // Association with User (created_by)
    Expense.belongsTo(models.User, {
      foreignKey: "created_by",
      as: "createdBy",
    });

    // Association with User (approved_by)
    Expense.belongsTo(models.User, {
      foreignKey: "approved_by",
      as: "approvedBy",
    });

    // Association with Payments - expenses can have multiple payments
    Expense.hasMany(models.Payment, {
      foreignKey: "reference_id",
      as: "payments",
      scope: {
        reference_type: "Expense",
      },
      constraints: false,
    });
  };

  return Expense;
};
