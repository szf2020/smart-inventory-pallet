const express = require("express");
const router = express.Router();
const salesInvoiceController = require("../controllers/salesInvoiceController");
const { verifyToken, authorize } = require("../middleware/authMiddleware");

// Quick customer creation for invoices
router.post("/quick-customer", verifyToken, salesInvoiceController.createQuickCustomer);

// Get all sales invoices
router.get("/", verifyToken, salesInvoiceController.getAllSalesInvoices);

// Get sales invoice by ID
router.get("/:id", verifyToken, salesInvoiceController.getSalesInvoiceById);

// Create a new sales invoice
router.post("/", verifyToken, salesInvoiceController.createSalesInvoice);

// Update a sales invoice
router.put("/:id", verifyToken, salesInvoiceController.updateSalesInvoice);

// Delete a sales invoice
router.delete(
  "/:id",
  verifyToken,
  authorize(["admin"]),
  salesInvoiceController.deleteSalesInvoice
);

// Get invoice summary/statistics
router.get("/reports/summary", verifyToken, salesInvoiceController.getInvoiceSummary);

// Export cheque/credit customers data
router.get("/export/customers", verifyToken, salesInvoiceController.exportCustomersData);

module.exports = router;
