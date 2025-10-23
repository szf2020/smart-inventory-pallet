// const db = require("../models");
// const StockInventory = db.StockInventory;
// const InventoryTransaction = db.InventoryTransaction;
// const { sequelize } = require("../models");

exports.getAllStockInventory = async (req, res) => {
  try {
    const db = req.db; // Use the database instance from the request
    const StockInventory = db.StockInventory; // Use the StockInventory model from the database instance
    const stockInventory = await StockInventory.findAll();
    res.status(200).json(stockInventory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getStockInventoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.db; // Use the database instance from the request
    const StockInventory = db.StockInventory; // Use the StockInventory model from the database instance
    const stockInventory = await StockInventory.findOne({
      where: { inventory_id: id },
    });
    if (stockInventory) {
      res.status(200).json(stockInventory);
    } else {
      res
        .status(404)
        .json({ message: `Stock inventory record with id ${id} not found` });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create stock inventory with optional purchase invoice
exports.createStockInventory = async (req, res) => {
  const db = req.db; // Use the database instance from the request
  const StockInventory = db.StockInventory;
  const InventoryTransaction = db.InventoryTransaction;
  const PurchaseInvoice = db.PurchaseInvoice;
  const Payment = db.Payment;
  const Supplier = db.Supplier;
  const PaymentMethod = db.PaymentMethod;
  const sequelizeInstance = StockInventory.sequelize;
  const transaction = await sequelizeInstance.transaction();

  try {
    const {
      // Stock fields
      product_id,
      cases_qty,
      bottles_qty,
      total_bottles,
      total_value,
      notes,
      // Invoice fields
      create_invoice,
      supplier_id,
      supplier_data,
      invoice_date,
      due_date,
      total_amount,
      paid_amount,
      payment_method_id,
      invoice_notes,
    } = req.body;

    const userId = req.user?.id || 1; // Fallback user ID if not available
    let supplierId = supplier_id;
    let createdInvoice = null;
    let createdPayment = null;

    // Validate stock fields
    if (!product_id || !total_bottles || !total_value) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Product, quantities, and values are required",
      });
    }

    // If creating invoice, validate invoice fields
    if (create_invoice) {
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

      // Validate required invoice fields
      if (!supplierId) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Supplier is required when creating purchase invoice",
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
    }

    // 1. Handle Stock Inventory
    // Check if inventory for this product already exists
    let existingInventory = await StockInventory.findOne({
      where: { product_id },
      transaction,
    });

    // Record the inventory transaction
    const inventoryTransaction = await InventoryTransaction.create(
      {
        product_id,
        transaction_type: "ADD",
        cases_qty: parseInt(cases_qty) || 0,
        bottles_qty: parseInt(bottles_qty) || 0,
        total_bottles: parseInt(total_bottles),
        total_value: parseFloat(total_value),
        notes,
        transaction_date: new Date(),
      },
      { transaction }
    );

    // Update or create inventory
    if (existingInventory) {
      existingInventory = await existingInventory.update(
        {
          cases_qty: existingInventory.cases_qty + parseInt(cases_qty || 0),
          bottles_qty:
            existingInventory.bottles_qty + parseInt(bottles_qty || 0),
          total_bottles:
            existingInventory.total_bottles + parseInt(total_bottles),
          total_value:
            parseFloat(existingInventory.total_value) + parseFloat(total_value),
          last_updated: new Date(),
        },
        { transaction }
      );
    } else {
      existingInventory = await StockInventory.create(
        {
          product_id,
          cases_qty: parseInt(cases_qty) || 0,
          bottles_qty: parseInt(bottles_qty) || 0,
          total_bottles: parseInt(total_bottles),
          total_value: parseFloat(total_value),
          last_updated: new Date(),
        },
        { transaction }
      );
    }

    // 2. Handle Purchase Invoice Creation (if requested)
    if (create_invoice) {
      // Calculate balance and status
      const paidAmountValue = parseFloat(paid_amount || 0);
      const totalAmountValue = parseFloat(total_amount);
      const balance = totalAmountValue - paidAmountValue;

      let status = "pending";
      if (paidAmountValue >= totalAmountValue) {
        status = "paid";
      } else if (paidAmountValue > 0) {
        status = "partially_paid";
      }

      // Generate invoice number
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
        transaction,
      });

      const nextNumber = lastInvoice ? lastInvoice.invoice_id + 1 : 1;
      invoiceNumber = `PINV-${year}${month}-${String(nextNumber).padStart(4, "0")}`;

      // Create purchase invoice
      createdInvoice = await PurchaseInvoice.create(
        {
          invoice_number: invoiceNumber,
          supplier_id: supplierId,
          invoice_date: invoice_date || new Date(),
          due_date,
          total_amount: totalAmountValue,
          status: status,
          notes:
            invoice_notes ||
            `Purchase invoice for stock addition - Product ID: ${product_id}`,
          created_by: userId,
        },
        { transaction }
      );

      // Update supplier outstanding balance
      const supplier = await Supplier.findByPk(supplierId, { transaction });
      if (supplier) {
        // Add the unpaid balance to supplier's outstanding balance
        const paidAmountValue = parseFloat(paid_amount || 0);
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
        createdPayment = await Payment.create(
          {
            payment_type: "purchase_payment",
            party_type: "supplier",
            party_id: supplierId,
            reference_id: createdInvoice.invoice_id,
            reference_type: "PurchaseInvoice",
            method_id: payment_method_id,
            amount: paidAmountValue,
            payment_date: invoice_date || new Date(),
            status: "completed",
            notes: `Payment for purchase invoice ${invoiceNumber} - Stock addition`,
            recorded_by: userId,
          },
          { transaction }
        );
      }
    }

    // Commit the transaction
    await transaction.commit();

    // Prepare response
    const response = {
      success: true,
      message: create_invoice
        ? "Stock added and purchase invoice created successfully"
        : "Stock added successfully",
      data: {
        inventory: existingInventory,
        inventoryTransaction: inventoryTransaction,
      },
    };

    // Add invoice and payment info if created
    if (create_invoice && createdInvoice) {
      // Fetch the complete invoice with relations
      const completeInvoice = await PurchaseInvoice.findByPk(
        createdInvoice.invoice_id,
        {
          include: [
            { model: Supplier, as: "supplier" },
            {
              model: Payment,
              as: "payments",
              include: [{ model: PaymentMethod, as: "paymentMethod" }],
            },
          ],
        }
      );

      response.data.invoice = completeInvoice;
      response.data.payment = createdPayment;
      response.message += `. Invoice number: ${createdInvoice.invoice_number}`;

      if (createdPayment) {
        const paidAmountValue = parseFloat(paid_amount || 0);
        response.message += `. Payment of Rs. ${paidAmountValue} recorded.`;
      }
    }

    res.status(201).json(response);
  } catch (error) {
    // Rollback transaction on error
    if (!transaction.finished) {
      await transaction.rollback();
    }

    console.error("Error creating stock inventory:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create stock inventory record",
      error: error.message,
    });
  }
};

exports.adjustStockInventory = async (req, res) => {
  const db = req.db;
  const StockInventory = db.StockInventory;
  const InventoryTransaction = db.InventoryTransaction;
  const sequelizeInstance = StockInventory.sequelize;
  const transaction = await sequelizeInstance.transaction();

  try {
    const {
      product_id,
      cases_qty,
      bottles_qty,
      total_bottles,
      adjustment_type,
      total_value,
      reason,
    } = req.body;

    // Find the current inventory for this product
    let existingInventory = await StockInventory.findOne({
      where: { product_id },
      transaction,
    });

    // If no inventory exists and trying to decrease, that's an error
    if (!existingInventory && adjustment_type === "decrease") {
      await transaction.rollback();
      return res.status(400).json({
        message: "Cannot decrease inventory that doesn't exist",
      });
    }

    // Create a transaction record
    const inventoryTransaction = await InventoryTransaction.create(
      {
        product_id,
        transaction_type: adjustment_type === "increase" ? "ADD" : "REMOVE",
        cases_qty,
        bottles_qty,
        total_bottles,
        notes: reason,
        total_value,
        transaction_date: new Date(),
      },
      { transaction }
    );

    // Update or create the inventory record
    if (existingInventory) {
      // Calculate new quantities based on adjustment type
      const newCasesQty =
        adjustment_type === "increase"
          ? existingInventory.cases_qty + parseInt(cases_qty)
          : existingInventory.cases_qty - parseInt(cases_qty);

      const newBottlesQty =
        adjustment_type === "increase"
          ? existingInventory.bottles_qty + parseInt(bottles_qty)
          : existingInventory.bottles_qty - parseInt(bottles_qty);

      const newTotalBottles =
        adjustment_type === "increase"
          ? existingInventory.total_bottles + parseInt(total_bottles)
          : existingInventory.total_bottles - parseInt(total_bottles);

      // Prevent negative inventory
      if (newCasesQty < 0 || newBottlesQty < 0 || newTotalBottles < 0) {
        await transaction.rollback();
        return res.status(400).json({
          message: "Adjustment would result in negative inventory",
        });
      }

      // Update the inventory
      existingInventory = await existingInventory.update(
        {
          cases_qty: newCasesQty,
          bottles_qty: newBottlesQty,
          total_bottles: newTotalBottles,
          total_value:
            adjustment_type === "increase"
              ? existingInventory.total_value + parseFloat(total_value)
              : existingInventory.total_value - parseFloat(total_value),
          last_updated: new Date(),
        },
        { transaction }
      );
    } else {
      // Create new inventory if it doesn't exist (only for increases)
      existingInventory = await StockInventory.create(
        {
          product_id,
          cases_qty,
          bottles_qty,
          total_bottles,
          last_updated: new Date(),
        },
        { transaction }
      );
    }

    await transaction.commit();

    // Return both the current inventory and the transaction
    res.status(200).json({
      currentInventory: existingInventory,
      transaction: inventoryTransaction,
      message: `Stock ${adjustment_type}d successfully`,
    });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({
      error: error.message,
      message: `Failed to ${req.body.adjustment_type} stock inventory`,
    });
  }
};

exports.updateStockInventory = async (req, res) => {
  try {
    const { id } = req.params;
    // Always update the last_updated timestamp
    const dataToUpdate = {
      ...req.body,
      last_updated: new Date(),
    };

    const db = req.db; // Use the database instance from the request
    const StockInventory = db.StockInventory; // Use the StockInventory model from the database instance

    const [updated] = await StockInventory.update(dataToUpdate, {
      where: { inventory_id: id },
    });

    if (updated) {
      const updatedStockInventory = await StockInventory.findOne({
        where: { inventory_id: id },
      });
      return res.status(200).json(updatedStockInventory);
    }
    throw new Error("Stock inventory record not found");
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.deleteStockInventory = async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.db; // Use the database instance from the request
    const StockInventory = db.StockInventory; // Use the StockInventory model from the database instance
    const deleted = await StockInventory.destroy({
      where: { inventory_id: id },
    });
    if (deleted) {
      return res.status(204).send("Stock inventory record deleted");
    }
    throw new Error("Stock inventory record not found");
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.getStockInventoryByProductId = async (req, res) => {
  try {
    const { productId } = req.params;
    const db = req.db; // Use the database instance from the request
    const StockInventory = db.StockInventory; // Use the StockInventory model from the database instance
    const stockInventory = await StockInventory.findOne({
      where: { product_id: productId },
    });

    if (stockInventory) {
      res.status(200).json(stockInventory);
    } else {
      res.status(404).json({
        message: `Stock inventory for product ID ${productId} not found`,
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateStockQuantity = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      cases_qty,
      bottles_qty,
      adjustment_reason,
      adjustment_type,
      reference_number,
    } = req.body;

    const db = req.db; // Use the database instance from the request
    const StockInventory = db.StockInventory; // Use the StockInventory model from the database instance

    // Find the current inventory record
    const stockInventory = await StockInventory.findOne({
      where: { inventory_id: id },
    });

    if (!stockInventory) {
      return res.status(404).json({
        message: `Stock inventory record with id ${id} not found`,
      });
    }

    // Store previous values for transaction record
    const previousCasesQty = stockInventory.cases_qty;
    const previousBottlesQty = stockInventory.bottles_qty;
    const previousTotalBottles = stockInventory.total_bottles;
    const previousTotalValue = stockInventory.total_value;

    const sequelizeInstance = StockInventory.sequelize;
    // Start a transaction
    const t = await sequelizeInstance.transaction();

    try {
      // Calculate new values
      const newCasesQty =
        cases_qty !== undefined ? cases_qty : stockInventory.cases_qty;
      const newBottlesQty =
        bottles_qty !== undefined ? bottles_qty : stockInventory.bottles_qty;

      // Assuming you have a way to calculate bottles per case and value per bottle
      // You might want to fetch this from Products table or pass it in the request
      const bottlesPerCase = stockInventory.bottles_per_case; // Default value if not available
      const valuePerBottle =
        stockInventory.value_per_bottle ||
        stockInventory.total_value / stockInventory.total_bottles;

      const newTotalBottles = newCasesQty * bottlesPerCase + newBottlesQty;
      const newTotalValue = newTotalBottles * valuePerBottle;

      // Update the inventory
      const updatedInventory = await stockInventory.update(
        {
          cases_qty: newCasesQty,
          bottles_qty: newBottlesQty,
          total_bottles: newTotalBottles,
          total_value: newTotalValue,
          last_updated: new Date(),
        },
        { transaction: t }
      );

      // Create a transaction record if InventoryTransaction model exists

      // Commit the transaction
      await t.commit();

      res.status(200).json(updatedInventory);
    } catch (error) {
      // Rollback the transaction in case of error
      await t.rollback();
      throw error;
    }
  } catch (error) {
    res.status(500).json({
      error: error.message,
      message: "Failed to update stock quantity",
    });
  }
};

// Add a new endpoint to get inventory history for a product
exports.getInventoryHistory = async (req, res) => {
  try {
    const { productId } = req.params;
    const db = req.db; // Use the database instance from the request
    const InventoryTransaction = db.InventoryTransaction; // Use the InventoryTransaction model from the database instance

    const transactions = await InventoryTransaction.findAll({
      where: { product_id: productId },
      include: [
        {
          model: db.Product,
          as: "product",
          attributes: ["product_name", "size"],
        },
      ],
      order: [["transaction_date", "DESC"]],
    });

    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({
      error: error.message,
      message: "Failed to retrieve inventory history",
    });
  }
};

// Add this function to fix existing incorrect inventory data
exports.fixExistingInventoryData = async (req, res) => {
  const db = req.db;
  const StockInventory = db.StockInventory;
  const sequelizeInstance = StockInventory.sequelize;
  const dbTransaction = await sequelizeInstance.transaction();

  try {
    // Get all inventory records with their products
    const inventories = await StockInventory.findAll({
      include: [
        {
          model: db.Product,
          as: "product",
        },
      ],
      transaction: dbTransaction,
    });

    const fixedRecords = [];

    for (const inventory of inventories) {
      const product = inventory.product;
      const bottlesPerCase = product.bottles_per_case;

      // Check if bottles_qty exceeds bottles_per_case
      if (inventory.bottles_qty >= bottlesPerCase) {
        // Calculate total bottles
        const totalBottles =
          inventory.cases_qty * bottlesPerCase + inventory.bottles_qty;

        // Convert to proper format
        const newCasesQty = Math.floor(totalBottles / bottlesPerCase);
        const newBottlesQty = totalBottles % bottlesPerCase;

        // Update the record
        await inventory.update(
          {
            cases_qty: newCasesQty,
            bottles_qty: newBottlesQty,
            total_bottles: totalBottles,
            last_updated: new Date(),
          },
          { transaction: dbTransaction }
        );

        fixedRecords.push({
          inventory_id: inventory.inventory_id,
          product_name: product.product_name,
          old_cases: inventory.cases_qty,
          old_bottles: inventory.bottles_qty,
          new_cases: newCasesQty,
          new_bottles: newBottlesQty,
          total_bottles: totalBottles,
        });
      }
    }

    await dbTransaction.commit();

    res.status(200).json({
      message: "Inventory data fixed successfully",
      fixedRecords: fixedRecords,
      totalFixed: fixedRecords.length,
    });
  } catch (error) {
    await dbTransaction.rollback();
    res.status(500).json({
      error: error.message,
      message: "Failed to fix inventory data",
    });
  }
};
