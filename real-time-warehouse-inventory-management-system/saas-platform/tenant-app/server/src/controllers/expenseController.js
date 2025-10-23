const { Op } = require("sequelize");

// Get all expenses with filtering and pagination
const getExpenses = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      startDate,
      endDate,
      category,
      status,
      search,
    } = req.query;

    const Expense = req.db.Expense; // Use the Expense model from the database instance
    const User = req.db.User;
    const Payment = req.db.Payment;
    const PaymentMethod = req.db.PaymentMethod;

    // Also check for alternative parameter names
    const start_date = req.query.start_date;
    const end_date = req.query.end_date;

    console.log("=== EXPENSE CONTROLLER DEBUG ===");
    console.log("Full req.query:", req.query);
    console.log("Extracted params:", {
      page,
      limit,
      startDate,
      endDate,
      category,
      status,
      search,
    });
    console.log("Alternative date params:", { start_date, end_date });
    console.log("Types:", {
      startDateType: typeof startDate,
      endDateType: typeof endDate,
      startDateValue: startDate,
      endDateValue: endDate,
      start_dateType: typeof start_date,
      end_dateType: typeof end_date,
      start_dateValue: start_date,
      end_dateValue: end_date,
    });

    // Use the correct date parameters (check both naming conventions)
    const finalStartDate = startDate || start_date;
    const finalEndDate = endDate || end_date;

    console.log("Final date params:", { finalStartDate, finalEndDate });

    const offset = (page - 1) * limit;
    const where = {};

    // Date range filter with proper validation
    if (finalStartDate || finalEndDate) {
      console.log("Raw date inputs:", {
        finalStartDate,
        finalEndDate,
        typeOfStart: typeof finalStartDate,
        typeOfEnd: typeof finalEndDate,
      });

      // Validate and format start_date
      const validStartDate =
        finalStartDate &&
        finalStartDate !== "null" &&
        finalStartDate !== "undefined" &&
        finalStartDate.trim() !== "" &&
        !isNaN(new Date(finalStartDate).getTime())
          ? finalStartDate
          : null;

      // Validate and format end_date
      const validEndDate =
        finalEndDate &&
        finalEndDate !== "null" &&
        finalEndDate !== "undefined" &&
        finalEndDate.trim() !== "" &&
        !isNaN(new Date(finalEndDate).getTime())
          ? finalEndDate
          : null;

      console.log("Date filtering - Input:", { finalStartDate, finalEndDate });
      console.log("Date filtering - Validated:", {
        validStartDate,
        validEndDate,
      });
      console.log("Date validation checks:", {
        startDateExists: !!finalStartDate,
        startDateNotNull: finalStartDate !== "null",
        startDateNotUndefined: finalStartDate !== "undefined",
        startDateNotEmpty: finalStartDate && finalStartDate.trim() !== "",
        startDateValidDate:
          finalStartDate && !isNaN(new Date(finalStartDate).getTime()),
        endDateExists: !!finalEndDate,
        endDateNotNull: finalEndDate !== "null",
        endDateNotUndefined: finalEndDate !== "undefined",
        endDateNotEmpty: finalEndDate && finalEndDate.trim() !== "",
        endDateValidDate:
          finalEndDate && !isNaN(new Date(finalEndDate).getTime()),
      });

      if (validStartDate && validEndDate) {
        // Both dates provided - use between
        where.date = {
          [Op.between]: [validStartDate, validEndDate],
        };
        console.log("Applied date filter (between):", where.date);
      } else if (validStartDate && !validEndDate) {
        // Only start date provided - from start date to today
        const today = new Date().toISOString().split("T")[0];
        where.date = {
          [Op.between]: [validStartDate, today],
        };
        console.log("Applied date filter (start to today):", where.date);
      } else if (!validStartDate && validEndDate) {
        // Only end date provided - up to end date
        where.date = {
          [Op.lte]: validEndDate,
        };
        console.log("Applied date filter (up to end):", where.date);
      }
    }

    // Category filter
    if (category) {
      where.expense_category = category;
    }

    // Status filter
    if (status) {
      where.status = status;
    }

    // Search filter
    if (search) {
      where[Op.or] = [
        { expense_category: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { supplier_name: { [Op.iLike]: `%${search}%` } },
        { reference_number: { [Op.iLike]: `%${search}%` } },
        { expense_number: { [Op.iLike]: `%${search}%` } },
      ];
    }

    console.log("Final where clause:", JSON.stringify(where, null, 2));

    const expenses = await Expense.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: "createdBy",
          attributes: ["user_id", "username", "full_name"],
        },
        {
          model: User,
          as: "approvedBy",
          attributes: ["user_id", "username", "full_name"],
        },
        {
          model: Payment,
          as: "payments",
          include: [
            {
              model: PaymentMethod,
              as: "paymentMethod",
              attributes: ["method_id", "name", "description"],
            },
            {
              model: User,
              as: "recordedBy",
              attributes: ["user_id", "username", "full_name"],
            },
          ],
        },
      ],
      order: [
        ["date", "DESC"],
        ["created_at", "DESC"],
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // Calculate paid amounts for each expense
    const expensesWithPaymentInfo = expenses.rows.map((expense) => {
      const totalPaid =
        expense.payments?.reduce((sum, payment) => {
          return (
            sum +
            (payment.status === "completed" ? parseFloat(payment.amount) : 0)
          );
        }, 0) || 0;

      const outstanding = parseFloat(expense.amount) - totalPaid;

      return {
        ...expense.toJSON(),
        totalPaid,
        outstanding: Math.max(0, outstanding),
      };
    });

    res.json({
      success: true,
      data: expensesWithPaymentInfo,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(expenses.count / limit),
        totalItems: expenses.count,
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Error fetching expenses:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch expenses",
      error: error.message,
    });
  }
};

// Get expense summary/statistics
const getExpenseSummary = async (req, res) => {
  try {
    const Expense = req.db.Expense; // Use the Expense model from the database instance
    const User = req.db.User;
    const Payment = req.db.Payment;
    const PaymentMethod = req.db.PaymentMethod;
    const { startDate, endDate } = req.query;
    // Also check for alternative parameter names
    const start_date = req.query.start_date;
    const end_date = req.query.end_date;

    // Use the correct date parameters (check both naming conventions)
    const finalStartDate = startDate || start_date;
    const finalEndDate = endDate || end_date;

    const where = {};

    // Date range filter with proper validation
    if (finalStartDate || finalEndDate) {
      // Validate and format start_date
      const validStartDate =
        finalStartDate &&
        finalStartDate !== "null" &&
        finalStartDate !== "undefined" &&
        !isNaN(new Date(finalStartDate).getTime())
          ? finalStartDate
          : null;

      // Validate and format end_date
      const validEndDate =
        finalEndDate &&
        finalEndDate !== "null" &&
        finalEndDate !== "undefined" &&
        !isNaN(new Date(finalEndDate).getTime())
          ? finalEndDate
          : null;

      if (validStartDate && validEndDate) {
        // Both dates provided - use between
        where.date = {
          [Op.between]: [validStartDate, validEndDate],
        };
      } else if (validStartDate && !validEndDate) {
        // Only start date provided - from start date to today
        const today = new Date().toISOString().split("T")[0];
        where.date = {
          [Op.between]: [validStartDate, today],
        };
      } else if (!validStartDate && validEndDate) {
        // Only end date provided - up to end date
        where.date = {
          [Op.lte]: validEndDate,
        };
      }
    }

    // Total expenses by status
    const totalExpenses = await Expense.findAll({
      where,
      attributes: [
        "status",
        [req.sequelize.fn("COUNT", req.sequelize.col("expense_id")), "count"],
        [req.sequelize.fn("SUM", req.sequelize.col("amount")), "total_amount"],
      ],
      group: ["status"],
    });

    // Total expenses by category
    const expensesByCategory = await Expense.findAll({
      where,
      attributes: [
        "expense_category",
        [req.sequelize.fn("COUNT", req.sequelize.col("expense_id")), "count"],
        [req.sequelize.fn("SUM", req.sequelize.col("amount")), "total_amount"],
      ],
      group: ["expense_category"],
      order: [[req.sequelize.fn("SUM", req.sequelize.col("amount")), "DESC"]],
    });

    // Get payment summary for expenses
    // Validate and format dates for payment filtering
    const validStartDate =
      finalStartDate &&
      finalStartDate !== "null" &&
      finalStartDate !== "undefined" &&
      !isNaN(new Date(finalStartDate).getTime())
        ? finalStartDate
        : null;
    const validEndDate =
      finalEndDate &&
      finalEndDate !== "null" &&
      finalEndDate !== "undefined" &&
      !isNaN(new Date(finalEndDate).getTime())
        ? finalEndDate
        : null;

    let paymentDateFilter = {};
    if (validStartDate && validEndDate) {
      paymentDateFilter = {
        payment_date: { [Op.between]: [validStartDate, validEndDate] },
      };
    } else if (validStartDate && !validEndDate) {
      const today = new Date().toISOString().split("T")[0];
      paymentDateFilter = {
        payment_date: { [Op.between]: [validStartDate, today] },
      };
    } else if (!validStartDate && validEndDate) {
      paymentDateFilter = { payment_date: { [Op.lte]: validEndDate } };
    }

    const expensePayments = await Payment.findAll({
      where: {
        payment_type: "purchase_payment",
        reference_type: "Expense",
        status: "completed",
        ...paymentDateFilter,
      },
      include: [
        {
          model: PaymentMethod,
          as: "paymentMethod",
          attributes: ["name"],
        },
      ],
      attributes: [
        [req.sequelize.fn("SUM", req.sequelize.col("amount")), "total_paid"],
        [
          req.sequelize.fn("COUNT", req.sequelize.col("payment_id")),
          "payment_count",
        ],
      ],
      group: ["paymentMethod.method_id", "paymentMethod.name"],
    });

    // Overall totals
    const overallTotal = await Expense.findOne({
      where,
      attributes: [
        [
          req.sequelize.fn("COUNT", req.sequelize.col("expense_id")),
          "total_count",
        ],
        [req.sequelize.fn("SUM", req.sequelize.col("amount")), "total_amount"],
      ],
    });

    // Total paid for expenses
    const totalPaid =
      (await Payment.sum("amount", {
        where: {
          payment_type: "purchase_payment",
          reference_type: "Expense",
          status: "completed",
          ...paymentDateFilter,
        },
      })) || 0;

    res.json({
      success: true,
      data: {
        totalExpenses,
        expensesByCategory,
        expensePayments,
        overallTotal: {
          ...overallTotal?.toJSON(),
          total_paid: totalPaid,
          outstanding:
            (overallTotal?.dataValues?.total_amount || 0) - totalPaid,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching expense summary:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch expense summary",
      error: error.message,
    });
  }
};

// Create a new expense
const createExpense = async (req, res) => {
  const transaction = await req.sequelize.transaction();
  const Expense = req.db.Expense; // Use the Expense model from the database instance
  const User = req.db.User;
  const Payment = req.db.Payment;
  const PaymentMethod = req.db.PaymentMethod;

  try {
    const {
      date,
      expense_category,
      amount,
      description,
      supplier_name,
      reference_number,
      paid_amount,
      payment_method_id,
    } = req.body;

    const userId = req.user?.id;
    if (!userId) {
      await transaction.rollback();
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Validate required fields
    if (!amount || amount <= 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Amount is required and must be greater than 0",
      });
    }

    // Validate payment method if paid amount is provided
    const paidAmountValue = parseFloat(paid_amount || 0);
    if (paidAmountValue > 0 && !payment_method_id) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Payment method is required when payment amount is provided",
      });
    }

    if (paidAmountValue > parseFloat(amount)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Payment amount cannot exceed expense amount",
      });
    }

    // Generate expense number
    const currentDate = new Date();
    const lastExpense = await Expense.findOne({
      order: [["expense_id", "DESC"]],
      limit: 1,
      raw: true,
      transaction,
    });

    const nextNumber = lastExpense ? lastExpense.expense_id + 1 : 1;
    const expenseNumber = `EXP-${currentDate.getFullYear()}${String(
      currentDate.getMonth() + 1
    ).padStart(2, "0")}-${String(nextNumber).padStart(4, "0")}`;

    // Calculate status based on payment
    let status = "pending";
    if (paidAmountValue >= parseFloat(amount)) {
      status = "paid";
    } else if (paidAmountValue > 0) {
      status = "partially_paid";
    }

    const expense = await Expense.create(
      {
        expense_number: expenseNumber,
        date: date || new Date(),
        expense_category,
        amount: parseFloat(amount),
        description,
        supplier_name,
        reference_number,
        status,
        created_by: userId,
      },
      { transaction }
    );

    // Create payment record if payment was made
    if (paidAmountValue > 0) {
      await Payment.create(
        {
          payment_type: "purchase_payment",
          reference_id: expense.expense_id,
          reference_type: "Expense",
          party_type: "expense",
          party_id: null,
          method_id: payment_method_id,
          amount: paidAmountValue,
          payment_date: date || new Date(),
          status: "completed",
          notes: `Payment for expense ${expenseNumber}`,
          recorded_by: userId,
        },
        { transaction }
      );
    }

    await transaction.commit();

    // Fetch the created expense with associations
    const createdExpense = await Expense.findByPk(expense.expense_id, {
      include: [
        {
          model: User,
          as: "createdBy",
          attributes: ["user_id", "username", "full_name"],
        },
        {
          model: Payment,
          as: "payments",
          include: [
            {
              model: PaymentMethod,
              as: "paymentMethod",
              attributes: ["method_id", "name", "description"],
            },
          ],
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: "Expense created successfully",
      data: createdExpense,
    });
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }
    console.error("Error creating expense:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create expense",
      error: error.message,
    });
  }
};

// Update an expense
const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const Expense = req.db.Expense; // Use the Expense model from the database instance
    const User = req.db.User;
    const Payment = req.db.Payment;
    const PaymentMethod = req.db.PaymentMethod;

    const expense = await Expense.findByPk(id);
    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    await expense.update(updateData);

    // Fetch updated expense with associations
    const updatedExpense = await Expense.findByPk(id, {
      include: [
        {
          model: User,
          as: "createdBy",
          attributes: ["user_id", "username", "full_name"],
        },
        {
          model: User,
          as: "approvedBy",
          attributes: ["user_id", "username", "full_name"],
        },
        {
          model: Payment,
          as: "payments",
          include: [
            {
              model: PaymentMethod,
              as: "paymentMethod",
              attributes: ["method_id", "name", "description"],
            },
          ],
        },
      ],
    });

    res.json({
      success: true,
      message: "Expense updated successfully",
      data: updatedExpense,
    });
  } catch (error) {
    console.error("Error updating expense:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update expense",
      error: error.message,
    });
  }
};

// Delete an expense
const deleteExpense = async (req, res) => {
  const transaction = await req.sequelize.transaction();
  const Expense = req.db.Expense; // Use the Expense model from the database instance
  const User = req.db.User;
  const Payment = req.db.Payment;
  const PaymentMethod = req.db.PaymentMethod;

  try {
    const { id } = req.params;

    const expense = await Expense.findByPk(id, { transaction });
    if (!expense) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    // Delete associated payments first
    await Payment.destroy({
      where: {
        reference_id: id,
        reference_type: "Expense",
      },
      transaction,
    });

    // Delete the expense
    await expense.destroy({ transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: "Expense deleted successfully",
    });
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }
    console.error("Error deleting expense:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete expense",
      error: error.message,
    });
  }
};

// Approve an expense
const approveExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const Expense = req.db.Expense; // Use the Expense model from the database instance
    const User = req.db.User;
    const Payment = req.db.Payment;
    const PaymentMethod = req.db.PaymentMethod;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const expense = await Expense.findByPk(id);
    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    await expense.update({
      approved_by: userId,
      approved_at: new Date(),
    });

    const updatedExpense = await Expense.findByPk(id, {
      include: [
        {
          model: User,
          as: "createdBy",
          attributes: ["user_id", "username", "full_name"],
        },
        {
          model: User,
          as: "approvedBy",
          attributes: ["user_id", "username", "full_name"],
        },
        {
          model: Payment,
          as: "payments",
          include: [
            {
              model: PaymentMethod,
              as: "paymentMethod",
              attributes: ["method_id", "name", "description"],
            },
          ],
        },
      ],
    });

    res.json({
      success: true,
      message: "Expense approved successfully",
      data: updatedExpense,
    });
  } catch (error) {
    console.error("Error approving expense:", error);
    res.status(500).json({
      success: false,
      message: "Failed to approve expense",
      error: error.message,
    });
  }
};

// Get expense categories (for dropdown)
const getExpenseCategories = async (req, res) => {
  try {
    const Expense = req.db.Expense;
    const categories = await Expense.findAll({
      attributes: [
        [
          req.sequelize.fn("DISTINCT", req.sequelize.col("expense_category")),
          "category",
        ],
      ],
      order: [["expense_category", "ASC"]],
    });

    const categoryList = categories.map((cat) => cat.dataValues.category);

    res.json({
      success: true,
      data: categoryList,
    });
  } catch (error) {
    console.error("Error fetching expense categories:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch expense categories",
      error: error.message,
    });
  }
};

// Get unpaid expenses (for payment form)
const getUnpaidExpenses = async (req, res) => {
  try {
    const Expense = req.db.Expense;
    const Payment = req.db.Payment;
    const expenses = await Expense.findAll({
      where: {
        status: ["pending", "partially_paid"],
      },
      include: [
        {
          model: Payment,
          as: "payments",
          where: { status: "completed" },
          required: false,
        },
      ],
      order: [["date", "DESC"]],
    });

    // Calculate outstanding amounts
    const expensesWithBalance = expenses.map((expense) => {
      const totalPaid =
        expense.payments?.reduce((sum, payment) => {
          return (
            sum +
            (payment.status === "completed" ? parseFloat(payment.amount) : 0)
          );
        }, 0) || 0;

      return {
        ...expense.toJSON(),
        paid_amount: totalPaid,
        outstanding: parseFloat(expense.amount) - totalPaid,
      };
    });

    res.json({
      success: true,
      data: expensesWithBalance,
    });
  } catch (error) {
    console.error("Error fetching unpaid expenses:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch unpaid expenses",
      error: error.message,
    });
  }
};

module.exports = {
  getExpenses,
  getExpenseSummary,
  createExpense,
  updateExpense,
  deleteExpense,
  approveExpense,
  getExpenseCategories,
  getUnpaidExpenses,
};
