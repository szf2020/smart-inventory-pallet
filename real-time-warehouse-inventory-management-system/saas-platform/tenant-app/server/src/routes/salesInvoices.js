const express = require('express');
const router = express.Router();
const salesInvoiceController = require('../controllers/salesInvoiceController');
const authMiddleware = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authMiddleware.verifyToken);

// Routes
router.get('/', salesInvoiceController.getAllSalesInvoices);
router.get('/summary', salesInvoiceController.getInvoiceSummary);
router.get('/:id', salesInvoiceController.getSalesInvoiceById);
router.post('/', salesInvoiceController.createSalesInvoice);
router.put('/:id', salesInvoiceController.updateSalesInvoice);
router.delete('/:id', salesInvoiceController.deleteSalesInvoice);

module.exports = router;
