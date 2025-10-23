const express = require("express");
const router = express.Router();
const expenseController = require("../controllers/expenseController");
const authMiddleware = require("../middleware/auth");

// Apply authentication middleware to all routes
router.use(authMiddleware.verifyToken);

// GET /api/expenses - Get all expenses with filtering and payment info
router.get("/", expenseController.getExpenses);

// GET /api/expenses/summary - Get expense summary/statistics
router.get("/summary", expenseController.getExpenseSummary);

// GET /api/expenses/categories - Get expense categories
router.get("/categories", expenseController.getExpenseCategories);

// GET /api/expenses/unpaid - Get unpaid expenses (for payment form)
router.get("/unpaid", expenseController.getUnpaidExpenses);

// POST /api/expenses - Create a new expense
router.post("/", expenseController.createExpense);

// PUT /api/expenses/:id - Update an expense
router.put("/:id", expenseController.updateExpense);

// DELETE /api/expenses/:id - Delete an expense
router.delete("/:id", expenseController.deleteExpense);

// PUT /api/expenses/:id/approve - Approve an expense
router.put("/:id/approve", expenseController.approveExpense);

module.exports = router;
