const db = require("../models");

const syncTenantDatabase = async (
  tenantDomain = "test123.zendensolutions.store",
  closeConnection = true
) => {
  console.log(`🚀 Starting database sync for tenant: ${tenantDomain}`);

  let tenantDb;

  try {
    // Get the tenant-specific database connection
    tenantDb = await db.getSequelizeForTenant(tenantDomain);
    console.log(`✅ Connected to tenant database for: ${tenantDomain}`);

    // Get the database configuration for this tenant
    const dbConfig = tenantDb.sequelize.config;
    console.log(
      `📊 Setting up database: ${dbConfig.database} on ${dbConfig.host}:${dbConfig.port}`
    );

    // Use Sequelize sync to create tables (safer than migrations for multi-tenant)
    console.log(`🏗️ Creating database tables...`);
    await tenantDb.sequelize.sync({ force: false, alter: false });
    console.log(
      `✅ Database tables created successfully for tenant: ${tenantDomain}`
    );

    // Close the connection only if requested (when running standalone)
    if (closeConnection) {
      await tenantDb.sequelize.close();
      console.log(`🔌 Database connection closed`);
    }

    return tenantDb;
  } catch (error) {
    console.error(
      `❌ Error syncing database for tenant ${tenantDomain}:`,
      error
    );

    // Make sure to close any open connections only if we opened them
    if (tenantDb && tenantDb.sequelize && closeConnection) {
      try {
        await tenantDb.sequelize.close();
        console.log(`🔌 Database connection closed due to error`);
      } catch (closeError) {
        console.error("Error closing database connection:", closeError);
      }
    }

    throw error;
  }
};

// Allow running with command line argument for tenant
// Usage: node syncDatabase.js [tenant-domain]
// Example: node syncDatabase.js test123.zendensolutions.store
const runSync = async () => {
  const tenantDomain = process.argv[2] || "test123.zendensolutions.store";

  try {
    await syncTenantDatabase(tenantDomain);
    console.log(
      `🎉 Database sync completed successfully for tenant: ${tenantDomain}`
    );
    process.exit(0);
  } catch (error) {
    console.error("💥 Database sync failed:", error.message);
    process.exit(1);
  }
};

// Export for use in other files
module.exports = syncTenantDatabase;

// Run if this file is executed directly
if (require.main === module) {
  runSync();
}
