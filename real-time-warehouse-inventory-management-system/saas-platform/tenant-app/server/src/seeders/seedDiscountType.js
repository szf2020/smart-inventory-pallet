const db = require("../models");

const seedDiscountTypes = async (
  tenantDomain = "test123.zendensolutions.store"
) => {
  let tenantDb;

  try {
    // Get the tenant-specific database connection
    tenantDb = await db.getSequelizeForTenant(tenantDomain);
    console.log(`Connected to tenant database for: ${tenantDomain}`);

    const discountTypes = [{ discount_name: "SSG" }, { discount_name: "SPC" }];

    for (const data of discountTypes) {
      const existingEntry = await tenantDb.models.DiscountType.findOne({
        where: { discount_name: data.discount_name },
      });

      if (!existingEntry) {
        await tenantDb.models.DiscountType.create({
          ...data,
          created_at: new Date(),
          updated_at: new Date(),
        });
        console.log(
          `Discount type '${data.discount_name}' added for tenant: ${tenantDomain}`
        );
      } else {
        console.log(
          `Discount type '${data.discount_name}' already exists for tenant: ${tenantDomain}`
        );
      }
    }
  } catch (error) {
    console.error(
      `Error seeding discount types for tenant ${tenantDomain}:`,
      error
    );
    throw error;
  } finally {
    if (tenantDb && tenantDb.sequelize) {
      await tenantDb.sequelize.close();
      console.log(`Database connection closed for tenant: ${tenantDomain}`);
    }
    console.log(`Discount types seeding complete for tenant: ${tenantDomain}`);
  }
};

// Allow running with command line argument for tenant
// Usage: node seedDiscountType.js [tenant-domain]
// Example: node seedDiscountType.js test123.zendensolutions.store
const runSeeder = async () => {
  const tenantDomain = process.argv[2] || "test123.zendensolutions.store";

  console.log(`Starting discount types seeding for tenant: ${tenantDomain}`);

  try {
    await seedDiscountTypes(tenantDomain);
    console.log("✅ Discount types seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Discount types seeding failed:", error);
    process.exit(1);
  }
};

// Export for use in other files
module.exports = seedDiscountTypes;

// Run if this file is executed directly
if (require.main === module) {
  runSeeder();
}
