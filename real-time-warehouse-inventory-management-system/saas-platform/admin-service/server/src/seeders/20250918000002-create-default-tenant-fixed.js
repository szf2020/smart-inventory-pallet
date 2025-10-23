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
          database_name: "postgres",
          database_user: "postgres",
          database_password: "admin123", // You should encrypt this in production
          database_host: "localhost",
          database_port: 5432,
          status: "active",
          company_name: "Default Development Tenant",
          contact_email: "admin@default.zendensolutions.store",
          contact_phone: "+1-555-0123",
        },
        transaction,
      });

      console.log("✅ Default tenant created/found:", tenant.company_name);

      // Add CORS origins for the default tenant
      const corsOrigins = [
        {
          tenant_id: tenant.id,
          origin_url: "https://default.zendensolutions.store",
          active: true,
          description: "Production domain (HTTPS)",
        },
        {
          tenant_id: tenant.id,
          origin_url: "http://default.zendensolutions.store",
          active: true,
          description: "Production domain (HTTP)",
        },
      ];

      for (const corsData of corsOrigins) {
        await CorsOrigin.findOrCreate({
          where: {
            tenant_id: corsData.tenant_id,
            origin_url: corsData.origin_url,
          },
          defaults: corsData,
          transaction,
        });
      }

      console.log("✅ CORS origins created for default tenant");

      // Add environment variables for the default tenant
      const envVariables = [
        {
          tenant_id: tenant.id,
          var_name: "DATABASE_NAME",
          var_value: "postgres",
          description: "Database name for this tenant",
          encrypted: false,
          category: "database",
        },
        {
          tenant_id: tenant.id,
          var_name: "REDIS_URL",
          var_value: "redis://localhost:6379",
          description: "Redis connection URL",
          encrypted: false,
          category: "database",
        },
        {
          tenant_id: tenant.id,
          var_name: "JWT_SECRET",
          var_value: "default-tenant-jwt-secret-key-2024",
          description: "JWT secret for token signing",
          encrypted: true,
          category: "api",
        },
        {
          tenant_id: tenant.id,
          var_name: "STRIPE_SECRET_KEY",
          var_value: "sk_test_default_tenant_stripe_key",
          description: "Stripe secret key for payments",
          encrypted: true,
          category: "payment",
        },
        {
          tenant_id: tenant.id,
          var_name: "EMAIL_FROM",
          var_value: "noreply@default.zendensolutions.store",
          description: "Default from email address",
          encrypted: false,
          category: "email",
        },
        {
          tenant_id: tenant.id,
          var_name: "MAX_UPLOAD_SIZE",
          var_value: "10485760",
          description: "Maximum file upload size in bytes (10MB)",
          encrypted: false,
          category: "storage",
        },
        {
          tenant_id: tenant.id,
          var_name: "FEATURE_ANALYTICS",
          var_value: "true",
          description: "Enable analytics feature",
          encrypted: false,
          category: "other",
        },
      ];

      for (const envData of envVariables) {
        await EnvironmentVariable.findOrCreate({
          where: {
            tenant_id: envData.tenant_id,
            var_name: envData.var_name,
          },
          defaults: envData,
          transaction,
        });
      }

      console.log("✅ Environment variables created for default tenant");

      // Add SSL certificate (optional, for testing)
      const sslCert = {
        tenant_id: tenant.id,
        domain: "default.zendensolutions.store",
        certificate_path: "/etc/ssl/certs/default.zendensolutions.store.crt",
        private_key_path: "/etc/ssl/private/default.zendensolutions.store.key",
        expires_at: new Date("2025-12-31"),
        auto_renew: true,
        status: "active",
      };

      await TenantSSLCertificate.findOrCreate({
        where: {
          tenant_id: sslCert.tenant_id,
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
          where: { tenant_id: tenant.id },
          transaction,
        });

        await CorsOrigin.destroy({
          where: { tenant_id: tenant.id },
          transaction,
        });

        await TenantSSLCertificate.destroy({
          where: { tenant_id: tenant.id },
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
