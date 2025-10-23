const bcrypt = require("bcrypt");
const db = require("../models");

const seedUsers = async (tenantDomain = "test123.zendensolutions.store") => {
  let tenantDb;

  try {
    // Get the tenant-specific database connection
    tenantDb = await db.getSequelizeForTenant(tenantDomain);
    console.log(`Connected to tenant database for: ${tenantDomain}`);

    // First, ensure roles exist
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

    // Create roles if they don't exist
    for (const roleData of roles) {
      const existingRole = await tenantDb.models.Role.findOne({
        where: { name: roleData.name },
      });

      if (!existingRole) {
        await tenantDb.models.Role.create(roleData);
        console.log(
          `Role '${roleData.name}' created for tenant: ${tenantDomain}`
        );
      }
    }

    // Get role IDs
    const adminRole = await tenantDb.models.Role.findOne({
      where: { name: "admin" },
    });
    const managerRole = await tenantDb.models.Role.findOne({
      where: { name: "manager" },
    });
    const userRole = await tenantDb.models.Role.findOne({
      where: { name: "user" },
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
      });

      if (!existingUser) {
        // Don't hash password here - the model hook will handle it automatically
        await tenantDb.models.User.create({
          username: user.username,
          password: user.password, // Use plain password - model will hash it
          role_id: user.role_id,
          role: user.role,
        });
        console.log(
          `User '${user.username}' created for tenant: ${tenantDomain}`
        );
      } else {
        // Update existing user with proper role_id if it's missing
        if (!existingUser.role_id) {
          await existingUser.update({
            role_id: user.role_id,
            role: user.role,
          });
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
  } catch (error) {
    console.error(`Error seeding users for tenant ${tenantDomain}:`, error);
    throw error;
  } finally {
    if (tenantDb && tenantDb.sequelize) {
      await tenantDb.sequelize.close();
      console.log(`Database connection closed for tenant: ${tenantDomain}`);
    }
    console.log(`Seeding complete for tenant: ${tenantDomain}`);
  }
};

// Allow running with command line argument for tenant
// Usage: node seedUsers.js [tenant-domain]
// Example: node seedUsers.js test123.zendensolutions.store
const runSeeder = async () => {
  const tenantDomain = process.argv[2] || "test123.zendensolutions.store";

  console.log(`Starting user seeding for tenant: ${tenantDomain}`);

  try {
    await seedUsers(tenantDomain);
    console.log("✅ User seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ User seeding failed:", error);
    process.exit(1);
  }
};

// Export for use in other files
module.exports = seedUsers;

// Run if this file is executed directly
if (require.main === module) {
  runSeeder();
}
