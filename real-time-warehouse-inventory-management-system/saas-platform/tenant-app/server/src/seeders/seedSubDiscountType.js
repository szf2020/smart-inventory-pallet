const db = require("../models");

const seedSubDiscountTypes = async (
  tenantDomain = "test123.zendensolutions.store"
) => {
  let tenantDb;

  try {
    // Get the tenant-specific database connection
    tenantDb = await db.getSequelizeForTenant(tenantDomain);
    console.log(`Connected to tenant database for: ${tenantDomain}`);

    const subDiscountTypes = [
      { sub_discount_name: "ALL WO MPET", discount_type_id: 1 },
      { sub_discount_name: "ALL MPET", discount_type_id: 1 },
      { sub_discount_name: "MPET (SSG)", discount_type_id: 1 },
      { sub_discount_name: "RGB", discount_type_id: 2 },
      { sub_discount_name: "MPET (SPC)", discount_type_id: 2 },
      { sub_discount_name: "LPET", discount_type_id: 2 },
    ];

    for (const data of subDiscountTypes) {
      const existingEntry = await tenantDb.models.SubDiscountType.findOne({
        where: { sub_discount_name: data.sub_discount_name },
      });

      if (!existingEntry) {
        await tenantDb.models.SubDiscountType.create({
          ...data,
          created_at: new Date(),
          updated_at: new Date(),
        });
        console.log(
          `Sub-discount type '${data.sub_discount_name}' added for tenant: ${tenantDomain}`
        );
      } else {
        console.log(
          `Sub-discount type '${data.sub_discount_name}' already exists for tenant: ${tenantDomain}`
        );
      }
    }
  } catch (error) {
    console.error(
      `Error seeding sub-discount types for tenant ${tenantDomain}:`,
      error
    );
    throw error;
  } finally {
    if (tenantDb && tenantDb.sequelize) {
      await tenantDb.sequelize.close();
      console.log(`Database connection closed for tenant: ${tenantDomain}`);
    }
    console.log(
      `Sub-discount types seeding complete for tenant: ${tenantDomain}`
    );
  }
};

// Allow running with command line argument for tenant
// Usage: node seedSubDiscountType.js [tenant-domain]
// Example: node seedSubDiscountType.js test123.zendensolutions.store
const runSeeder = async () => {
  const tenantDomain = process.argv[2] || "test123.zendensolutions.store";

  console.log(
    `Starting sub-discount types seeding for tenant: ${tenantDomain}`
  );

  try {
    await seedSubDiscountTypes(tenantDomain);
    console.log("✅ Sub-discount types seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Sub-discount types seeding failed:", error);
    process.exit(1);
  }
};

// Export for use in other files
module.exports = seedSubDiscountTypes;

// Run if this file is executed directly
if (require.main === module) {
  runSeeder();
}
