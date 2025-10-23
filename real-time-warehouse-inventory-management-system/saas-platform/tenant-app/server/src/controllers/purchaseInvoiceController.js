const { Op } = require("sequelize");

// Get all purchase invoices
exports.getAllPurchaseInvoices = async (req, res) => {
  try {
    const PurchaseInvoice = req.db.PurchaseInvoice; // Use the PurchaseInvoice model from the database instance
    const Supplier = req.db.Supplier; // Use the Supplier model from the database instance
    const Payment = req.db.Payment; // Use the Payment model from the database instance
    const PaymentMethod = req.db.PaymentMethod; // Use the PaymentMethod model from the database instance

    const {
      page = 1,
      limit = 10,
      search = "",
      status = "",
      payment_type = "",
      start_date,
      end_date,
      supplier_id = "",
    } = req.query;

    // Build where conditions
    const whereConditions = {};
    const supplierWhereConditions = {};
    const paymentWhereConditions = {};

    // Status filter
    if (status) {
      whereConditions.status = status;
    }

    // Supplier filter (changed from customer_id to supplier_id)
    if (supplier_id) {
      whereConditions.supplier_id = supplier_id;
    }

    // Date range filter (using invoice_date)
    if (start_date || end_date) {
      const dateFilter = {};
      if (start_date) {
        dateFilter[Op.gte] = new Date(start_date);
      }
      if (end_date) {
        const endDateObj = new Date(end_date);
        endDateObj.setHours(23, 59, 59, 999); // Set to end of day
        dateFilter[Op.lte] = endDateObj;
      }
      whereConditions.invoice_date = dateFilter;
    }

    // Search filter (across invoice number and supplier name)
    if (search) {
      const searchConditions = {
        [Op.or]: [
          {
            invoice_number: {
              [Op.iLike]: `%${search}%`,
            },
          },
          {
            notes: {
              [Op.iLike]: `%${search}%`,
            },
          },
        ],
      };

      // Add supplier name search
      supplierWhereConditions[req.db.Sequelize.Op.or] = [
        {
          supplier_name: {
            [Op.iLike]: `%${search}%`,
          },
        },
        {
          contact_person: {
            [Op.iLike]: `%${search}%`,
          },
        },
      ];

      // Combine search conditions
      whereConditions[Op.or] = searchConditions[Op.or];
    }

    // Payment method filter
    if (payment_type) {
      paymentWhereConditions.method_id = payment_type;
    }

    // Calculate offset for pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build include array
    const includeArray = [
      {
        model: Supplier,
        as: "supplier",
        where:
          Object.keys(supplierWhereConditions).length > 0
            ? supplierWhereConditions
            : undefined,
        required: Object.keys(supplierWhereConditions).length > 0,
      },
    ];

    // Add payment include if payment_type filter is used
    if (payment_type) {
      includeArray.push({
        model: Payment,
        as: "payments",
        where: paymentWhereConditions,
        required: true,
        include: [
          {
            model: PaymentMethod,
            as: "paymentMethod",
          },
        ],
      });
    } else {
      includeArray.push({
        model: Payment,
        as: "payments",
        required: false,
        include: [
          {
            model: PaymentMethod,
            as: "paymentMethod",
          },
        ],
      });
    }

    // Get total count for pagination
    const totalCount = await PurchaseInvoice.count({
      where: whereConditions,
      include: includeArray
        .filter((inc) => inc.required !== false)
        .map((inc) => ({
          model: inc.model,
          as: inc.as,
          where: inc.where,
          required: inc.required,
        })),
    });

    // Get purchase invoices with filters and pagination
    const purchaseInvoices = await PurchaseInvoice.findAll({
      where: whereConditions,
      include: includeArray,
      limit: parseInt(limit),
      offset: offset,
      order: [["invoice_date", "DESC"]],
      distinct: true,
    });

    return res.status(200).json({
      data: purchaseInvoices,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error getting purchase invoices:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

// Get purchase invoice by ID
exports.getPurchaseInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const PurchaseInvoice = req.db.PurchaseInvoice; // Use the PurchaseInvoice model from the database instance
    const Supplier = req.db.Supplier; // Use the Supplier model from the database instance
    const purchaseInvoice = await PurchaseInvoice.findByPk(id, {
      include: [{ model: Supplier, as: "supplier" }],
    });

    if (!purchaseInvoice) {
      return res.status(404).json({ message: "Purchase invoice not found" });
    }

    return res.status(200).json(purchaseInvoice);
  } catch (error) {
    console.error("Error getting purchase invoice:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

// Create a new purchase invoice
exports.createPurchaseInvoice = async (req, res) => {
  const transaction = await req.sequelize.transaction();
  const PurchaseInvoice = req.db.PurchaseInvoice; // Use the PurchaseInvoice model from the database instance
  const Supplier = req.db.Supplier; // Use the Supplier model from the database instance
  const Payment = req.db.Payment; // Use the Payment model from the database instance
  const PaymentMethod = req.db.PaymentMethod; // Use the PaymentMethod model from the database instance

  try {
    const {
      supplier_id,
      supplier_data, // For new suppliers
      invoice_date,
      due_date,
      total_amount,
      paid_amount,
      payment_method_id,
      notes,
    } = req.body;

    const userId = req.user.id;
    let supplierId = supplier_id;

    // Create supplier if supplier_data is provided
    if (supplier_data && !supplier_id) {
      const newSupplier = await Supplier.create(
        {
          ...supplier_data,
          created_by: userId,
        },
        { transaction }
      );
      supplierId = newSupplier.supplier_id;
    }

    // Validate required fields
    if (!supplierId) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Supplier is required",
      });
    }

    if (!total_amount || total_amount <= 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Total amount is required and must be greater than 0",
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

    // Calculate balance and status
    const totalAmountValue = parseFloat(total_amount);
    const balance = totalAmountValue - paidAmountValue;

    let status = "pending";
    if (paidAmountValue >= totalAmountValue) {
      status = "paid";
    } else if (paidAmountValue > 0) {
      status = "partially_paid";
    }

    // Generate invoice number manually
    let invoiceNumber;
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");

    // Get the last invoice to determine next number
    const lastInvoice = await PurchaseInvoice.findOne({
      attributes: ["invoice_id"],
      order: [["invoice_id", "DESC"]],
      limit: 1,
      raw: true,
    });

    const nextNumber = lastInvoice ? lastInvoice.invoice_id + 1 : 1;
    invoiceNumber = `PINV-${year}${month}-${String(nextNumber).padStart(4, "0")}`;

    // Create invoice
    const invoice = await PurchaseInvoice.create(
      {
        invoice_number: invoiceNumber,
        supplier_id: supplierId,
        invoice_date: invoice_date || new Date(),
        due_date,
        total_amount: totalAmountValue,
        status: status,
        notes,
        created_by: userId,
      },
      { transaction }
    );

    // Update supplier outstanding balance
    const supplier = await Supplier.findByPk(supplierId, { transaction });
    if (supplier) {
      // Add the unpaid balance to supplier's outstanding balance
      const unpaidBalance = totalAmountValue - paidAmountValue;
      const newOutstandingBalance =
        parseFloat(supplier.outstanding_balance || 0) + unpaidBalance;

      await supplier.update(
        { outstanding_balance: newOutstandingBalance },
        { transaction }
      );
    }

    // Create payment record if payment was made
    if (paidAmountValue > 0) {
      await Payment.create(
        {
          payment_type: "purchase_payment",
          party_type: "supplier",
          party_id: supplierId,
          reference_id: invoice.invoice_id,
          reference_type: "PurchaseInvoice",
          method_id: payment_method_id,
          amount: paidAmountValue,
          payment_date: invoice_date || new Date(),
          status: "completed",
          notes: `Payment for purchase invoice ${invoiceNumber}`,
          recorded_by: userId,
        },
        { transaction }
      );
    }

    // Fetch the created invoice with all relations
    const createdInvoice = await PurchaseInvoice.findByPk(invoice.invoice_id, {
      include: [
        { model: Supplier, as: "supplier" },
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
      message: "Purchase invoice created successfully",
      data: createdInvoice,
    });
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }
    console.error("Error creating purchase invoice:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create purchase invoice",
      error: error.message,
    });
  }
};

// Update a purchase invoice
exports.updatePurchaseInvoice = async (req, res) => {
  const db = req.db; // Use the database instance from the request
  const sequelizeInstance = db.PurchaseInvoice.sequelize;
  const transaction = await sequelizeInstance.transaction();

  const PurchaseInvoice = db.PurchaseInvoice; // Use the PurchaseInvoice model from the database instance
  const Supplier = db.Supplier; // Use the Supplier model from the database instance

  try {
    const { id } = req.params;
    const {
      purchase_number,
      supplier_id,
      purchase_date,
      total_amount,
      paid_amount,
      status,
    } = req.body;

    const purchaseInvoice = await PurchaseInvoice.findByPk(id, { transaction });

    if (!purchaseInvoice) {
      await transaction.rollback();
      return res.status(404).json({ message: "Purchase invoice not found" });
    }

    // If just marking as paid without specifying paid_amount, set paid_amount = total_amount
    if (status === "paid" && paid_amount === undefined) {
      paid_amount = purchaseInvoice.total_amount;
    }

    // Calculate the difference in outstanding balance
    const oldAmountDue = purchaseInvoice.amount_due || 0;
    const newAmountDue = Math.max(
      0,
      (total_amount !== undefined
        ? parseFloat(total_amount)
        : parseFloat(purchaseInvoice.total_amount)) -
        (paid_amount !== undefined
          ? parseFloat(paid_amount)
          : parseFloat(purchaseInvoice.paid_amount || 0))
    );
    const balanceDifference = newAmountDue - oldAmountDue;

    // Update purchase invoice fields
    await purchaseInvoice.update(
      {
        purchase_number: purchase_number || purchaseInvoice.purchase_number,
        supplier_id: supplier_id || purchaseInvoice.supplier_id,
        purchase_date: purchase_date || purchaseInvoice.purchase_date,
        total_amount:
          total_amount !== undefined
            ? parseFloat(total_amount)
            : parseFloat(purchaseInvoice.total_amount),
        paid_amount:
          paid_amount !== undefined
            ? parseFloat(paid_amount)
            : parseFloat(purchaseInvoice.paid_amount || 0),
        amount_due: newAmountDue,
        status: status || purchaseInvoice.status,
      },
      { transaction }
    );

    // Update supplier outstanding balance if there's a change
    if (balanceDifference !== 0) {
      const supplier = await Supplier.findByPk(purchaseInvoice.supplier_id, {
        transaction,
      });
      if (supplier) {
        // Ensure we're working with numbers
        const currentBalance = parseFloat(supplier.outstanding_balance || 0);
        const newBalance = currentBalance + balanceDifference;

        await supplier.update(
          { outstanding_balance: Math.max(0, newBalance) },
          { transaction }
        );
      }
    }

    await transaction.commit();

    // Get the updated invoice with related data
    const updatedInvoice = await PurchaseInvoice.findByPk(id, {
      include: [{ model: Supplier, as: "supplier" }],
    });

    return res.status(200).json(updatedInvoice);
  } catch (error) {
    await transaction.rollback();
    console.error("Error updating purchase invoice:", error);

    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({ message: error.message });
    }

    if (error.name === "SequelizeUniqueConstraintError") {
      return res
        .status(400)
        .json({ message: "Purchase number already exists" });
    }

    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

// Delete a purchase invoice
exports.deletePurchaseInvoice = async (req, res) => {
  const db = req.db; // Use the database instance from the request
  const sequelizeInstance = db.PurchaseInvoice.sequelize;
  const transaction = await sequelizeInstance.transaction();

  const PurchaseInvoice = db.PurchaseInvoice; // Use the PurchaseInvoice model from the database instance
  const Supplier = db.Supplier; // Use the Supplier model from the database instance

  try {
    const { id } = req.params;
    const purchaseInvoice = await PurchaseInvoice.findByPk(id, { transaction });

    if (!purchaseInvoice) {
      await transaction.rollback();
      return res.status(404).json({ message: "Purchase invoice not found" });
    }

    // Update supplier outstanding balance
    const supplier = await Supplier.findByPk(purchaseInvoice.supplier_id, {
      transaction,
    });
    if (supplier) {
      const newBalance =
        supplier.outstanding_balance - purchaseInvoice.amount_due;
      await supplier.update(
        { outstanding_balance: Math.max(0, newBalance) },
        { transaction }
      );
    }

    await purchaseInvoice.destroy({ transaction });
    await transaction.commit();

    return res
      .status(200)
      .json({ message: "Purchase invoice deleted successfully" });
  } catch (error) {
    await transaction.rollback();
    console.error("Error deleting purchase invoice:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};
