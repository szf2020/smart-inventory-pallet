const { Op } = require("sequelize");
const sequelize = require("../config/config");

// Get all reps with pagination and filtering
const getReps = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      status = "",
      territory = "",
      sortBy = "created_at",
      sortOrder = "DESC",
    } = req.query;

    const db = req.db; // Use the database instance from the request
    const Rep = db.Rep;
    const User = db.User;

    const offset = (page - 1) * limit;
    const whereClause = {};

    // Search filter
    if (search) {
      whereClause[Op.or] = [
        { rep_code: { [Op.iLike]: `%${search}%` } },
        { rep_name: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { territory: { [Op.iLike]: `%${search}%` } },
      ];
    }

    // Status filter
    if (status) {
      whereClause.status = status;
    }

    // Territory filter
    if (territory) {
      whereClause.territory = { [Op.iLike]: `%${territory}%` };
    }

    const { count, rows } = await Rep.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["user_id", "full_name", "username"],
        },
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder.toUpperCase()]],
    });

    res.json({
      success: true,
      data: {
        reps: rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching reps:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch reps",
      error: error.message,
    });
  }
};

// Get rep by ID with performance data
const getRepById = async (req, res) => {
  try {
    const { id } = req.params;
    const db = req.db; // Use the database instance from the request
    const Rep = db.Rep;
    const User = db.User;
    const Customer = db.Customer;
    const SalesInvoice = db.SalesInvoice;
    const LoadingTransaction = db.LoadingTransaction;

    const rep = await Rep.findByPk(id, {
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["user_id", "full_name", "username"],
        },
        {
          model: Customer,
          as: "customers",
          attributes: ["customer_id", "customer_name", "phone"],
        },
      ],
    });

    if (!rep) {
      return res.status(404).json({
        success: false,
        message: "Rep not found",
      });
    }

    // Get performance metrics
    const today = new Date();
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

    const [salesThisMonth, salesLastMonth, totalCustomers, activeLoads] =
      await Promise.all([
        SalesInvoice.sum("total_amount", {
          where: {
            rep_id: id,
            invoice_date: { [Op.gte]: thisMonth },
          },
        }),
        SalesInvoice.sum("total_amount", {
          where: {
            rep_id: id,
            invoice_date: {
              [Op.gte]: lastMonth,
              [Op.lt]: thisMonth,
            },
          },
        }),
        Customer.count({
          where: { rep_id: id },
        }),
        LoadingTransaction.count({
          where: {
            rep_id: id,
            status: "active",
          },
        }),
      ]);

    const performance = {
      salesThisMonth: salesThisMonth || 0,
      salesLastMonth: salesLastMonth || 0,
      totalCustomers,
      activeLoads,
      salesGrowth: salesLastMonth
        ? (((salesThisMonth - salesLastMonth) / salesLastMonth) * 100).toFixed(
            2
          )
        : 0,
    };

    res.json({
      success: true,
      data: {
        ...rep.toJSON(),
        performance,
      },
    });
  } catch (error) {
    console.error("Error fetching rep:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch rep",
      error: error.message,
    });
  }
};

// Create new rep
const createRep = async (req, res) => {
  try {
    const {
      rep_code,
      rep_name,
      phone,
      email,
      address,
      hire_date,
      salary,
      commission_rate,
      territory,
      notes,
    } = req.body;

    const db = req.db; // Use the database instance from the request
    const Rep = db.Rep;
    const User = db.User;

    // Check if rep_code already exists
    const existingRep = await Rep.findOne({ where: { rep_code } });
    if (existingRep) {
      return res.status(400).json({
        success: false,
        message: "Rep code already exists",
      });
    }

    // Check if email already exists
    if (email) {
      const existingEmail = await Rep.findOne({ where: { email } });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: "Email already exists",
        });
      }
    }

    const rep = await Rep.create({
      rep_code,
      rep_name,
      phone,
      email,
      address,
      hire_date,
      salary,
      commission_rate,
      territory,
      notes,
      created_by: req.user.id,
    });

    const newRep = await Rep.findByPk(rep.rep_id, {
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["user_id", "full_name", "username"],
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: "Rep created successfully",
      data: newRep,
    });
  } catch (error) {
    console.error("Error creating rep:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create rep",
      error: error.message,
    });
  }
};

// Update rep
const updateRep = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      rep_code,
      rep_name,
      phone,
      email,
      address,
      hire_date,
      salary,
      commission_rate,
      territory,
      status,
      notes,
    } = req.body;

    const db = req.db; // Use the database instance from the request
    const Rep = db.Rep;
    const User = db.User;

    const rep = await Rep.findByPk(id);
    if (!rep) {
      return res.status(404).json({
        success: false,
        message: "Rep not found",
      });
    }

    // Check if rep_code already exists (excluding current rep)
    if (rep_code && rep_code !== rep.rep_code) {
      const existingRep = await Rep.findOne({
        where: {
          rep_code,
          rep_id: { [Op.ne]: id },
        },
      });
      if (existingRep) {
        return res.status(400).json({
          success: false,
          message: "Rep code already exists",
        });
      }
    }

    // Check if email already exists (excluding current rep)
    if (email && email !== rep.email) {
      const existingEmail = await Rep.findOne({
        where: {
          email,
          rep_id: { [Op.ne]: id },
        },
      });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: "Email already exists",
        });
      }
    }

    await rep.update({
      rep_code,
      rep_name,
      phone,
      email,
      address,
      hire_date,
      salary,
      commission_rate,
      territory,
      status,
      notes,
    });

    const updatedRep = await Rep.findByPk(id, {
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["user_id", "full_name", "username"],
        },
      ],
    });

    res.json({
      success: true,
      message: "Rep updated successfully",
      data: updatedRep,
    });
  } catch (error) {
    console.error("Error updating rep:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update rep",
      error: error.message,
    });
  }
};

// Delete rep
const deleteRep = async (req, res) => {
  try {
    const { id } = req.params;

    const db = req.db; // Use the database instance from the request
    const Rep = db.Rep;
    const SalesInvoice = db.SalesInvoice;
    const LoadingTransaction = db.LoadingTransaction;
    const Customer = db.Customer;

    const rep = await Rep.findByPk(id);
    if (!rep) {
      return res.status(404).json({
        success: false,
        message: "Rep not found",
      });
    }

    // Check if rep has associated records
    const [salesCount, loadingCount, customerCount] = await Promise.all([
      SalesInvoice.count({ where: { rep_id: id } }),
      LoadingTransaction.count({ where: { rep_id: id } }),
      Customer.count({ where: { rep_id: id } }),
    ]);

    if (salesCount > 0 || loadingCount > 0 || customerCount > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete rep with associated sales, loading, or customer records",
        details: {
          salesCount,
          loadingCount,
          customerCount,
        },
      });
    }

    await rep.destroy();

    res.json({
      success: true,
      message: "Rep deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting rep:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete rep",
      error: error.message,
    });
  }
};

// Get rep performance dashboard
const getRepPerformance = async (req, res) => {
  try {
    const { id } = req.params;
    const { period = "30" } = req.query; // days

    const db = req.db; // Use the database instance from the request
    const Rep = db.Rep;
    const SalesInvoice = db.SalesInvoice;
    const LoadingTransaction = db.LoadingTransaction;
    const Customer = db.Customer;

    const rep = await Rep.findByPk(id);
    if (!rep) {
      return res.status(404).json({
        success: false,
        message: "Rep not found",
      });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // Sales performance
    const salesData = await SalesInvoice.findAll({
      where: {
        rep_id: id,
        invoice_date: { [Op.gte]: startDate },
      },
      attributes: [
        [sequelize.fn("DATE", sequelize.col("invoice_date")), "date"],
        [sequelize.fn("SUM", sequelize.col("total_amount")), "total_sales"],
        [sequelize.fn("COUNT", sequelize.col("invoice_id")), "invoice_count"],
      ],
      group: [sequelize.fn("DATE", sequelize.col("invoice_date"))],
      order: [[sequelize.fn("DATE", sequelize.col("invoice_date")), "ASC"]],
    });

    // Loading performance
    const loadingData = await LoadingTransaction.findAll({
      where: {
        rep_id: id,
        loading_date: { [Op.gte]: startDate },
      },
      attributes: [
        [sequelize.fn("DATE", sequelize.col("loading_date")), "date"],
        [sequelize.fn("COUNT", sequelize.col("loading_id")), "load_count"],
      ],
      group: [sequelize.fn("DATE", sequelize.col("loading_date"))],
      order: [[sequelize.fn("DATE", sequelize.col("loading_date")), "ASC"]],
    });

    // Top customers
    const topCustomers = await SalesInvoice.findAll({
      where: {
        rep_id: id,
        invoice_date: { [Op.gte]: startDate },
      },
      include: [
        {
          model: Customer,
          as: "customer",
          attributes: ["customer_id", "customer_name"],
        },
      ],
      attributes: [
        [sequelize.fn("SUM", sequelize.col("total_amount")), "total_sales"],
        [sequelize.fn("COUNT", sequelize.col("invoice_id")), "invoice_count"],
      ],
      group: ["customer.customer_id", "customer.customer_name"],
      order: [[sequelize.fn("SUM", sequelize.col("total_amount")), "DESC"]],
      limit: 10,
    });

    res.json({
      success: true,
      data: {
        rep,
        salesData,
        loadingData,
        topCustomers,
        period: parseInt(period),
      },
    });
  } catch (error) {
    console.error("Error fetching rep performance:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch rep performance",
      error: error.message,
    });
  }
};

// Get all active reps for dropdown
const getActiveReps = async (req, res) => {
  try {
    const db = req.db; // Use the database instance from the request
    const Rep = db.Rep;

    const reps = await Rep.findAll({
      where: { status: "active" },
      attributes: ["rep_id", "rep_code", "rep_name", "territory"],
      order: [["rep_name", "ASC"]],
    });

    res.json({
      success: true,
      data: reps,
    });
  } catch (error) {
    console.error("Error fetching active reps:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch active reps",
      error: error.message,
    });
  }
};

module.exports = {
  getReps,
  getRepById,
  createRep,
  updateRep,
  deleteRep,
  getRepPerformance,
  getActiveReps,
};
