const { Op } = require("sequelize");

const paymentController = {
  // Create a new payment
  async createPayment(req, res) {
    const Payment = req.db.Payment; // Use the Payment model from the database instance
    const SalesInvoice = req.db.SalesInvoice;
    const PurchaseInvoice = req.db.PurchaseInvoice;
    const PaymentMethod = req.db.PaymentMethod;
    const Customer = req.db.Customer;
    const Supplier = req.db.Supplier;
    const User = req.db.User;

    const transaction = await req.sequelize.transaction();

    try {
      const {
        payment_type,
        payment_date,
        amount,
        method_id,
        reference_id,
        notes,
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
      if (!payment_type) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Payment type is required",
        });
      }

      if (!amount || amount <= 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Amount must be greater than 0",
        });
      }

      if (!method_id) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Payment method is required",
        });
      }

      // For invoice payments, validate reference_id and get invoice details (if provided)
      let invoice = null;
      let party_id = null;
      let party_type = null;
      let reference_type = null;

      if (payment_type === "sales_payment") {
        if (reference_id) {
          // Invoice payment
          invoice = await SalesInvoice.findByPk(reference_id, {
            include: [{ model: Customer, as: "customer" }],
            transaction,
          });

          if (!invoice) {
            await transaction.rollback();
            return res.status(400).json({
              success: false,
              message: "Sales invoice not found",
            });
          }

          party_id = invoice.customer_id;
          party_type = "customer";
          reference_type = "SalesInvoice";

          // Check if payment amount doesn't exceed remaining balance
          const currentPaid =
            (await Payment.sum("amount", {
              where: {
                reference_id: reference_id,
                reference_type: "SalesInvoice",
                status: "completed",
              },
              transaction,
            })) || 0;

          const remainingBalance =
            parseFloat(invoice.total_amount) - currentPaid;

          if (amount > remainingBalance) {
            await transaction.rollback();
            return res.status(400).json({
              success: false,
              message: `Payment amount (${amount}) exceeds remaining balance (${remainingBalance})`,
            });
          }
        } else {
          // Manual sales payment (no specific invoice)
          party_type = "customer";
          reference_type = null;
        }
      } else if (payment_type === "purchase_payment") {
        if (reference_id) {
          // Invoice payment
          invoice = await PurchaseInvoice.findByPk(reference_id, {
            include: [{ model: Supplier, as: "supplier" }],
            transaction,
          });

          if (!invoice) {
            await transaction.rollback();
            return res.status(400).json({
              success: false,
              message: "Purchase invoice not found",
            });
          }

          party_id = invoice.supplier_id;
          party_type = "supplier";
          reference_type = "PurchaseInvoice";

          // Check if payment amount doesn't exceed remaining balance
          const currentPaid =
            (await Payment.sum("amount", {
              where: {
                reference_id: reference_id,
                reference_type: "PurchaseInvoice",
                status: "completed",
              },
              transaction,
            })) || 0;

          const remainingBalance =
            parseFloat(invoice.total_amount) - currentPaid;

          if (amount > remainingBalance) {
            await transaction.rollback();
            return res.status(400).json({
              success: false,
              message: `Payment amount (${amount}) exceeds remaining balance (${remainingBalance})`,
            });
          }
        } else {
          // Manual purchase payment (no specific invoice)
          party_type = "supplier";
          reference_type = null;
        }
      }

      // Create the payment
      const payment = await Payment.create(
        {
          payment_type,
          reference_id: reference_id || null,
          reference_type: reference_type || null,
          party_type:
            party_type ||
            (payment_type === "advance_payment" ? "customer" : "expense"),
          party_id: party_id || null,
          method_id: parseInt(method_id),
          amount: parseFloat(amount),
          payment_date: payment_date || new Date(),
          status: "completed",
          notes: notes || "",
          recorded_by: userId,
        },
        { transaction }
      );

      // Update invoice status if it's an invoice payment
      if (invoice) {
        // Calculate new totals
        const totalPaid = await Payment.sum("amount", {
          where: {
            reference_id: reference_id,
            reference_type: reference_type,
            status: "completed",
          },
          transaction,
        });

        const totalAmount = parseFloat(invoice.total_amount);
        let newStatus = "pending";

        if (totalPaid >= totalAmount) {
          newStatus = "paid";
        } else if (totalPaid > 0) {
          newStatus = "partially_paid";
        }

        await invoice.update({ status: newStatus }, { transaction });

        // Update customer/supplier outstanding balance
        if (payment_type === "sales_payment") {
          // For sales payments, reduce customer outstanding balance
          const customer = await Customer.findByPk(party_id, { transaction });
          if (customer) {
            const newBalance = Math.max(
              0,
              parseFloat(customer.outstanding_balance) - parseFloat(amount)
            );
            await customer.update(
              { outstanding_balance: newBalance },
              { transaction }
            );
          }
        } else if (payment_type === "purchase_payment") {
          // For purchase payments, you might want to track supplier balances too
          // This depends on your business logic - uncomment if needed
          const supplier = await Supplier.findByPk(party_id, { transaction });
          if (supplier && supplier.outstanding_balance !== undefined) {
            const newBalance = Math.max(
              0,
              parseFloat(supplier.outstanding_balance) - parseFloat(amount)
            );
            await supplier.update(
              { outstanding_balance: newBalance },
              { transaction }
            );
          }
        }
      } else if (payment_type === "sales_payment" && !reference_id) {
        // Manual sales payment without specific invoice - still reduce customer balance
        if (party_id) {
          const customer = await Customer.findByPk(party_id, { transaction });
          if (customer) {
            const newBalance = Math.max(
              0,
              parseFloat(customer.outstanding_balance) - parseFloat(amount)
            );
            await customer.update(
              { outstanding_balance: newBalance },
              { transaction }
            );
          }
        }
      }

      await transaction.commit();

      // Fetch the created payment with all relations
      const createdPayment = await Payment.findByPk(payment.payment_id, {
        include: [
          { model: PaymentMethod, as: "paymentMethod" },
          { model: User, as: "recordedBy" },
        ],
      });

      res.status(201).json({
        success: true,
        message: "Payment created successfully",
        data: createdPayment,
      });
    } catch (error) {
      if (!transaction.finished) {
        await transaction.rollback();
      }
      console.error("Error creating payment:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create payment",
        error: error.message,
      });
    }
  },

  // Get all payments with filters
  async getPayments(req, res) {
    try {
      const Payment = req.db.Payment;
      const PaymentMethod = req.db.PaymentMethod;
      const User = req.db.User;
      const {
        payment_type,
        party_type,
        status,
        start_date,
        end_date,
        page = 1,
        limit = 25,
      } = req.query;

      const where = {};

      if (payment_type) where.payment_type = payment_type;
      if (party_type) where.party_type = party_type;
      if (status) where.status = status;

      // Handle date filtering with proper validation
      if (start_date || end_date) {
        where.payment_date = {};

        // Validate and format start_date
        const validStartDate =
          start_date &&
          start_date !== "null" &&
          start_date !== "undefined" &&
          !isNaN(new Date(start_date).getTime())
            ? start_date
            : null;

        // Validate and format end_date
        const validEndDate =
          end_date &&
          end_date !== "null" &&
          end_date !== "undefined" &&
          !isNaN(new Date(end_date).getTime())
            ? end_date
            : null;

        if (validStartDate && validEndDate) {
          // Both dates provided - use between
          where.payment_date = {
            [Op.between]: [validStartDate, validEndDate],
          };
        } else if (validStartDate && !validEndDate) {
          // Only start date provided - from start date to today
          const today = new Date().toISOString().split("T")[0];
          where.payment_date = {
            [Op.between]: [validStartDate, today],
          };
        } else if (!validStartDate && validEndDate) {
          // Only end date provided - up to end date
          where.payment_date = {
            [Op.lte]: validEndDate,
          };
        } else {
          // Neither date is valid, remove the date filter
          delete where.payment_date;
        }
      }

      const offset = (parseInt(page) - 1) * parseInt(limit);

      const payments = await Payment.findAndCountAll({
        where,
        include: [
          { model: PaymentMethod, as: "paymentMethod" },
          { model: User, as: "recordedBy" },
        ],
        order: [
          ["payment_date", "DESC"],
          ["created_at", "DESC"],
        ],
        limit: parseInt(limit),
        offset: offset,
      });

      res.json({
        success: true,
        data: payments.rows,
        pagination: {
          total: payments.count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(payments.count / parseInt(limit)),
        },
      });
    } catch (error) {
      console.error("Error fetching payments:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch payments",
        error: error.message,
      });
    }
  },

  // Get unpaid/partially paid sales invoices
  async getUnpaidSalesInvoices(req, res) {
    try {
      const Payment = req.db.Payment; // Use the Payment model from the database instance
      const SalesInvoice = req.db.SalesInvoice;
      const Customer = req.db.Customer;
      const invoices = await SalesInvoice.findAll({
        where: {
          status: ["pending", "partially_paid"],
        },
        include: [{ model: Customer, as: "customer" }],
        order: [["invoice_date", "DESC"]],
      });

      // Calculate paid amounts for each invoice
      const invoicesWithBalance = await Promise.all(
        invoices.map(async (invoice) => {
          const totalPaid =
            (await Payment.sum("amount", {
              where: {
                reference_id: invoice.invoice_id,
                reference_type: "SalesInvoice",
                status: "completed",
              },
            })) || 0;

          return {
            ...invoice.toJSON(),
            paid_amount: totalPaid,
            balance: parseFloat(invoice.total_amount) - totalPaid,
          };
        })
      );

      res.json({
        success: true,
        data: invoicesWithBalance,
      });
    } catch (error) {
      console.error("Error fetching unpaid sales invoices:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch unpaid sales invoices",
        error: error.message,
      });
    }
  },

  // Get unpaid/partially paid purchase invoices
  async getUnpaidPurchaseInvoices(req, res) {
    try {
      const Payment = req.db.Payment;
      const PurchaseInvoice = req.db.PurchaseInvoice;
      const Supplier = req.db.Supplier;
      const invoices = await PurchaseInvoice.findAll({
        where: {
          status: ["pending", "partially_paid"],
        },
        include: [{ model: Supplier, as: "supplier" }],
        order: [["invoice_date", "DESC"]],
      });

      // Calculate paid amounts for each invoice
      const invoicesWithBalance = await Promise.all(
        invoices.map(async (invoice) => {
          const totalPaid =
            (await Payment.sum("amount", {
              where: {
                reference_id: invoice.invoice_id,
                reference_type: "PurchaseInvoice",
                status: "completed",
              },
            })) || 0;

          return {
            ...invoice.toJSON(),
            paid_amount: totalPaid,
            balance: parseFloat(invoice.total_amount) - totalPaid,
          };
        })
      );

      res.json({
        success: true,
        data: invoicesWithBalance,
      });
    } catch (error) {
      console.error("Error fetching unpaid purchase invoices:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch unpaid purchase invoices",
        error: error.message,
      });
    }
  },

  // Get payment summary/dashboard data
  async getPaymentSummary(req, res) {
    try {
      const Payment = req.db.Payment;
      const PaymentMethod = req.db.PaymentMethod;
      const { start_date, end_date } = req.query;

      const dateFilter = {};
      if (start_date && end_date) {
        dateFilter.payment_date = {
          [Op.between]: [start_date, end_date],
        };
      }

      const [
        totalIncome,
        totalExpenses,
        salesPayments,
        purchasePayments,
        advances,
        refunds,
        recentPayments,
      ] = await Promise.all([
        // Total income (sales + advances)
        Payment.sum("amount", {
          where: {
            ...dateFilter,
            payment_type: ["sales_payment", "advance_payment"],
            status: "completed",
          },
        }),

        // Total expenses (purchases + refunds)
        Payment.sum("amount", {
          where: {
            ...dateFilter,
            payment_type: ["purchase_payment", "refund"],
            status: "completed",
          },
        }),

        // Sales payments count
        Payment.count({
          where: {
            ...dateFilter,
            payment_type: "sales_payment",
            status: "completed",
          },
        }),

        // Purchase payments count
        Payment.count({
          where: {
            ...dateFilter,
            payment_type: "purchase_payment",
            status: "completed",
          },
        }),

        // Advances count
        Payment.count({
          where: {
            ...dateFilter,
            payment_type: "advance_payment",
            status: "completed",
          },
        }),

        // Refunds count
        Payment.count({
          where: {
            ...dateFilter,
            payment_type: "refund",
            status: "completed",
          },
        }),

        // Recent payments
        Payment.findAll({
          where: {
            status: "completed",
          },
          include: [{ model: PaymentMethod, as: "paymentMethod" }],
          order: [
            ["payment_date", "DESC"],
            ["created_at", "DESC"],
          ],
          limit: 10,
        }),
      ]);

      const netCashFlow = (totalIncome || 0) - (totalExpenses || 0);

      res.json({
        success: true,
        data: {
          summary: {
            totalIncome: totalIncome || 0,
            totalExpenses: totalExpenses || 0,
            netCashFlow,
          },
          counts: {
            salesPayments,
            purchasePayments,
            advances,
            refunds,
            totalPayments:
              salesPayments + purchasePayments + advances + refunds,
          },
          recentPayments,
        },
      });
    } catch (error) {
      console.error("Error fetching payment summary:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch payment summary",
        error: error.message,
      });
    }
  },
};

module.exports = paymentController;
