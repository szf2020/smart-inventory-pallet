const axios = require("axios");
const crypto = require("crypto");

class AdminServiceClient {
  constructor() {
    this.baseURL =
      process.env.ADMIN_SERVICE_URL || "http://localhost:7005/api/super-admin";
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache
  }

  /**
   * Decrypt database password if it's encrypted
   */
  decryptDatabasePassword(encryptedPassword) {
    try {
      // If password doesn't contain ':' it's likely plain text (backward compatibility)
      if (!encryptedPassword.includes(":")) {
        return encryptedPassword;
      }

      const [ivHex, saltHex, encryptedHex] = encryptedPassword.split(":");

      if (!ivHex || !saltHex || !encryptedHex) {
        // If format is invalid, treat as plain text
        return encryptedPassword;
      }

      const encryptionKey =
        process.env.ENCRYPTION_KEY || "default-key-change-in-production";
      const iv = Buffer.from(ivHex, "hex");
      const salt = Buffer.from(saltHex, "hex");
      const encrypted = Buffer.from(encryptedHex, "hex");

      // Derive key using salt
      const key = crypto.pbkdf2Sync(encryptionKey, salt, 10000, 32, "sha256");

      const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
      let decrypted = decipher.update(encrypted, null, "utf8");
      decrypted += decipher.final("utf8");

      return decrypted;
    } catch (error) {
      console.error("Error decrypting database password:", error.message);
      // Return original password if decryption fails (backward compatibility)
      return encryptedPassword;
    }
  }

  /**
   * Get active CORS origins for a tenant domain
   */
  async getCorsOriginsForTenant(tenantDomain) {
    try {
      const cacheKey = `cors_${tenantDomain}`;
      const cached = this.cache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }

      console.log(`Fetching CORS origins for domain: ${tenantDomain}`);

      // Get tenant by domain first
      const tenant = await this.getTenantByDomain(tenantDomain);
      if (!tenant) {
        console.warn(`Tenant not found for domain: ${tenantDomain}`);
        return [];
      }

      const response = await axios.get(
        `${this.baseURL}/cors/public/tenant/${tenant.id}`,
        {
          timeout: 5000,
        }
      );

      console.log(`CORS origins response for ${tenantDomain}:`, response.data);

      const corsData = response.data.corsOrigins || response.data;

      // Handle both object and array responses
      const corsArray = Array.isArray(corsData) ? corsData : [];

      // Extract active origins
      const activeOrigins = corsArray
        .filter((cors) => cors.active)
        .map((cors) => cors.origin_url);

      // Add the tenant's own domain to CORS origins
      const tenantOrigins = [
        `https://${tenantDomain}`,
        `http://${tenantDomain}`,
        ...activeOrigins,
      ];

      // Cache the result
      this.cache.set(cacheKey, {
        data: tenantOrigins,
        timestamp: Date.now(),
      });

      console.log(
        `Found ${tenantOrigins.length} CORS origins for ${tenantDomain}`
      );
      return tenantOrigins;
    } catch (error) {
      console.error(
        `Error fetching CORS origins for ${tenantDomain}:`,
        error.message
      );

      // Return fallback CORS origins
      return [
        `https://${tenantDomain}`,
        `http://${tenantDomain}`,
        "http://localhost:5173",
        "http://localhost:3000",
      ];
    }
  }

  /**
   * Get tenant information by domain
   */
  async getTenantByDomain(domain) {
    try {
      const cacheKey = `tenant_${domain}`;
      const cached = this.cache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }

      const response = await axios.get(
        `${this.baseURL}/tenants/public/domain/${domain}`,
        {
          timeout: 5000,
        }
      );

      // Find exact match
      const tenant = response.data.tenant;

      if (tenant) {
        this.cache.set(cacheKey, {
          data: tenant,
          timestamp: Date.now(),
        });
      }

      return tenant;
    } catch (error) {
      console.error(
        `Error fetching tenant for domain ${domain}:`,
        error.message
      );
      return null;
    }
  }

  /**
   * Get tenant database configuration
   */
  async getTenantDatabaseConfig(tenantDomain) {
    try {
      const tenant = await this.getTenantByDomain(tenantDomain);
      if (!tenant) {
        return null;
      }

      // Decrypt the database password
      const decryptedPassword = this.decryptDatabasePassword(
        tenant.database_password
      );

      return {
        database: tenant.database_name,
        username: tenant.database_user,
        password: decryptedPassword,
        host: tenant.database_host || "localhost",
        port: tenant.database_port || 5432,
        dialect: "postgres",
      };
    } catch (error) {
      console.error(
        `Error fetching database config for ${tenantDomain}:`,
        error.message
      );
      return null;
    }
  }

  /**
   * Clear cache
   */
  clearCache(tenantDomain = null) {
    if (tenantDomain) {
      for (const key of this.cache.keys()) {
        if (key.includes(tenantDomain)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }
}

// Create singleton instance
const adminServiceClient = new AdminServiceClient();

module.exports = adminServiceClient;
