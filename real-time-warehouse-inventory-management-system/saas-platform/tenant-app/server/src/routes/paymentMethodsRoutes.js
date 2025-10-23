const express = require("express");
const router = express.Router();
const paymentMethodController = require("../controllers/paymentMethodController");

// GET /api/payment-methods - Get all payment methods
router.get("/", paymentMethodController.getAllPaymentMethods);

// GET /api/payment-methods/:id - Get payment method by ID
router.get("/:id", paymentMethodController.getPaymentMethodById);

// POST /api/payment-methods - Create a new payment method
router.post("/", paymentMethodController.createPaymentMethod);

// PUT /api/payment-methods/:id - Update a payment method
router.put("/:id", paymentMethodController.updatePaymentMethod);

// DELETE /api/payment-methods/:id - Delete a payment method
router.delete("/:id", paymentMethodController.deletePaymentMethod);

module.exports = router;
