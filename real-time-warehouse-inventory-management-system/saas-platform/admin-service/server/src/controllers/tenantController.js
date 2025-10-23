const { Client } = require("pg");
const axios = require("axios");

// Database service for tenant database operations
class TenantDatabaseService {
  constructor() {
    this.adminConfig = {
      user: process.env.ADMIN_DATABASE_USER || "postgres",
      password: process.env.ADMIN_DATABASE_PASSWORD || "Mt202161534#",
      host: process.env.ADMIN_DATABASE_HOST || "localhost",
      port: process.env.ADMIN_DATABASE_PORT || 5432,
      database: process.env.ADMIN_DATABASE_NAME || "cnh_admin_dev",
    };
  }

  async createTenantDatabase(databaseName, dbUser, dbPassword) {
    const adminClient = new Client(this.adminConfig);

    try {
      await adminClient.connect();
      console.log(`🔌 Connected to PostgreSQL as admin user`);

      // Validate input to prevent SQL injection
      if (
        !/^[a-zA-Z0-9_]+$/.test(databaseName) ||
        !/^[a-zA-Z0-9_]+$/.test(dbUser)
      ) {
        throw new Error(
          "Database name and username must contain only alphanumeric characters and underscores"
        );
      }

      // Check if database already exists
      const dbExistsQuery = `
        SELECT 1 FROM pg_database WHERE datname = $1;
      `;
      const dbExistsResult = await adminClient.query(dbExistsQuery, [
        databaseName,
      ]);

      if (dbExistsResult.rows.length > 0) {
        throw new Error(`Database '${databaseName}' already exists`);
      }

      // Check if user already exists
      const userExistsQuery = `
        SELECT 1 FROM pg_roles WHERE rolname = $1;
      `;
      const userExistsResult = await adminClient.query(userExistsQuery, [
        dbUser,
      ]);

      // Create user if it doesn't exist
      if (userExistsResult.rows.length === 0) {
        console.log(`👤 Creating database user: ${dbUser}`);
        // Interpolate password safely (Postgres does not allow parameterized DDL)
        const createUserQuery = `CREATE USER "${dbUser}" WITH PASSWORD '${dbPassword.replace(
          /'/g,
          "''"
        )}';`;
        await adminClient.query(createUserQuery);
        console.log(`✅ User '${dbUser}' created successfully`);
      } else {
        console.log(`👤 User '${dbUser}' already exists, updating password`);
        // Interpolate password safely
        const updatePasswordQuery = `ALTER USER "${dbUser}" WITH PASSWORD '${dbPassword.replace(
          /'/g,
          "''"
        )}';`;
        await adminClient.query(updatePasswordQuery);
        console.log(`✅ Password updated for user '${dbUser}'`);
      }

      // Create database - identifiers cannot be parameterized
      console.log(`🗄️ Creating database: ${databaseName}`);
      const createDbQuery = `CREATE DATABASE "${databaseName}" OWNER "${dbUser}";`;
      await adminClient.query(createDbQuery);
      console.log(`✅ Database '${databaseName}' created successfully`);

      // Grant necessary privileges - identifiers cannot be parameterized
      console.log(`🔑 Granting privileges to user: ${dbUser}`);
      const grantPrivilegesQuery = `GRANT ALL PRIVILEGES ON DATABASE "${databaseName}" TO "${dbUser}";`;
      await adminClient.query(grantPrivilegesQuery);
      console.log(`✅ Privileges granted to user '${dbUser}'`);

      await adminClient.end();

      return {
        success: true,
        database: databaseName,
        user: dbUser,
        message: "Database and user created successfully",
      };
    } catch (error) {
      console.error("Database creation error:", error);
      await adminClient.end();
      throw error;
    }
  }

  async deleteTenantDatabase(databaseName, dbUser) {
    const adminClient = new Client(this.adminConfig);

    try {
      await adminClient.connect();
      console.log(`🔌 Connected to PostgreSQL as admin user for deletion`);

      // Validate input to prevent SQL injection
      if (
        !/^[a-zA-Z0-9_]+$/.test(databaseName) ||
        !/^[a-zA-Z0-9_]+$/.test(dbUser)
      ) {
        throw new Error(
          "Database name and username must contain only alphanumeric characters and underscores"
        );
      }

      // Terminate existing connections to the database
      const terminateConnectionsQuery = `
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = $1 AND pid <> pg_backend_pid();
      `;
      await adminClient.query(terminateConnectionsQuery, [databaseName]);
      console.log(
        `🔌 Terminated existing connections to database: ${databaseName}`
      );

      // Drop database - identifiers cannot be parameterized
      const dropDbQuery = `DROP DATABASE IF EXISTS "${databaseName}";`;
      await adminClient.query(dropDbQuery);
      console.log(`🗑️ Database '${databaseName}' deleted successfully`);

      // Drop user - identifiers cannot be parameterized
      const dropUserQuery = `DROP USER IF EXISTS "${dbUser}";`;
      await adminClient.query(dropUserQuery);
      console.log(`🗑️ User '${dbUser}' deleted successfully`);

      await adminClient.end();

      return {
        success: true,
        message: "Database and user deleted successfully",
      };
    } catch (error) {
      console.error("Database deletion error:", error);
      await adminClient.end();
      throw error;
    }
  }

  async testTenantConnection(
    databaseName,
    dbUser,
    dbPassword,
    dbHost = "localhost",
    dbPort = 5432
  ) {
    const tenantClient = new Client({
      user: dbUser,
      password: dbPassword,
      host: dbHost,
      port: dbPort,
      database: databaseName,
    });

    try {
      await tenantClient.connect();
      const result = await tenantClient.query("SELECT NOW() as current_time;");
      await tenantClient.end();

      return {
        success: true,
        currentTime: result.rows[0].current_time,
        message: "Database connection test successful",
      };
    } catch (error) {
      console.error("Database connection test failed:", error);
      await tenantClient.end();
      throw error;
    }
  }
}

// Get all tenants
exports.getAllTenants = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (status) whereClause.status = status;
    if (search) {
      whereClause[req.db.Sequelize.Op.or] = [
        { subdomain: { [req.db.Sequelize.Op.iLike]: `%${search}%` } },
        { company_name: { [req.db.Sequelize.Op.iLike]: `%${search}%` } },
      ];
    }

    const { rows: tenants, count } = await req.db.Tenant.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: req.db.TenantBilling,
          as: "billing",
          attributes: [
            "plan",
            "status",
            "monthly_rate",
            "billing_cycle",
            "trial_ends_at",
          ],
        },
        {
          model: req.db.TenantSSLCertificate,
          as: "sslCertificates",
          attributes: ["domain", "expires_at", "status"],
          required: false,
        },
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["created_at", "DESC"]],
    });

    res.json({
      success: true,
      tenants,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error("Get tenants error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get single tenant
exports.getTenant = async (req, res) => {
  try {
    const { id } = req.params;

    const tenant = await req.db.Tenant.findByPk(id, {
      include: [
        {
          model: req.db.TenantBilling,
          as: "billing",
          attributes: { exclude: ["tenant_id"] },
        },
        {
          model: req.db.CorsOrigin,
          as: "corsOrigins",
          attributes: { exclude: ["tenant_id"] },
        },
        {
          model: req.db.TenantSSLCertificate,
          as: "sslCertificates",
          attributes: { exclude: ["tenant_id"] },
        },
        {
          model: req.db.EnvironmentVariable,
          as: "environmentVariables",
          attributes: { exclude: ["tenant_id"] },
        },
      ],
    });

    if (!tenant) {
      return res.status(404).json({ message: "Tenant not found" });
    }

    res.json({ success: true, tenant });
  } catch (error) {
    console.error("Get tenant error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const callTenantSeeder = async (tenantDomain, tenantId) => {
  try {
    const tenantAppUrl = process.env.TENANT_APP_URL || "http://localhost:5005";
    const response = await axios.post(
      `${tenantAppUrl}/api/admin/seed-tenant`,
      {
        tenantDomain,
        tenantId,
      },
      {
        timeout: 60000, // 60 seconds timeout for seeding
        headers: {
          "Content-Type": "application/json",
          // Add any authentication headers if needed
          // 'Authorization': `Bearer ${process.env.INTERNAL_API_KEY}`
        },
      }
    );

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error(`❌ Failed to call tenant seeder:`, error.message);
    return {
      success: false,
      error: error.message,
      message:
        "Tenant created but seeding failed. Please run seeding manually.",
    };
  }
};

// Create new tenant
exports.createTenant = async (req, res) => {
  const transaction = await req.db.sequelize.transaction();

  try {
    const NginxService = require("../services/nginxService");
    const nginxService = new NginxService();
    const dbService = new TenantDatabaseService();

    const {
      // Tenant Basic Info
      subdomain,
      database_name,
      status = "pending",
      company_name,
      contact_email,
      contact_phone,

      // Database Configuration
      database_user = "postgres",
      database_password,
      database_host = "localhost",
      database_port = 5432,
      auto_create_database = true, // New flag to control database creation

      // Billing Information
      billing_status = "trial",
      plan = "free",
      monthly_rate = 0.0,
      billing_cycle = "monthly",
      trial_ends_at,

      // SSL Certificate (Optional)
      ssl_domain,
      certificate_path,
      private_key_path,
      ssl_expires_at,

      // Nginx Automation (Optional)
      auto_setup_domain = true,
      generate_ssl = true,
    } = req.body;

    // Validation
    if (!subdomain || !company_name) {
      await transaction.rollback();
      return res
        .status(400)
        .json({ message: "Subdomain and company name are required" });
    }

    // Validate database password is provided when auto-creating database
    if (auto_create_database && !database_password) {
      await transaction.rollback();
      return res.status(400).json({
        message:
          "Database password is required when auto_create_database is enabled",
      });
    }

    // Generate database name if not provided
    const finalDatabaseName =
      database_name || `cnh_${subdomain}_${Date.now().toString().slice(-6)}`;

    // Generate database user if not provided and different from default
    const finalDatabaseUser =
      database_user === "postgres"
        ? `user_${subdomain}_${Date.now().toString().slice(-6)}`
        : database_user;

    // Set default database password if not provided
    const finalDatabasePassword =
      database_password || `pwd_${subdomain}_${Date.now()}`;

    // Set default trial end date if billing status is trial and no date provided
    let trialEndDate = trial_ends_at;
    if (billing_status === "trial" && !trialEndDate) {
      trialEndDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days from now
    }

    // Auto-create database if requested
    let databaseCreationResult = null;
    if (auto_create_database) {
      try {
        console.log(`🗄️ Auto-creating database for tenant: ${subdomain}`);
        databaseCreationResult = await dbService.createTenantDatabase(
          finalDatabaseName,
          finalDatabaseUser,
          finalDatabasePassword
        );
        console.log(`✅ Database created: ${finalDatabaseName}`);

        // Test the database connection
        const connectionTest = await dbService.testTenantConnection(
          finalDatabaseName,
          finalDatabaseUser,
          finalDatabasePassword,
          database_host,
          parseInt(database_port)
        );
        console.log(`✅ Database connection test passed`);
      } catch (dbError) {
        console.error(
          `❌ Database creation failed for ${subdomain}:`,
          dbError.message
        );
        await transaction.rollback();
        return res.status(500).json({
          success: false,
          message: "Failed to create tenant database",
          error: dbError.message,
        });
      }
    }

    // Create the main tenant record
    const tenant = await req.db.Tenant.create(
      {
        subdomain,
        database_name: finalDatabaseName,
        database_user: finalDatabaseUser,
        database_password: finalDatabasePassword,
        database_host,
        database_port: parseInt(database_port),
        company_name,
        contact_email,
        contact_phone,
        status,
      },
      { transaction }
    );

    // Create billing record
    const billingData = {
      tenant_id: tenant.id,
      plan,
      status: billing_status,
      monthly_rate: parseFloat(monthly_rate) || 0.0,
      billing_cycle,
      trial_ends_at: trialEndDate,
    };

    const tenantBilling = await req.db.TenantBilling.create(billingData, {
      transaction,
    });

    // Create SSL Certificate record if SSL data is provided
    let tenantSSL = null;
    if (ssl_domain && certificate_path) {
      const sslData = {
        tenant_id: tenant.id,
        domain: ssl_domain,
        certificate_path,
        private_key_path,
        expires_at: ssl_expires_at
          ? new Date(ssl_expires_at)
          : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year default
        status: "active",
        auto_renew: false,
      };

      tenantSSL = await req.db.TenantSSLCertificate.create(sslData, {
        transaction,
      });
    }

    // Automatically create CORS origins for this tenant
    const tenantDomain = `${subdomain}.zendensolutions.store`;
    const corsOrigins = [
      {
        tenant_id: tenant.id,
        origin_url: `https://${tenantDomain}`,
        active: true,
        description: "Production HTTPS domain",
      },
      {
        tenant_id: tenant.id,
        origin_url: `http://${tenantDomain}`,
        active: true,
        description: "Production HTTP domain",
      },
    ];

    for (const corsData of corsOrigins) {
      await req.db.CorsOrigin.create(corsData, { transaction });
    }

    // Commit the transaction
    await transaction.commit();

    // Fetch the complete tenant data with all associations for the response
    const completeTenant = await req.db.Tenant.findByPk(tenant.id, {
      include: [
        {
          model: req.db.TenantBilling,
          as: "billing",
          attributes: { exclude: ["created_at", "updated_at"] },
        },
        {
          model: req.db.TenantSSLCertificate,
          as: "sslCertificates",
          attributes: { exclude: ["created_at", "updated_at"] },
        },
        {
          model: req.db.CorsOrigin,
          as: "corsOrigins",
          attributes: { exclude: ["created_at", "updated_at"] },
        },
      ],
    });

    console.log(`✅ Created comprehensive tenant: ${subdomain}`);
    console.log(`   - Database: ${finalDatabaseName}`);
    console.log(`   - DB User: ${finalDatabaseUser}`);
    console.log(`   - Plan: ${plan} (${billing_status})`);
    if (tenantSSL) {
      console.log(`   - SSL: ${ssl_domain} (expires: ${ssl_expires_at})`);
    }
    console.log(`   - CORS origins: ${corsOrigins.length} domains`);

    // Auto-setup domain if requested
    let domainSetupResult = null;
    if (auto_setup_domain && process.env.NODE_ENV === "production") {
      try {
        console.log(
          `🚀 Setting up domain for: ${subdomain}.zendensolutions.store`
        );
        domainSetupResult = await nginxService.setupTenantDomain(
          subdomain,
          generate_ssl,
          contact_email
        );
        console.log(`✅ Domain setup completed: ${domainSetupResult.domain}`);
      } catch (domainError) {
        console.error(
          `⚠️ Domain setup failed for ${subdomain}:`,
          domainError.message
        );
        // Don't fail tenant creation if domain setup fails
        domainSetupResult = {
          success: false,
          error: domainError.message,
          message:
            "Tenant created but domain setup failed. Please setup manually.",
        };
      }
    } else if (auto_setup_domain) {
      console.log(`ℹ️ Domain setup skipped (not in production environment)`);
      domainSetupResult = {
        success: false,
        message: "Domain setup skipped (development environment)",
      };
    }

    let seedingResult = null;

    try {
      console.log(`🌱 Starting database seeding for: ${tenantDomain}`);
      seedingResult = await callTenantSeeder(tenantDomain, tenant.id);

      if (seedingResult.success) {
        console.log(`✅ Database seeding completed for: ${tenantDomain}`);
      } else {
        console.error(`⚠️ Database seeding failed for: ${tenantDomain}`);
      }
    } catch (seedingError) {
      console.error(
        `❌ Database seeding error for ${tenantDomain}:`,
        seedingError.message
      );
      seedingResult = {
        success: false,
        error: seedingError.message,
        message:
          "Tenant created but database seeding failed. Please run seeding manually.",
      };
    }

    res.status(201).json({
      success: true,
      tenant: completeTenant,
      databaseCreation: databaseCreationResult,
      domainSetup: domainSetupResult,
      message: databaseCreationResult?.success
        ? "Tenant created successfully with database and domain setup"
        : "Tenant created successfully",
    });
  } catch (error) {
    // Rollback transaction on error
    await transaction.rollback();

    console.error("Create tenant error:", error);

    if (error.name === "SequelizeUniqueConstraintError") {
      const field = error.errors[0]?.path || "field";
      const value = error.errors[0]?.value || "value";
      return res.status(409).json({
        message: `${field} '${value}' already exists. Please choose a different ${field}.`,
      });
    }

    if (error.name === "SequelizeValidationError") {
      const validationErrors = error.errors.map((err) => ({
        field: err.path,
        message: err.message,
        value: err.value,
      }));
      return res.status(400).json({
        message: "Validation failed",
        errors: validationErrors,
      });
    }

    res.status(500).json({
      message: "Internal server error while creating tenant",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Update tenant
exports.updateTenant = async (req, res) => {
  try {
    const { id } = req.params;
    const { company_name, contact_email, contact_phone, status } = req.body;

    const tenant = await req.db.Tenant.findByPk(id);
    if (!tenant) {
      return res.status(404).json({ message: "Tenant not found" });
    }

    await tenant.update({
      company_name: company_name || tenant.company_name,
      contact_email: contact_email || tenant.contact_email,
      contact_phone: contact_phone || tenant.contact_phone,
      status: status || tenant.status,
    });

    res.json({ success: true, tenant });
  } catch (error) {
    console.error("Update tenant error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Delete tenant (including database cleanup)
exports.deleteTenant = async (req, res) => {
  const transaction = await req.db.sequelize.transaction();

  try {
    const { id } = req.params;
    const { cleanup_database = true } = req.body;

    const dbService = new TenantDatabaseService();

    // Find the tenant
    const tenant = await req.db.Tenant.findByPk(id);
    if (!tenant) {
      await transaction.rollback();
      return res.status(404).json({ message: "Tenant not found" });
    }

    let databaseCleanupResult = null;

    // Clean up database if requested
    if (cleanup_database) {
      try {
        console.log(`🗑️ Cleaning up database for tenant: ${tenant.subdomain}`);
        databaseCleanupResult = await dbService.deleteTenantDatabase(
          tenant.database_name,
          tenant.database_user
        );
        console.log(`✅ Database cleanup completed`);
      } catch (dbError) {
        console.error(`⚠️ Database cleanup failed:`, dbError.message);
        // Don't fail tenant deletion if database cleanup fails
        databaseCleanupResult = {
          success: false,
          error: dbError.message,
          message: "Tenant deleted but database cleanup failed",
        };
      }
    }

    // Delete tenant record (cascading deletes will handle related records)
    await tenant.destroy({ transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: "Tenant deleted successfully",
      databaseCleanup: databaseCleanupResult,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Delete tenant error:", error);

    res.status(500).json({
      message: "Internal server error while deleting tenant",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Get tenant CORS origins (for tenant-app to call)
exports.getCorsOrigins = async (req, res) => {
  try {
    const { subdomain } = req.params;

    const tenant = await req.db.Tenant.findOne({
      where: { subdomain },
      include: [
        {
          model: req.db.CorsOrigin,
          as: "corsOrigins",
          where: { active: true },
          required: false,
        },
      ],
    });

    if (!tenant) {
      return res.status(404).json({ message: "Tenant not found" });
    }

    const origins = tenant.corsOrigins
      ? tenant.corsOrigins.map((cors) => cors.origin_url)
      : [];

    res.json({ success: true, origins });
  } catch (error) {
    console.error("Get CORS origins error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Service method: Get tenant by domain (for tenant-app server)
exports.getTenantByDomain = async (req, res) => {
  try {
    const { domain } = req.params;

    // Extract subdomain from domain
    let subdomain = domain;
    if (domain.includes(".zendensolutions.store")) {
      subdomain = domain.replace(".zendensolutions.store", "");
    }

    const tenant = await req.db.Tenant.findOne({
      where: { subdomain },
      attributes: [
        "id",
        "subdomain",
        "database_name",
        "database_user",
        "database_password",
        "database_host",
        "database_port",
        "status",
        "company_name",
        "contact_email",
      ],
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: "Tenant not found for domain",
        domain,
      });
    }

    if (tenant.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Tenant is not active",
        status: tenant.status,
      });
    }

    res.json({
      success: true,
      tenant: {
        id: tenant.id,
        subdomain: tenant.subdomain,
        database_name: tenant.database_name,
        database_user: tenant.database_user,
        database_password: tenant.database_password,
        database_host: tenant.database_host,
        database_port: tenant.database_port,
        company_name: tenant.company_name,
        contact_email: tenant.contact_email,
      },
    });
  } catch (error) {
    console.error("Get tenant by domain error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Service method: Get database configuration for tenant
exports.getDatabaseConfig = async (req, res) => {
  try {
    const { domain } = req.params;

    // Extract subdomain from domain
    let subdomain = domain;
    if (domain.includes(".zendensolutions.store")) {
      subdomain = domain.replace(".zendensolutions.store", "");
    }

    const tenant = await req.db.Tenant.findOne({
      where: { subdomain },
      attributes: [
        "database_name",
        "database_user",
        "database_password",
        "database_host",
        "database_port",
        "status",
      ],
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: "Tenant not found for domain",
        domain,
      });
    }

    if (tenant.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Tenant is not active",
        status: tenant.status,
      });
    }

    res.json({
      success: true,
      databaseConfig: {
        database: tenant.database_name,
        username: tenant.database_user,
        password: tenant.database_password,
        host: tenant.database_host || "localhost",
        port: tenant.database_port || 5432,
        dialect: "postgres",
      },
    });
  } catch (error) {
    console.error("Get database config error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
