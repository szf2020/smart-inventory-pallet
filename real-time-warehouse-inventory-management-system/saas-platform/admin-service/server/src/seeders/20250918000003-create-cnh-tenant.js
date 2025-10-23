const {
  Tenant,
  CorsOrigin,
  EnvironmentVariable,
  TenantBilling,
} = require("../models");

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Create the CNH tenant
      const [tenant] = await Tenant.findOrCreate({
        where: { subdomain: "cnh" },
        defaults: {
          subdomain: "cnh",
          database_name: "cnh_distributors_db",
          database_user: "cnh_user",
          database_password: "cnh_secure_pass_2024", // You should encrypt this in production
          database_host: "localhost",
          database_port: 5432,
          status: "active",
          company_name: "CNH Distributors Ltd.",
          contact_email: "admin@cnh.zendensolutions.store",
          contact_phone: "+1-555-0456",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        transaction,
      });

      console.log("✅ CNH tenant created/found:", tenant.company_name);

      // Add CORS origins for CNH tenant
      const corsOrigins = [
        {
          tenantId: tenant.id,
          origin: "https://cnh.zendensolutions.store",
          methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
          headers: [
            "Content-Type",
            "Authorization",
            "X-Requested-With",
            "X-API-Key",
          ],
          credentials: true,
          isActive: true,
          description: "Production domain",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          tenantId: tenant.id,
          origin: "http://cnh.zendensolutions.store",
          methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
          headers: ["Content-Type", "Authorization", "X-Requested-With"],
          credentials: true,
          isActive: true,
          description: "Production domain (HTTP)",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          tenantId: tenant.id,
          origin: "https://app.cnh-distributors.com",
          methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
          headers: ["Content-Type", "Authorization", "X-Requested-With"],
          credentials: true,
          isActive: true,
          description: "Custom domain",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      for (const corsData of corsOrigins) {
        await CorsOrigin.findOrCreate({
          where: {
            tenantId: corsData.tenantId,
            origin: corsData.origin,
          },
          defaults: corsData,
          transaction,
        });
      }

      console.log("✅ CORS origins created for CNH tenant");

      // Add environment variables for CNH tenant
      const envVariables = [
        {
          tenantId: tenant.id,
          key: "DATABASE_NAME",
          value: "cnh_distributors_db",
          description: "Database name for CNH tenant",
          isEncrypted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          tenantId: tenant.id,
          key: "JWT_SECRET",
          value: "cnh-super-secret-jwt-key-production-2024",
          description: "JWT secret for CNH tenant",
          isEncrypted: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          tenantId: tenant.id,
          key: "STRIPE_SECRET_KEY",
          value: "sk_live_cnh_tenant_stripe_production_key",
          description: "Stripe live secret key",
          isEncrypted: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          tenantId: tenant.id,
          key: "EMAIL_FROM",
          value: "noreply@cnh-distributors.com",
          description: "From email address",
          isEncrypted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          tenantId: tenant.id,
          key: "COMPANY_NAME",
          value: "CNH Distributors Ltd.",
          description: "Company name for branding",
          isEncrypted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          tenantId: tenant.id,
          key: "MAX_UPLOAD_SIZE",
          value: "52428800",
          description: "Maximum file upload size (50MB)",
          isEncrypted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          tenantId: tenant.id,
          key: "FEATURE_CUSTOM_BRANDING",
          value: "true",
          description: "Enable custom branding",
          isEncrypted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      for (const envData of envVariables) {
        await EnvironmentVariable.findOrCreate({
          where: {
            tenantId: envData.tenantId,
            key: envData.key,
          },
          defaults: envData,
          transaction,
        });
      }

      console.log("✅ Environment variables created for CNH tenant");

      // Add billing information
      const billing = {
        tenant_id: tenant.id,
        plan: "enterprise",
        billing_cycle: "monthly",
        monthly_rate: 299.99,
        currency: "USD",
        status: "active",
        next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        created_at: new Date(),
        updated_at: new Date(),
      };

      await TenantBilling.findOrCreate({
        where: { tenant_id: billing.tenant_id },
        defaults: billing,
        transaction,
      });

      console.log("✅ Billing information created for CNH tenant");

      await transaction.commit();
      console.log("🎉 CNH tenant setup completed successfully!");
    } catch (error) {
      await transaction.rollback();
      console.error("❌ Error setting up CNH tenant:", error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const tenant = await Tenant.findOne({
        where: { subdomain: "cnh" },
        transaction,
      });

      if (tenant) {
        await EnvironmentVariable.destroy({
          where: { tenantId: tenant.id },
          transaction,
        });

        await CorsOrigin.destroy({
          where: { tenantId: tenant.id },
          transaction,
        });

        await TenantBilling.destroy({
          where: { tenantId: tenant.id },
          transaction,
        });

        await tenant.destroy({ transaction });

        console.log("✅ CNH tenant and related data removed");
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      console.error("❌ Error removing CNH tenant:", error);
      throw error;
    }
  },
};
