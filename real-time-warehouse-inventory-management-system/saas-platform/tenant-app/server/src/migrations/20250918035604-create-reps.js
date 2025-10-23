"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("reps", {
      rep_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      rep_code: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true,
      },
      rep_name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      phone: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
      email: {
        type: Sequelize.STRING(100),
        allowNull: true,
        unique: true,
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      hire_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      salary: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      commission_rate: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 0.0,
      },
      territory: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM("active", "inactive", "suspended"),
        defaultValue: "active",
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "users",
          key: "user_id",
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

    // Add indexes
    await queryInterface.addIndex("reps", ["rep_code"], { unique: true });
    await queryInterface.addIndex("reps", ["email"], {
      unique: true,
      where: {
        email: {
          [Sequelize.Op.ne]: null,
        },
      },
    });
    await queryInterface.addIndex("reps", ["status"]);
    await queryInterface.addIndex("reps", ["territory"]);
    await queryInterface.addIndex("reps", ["rep_name"]);
    await queryInterface.addIndex("reps", ["hire_date"]);
    await queryInterface.addIndex("reps", ["created_by"]);

    // Add constraints
    await queryInterface.addConstraint("reps", {
      fields: ["rep_code"],
      type: "check",
      name: "check_rep_code_length",
      where: {
        [Sequelize.Op.and]: [
          Sequelize.where(
            Sequelize.fn("LENGTH", Sequelize.col("rep_code")),
            Sequelize.Op.gte,
            2
          ),
          Sequelize.where(
            Sequelize.fn("LENGTH", Sequelize.col("rep_code")),
            Sequelize.Op.lte,
            20
          ),
        ],
      },
    });

    await queryInterface.addConstraint("reps", {
      fields: ["rep_name"],
      type: "check",
      name: "check_rep_name_length",
      where: {
        [Sequelize.Op.and]: [
          Sequelize.where(
            Sequelize.fn("LENGTH", Sequelize.col("rep_name")),
            Sequelize.Op.gte,
            2
          ),
          Sequelize.where(
            Sequelize.fn("LENGTH", Sequelize.col("rep_name")),
            Sequelize.Op.lte,
            100
          ),
        ],
      },
    });

    await queryInterface.addConstraint("reps", {
      fields: ["phone"],
      type: "check",
      name: "check_phone_length",
      where: {
        [Sequelize.Op.or]: [
          { phone: { [Sequelize.Op.is]: null } },
          Sequelize.where(
            Sequelize.fn("LENGTH", Sequelize.col("phone")),
            Sequelize.Op.lte,
            20
          ),
        ],
      },
    });

    await queryInterface.addConstraint("reps", {
      fields: ["salary"],
      type: "check",
      name: "check_salary_non_negative",
      where: {
        [Sequelize.Op.or]: [
          { salary: { [Sequelize.Op.is]: null } },
          { salary: { [Sequelize.Op.gte]: 0 } },
        ],
      },
    });

    await queryInterface.addConstraint("reps", {
      fields: ["commission_rate"],
      type: "check",
      name: "check_commission_rate_range",
      where: {
        [Sequelize.Op.or]: [
          { commission_rate: { [Sequelize.Op.is]: null } },
          {
            [Sequelize.Op.and]: [
              { commission_rate: { [Sequelize.Op.gte]: 0 } },
              { commission_rate: { [Sequelize.Op.lte]: 100 } },
            ],
          },
        ],
      },
    });

    // Email format validation (basic check)
    await queryInterface.addConstraint("reps", {
      fields: ["email"],
      type: "check",
      name: "check_email_format",
      where: {
        [Sequelize.Op.or]: [
          { email: { [Sequelize.Op.is]: null } },
          { email: { [Sequelize.Op.like]: "%@%" } },
        ],
      },
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove constraints
    await queryInterface.removeConstraint("reps", "check_rep_code_length");
    await queryInterface.removeConstraint("reps", "check_rep_name_length");
    await queryInterface.removeConstraint("reps", "check_phone_length");
    await queryInterface.removeConstraint("reps", "check_salary_non_negative");
    await queryInterface.removeConstraint(
      "reps",
      "check_commission_rate_range"
    );
    await queryInterface.removeConstraint("reps", "check_email_format");

    // Remove indexes (unique indexes removed automatically with table)
    await queryInterface.removeIndex("reps", ["status"]);
    await queryInterface.removeIndex("reps", ["territory"]);
    await queryInterface.removeIndex("reps", ["rep_name"]);
    await queryInterface.removeIndex("reps", ["hire_date"]);
    await queryInterface.removeIndex("reps", ["created_by"]);

    // Drop table
    await queryInterface.dropTable("reps");

    // Drop ENUM type
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_reps_status";'
    );
  },
};
