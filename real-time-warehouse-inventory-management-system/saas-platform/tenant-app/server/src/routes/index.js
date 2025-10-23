const express = require("express");
const router = express.Router();

// Import routes
const authRoutes = require("./authRoutes");
const customerRoutes = require("./customerRoutes");
const supplierRoutes = require("./supplierRoutes");
const salesInvoiceRoutes = require("./salesInvoiceRoutes"); // Updated to new financial system
const purchaseInvoiceRoutes = require("./purchaseInvoiceRoutes");
const productRoutes = require("./productRoutes");
const lorryRoutes = require("./lorryRoutes");
const emptyReturnRoutes = require("./emptyReturnRoutes");
const expiryReturnRoutes = require("./expiryReturnRoutes");
const stockInventoryRoutes = require("./stockInventoryRoutes");
const loadingTransactionRoutes = require("./loadingTransactionRoutes");
const unloadingTransactionRoutes = require("./unloadingTransactionRoutes");
const loadingDetailRoutes = require("./loadingDetailRoutes");
const unloadingDetailRoutes = require("./unloadingDetailRoutes");
const discountRoutes = require("./discountRoutes");
const dailySalesRoutes = require("./dailySalesRoutes");
const systemRoutes = require("./system");
const cocaColaMonthRoutes = require("./cocaColaMonthRoutes");
const shopRoutes = require("./shopRoutes");
const subDiscountTypeRoutes = require("./subDiscountTypeRoutes");
const roleRoutes = require("./roles");
const userManagementRoutes = require("./userManagement");
const repRoutes = require("./repRoutes");
const expenseRoutes = require("./expenseRoutes");
const paymentMethodsRoutes = require("./paymentMethodsRoutes");
const adminRoutes = require("./adminRoutes");

// New simplified financial system routes
const paymentsRoutes = require("./paymentRoutes");

const { verifyToken, authorize } = require("../middleware/authMiddleware");

const adminOnly = authorize("admin");

// Use the imported routes
router.use("/auth", authRoutes);
router.use("/customers", customerRoutes);
router.use("/suppliers", supplierRoutes);
router.use("/sales-invoices", salesInvoiceRoutes);
router.use("/purchase-invoices", purchaseInvoiceRoutes);
router.use("/products", productRoutes);
router.use("/lorries", lorryRoutes);
router.use("/empty-returns", emptyReturnRoutes);
router.use("/expiry-returns", expiryReturnRoutes);
router.use("/stock-inventory", stockInventoryRoutes);
router.use("/loading-transactions", loadingTransactionRoutes);
router.use("/unloading-transactions", unloadingTransactionRoutes);
router.use("/loading-details", loadingDetailRoutes);
router.use("/unloading-details", unloadingDetailRoutes);
router.use("/discounts", discountRoutes);
router.use("/daily-sales", dailySalesRoutes);
router.use("/coca-cola-months", cocaColaMonthRoutes);
router.use("/shops", shopRoutes);
router.use("/sub-discount-types", subDiscountTypeRoutes);
router.use("/roles", roleRoutes);
router.use("/user-management", userManagementRoutes);
router.use("/reps", repRoutes);
router.use("/expenses", expenseRoutes); // Registering expense routes
router.use("/admin", adminRoutes);

// New simplified financial system routes
router.use("/payments", paymentsRoutes);
router.use("/payment-methods", paymentMethodsRoutes);

// System and health check routes
router.use("/system", systemRoutes);

module.exports = router;
