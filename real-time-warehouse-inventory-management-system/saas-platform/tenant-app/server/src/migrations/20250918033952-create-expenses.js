"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("expenses", {
      expense_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      expense_number: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
      },
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_DATE"),
      },
      expense_category: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      supplier_name: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      reference_number: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM("pending", "paid", "partially_paid", "cancelled"),
        allowNull: false,
        defaultValue: "pending",
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
      approved_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "users",
          key: "user_id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      approved_at: {
        type: Sequelize.DATE,
        allowNull: true,
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
    await queryInterface.addIndex("expenses", ["expense_number"], {
      unique: true,
    });
    await queryInterface.addIndex("expenses", ["date"]);
    await queryInterface.addIndex("expenses", ["expense_category"]);
    await queryInterface.addIndex("expenses", ["status"]);
    await queryInterface.addIndex("expenses", ["created_by"]);
    await queryInterface.addIndex("expenses", ["approved_by"]);
    await queryInterface.addIndex("expenses", ["supplier_name"]);
    await queryInterface.addIndex("expenses", ["reference_number"]);

    // Composite indexes for common queries
    await queryInterface.addIndex("expenses", ["date", "status"]);
    await queryInterface.addIndex("expenses", ["expense_category", "status"]);
    await queryInterface.addIndex("expenses", ["created_by", "date"]);

    // Add constraints
    await queryInterface.addConstraint("expenses", {
      fields: ["amount"],
      type: "check",
      name: "check_amount_positive",
      where: {
        amount: {
          [Sequelize.Op.gt]: 0,
        },
      },
    });

    // Ensure that if approved_by is set, approved_at must also be set
    await queryInterface.addConstraint("expenses", {
      fields: ["approved_by", "approved_at"],
      type: "check",
      name: "check_approval_consistency",
      where: {
        [Sequelize.Op.or]: [
          {
            [Sequelize.Op.and]: [
              { approved_by: { [Sequelize.Op.is]: null } },
              { approved_at: { [Sequelize.Op.is]: null } },
            ],
          },
          {
            [Sequelize.Op.and]: [
              { approved_by: { [Sequelize.Op.ne]: null } },
              { approved_at: { [Sequelize.Op.ne]: null } },
            ],
          },
        ],
      },
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove constraints
    await queryInterface.removeConstraint("expenses", "check_amount_positive");
    await queryInterface.removeConstraint(
      "expenses",
      "check_approval_consistency"
    );

    // Remove indexes (unique indexes are removed automatically with table drop)
    await queryInterface.removeIndex("expenses", ["date"]);
    await queryInterface.removeIndex("expenses", ["expense_category"]);
    await queryInterface.removeIndex("expenses", ["status"]);
    await queryInterface.removeIndex("expenses", ["created_by"]);
    await queryInterface.removeIndex("expenses", ["approved_by"]);
    await queryInterface.removeIndex("expenses", ["supplier_name"]);
    await queryInterface.removeIndex("expenses", ["reference_number"]);
    await queryInterface.removeIndex("expenses", ["date", "status"]);
    await queryInterface.removeIndex("expenses", [
      "expense_category",
      "status",
    ]);
    await queryInterface.removeIndex("expenses", ["created_by", "date"]);

    // Drop ENUM type first, then table
    await queryInterface.dropTable("expenses");
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_expenses_status";'
    );
  },
};
