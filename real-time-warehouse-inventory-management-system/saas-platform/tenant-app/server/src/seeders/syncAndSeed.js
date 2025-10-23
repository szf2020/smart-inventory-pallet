const db = require("../models");

const syncAndSeedTenant = async (
  tenantDomain = "test123.zendensolutions.store",
  closeConnection = false
) => {
  console.log(
    `🚀 Starting database setup and seeding for tenant: ${tenantDomain}`
  );

  let tenantDb;
  let transaction;

  try {
    // Ensure tenantDomain is a string
    const domain =
      typeof tenantDomain === "object"
        ? JSON.stringify(tenantDomain)
        : String(tenantDomain);

    console.log(`📋 Processing tenant domain: ${domain}`);

    // Step 1: Get database connection
    tenantDb = await db.getSequelizeForTenant(domain);
    console.log(`✅ Connected to tenant database for: ${domain}`);

    // Step 2: Sync database (create tables)
    console.log(`🏗️ Syncing database tables...`);
    await tenantDb.sequelize.sync({ force: false, alter: false });
    console.log(`✅ Database tables created successfully`);

    // Step 3: Start transaction for all seeding operations
    console.log(`🔄 Starting database transaction...`);
    transaction = await tenantDb.sequelize.transaction();

    // Step 4: Seed roles first
    console.log(`🔐 Seeding roles...`);
    await seedRoles(tenantDb, transaction, domain);

    // Step 5: Seed users (depends on roles)
    console.log(`👥 Seeding users...`);
    await seedUsers(tenantDb, transaction, domain);

    // Step 6: Seed discount types
    console.log(`🏷️ Seeding discount types...`);
    await seedDiscountTypes(tenantDb, transaction, domain);

    // Step 7: Seed sub-discount types (depends on discount types)
    console.log(`🏷️ Seeding sub-discount types...`);
    await seedSubDiscountTypes(tenantDb, transaction, domain);

    // Step 8: Seed payment methods
    console.log(`💳 Seeding payment methods...`);
    await seedPaymentMethods(tenantDb, transaction, domain);

    // Step 9: Seed products
    console.log(`📦 Seeding products...`);
    await seedProducts(tenantDb, transaction, domain);

    // Commit transaction
    await transaction.commit();
    console.log(`✅ All operations committed successfully`);

    console.log(
      `✅ Database setup and seeding completed for tenant: ${domain}`
    );

    return {
      success: true,
      tenantDomain: domain,
      message: "Database setup and seeding completed successfully",
      tenantDb: tenantDb, // Return the connection for reuse
    };
  } catch (error) {
    console.error(
      `❌ Error setting up and seeding tenant ${tenantDomain}:`,
      error
    );

    // Rollback transaction if it exists
    if (transaction) {
      try {
        await transaction.rollback();
        console.log(`🔄 Transaction rolled back due to error`);
      } catch (rollbackError) {
        console.error("Error rolling back transaction:", rollbackError);
      }
    }

    throw error;
  } finally {
    // Only close the connection if explicitly requested (for CLI usage)
    if (tenantDb && tenantDb.sequelize && closeConnection) {
      try {
        await tenantDb.sequelize.close();
        console.log(`🔌 Database connection closed`);
      } catch (closeError) {
        console.error("Error closing database connection:", closeError);
      }
    }
  }
};

// Seed roles function
const seedRoles = async (tenantDb, transaction, tenantDomain) => {
  const roles = [
    {
      name: "admin",
      description: "Administrator with full access",
      is_system_role: true,
      tab_permissions: {
        dashboard: true,
        stock: true,
        loading: true,
        discounts: true,
        credits: true,
        expenses: true,
        reports: true,
        manage: true,
        representatives: true,
        users_roles: true,
        help: true,
      },
    },
    {
      name: "manager",
      description: "Manager with limited access",
      is_system_role: true,
      tab_permissions: {
        dashboard: true,
        stock: true,
        loading: true,
        discounts: true,
        credits: true,
        expenses: true,
        reports: true,
        manage: false,
        representatives: true,
        users_roles: false,
        help: true,
      },
    },
    {
      name: "user",
      description: "Regular user with basic access",
      is_system_role: true,
      tab_permissions: {
        dashboard: true,
        stock: false,
        loading: false,
        discounts: false,
        credits: false,
        expenses: false,
        reports: false,
        manage: false,
        representatives: false,
        users_roles: false,
        help: true,
      },
    },
  ];

  for (const roleData of roles) {
    const existingRole = await tenantDb.models.Role.findOne({
      where: { name: roleData.name },
      transaction,
    });

    if (!existingRole) {
      await tenantDb.models.Role.create(roleData, { transaction });
      console.log(
        `Role '${roleData.name}' created for tenant: ${tenantDomain}`
      );
    } else {
      console.log(
        `Role '${roleData.name}' already exists for tenant: ${tenantDomain}`
      );
    }
  }
};

// Seed users function
const seedUsers = async (tenantDb, transaction, tenantDomain) => {
  // Get role IDs
  const adminRole = await tenantDb.models.Role.findOne({
    where: { name: "admin" },
    transaction,
  });
  const managerRole = await tenantDb.models.Role.findOne({
    where: { name: "manager" },
    transaction,
  });
  const userRole = await tenantDb.models.Role.findOne({
    where: { name: "user" },
    transaction,
  });

  const users = [
    {
      username: "admin@test123.com",
      password: "admin123",
      role_id: adminRole.role_id,
      role: "admin",
    },
    {
      username: "manager@test123.com",
      password: "manager123",
      role_id: managerRole.role_id,
      role: "manager",
    },
    {
      username: "user@test123.com",
      password: "user123",
      role_id: userRole.role_id,
      role: "user",
    },
  ];

  for (const user of users) {
    const existingUser = await tenantDb.models.User.findOne({
      where: { username: user.username },
      transaction,
    });

    if (!existingUser) {
      await tenantDb.models.User.create(
        {
          username: user.username,
          password: user.password,
          role_id: user.role_id,
          role: user.role,
        },
        { transaction }
      );
      console.log(
        `User '${user.username}' created for tenant: ${tenantDomain}`
      );
    } else {
      if (!existingUser.role_id) {
        await existingUser.update(
          {
            role_id: user.role_id,
            role: user.role,
          },
          { transaction }
        );
        console.log(
          `User '${user.username}' updated with role_id for tenant: ${tenantDomain}`
        );
      } else {
        console.log(
          `User '${user.username}' already exists with proper role for tenant: ${tenantDomain}`
        );
      }
    }
  }
};

// Seed discount types function
const seedDiscountTypes = async (tenantDb, transaction, tenantDomain) => {
  const discountTypes = [{ discount_name: "SSG" }, { discount_name: "SPC" }];

  for (const data of discountTypes) {
    const existingEntry = await tenantDb.models.DiscountType.findOne({
      where: { discount_name: data.discount_name },
      transaction,
    });

    if (!existingEntry) {
      await tenantDb.models.DiscountType.create(
        {
          ...data,
          created_at: new Date(),
          updated_at: new Date(),
        },
        { transaction }
      );
      console.log(
        `Discount type '${data.discount_name}' added for tenant: ${tenantDomain}`
      );
    } else {
      console.log(
        `Discount type '${data.discount_name}' already exists for tenant: ${tenantDomain}`
      );
    }
  }
};

// Seed sub-discount types function
const seedSubDiscountTypes = async (tenantDb, transaction, tenantDomain) => {
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
      transaction,
    });

    if (!existingEntry) {
      await tenantDb.models.SubDiscountType.create(
        {
          ...data,
          created_at: new Date(),
          updated_at: new Date(),
        },
        { transaction }
      );
      console.log(
        `Sub-discount type '${data.sub_discount_name}' added for tenant: ${tenantDomain}`
      );
    } else {
      console.log(
        `Sub-discount type '${data.sub_discount_name}' already exists for tenant: ${tenantDomain}`
      );
    }
  }
};

// Seed payment methods function
const seedPaymentMethods = async (tenantDb, transaction, tenantDomain) => {
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
      transaction,
    });

    if (!existingEntry) {
      await tenantDb.models.PaymentMethod.create(data, { transaction });
      console.log(
        `Payment method '${data.name}' added for tenant: ${tenantDomain}`
      );
    } else {
      console.log(
        `Payment method '${data.name}' already exists for tenant: ${tenantDomain}`
      );
    }
  }
};

// Seed products function
const seedProducts = async (tenantDb, transaction, tenantDomain) => {
  const products = [
    // 175 mL (RGB) products
    {
      product_name: "Coca Cola",
      unit_price: 82.8,
      selling_price: 92.0,
      bottles_per_case: 24,
      size: "175 mL",
      active: true,
    },
    {
      product_name: "Sprite",
      unit_price: 82.8,
      selling_price: 92.0,
      bottles_per_case: 24,
      size: "175 mL",
      active: true,
    },
    {
      product_name: "Fanta Orange",
      unit_price: 82.8,
      selling_price: 92.0,
      bottles_per_case: 24,
      size: "175 mL",
      active: true,
    },
    {
      product_name: "Fanta Portelo",
      unit_price: 82.8,
      selling_price: 92.0,
      bottles_per_case: 24,
      size: "175 mL",
      active: true,
    },
    {
      product_name: "Fanta Cream Soda",
      unit_price: 82.8,
      selling_price: 92.0,
      bottles_per_case: 24,
      size: "175 mL",
      active: true,
    },

    // 300 mL (RGB) products
    {
      product_name: "Coca Cola",
      unit_price: 126.95,
      selling_price: 136.5,
      bottles_per_case: 24,
      size: "300 mL",
      active: true,
    },
    {
      product_name: "Sprite",
      unit_price: 126.95,
      selling_price: 136.5,
      bottles_per_case: 24,
      size: "300 mL",
      active: true,
    },
    {
      product_name: "Fanta Orange",
      unit_price: 100,
      selling_price: 150,
      bottles_per_case: 24,
      size: "300 mL",
      active: true,
    },
    {
      product_name: "Fanta Portelo",
      unit_price: 100,
      selling_price: 150,
      bottles_per_case: 24,
      size: "300 mL",
      active: true,
    },
    {
      product_name: "Fanta Cream Soda",
      unit_price: 100,
      selling_price: 150,
      bottles_per_case: 24,
      size: "300 mL",
      active: true,
    },
    {
      product_name: "Lion Club Soda",
      unit_price: 85.56,
      selling_price: 92,
      bottles_per_case: 24,
      size: "300 mL",
      active: true,
    },
    {
      product_name: "Tonic",
      unit_price: 100,
      selling_price: 150,
      bottles_per_case: 24,
      size: "300 mL",
      active: true,
    },
    {
      product_name: "Kinley Club Soda",
      unit_price: 92,
      selling_price: 100,
      bottles_per_case: 24,
      size: "300 mL",
      active: true,
    },

    // 750 mL (RGB) products
    {
      product_name: "Coca Cola",
      unit_price: 160.81,
      selling_price: 204.6,
      bottles_per_case: 9,
      size: "750 mL",
      active: true,
    },
    {
      product_name: "Sprite",
      unit_price: 160.81,
      selling_price: 204.6,
      bottles_per_case: 9,
      size: "750 mL",
      active: true,
    },
    {
      product_name: "Fanta Orange",
      unit_price: 160.81,
      selling_price: 204.6,
      bottles_per_case: 9,
      size: "750 mL",
      active: true,
    },

    // 250 mL products (case of 16)
    {
      product_name: "Coca Cola",
      unit_price: 104.9,
      selling_price: 111.6,
      bottles_per_case: 16,
      size: "250 mL",
      active: true,
    },
    {
      product_name: "Sprite",
      unit_price: 104.9,
      selling_price: 111.6,
      bottles_per_case: 16,
      size: "250 mL",
      active: true,
    },
    {
      product_name: "Fanta Orange",
      unit_price: 104.9,
      selling_price: 111.6,
      bottles_per_case: 16,
      size: "250 mL",
      active: true,
    },
    {
      product_name: "Fanta Portelo",
      unit_price: 104.9,
      selling_price: 111.6,
      bottles_per_case: 16,
      size: "250 mL",
      active: true,
    },
    {
      product_name: "Fanta Cream Soda",
      unit_price: 104.9,
      selling_price: 111.6,
      bottles_per_case: 16,
      size: "250 mL",
      active: true,
    },
    {
      product_name: "Lion Ginger Beer",
      unit_price: 104.9,
      selling_price: 111.6,
      bottles_per_case: 16,
      size: "250 mL",
      active: true,
    },

    // 400 mL products
    {
      product_name: "Coca Cola",
      unit_price: 156.38,
      selling_price: 167.25,
      bottles_per_case: 24,
      size: "400 mL",
      active: true,
    },
    {
      product_name: "Sprite",
      unit_price: 100,
      selling_price: 167.25,
      bottles_per_case: 24,
      size: "400 mL",
      active: true,
    },
    {
      product_name: "Fanta Orange",
      unit_price: 100,
      selling_price: 167.25,
      bottles_per_case: 24,
      size: "400 mL",
      active: true,
    },
    {
      product_name: "Fanta Portelo",
      unit_price: 156.38,
      selling_price: 167.25,
      bottles_per_case: 24,
      size: "400 mL",
      active: true,
    },
    {
      product_name: "Fanta Cream Soda",
      unit_price: 156.38,
      selling_price: 167.25,
      bottles_per_case: 24,
      size: "400 mL",
      active: true,
    },
    {
      product_name: "Zero Coke",
      unit_price: 100,
      selling_price: 167.25,
      bottles_per_case: 24,
      size: "400 mL",
      active: true,
    },
    {
      product_name: "Lion Ginger Beer",
      unit_price: 156.38,
      selling_price: 167.25,
      bottles_per_case: 24,
      size: "400 mL",
      active: true,
    },
    {
      product_name: "Lion Club Soda",
      unit_price: 92,
      selling_price: 100,
      bottles_per_case: 24,
      size: "400 mL",
      active: true,
    },
    {
      product_name: "Kinley Club Soda",
      unit_price: 100,
      selling_price: 93,
      bottles_per_case: 24,
      size: "400 mL",
      active: true,
    },

    // 1050 mL products
    {
      product_name: "Coca Cola",
      unit_price: 262.26,
      selling_price: 279,
      bottles_per_case: 12,
      size: "1050 mL",
      active: true,
    },
    {
      product_name: "Sprite",
      unit_price: 262.26,
      selling_price: 279,
      bottles_per_case: 12,
      size: "1050 mL",
      active: true,
    },
    {
      product_name: "Fanta Orange",
      unit_price: 262.26,
      selling_price: 279,
      bottles_per_case: 12,
      size: "1050 mL",
      active: true,
    },
    {
      product_name: "Fanta Portelo",
      unit_price: 100,
      selling_price: 279,
      bottles_per_case: 12,
      size: "1050 mL",
      active: true,
    },
    {
      product_name: "Fanta Cream Soda",
      unit_price: 262.26,
      selling_price: 279,
      bottles_per_case: 12,
      size: "1050 mL",
      active: true,
    },
    {
      product_name: "Zero Coke",
      unit_price: 100,
      selling_price: 0,
      bottles_per_case: 12,
      size: "1050 mL",
      active: true,
    },
    {
      product_name: "Lion Ginger Beer",
      unit_price: 262.26,
      selling_price: 279,
      bottles_per_case: 12,
      size: "1050 mL",
      active: true,
    },
    {
      product_name: "Lion Club Soda",
      unit_price: 157.36,
      selling_price: 167.4,
      bottles_per_case: 12,
      size: "1050 mL",
      active: true,
    },
    {
      product_name: "Kinley Club Soda",
      unit_price: 167,
      selling_price: 180,
      bottles_per_case: 12,
      size: "1050 mL",
      active: true,
    },

    // 1.5L products
    {
      product_name: "Coca Cola",
      unit_price: 314.71,
      selling_price: 334.8,
      bottles_per_case: 12,
      size: "1.5 L",
      active: true,
    },
    {
      product_name: "Sprite",
      unit_price: 314.71,
      selling_price: 372,
      bottles_per_case: 12,
      size: "1.5 L",
      active: true,
    },
    {
      product_name: "Fanta Orange",
      unit_price: 314.71,
      selling_price: 334.8,
      bottles_per_case: 12,
      size: "1.5 L",
      active: true,
    },
    {
      product_name: "Fanta Portelo",
      unit_price: 314.71,
      selling_price: 334.8,
      bottles_per_case: 12,
      size: "1.5 L",
      active: true,
    },
    {
      product_name: "Fanta Cream Soda",
      unit_price: 349.68,
      selling_price: 372,
      bottles_per_case: 12,
      size: "1.5 L",
      active: true,
    },
    {
      product_name: "Lion Club Soda",
      unit_price: 218.55,
      selling_price: 232.5,
      bottles_per_case: 12,
      size: "1.5 L",
      active: true,
    },
    {
      product_name: " Kinley Club Soda",
      unit_price: 232.5,
      selling_price: 250,
      bottles_per_case: 12,
      size: "1.5 L",
      active: true,
    },

    // 2L products
    {
      product_name: "Coca Cola",
      unit_price: 421.59,
      selling_price: 448.5,
      bottles_per_case: 9,
      size: "2 L",
      active: true,
    },
    {
      product_name: "Sprite",
      unit_price: 421.59,
      selling_price: 448.5,
      bottles_per_case: 9,
      size: "2 L",
      active: true,
    },
    {
      product_name: "Fanta Orange",
      unit_price: 100,
      selling_price: 448.5,
      bottles_per_case: 9,
      size: "2 L",
      active: true,
    },
    {
      product_name: "Fanta Portelo",
      unit_price: 100,
      selling_price: 448.5,
      bottles_per_case: 9,
      size: "2 L",
      active: true,
    },
    {
      product_name: "Fanta Cream Soda",
      unit_price: 100,
      selling_price: 448.5,
      bottles_per_case: 9,
      size: "2 L",
      active: true,
    },

    // 355ML Monster
    {
      product_name: "Monster",
      unit_price: 579.6,
      selling_price: 630,
      bottles_per_case: 24,
      size: "355 mL",
      active: true,
    },

    // Water products
    {
      product_name: "Water",
      unit_price: 64.8,
      selling_price: 72,
      bottles_per_case: 24,
      size: "500 mL",
      active: true,
    },
    {
      product_name: "Water",
      unit_price: 100.8,
      selling_price: 112,
      bottles_per_case: 15,
      size: "1 L",
      active: true,
    },
    {
      product_name: "Water",
      unit_price: 122.4,
      selling_price: 136,
      bottles_per_case: 12,
      size: "1.5 L",
      active: true,
    },
  ];

  for (const product of products) {
    const existingProduct = await tenantDb.models.Product.findOne({
      where: {
        product_name: product.product_name,
        size: product.size,
      },
      transaction,
    });

    if (!existingProduct) {
      await tenantDb.models.Product.create(product, { transaction });
      console.log(
        `Product '${product.product_name} (${product.size})' created for tenant: ${tenantDomain}`
      );
    } else {
      console.log(
        `Product '${product.product_name} (${product.size})' already exists for tenant: ${tenantDomain}`
      );
    }
  }
};

// Allow running with command line argument for tenant
// Usage: node syncAndSeed.js [tenant-domain]
// Example: node syncAndSeed.js test123.zendensolutions.store
const runSyncAndSeed = async () => {
  const tenantDomain = process.argv[2] || "test123.zendensolutions.store";

  try {
    // When running from CLI, we want to close the connection
    const result = await syncAndSeedTenant(tenantDomain, true);
    console.log(
      `Database setup and seeding completed successfully for tenant: ${tenantDomain}`
    );
    console.log("Result:", result);
    process.exit(0);
  } catch (error) {
    console.error(
      `Database setup and seeding failed for tenant ${tenantDomain}:`,
      error.message
    );
    console.error("Stack trace:", error.stack);
    process.exit(1);
  }
};

// Export for use in other files
module.exports = syncAndSeedTenant;

// Run if this file is executed directly
if (require.main === module) {
  runSyncAndSeed();
}
