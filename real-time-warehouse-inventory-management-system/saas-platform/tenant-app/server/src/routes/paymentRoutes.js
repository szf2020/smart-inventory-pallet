const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const authMiddleware = require("../middleware/auth");

// Apply authentication middleware to all routes
router.use(authMiddleware.verifyToken);

// Payment CRUD operations
router.post("/", paymentController.createPayment);
router.get("/", paymentController.getPayments);
router.get("/summary", paymentController.getPaymentSummary);

// Helper routes for payment form
router.get("/unpaid-sales-invoices", paymentController.getUnpaidSalesInvoices);
router.get(
  "/unpaid-purchase-invoices",
  paymentController.getUnpaidPurchaseInvoices
);

module.exports = router;
