const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const cors = require("cors");
const express = require("express");
const routes = require("./routes");
const adminServiceClient = require("./services/adminServiceClient");
const {
  validateTenant,
  loadTenantEnvironment,
  checkBillingStatus,
} = require("./middleware/tenantMiddleware");

const app = express();
app.use(express.json());

// Import db with our enhanced getSequelizeForTenant function
const db = require("./models");

// Middleware to set tenant for each request and prepare the right database connection
app.use(async (req, res, next) => {
  let tenant;

  try {
    // In development, use a default tenant but still allow hostname override
    if (process.env.NODE_ENV === "development") {
      // For localhost requests, use default tenant
      if (
        req.hostname === "localhost" ||
        req.hostname.includes("localhost") ||
        req.hostname === "127.0.0.1"
      ) {
        console.log("hostname: ", req.hostname);
        tenant =
          process.env.DEV_DEFAULT_TENANT || "test123.zendensolutions.store";
      } else {
        tenant = req.hostname;
      }
      console.log(
        `Development Mode - Using tenant: ${tenant} (hostname: ${req.hostname})`
      );
    } else {
      tenant = req.hostname;
      console.log(`Production Mode - Current Tenant: ${tenant}`);
    }

    // Get the Sequelize instance for this tenant (now async)
    const tenantDb = await db.getSequelizeForTenant(tenant);

    // Attach the tenant-specific models to the request for easy access in routes
    req.db = tenantDb.models;
    req.sequelize = tenantDb.sequelize;
    req.tenant = tenant; // Also attach tenant info

    next();
  } catch (error) {
    console.error(`Error setting up tenant ${tenant}:`, error.message);

    // Try to fall back to a default tenant
    try {
      const defaultTenant =
        process.env.DEV_DEFAULT_TENANT || "demo.zendensolutions.store";
      console.log(`Falling back to default tenant: ${defaultTenant}`);

      const tenantDb = await db.getSequelizeForTenant(defaultTenant);
      req.db = tenantDb.models;
      req.sequelize = tenantDb.sequelize;
      req.tenant = defaultTenant;

      next();
    } catch (fallbackError) {
      console.error("Failed to set up fallback tenant:", fallbackError.message);
      return res.status(500).json({
        error: "Database connection failed",
        message: "Unable to establish database connection for this tenant",
      });
    }
  }
});

// Dynamic CORS Configuration
const getDynamicCorsOptions = () => {
  // Fallback origins for development and emergencies
  const fallbackOrigins = [
    "http://localhost:5173", // Frontend development server
    "http://localhost:5000", // Backend development server
    "http://localhost:3000", // Alternative frontend port
    "https://cnh-distributors-client.onrender.com",
  ];

  return {
    origin: async function (origin, callback) {
      try {
        // Allow requests with no origin (mobile apps, etc.)
        if (!origin) {
          return callback(null, true);
        }

        // Extract domain from origin
        const originUrl = new URL(origin);
        const domain = originUrl.hostname;

        // For localhost, always allow in development
        if (
          process.env.NODE_ENV === "development" &&
          (domain.includes("localhost") || domain.includes("127.0.0.1"))
        ) {
          return callback(null, true);
        }

        // Try to get CORS origins from admin service
        let allowedOrigins = [];

        try {
          // Get the tenant domain from the request hostname
          const tenantDomain = domain;
          allowedOrigins =
            await adminServiceClient.getCorsOriginsForTenant(tenantDomain);
        } catch (error) {
          console.warn(
            "Failed to fetch CORS origins from admin service:",
            error.message
          );
        }

        // Combine with fallback origins
        const allAllowedOrigins = [
          ...new Set([...allowedOrigins, ...fallbackOrigins]),
        ];

        console.log(`CORS check for origin: ${origin}`);
        console.log(`Allowed origins: ${allAllowedOrigins.join(", ")}`);

        if (allAllowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          console.warn(`CORS blocked origin: ${origin}`);
          callback(new Error("Not allowed by CORS"));
        }
      } catch (error) {
        console.error("CORS origin check error:", error);
        // In case of error, allow fallback origins
        if (fallbackOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error("CORS configuration error"));
        }
      }
    },
    credentials: true,
    optionsSuccessStatus: 200,
  };
};

app.use(cors(getDynamicCorsOptions()));

// Tenant validation and environment loading middleware
app.use(validateTenant);
app.use(loadTenantEnvironment);
app.use(checkBillingStatus);

// Routes
app.use("/api", routes);

// Sync databases based on environment
const syncAllDatabases = async () => {
  try {
    if (process.env.NODE_ENV === "development") {
      // In development, only sync the default database using actual tenant domain
      const defaultTenant =
        process.env.DEV_DEFAULT_TENANT || "demo.zendensolutions.store";
      console.log(
        `Development Mode - Syncing single database for tenant: ${defaultTenant}`
      );
      const instance = await db.getSequelizeForTenant(defaultTenant);
      await instance.sequelize.sync();
      console.log(`Development database synced successfully`);
    } else {
      // In production, sync all tenant databases
      const config = require("./config/config.js");

      // Try to get dynamic tenants from admin service
      let tenantsToSync;
      try {
        tenantsToSync = await config.getDynamicTenants();
        console.log("Using dynamic tenants from admin service");
      } catch (error) {
        console.warn(
          "Failed to get dynamic tenants, using fallback:",
          error.message
        );
        tenantsToSync = config.tenants;
      }

      for (const tenant in tenantsToSync) {
        console.log(`Syncing database for tenant: ${tenant}`);
        try {
          const instance = await db.getSequelizeForTenant(tenant);
          await instance.sequelize.sync();
          console.log(`Database synced successfully for tenant: ${tenant}`);
        } catch (error) {
          console.error(
            `Failed to sync database for tenant ${tenant}:`,
            error.message
          );
          // Continue with other tenants even if one fails
        }
      }
    }

    console.log("Database sync completed successfully");
  } catch (error) {
    console.error("Error syncing databases:", error);
    // Don't exit process in production to allow service to continue with fallback
    if (process.env.NODE_ENV === "development") {
      process.exit(1);
    }
  }
};

// Call the sync function
// syncAllDatabases();

// Simple health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    service: "CNH Tenant App",
    timestamp: new Date().toISOString(),
    tenant: req.tenant || "unknown",
  });
});

module.exports = app;
