// const {
//   SalesInvoice,
//   Customer,
//   InvoiceItem,
//   InvoiceDiscount,
//   Payment,
//   Product,
//   User,
//   Rep,
//   Lorry,
//   PaymentMethod,
//   Discount,
//   Shop,
//   ShopDiscountValue,
// } = require("../models");
const { Op } = require("sequelize");

const salesInvoiceController = {
  // Quick customer creation for invoices
  async createQuickCustomer(req, res) {
    try {
      const { name, phone, email, address } = req.body;
      const userId = req.user.id;
      const Customer = req.db.Customer; // Use the Customer model from the database instance

      // Check if customer already exists by phone or email
      const existingCustomer = await Customer.findOne({
        where: {
          [Op.or]: [{ phone: phone }, { email: email }],
        },
      });

      if (existingCustomer) {
        return res.status(400).json({
          success: false,
          message: "Customer with this phone or email already exists",
          data: existingCustomer,
        });
      }

      const customer = await Customer.create({
        name,
        phone,
        email,
        address,
        created_by: userId,
      });

      res.status(201).json({
        success: true,
        message: "Customer created successfully",
        data: customer,
      });
    } catch (error) {
      console.error("Error creating quick customer:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create customer",
        error: error.message,
      });
    }
  },

  // Get all sales invoices with filters
  async getAllSalesInvoices(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        search = "",
        status = "",
        payment_type = "",
        start_date,
        end_date,
        customer_id = "",
      } = req.query;

      const SalesInvoice = req.db.SalesInvoice; // Use the SalesInvoice model from the database instance
      const Customer = req.db.Customer; // Use the Customer model from the database instance
      const User = req.db.User; // Use the User model from the database instance
      const Rep = req.db.Rep; // Use the Rep model from the database instance

      const offset = (page - 1) * limit;
      const whereClause = {};

      // Search filters
      if (search) {
        whereClause[Op.or] = [
          { invoice_number: { [Op.iLike]: `%${search}%` } },
          { "$customer.name$": { [Op.iLike]: `%${search}%` } },
        ];
      }

      if (status) {
        whereClause.status = status;
      }

      if (payment_type) {
        whereClause.payment_type = payment_type;
      }

      if (customer_id) {
        whereClause.customer_id = customer_id;
      }

      if (start_date || end_date) {
        whereClause.invoice_date = {};
        if (start_date) whereClause.invoice_date[Op.gte] = start_date;
        if (end_date) whereClause.invoice_date[Op.lte] = end_date;
      }

      const { count, rows: invoices } = await SalesInvoice.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Customer,
            as: "customer",
            attributes: ["customer_id", "name", "phone", "email"],
          },
          {
            model: User,
            as: "createdBy",
            attributes: ["user_id", "username", "full_name"],
          },
          {
            model: Rep,
            as: "rep",
            attributes: ["rep_id", ["rep_name", "full_name"]],
            required: false,
          },
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [["created_at", "DESC"]],
      });

      res.json({
        success: true,
        data: {
          invoices,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / limit),
          },
        },
      });
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch invoices",
        error: error.message,
      });
    }
  },

  // Get single invoice with full details
  async getSalesInvoiceById(req, res) {
    try {
      const { id } = req.params;
      const SalesInvoice = req.db.SalesInvoice; // Use the SalesInvoice model from the database instance
      const Customer = req.db.Customer; // Use the Customer model from the database instance
      const User = req.db.User; // Use the User model from the database instance
      const Rep = req.db.Rep; // Use the Rep model from the database instance
      const Payment = req.db.Payment; // Use the Payment model from the database instance

      const invoice = await SalesInvoice.findByPk(id, {
        include: [
          {
            model: Customer,
            as: "customer",
          },
          {
            model: User,
            as: "createdBy",
            attributes: ["user_id", "username", "full_name"],
          },
          {
            model: Rep,
            as: "rep",
            required: false,
          },
          {
            model: Payment,
            as: "payments",
            order: [["created_at", "DESC"]],
          },
        ],
      });

      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: "Invoice not found",
        });
      }

      // Get payment summary
      const paymentSummary = await invoice.getPaymentSummary();

      res.json({
        success: true,
        data: {
          ...invoice.toJSON(),
          paymentSummary,
        },
      });
    } catch (error) {
      console.error("Error fetching invoice:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch invoice",
        error: error.message,
      });
    }
  },

  // Create new invoice
  async createSalesInvoice(req, res) {
    const transaction = await req.sequelize.transaction();
    const SalesInvoice = req.db.SalesInvoice; // Use the SalesInvoice model from the database instance
    const Customer = req.db.Customer; // Use the Customer model from the database instance
    const Rep = req.db.Rep; // Use the Rep model from the database instance
    const Payment = req.db.Payment; // Use the Payment model from the database instance
    const Discount = req.db.Discount; // Use the Discount model from the database instance
    const Shop = req.db.Shop; // Use the Shop model from the database instance
    const ShopDiscountValue = req.db.ShopDiscountValue; // Use the ShopDiscountValue model from the database instance
    const PaymentMethod = req.db.PaymentMethod; // Use the PaymentMethod model from the database instance
    const Lorry = req.db.Lorry; // Use the Lorry model from the database instance

    try {
      const {
        customer_id,
        customer_data, // For new customers
        rep_id,
        lorry_id,
        invoice_date,
        due_date,
        subtotal,
        total_amount,
        paid_amount,
        payment_method_id,
        notes,
        discount_data, // New field for discount information
      } = req.body;

      const userId = req.user.id;
      let customerId = customer_id;

      // Create customer if customer_data is provided
      if (customer_data && !customer_id) {
        const newCustomer = await Customer.create(
          {
            ...customer_data,
            created_by: userId,
          },
          { transaction }
        );
        customerId = newCustomer.customer_id;
      }

      // Validate required fields
      if (!customerId) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Customer is required",
        });
      }

      if (!subtotal || subtotal <= 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Subtotal is required and must be greater than 0",
        });
      }

      if (!total_amount || total_amount <= 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Total amount is required and must be greater than 0",
        });
      }

      // Validate that total_amount is less than or equal to subtotal
      if (parseFloat(total_amount) > parseFloat(subtotal)) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Total amount cannot be greater than subtotal",
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

      // Validate discount data if provided
      if (discount_data) {
        if (!discount_data.shop_id) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: "Shop ID is required for discount",
          });
        }

        if (
          !discount_data.discountItems ||
          !Array.isArray(discount_data.discountItems) ||
          discount_data.discountItems.length === 0
        ) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: "Discount items are required when discount is applied",
          });
        }

        // Validate each discount item
        for (const item of discount_data.discountItems) {
          if (
            !item.sub_discount_type_id ||
            !item.discounted_cases ||
            item.discounted_cases <= 0
          ) {
            await transaction.rollback();
            return res.status(400).json({
              success: false,
              message:
                "All discount items must have valid sub_discount_type_id and discounted_cases",
            });
          }
        }
      }

      // Calculate balance and status based on total_amount (after discount)
      const totalAmountValue = parseFloat(total_amount);
      const subtotalValue = parseFloat(subtotal);
      const balance = totalAmountValue - paidAmountValue;

      let status = "pending";
      if (paidAmountValue >= totalAmountValue) {
        status = "paid";
      } else if (paidAmountValue > 0) {
        status = "partially_paid";
      }

      // Generate invoice number
      let invoiceNumber;
      const date = new Date(invoice_date || new Date());
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");

      // Get the last invoice to determine next number
      const lastInvoice = await SalesInvoice.findOne({
        attributes: ["invoice_id"],
        order: [["invoice_id", "DESC"]],
        limit: 1,
        raw: true,
      });

      const nextNumber = lastInvoice ? lastInvoice.invoice_id + 1 : 1;
      invoiceNumber = `INV-${year}${month}-${String(nextNumber).padStart(4, "0")}`;

      // Create invoice with both subtotal and total_amount
      const invoice = await SalesInvoice.create(
        {
          invoice_number: invoiceNumber,
          customer_id: customerId,
          rep_id: rep_id || null,
          lorry_id: lorry_id || null,
          invoice_date: invoice_date || new Date(),
          due_date,
          subtotal: subtotalValue, // Original amount before discount
          total_amount: totalAmountValue, // Final amount after discount
          status: status,
          notes,
          created_by: userId,
        },
        { transaction }
      );

      // Create discount records if discount data is provided
      if (discount_data && discount_data.discountItems.length > 0) {
        try {
          // Validate shop exists and get max_discounted_cases
          const shop = await Shop.findOne({
            where: { shop_id: discount_data.shop_id },
            transaction,
          });

          if (!shop) {
            await transaction.rollback();
            return res.status(404).json({
              success: false,
              message: `Shop with id ${discount_data.shop_id} not found`,
            });
          }

          // Calculate total discounted cases
          const totalDiscountedCases = discount_data.discountItems.reduce(
            (sum, item) => sum + parseInt(item.discounted_cases),
            0
          );

          // Check if total discounted cases exceed max allowed
          if (totalDiscountedCases > shop.max_discounted_cases) {
            await transaction.rollback();
            return res.status(400).json({
              success: false,
              message: `Total discounted cases (${totalDiscountedCases}) exceed maximum allowed (${shop.max_discounted_cases})`,
            });
          }

          // Check monthly limit
          const currentDate = new Date(invoice_date || new Date());
          const startOfMonth = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            1
          );
          const endOfMonth = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() + 1,
            0,
            23,
            59,
            59
          );

          // Get existing discounts for this shop in current month
          const existingDiscounts = await Discount.findAll({
            where: {
              shop_id: discount_data.shop_id,
              selling_date: {
                [Op.between]: [startOfMonth, endOfMonth],
              },
            },
            transaction,
          });

          const existingDiscountedCases = existingDiscounts.reduce(
            (sum, discount) => sum + discount.discounted_cases,
            0
          );

          if (
            existingDiscountedCases + totalDiscountedCases >
            shop.max_discounted_cases
          ) {
            await transaction.rollback();
            return res.status(400).json({
              success: false,
              message: `Adding ${totalDiscountedCases} cases would exceed monthly limit. Already used: ${existingDiscountedCases}, Maximum: ${shop.max_discounted_cases}`,
            });
          }

          // Create discount records
          for (const item of discount_data.discountItems) {
            const { sub_discount_type_id, discounted_cases, total_discount } =
              item;

            // Find the discount value for this shop and sub-discount type
            const shopDiscountValue = await ShopDiscountValue.findOne({
              where: {
                shop_id: discount_data.shop_id,
                sub_discount_type_id,
              },
              transaction,
            });

            let calculatedTotalDiscount;
            if (shopDiscountValue) {
              // Use the shop-specific discount value
              calculatedTotalDiscount =
                discounted_cases * shopDiscountValue.discount_value;
            } else {
              // Use the total_discount from the form if no shop-specific value found
              calculatedTotalDiscount = parseFloat(total_discount || 0);
            }

            // Create the discount record
            await Discount.create(
              {
                shop_id: discount_data.shop_id,
                selling_date: invoice_date || new Date(),
                lorry_id: lorry_id || null,
                sub_discount_type_id,
                discounted_cases: parseInt(discounted_cases),
                invoice_number: invoiceNumber,
                total_discount: calculatedTotalDiscount,
              },
              { transaction }
            );
          }
        } catch (discountError) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message:
              "Failed to create discount records: " + discountError.message,
          });
        }
      }

      // Create payment record if payment was made (based on total_amount after discount)
      if (paidAmountValue > 0) {
        await Payment.create(
          {
            payment_type: "sales_payment",
            party_type: "customer",
            party_id: customerId,
            reference_id: invoice.invoice_id,
            reference_type: "SalesInvoice",
            method_id: payment_method_id,
            amount: paidAmountValue,
            payment_date: invoice_date || new Date(),
            status: "completed",
            notes: `Payment for invoice ${invoiceNumber} (Invoice ID: ${invoice.invoice_id})`,
            recorded_by: userId,
          },
          { transaction }
        );
      }

      // Update customer outstanding balance (use total_amount after discount)
      const customer = await Customer.findByPk(customerId, { transaction });
      if (customer) {
        // Add the unpaid balance (after discount) to customer's outstanding balance
        const unpaidBalance = totalAmountValue - paidAmountValue;
        const newOutstandingBalance =
          parseFloat(customer.outstanding_balance || 0) + unpaidBalance;

        await customer.update(
          { outstanding_balance: newOutstandingBalance },
          { transaction }
        );
      }

      // Fetch the created invoice with all relations
      const createdInvoice = await SalesInvoice.findByPk(invoice.invoice_id, {
        include: [
          { model: Customer, as: "customer" },
          { model: Rep, as: "rep" },
          { model: Lorry, as: "lorry" },
          {
            model: Payment,
            as: "payments",
            include: [{ model: PaymentMethod, as: "paymentMethod" }],
          },
        ],
        transaction,
      });

      await transaction.commit();

      res.status(201).json({
        success: true,
        message: "Invoice created successfully",
        data: {
          ...createdInvoice.toJSON(),
          discount_applied: discount_data ? true : false,
          discount_amount: subtotalValue - totalAmountValue,
        },
      });
    } catch (error) {
      if (!transaction.finished) {
        await transaction.rollback();
      }
      console.error("Error creating invoice:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create invoice",
        error: error.message,
      });
    }
  },

  // Update invoice
  async updateSalesInvoice(req, res) {
    const transaction = await req.sequelize.transaction();

    const SalesInvoice = req.db.SalesInvoice; // Use the SalesInvoice model from the database instance

    try {
      const { id } = req.params;
      const updateData = req.body;

      const invoice = await SalesInvoice.findByPk(id);
      if (!invoice) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: "Invoice not found",
        });
      }

      // Check if invoice can be updated
      if (invoice.status === "paid" || invoice.status === "cancelled") {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Cannot update paid or cancelled invoices",
        });
      }

      await invoice.update(updateData, { transaction });
      await transaction.commit();

      res.json({
        success: true,
        message: "Invoice updated successfully",
        data: invoice,
      });
    } catch (error) {
      await transaction.rollback();
      console.error("Error updating invoice:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update invoice",
        error: error.message,
      });
    }
  },

  // Delete/Cancel invoice
  async deleteSalesInvoice(req, res) {
    try {
      const { id } = req.params;

      const SalesInvoice = req.db.SalesInvoice; // Use the SalesInvoice model from the database instance
      const Payment = req.db.Payment; // Use the Payment model from the database instance

      const invoice = await SalesInvoice.findByPk(id);
      if (!invoice) {
        return res.status(404).json({
          success: false,
          message: "Invoice not found",
        });
      }

      // Check if invoice has payments
      const payments = await Payment.findAll({
        where: {
          invoice_id: id,
          status: "completed",
        },
      });

      if (payments.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Cannot delete invoice with completed payments",
        });
      }

      // Cancel instead of delete
      await invoice.update({ status: "cancelled" });

      res.json({
        success: true,
        message: "Invoice cancelled successfully",
      });
    } catch (error) {
      console.error("Error deleting invoice:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete invoice",
        error: error.message,
      });
    }
  },

  // Get invoice summary/statistics
  async getInvoiceSummary(req, res) {
    try {
      const {
        date_from = "",
        date_to = "",
        customer_id = "",
        payment_type = "",
      } = req.query;

      const SalesInvoice = req.db.SalesInvoice; // Use the SalesInvoice model from the database instance

      const whereClause = {};

      if (customer_id) whereClause.customer_id = customer_id;
      if (payment_type) whereClause.payment_type = payment_type;
      if (date_from || date_to) {
        whereClause.invoice_date = {};
        if (date_from) whereClause.invoice_date[Op.gte] = date_from;
        if (date_to) whereClause.invoice_date[Op.lte] = date_to;
      }

      const summary = await SalesInvoice.findAll({
        where: whereClause,
        attributes: [
          "status",
          "payment_type",
          [req.sequelize.fn("COUNT", req.sequelize.col("invoice_id")), "count"],
          [
            req.sequelize.fn("SUM", req.sequelize.col("total_amount")),
            "total_amount",
          ],
          [
            req.sequelize.fn("SUM", req.sequelize.col("paid_amount")),
            "paid_amount",
          ],
          [req.sequelize.fn("SUM", req.sequelize.col("balance")), "balance"],
        ],
        group: ["status", "payment_type"],
        raw: true,
      });

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      console.error("Error fetching invoice summary:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch invoice summary",
        error: error.message,
      });
    }
  },

  // Export cheque/credit customers data for Excel
  async exportCustomersData(req, res) {
    try {
      const {
        date_from,
        date_to,
        payment_type, // 'cheque' or 'credit'
      } = req.query;

      const SalesInvoice = req.db.SalesInvoice; // Use the SalesInvoice model from the database instance
      const Customer = req.db.Customer; // Use the Customer model from the database instance
      const Payment = req.db.Payment; // Use the Payment model from the database instance

      if (!payment_type || !["cheque", "credit"].includes(payment_type)) {
        return res.status(400).json({
          success: false,
          message: 'Payment type must be either "cheque" or "credit"',
        });
      }

      const whereClause = {
        payment_type: payment_type,
      };

      if (date_from || date_to) {
        whereClause.invoice_date = {};
        if (date_from) whereClause.invoice_date[Op.gte] = date_from;
        if (date_to) whereClause.invoice_date[Op.lte] = date_to;
      }

      const invoices = await SalesInvoice.findAll({
        where: whereClause,
        include: [
          {
            model: Customer,
            as: "customer",
            attributes: ["customer_id", "name", "phone", "email", "address"],
          },
          {
            model: Payment,
            as: "payments",
            where: { payment_type: payment_type },
            required: false,
          },
        ],
        attributes: [
          "invoice_id",
          "invoice_number",
          "invoice_date",
          "due_date",
          "total_amount",
          "paid_amount",
          "balance",
          "status",
        ],
        order: [["invoice_date", "DESC"]],
      });

      // Format data for Excel export
      const exportData = invoices.map((invoice) => ({
        Invoice_Number: invoice.invoice_number,
        Invoice_Date: invoice.invoice_date,
        Due_Date: invoice.due_date,
        Customer_Name: invoice.customer?.name || "N/A",
        Customer_Phone: invoice.customer?.phone || "N/A",
        Customer_Email: invoice.customer?.email || "N/A",
        Customer_Address: invoice.customer?.address || "N/A",
        Total_Amount: parseFloat(invoice.total_amount),
        Paid_Amount: parseFloat(invoice.paid_amount),
        Balance: parseFloat(invoice.balance),
        Status: invoice.status,
        Payment_Type: payment_type.toUpperCase(),
        Last_Payment_Date: invoice.payments?.[0]?.payment_date || "No Payment",
      }));

      res.json({
        success: true,
        data: exportData,
        summary: {
          total_invoices: exportData.length,
          total_amount: exportData.reduce(
            (sum, inv) => sum + inv.Total_Amount,
            0
          ),
          total_paid: exportData.reduce((sum, inv) => sum + inv.Paid_Amount, 0),
          total_balance: exportData.reduce((sum, inv) => sum + inv.Balance, 0),
        },
      });
    } catch (error) {
      console.error("Error exporting customers data:", error);
      res.status(500).json({
        success: false,
        message: "Failed to export data",
        error: error.message,
      });
    }
  },
};

module.exports = salesInvoiceController;
