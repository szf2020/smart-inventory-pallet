const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

console.log("db host: ", process.env.DB_HOST);

// Simple tenant configuration - just use default postgres for development
const tenants = {
  "test123.zendensolutions.store": "postgres",
  "default.zendensolutions.store": "postgres",
  "cnh.zendensolutions.store": "postgres",
  localhost: "postgres",
  "127.0.0.1": "postgres",
};

const isLocalhost = process.env.DB_HOST === "localhost";

// Default config
const baseConfig = {
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  dialect: "postgres",
  dialectOptions: isLocalhost
    ? {}
    : {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      },
};

// Export the configuration
module.exports = {
  tenants,
  development: {
    ...baseConfig,
    database: "postgres",
  },
  test: {
    ...baseConfig,
    database: "postgres",
  },
  production: {
    ...baseConfig,
    database: process.env.DB_DEFAULT || "postgres",
  },
};
