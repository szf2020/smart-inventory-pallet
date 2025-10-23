const {
  Tenant,
  CorsOrigin,
  EnvironmentVariable,
  TenantSSLCertificate,
} = require("../models");

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Create the default tenant
      const [tenant] = await Tenant.findOrCreate({
        where: { subdomain: "default" },
        defaults: {
          subdomain: "default",
          database_name: "default_test_cnh_dev",
          database_user: "postgres",
          database_password: "Mt202161534#", // You should encrypt this in production
          database_host: "localhost",
          database_port: 5432,
          status: "active",
          company_name: "Default Development Tenant",
          contact_email: "admin@default.zendensolutions.store",
          contact_phone: "+1-555-0123",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        transaction,
      });

      console.log("✅ Default tenant created/found:", tenant.company_name);

      // Add CORS origins for the default tenant
      const corsOrigins = [
        {
          tenantId: tenant.id,
          origin: "http://localhost:5173",
          methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
          headers: ["Content-Type", "Authorization", "X-Requested-With"],
          credentials: true,
          isActive: true,
          description: "Frontend development server",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          tenantId: tenant.id,
          origin: "http://localhost:3000",
          methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
          headers: ["Content-Type", "Authorization", "X-Requested-With"],
          credentials: true,
          isActive: true,
          description: "Alternative frontend port",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          tenantId: tenant.id,
          origin: "https://default.zendensolutions.store",
          methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
          headers: ["Content-Type", "Authorization", "X-Requested-With"],
          credentials: true,
          isActive: true,
          description: "Production domain",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          tenantId: tenant.id,
          origin: "http://default.zendensolutions.store",
          methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
          headers: ["Content-Type", "Authorization", "X-Requested-With"],
          credentials: true,
          isActive: true,
          description: "Production domain (HTTP)",
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

      console.log("✅ CORS origins created for default tenant");

      // Add environment variables for the default tenant
      const envVariables = [
        {
          tenantId: tenant.id,
          key: "DATABASE_NAME",
          value: "default_test_cnh_dev",
          description: "Database name for this tenant",
          isEncrypted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          tenantId: tenant.id,
          key: "REDIS_URL",
          value: "redis://localhost:6379",
          description: "Redis connection URL",
          isEncrypted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          tenantId: tenant.id,
          key: "JWT_SECRET",
          value: "default-tenant-jwt-secret-key-2024",
          description: "JWT secret for token signing",
          isEncrypted: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          tenantId: tenant.id,
          key: "STRIPE_SECRET_KEY",
          value: "sk_test_default_tenant_stripe_key",
          description: "Stripe secret key for payments",
          isEncrypted: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          tenantId: tenant.id,
          key: "EMAIL_FROM",
          value: "noreply@default.zendensolutions.store",
          description: "Default from email address",
          isEncrypted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          tenantId: tenant.id,
          key: "MAX_UPLOAD_SIZE",
          value: "10485760",
          description: "Maximum file upload size in bytes (10MB)",
          isEncrypted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          tenantId: tenant.id,
          key: "FEATURE_ANALYTICS",
          value: "true",
          description: "Enable analytics feature",
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

      console.log("✅ Environment variables created for default tenant");

      // Add SSL certificate (optional, for testing)
      const sslCert = {
        tenantId: tenant.id,
        domain: "default.zendensolutions.store",
        certificate:
          "-----BEGIN CERTIFICATE-----\n[DEMO CERTIFICATE DATA]\n-----END CERTIFICATE-----",
        privateKey:
          "-----BEGIN PRIVATE KEY-----\n[DEMO PRIVATE KEY DATA]\n-----END PRIVATE KEY-----",
        validFrom: new Date("2024-01-01"),
        validTo: new Date("2025-12-31"),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await TenantSSLCertificate.findOrCreate({
        where: {
          tenantId: sslCert.tenantId,
          domain: sslCert.domain,
        },
        defaults: sslCert,
        transaction,
      });

      console.log("✅ SSL certificate created for default tenant");

      await transaction.commit();
      console.log("🎉 Default tenant setup completed successfully!");
    } catch (error) {
      await transaction.rollback();
      console.error("❌ Error setting up default tenant:", error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Find the default tenant
      const tenant = await Tenant.findOne({
        where: { subdomain: "default" },
        transaction,
      });

      if (tenant) {
        // Delete related records
        await EnvironmentVariable.destroy({
          where: { tenantId: tenant.id },
          transaction,
        });

        await CorsOrigin.destroy({
          where: { tenantId: tenant.id },
          transaction,
        });

        await TenantSSLCertificate.destroy({
          where: { tenantId: tenant.id },
          transaction,
        });

        // Delete the tenant
        await tenant.destroy({ transaction });

        console.log("✅ Default tenant and related data removed");
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      console.error("❌ Error removing default tenant:", error);
      throw error;
    }
  },
};
