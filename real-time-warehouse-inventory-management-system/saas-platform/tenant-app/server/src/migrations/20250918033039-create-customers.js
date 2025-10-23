"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("customers", {
      customer_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      contact_person: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      phone: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
      address: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      email: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      credit_limit: {
        type: Sequelize.FLOAT,
        allowNull: true,
        defaultValue: 0,
      },
      outstanding_balance: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      rep_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "reps", // References the reps table
          key: "rep_id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
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
    await queryInterface.addIndex("customers", ["name"]);
    await queryInterface.addIndex("customers", ["email"]);
    await queryInterface.addIndex("customers", ["phone"]);
    await queryInterface.addIndex("customers", ["rep_id"]);

    // Add unique constraint on email if needed (uncomment if emails should be unique)
    // await queryInterface.addConstraint('customers', {
    //   fields: ['email'],
    //   type: 'unique',
    //   name: 'unique_customer_email'
    // });

    // Add check constraint to ensure outstanding_balance is not negative
    await queryInterface.addConstraint("customers", {
      fields: ["outstanding_balance"],
      type: "check",
      name: "check_outstanding_balance_non_negative",
      where: {
        outstanding_balance: {
          [Sequelize.Op.gte]: 0,
        },
      },
    });

    // Add check constraint to ensure credit_limit is not negative
    await queryInterface.addConstraint("customers", {
      fields: ["credit_limit"],
      type: "check",
      name: "check_credit_limit_non_negative",
      where: {
        credit_limit: {
          [Sequelize.Op.gte]: 0,
        },
      },
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove constraints first
    await queryInterface.removeConstraint(
      "customers",
      "check_outstanding_balance_non_negative"
    );
    await queryInterface.removeConstraint(
      "customers",
      "check_credit_limit_non_negative"
    );

    // Uncomment if you added the unique email constraint
    // await queryInterface.removeConstraint('customers', 'unique_customer_email');

    // Remove indexes
    await queryInterface.removeIndex("customers", ["name"]);
    await queryInterface.removeIndex("customers", ["email"]);
    await queryInterface.removeIndex("customers", ["phone"]);
    await queryInterface.removeIndex("customers", ["rep_id"]);

    // Drop the table
    await queryInterface.dropTable("customers");
  },
};
