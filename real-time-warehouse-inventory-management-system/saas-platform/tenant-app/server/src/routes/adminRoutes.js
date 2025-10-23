// tenant-app/server/src/routes/admin.js or similar
const express = require("express");
const syncAndSeedTenant = require("../seeders/syncAndSeed");
const router = express.Router();

// POST /api/admin/seed-tenant
router.post("/seed-tenant", async (req, res) => {
  const { tenantDomain, tenantId } = req.body;

  if (!tenantDomain) {
    return res.status(400).json({
      success: false,
      message: "Tenant domain is required",
    });
  }

  try {
    console.log(`🌱 Starting seeding process for tenant: ${tenantDomain}`);

    // Run the seeder
    await syncAndSeedTenant(tenantDomain);

    console.log(`✅ Seeding completed for tenant: ${tenantDomain}`);

    res.status(200).json({
      success: true,
      message: `Database seeding completed successfully for ${tenantDomain}`,
      tenantDomain,
      tenantId,
    });
  } catch (error) {
    console.error(`❌ Seeding failed for tenant ${tenantDomain}:`, error);

    res.status(500).json({
      success: false,
      message: "Database seeding failed",
      error: error.message,
      tenantDomain,
    });
  }
});

module.exports = router;
