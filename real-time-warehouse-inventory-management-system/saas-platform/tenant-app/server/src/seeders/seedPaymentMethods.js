const db = require("../models");

const seedPaymentMethods = async (
  tenantDomain = "test123.zendensolutions.store"
) => {
  let tenantDb;

  try {
    // Get the tenant-specific database connection
    tenantDb = await db.getSequelizeForTenant(tenantDomain);
    console.log(`Connected to tenant database for: ${tenantDomain}`);

    const paymentMethods = [
      {
        name: "cash",
        description: "Cash payment",
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        name: "cheque",
        description: "Check payment",
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        name: "bank_transfer",
        description: "Bank transfer or direct deposit",
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        name: "credit",
        description: "Credit card payment",
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    for (const data of paymentMethods) {
      const existingEntry = await tenantDb.models.PaymentMethod.findOne({
        where: { name: data.name },
      });

      if (!existingEntry) {
        await tenantDb.models.PaymentMethod.create(data);
        console.log(
          `Payment method '${data.name}' added for tenant: ${tenantDomain}`
        );
      } else {
        console.log(
          `Payment method '${data.name}' already exists for tenant: ${tenantDomain}`
        );
      }
    }
  } catch (error) {
    console.error(
      `Error seeding payment methods for tenant ${tenantDomain}:`,
      error
    );
    throw error;
  } finally {
    if (tenantDb && tenantDb.sequelize) {
      await tenantDb.sequelize.close();
      console.log(`Database connection closed for tenant: ${tenantDomain}`);
    }
    console.log(`Payment methods seeding complete for tenant: ${tenantDomain}`);
  }
};

// Allow running with command line argument for tenant
// Usage: node seedPaymentMethods.js [tenant-domain]
// Example: node seedPaymentMethods.js test123.zendensolutions.store
const runSeeder = async () => {
  const tenantDomain = process.argv[2] || "test123.zendensolutions.store";

  console.log(`Starting payment methods seeding for tenant: ${tenantDomain}`);

  try {
    await seedPaymentMethods(tenantDomain);
    console.log("✅ Payment methods seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Payment methods seeding failed:", error);
    process.exit(1);
  }
};

// Export for use in other files
module.exports = seedPaymentMethods;

// Run if this file is executed directly
if (require.main === module) {
  runSeeder();
}
