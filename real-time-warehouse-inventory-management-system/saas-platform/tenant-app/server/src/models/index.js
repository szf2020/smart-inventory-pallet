"use strict";

const fs = require("fs");
const path = require("path");
const Sequelize = require("sequelize");
const process = require("process");
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || "development";
const config = require(__dirname + "/../config/config.js")[env];
const { tenants } = require(__dirname + "/../config/config.js");
const adminServiceClient = require("../services/adminServiceClient");
const db = {};

// Store Sequelize instances for each tenant
const sequelizeInstances = {};

// Get or create Sequelize instance for a tenant
const getSequelizeForTenant = async (tenant) => {
  // If we already have an instance for this tenant, return it
  if (sequelizeInstances[tenant]) {
    return sequelizeInstances[tenant];
  }

  console.log(`Creating connection for tenant: ${tenant}`);

  try {
    let finalConfig = config;
    let dbName = config.database;

    // For real domain tenants, try to get database config from admin service
    if (tenant.includes(".") && !tenant.includes("localhost")) {
      try {
        const tenantDbConfig =
          await adminServiceClient.getTenantDatabaseConfig(tenant);
        if (tenantDbConfig) {
          finalConfig = {
            ...config,
            ...tenantDbConfig,
          };
          dbName = tenantDbConfig.database;
          console.log(`Using admin service database config for ${tenant}`);
        }
      } catch (error) {
        console.warn(
          `Failed to get admin service config for ${tenant}, using default:`,
          error.message
        );
      }
    }

    // For localhost or if admin service failed, use tenant mapping
    if (dbName === config.database) {
      dbName = tenants[tenant] || config.database;
    }

    console.log(`Using database: ${dbName} for tenant: ${tenant}`);
    console.log(`Database host: ${finalConfig.host}:${finalConfig.port}`);
    console.log(`Database user: ${finalConfig.username}`);

    // Create a new Sequelize instance with tenant-specific config
    const sequelize = new Sequelize(
      dbName,
      finalConfig.username,
      finalConfig.password,
      {
        host: finalConfig.host,
        port: finalConfig.port,
        dialect: finalConfig.dialect,
        dialectOptions: finalConfig.dialectOptions,
        logging: process.env.NODE_ENV === "development" ? console.log : false,
        pool: {
          max: 5,
          min: 0,
          acquire: 30000,
          idle: 10000,
        },
      }
    );

    // Test the connection
    await sequelize.authenticate();
    console.log(`Database connection established for tenant: ${tenant}`);

    // Store the instance
    sequelizeInstances[tenant] = { sequelize, models: {} };

    // Load models for this instance
    fs.readdirSync(__dirname)
      .filter((file) => {
        return (
          file.indexOf(".") !== 0 &&
          file !== basename &&
          file.slice(-3) === ".js" &&
          file.indexOf(".test.js") === -1
        );
      })
      .forEach((file) => {
        const model = require(path.join(__dirname, file))(
          sequelize,
          Sequelize.DataTypes
        );
        sequelizeInstances[tenant].models[model.name] = model;
      });

    // Set up associations
    Object.keys(sequelizeInstances[tenant].models).forEach((modelName) => {
      if (sequelizeInstances[tenant].models[modelName].associate) {
        sequelizeInstances[tenant].models[modelName].associate(
          sequelizeInstances[tenant].models
        );
      }
    });

    return sequelizeInstances[tenant];
  } catch (error) {
    console.error(
      `Error creating database connection for tenant ${tenant}:`,
      error.message
    );

    // Fallback to default configuration
    const dbName = tenants[tenant] || config.database;
    console.log(
      `Falling back to default config for tenant: ${tenant}, database: ${dbName}`
    );

    const sequelize = new Sequelize(dbName, config.username, config.password, {
      host: config.host,
      port: config.port,
      dialect: config.dialect,
      dialectOptions: config.dialectOptions,
      logging: process.env.NODE_ENV === "development" ? console.log : false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    });

    // Store the instance
    sequelizeInstances[tenant] = { sequelize, models: {} };

    // Load models for this instance
    fs.readdirSync(__dirname)
      .filter((file) => {
        return (
          file.indexOf(".") !== 0 &&
          file !== basename &&
          file.slice(-3) === ".js" &&
          file.indexOf(".test.js") === -1
        );
      })
      .forEach((file) => {
        const model = require(path.join(__dirname, file))(
          sequelize,
          Sequelize.DataTypes
        );
        sequelizeInstances[tenant].models[model.name] = model;
      });

    // Set up associations
    Object.keys(sequelizeInstances[tenant].models).forEach((modelName) => {
      if (sequelizeInstances[tenant].models[modelName].associate) {
        sequelizeInstances[tenant].models[modelName].associate(
          sequelizeInstances[tenant].models
        );
      }
    });

    return sequelizeInstances[tenant];
  }
};

// Initialize without any default connection - pure lazy initialization
db.sequelize = null; // Will be set when first tenant is accessed
db.Sequelize = Sequelize;
db.getSequelizeForTenant = getSequelizeForTenant;

module.exports = db;
