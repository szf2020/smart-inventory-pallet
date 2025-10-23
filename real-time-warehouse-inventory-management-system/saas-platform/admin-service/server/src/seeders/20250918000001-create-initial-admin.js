const { SystemAdmin } = require("../models");
const bcrypt = require("bcrypt");

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create initial super admin user
    const hashedPassword = await bcrypt.hash("admin123!", 12);

    return queryInterface.bulkInsert("system_admins", [
      {
        username: "superadmin",
        password: hashedPassword,
        email: "admin@cnhdistributors.com",
        full_name: "Super Administrator",
        role: "super_admin",
        status: "active",
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        username: "admin",
        password: hashedPassword,
        email: "support@cnhdistributors.com",
        full_name: "System Administrator",
        role: "admin",
        status: "active",
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete("system_admins", {
      username: {
        [Sequelize.Op.in]: ["superadmin", "admin"],
      },
    });
  },
};
