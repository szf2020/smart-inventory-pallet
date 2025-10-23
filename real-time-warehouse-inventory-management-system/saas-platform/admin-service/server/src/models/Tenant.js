const crypto = require("crypto");

module.exports = (sequelize, DataTypes) => {
  const Tenant = sequelize.define(
    "Tenant",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      subdomain: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        validate: {
          isLowercase: true,
          isAlphanumeric: true,
          len: [3, 50],
        },
      },
      database_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        validate: {
          isLowercase: true,
          len: [3, 100],
        },
      },
      status: {
        type: DataTypes.ENUM("active", "inactive", "suspended", "pending"),
        allowNull: false,
        defaultValue: "pending",
      },
      company_name: {
        type: DataTypes.STRING(200),
        allowNull: true,
      },
      contact_email: {
        type: DataTypes.STRING(255),
        allowNull: true,
        validate: {
          isEmail: true,
        },
      },
      contact_phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      database_user: {
        type: DataTypes.STRING(100),
        allowNull: true,
        defaultValue: "postgres",
        comment: "Database username for this tenant",
      },
      database_password: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Encrypted database password for this tenant",
      },
      database_host: {
        type: DataTypes.STRING(255),
        allowNull: true,
        defaultValue: "localhost",
        comment: "Database host for this tenant",
      },
      database_port: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 5432,
        comment: "Database port for this tenant",
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "tenants",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        {
          unique: true,
          fields: ["subdomain"],
        },
        {
          unique: true,
          fields: ["database_name"],
        },
        {
          fields: ["status"],
        },
      ],
    }
  );

  // Password encryption/decryption methods
  Tenant.prototype.setDatabasePassword = function (password) {
    if (password) {
      try {
        const encryptionKey =
          process.env.ENCRYPTION_KEY || "default-key-change-in-production";
        const salt = crypto.randomBytes(16);
        const iv = crypto.randomBytes(16);

        // Derive key using salt
        const key = crypto.pbkdf2Sync(encryptionKey, salt, 10000, 32, "sha256");

        const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
        let encrypted = cipher.update(password, "utf8", "hex");
        encrypted += cipher.final("hex");

        // Store as iv:salt:encrypted
        this.database_password = `${iv.toString("hex")}:${salt.toString(
          "hex"
        )}:${encrypted}`;
      } catch (error) {
        console.error("Error encrypting database password:", error);
        // Fallback to plain text if encryption fails
        this.database_password = password;
      }
    }
  };

  Tenant.prototype.getDatabasePassword = function () {
    if (!this.database_password) return null;

    try {
      // Check if password is encrypted (contains ':')
      if (!this.database_password.includes(":")) {
        // Plain text password, return as is (for backward compatibility)
        return this.database_password;
      }

      const [ivHex, saltHex, encrypted] = this.database_password.split(":");

      if (!ivHex || !saltHex || !encrypted) {
        // Invalid format, return as plain text
        return this.database_password;
      }

      const encryptionKey =
        process.env.ENCRYPTION_KEY || "default-key-change-in-production";
      const iv = Buffer.from(ivHex, "hex");
      const salt = Buffer.from(saltHex, "hex");

      // Derive key using salt
      const key = crypto.pbkdf2Sync(encryptionKey, salt, 10000, 32, "sha256");

      const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
      let decrypted = decipher.update(encrypted, "hex", "utf8");
      decrypted += decipher.final("utf8");

      return decrypted;
    } catch (error) {
      console.error("Error decrypting database password:", error);
      // Return plain text if decryption fails (for backward compatibility)
      return this.database_password;
    }
  };

  // Hook to encrypt password before saving
  Tenant.addHook("beforeCreate", (tenant) => {
    if (tenant.database_password && !tenant.database_password.includes(":")) {
      tenant.setDatabasePassword(tenant.database_password);
    }
  });

  Tenant.addHook("beforeUpdate", (tenant) => {
    if (
      tenant.changed("database_password") &&
      tenant.database_password &&
      !tenant.database_password.includes(":")
    ) {
      tenant.setDatabasePassword(tenant.database_password);
    }
  });

  Tenant.associate = (models) => {
    // A tenant can have many SSL certificates
    Tenant.hasMany(models.TenantSSLCertificate, {
      foreignKey: "tenant_id",
      as: "sslCertificates",
      onDelete: "CASCADE",
    });

    // A tenant can have many CORS origins
    Tenant.hasMany(models.CorsOrigin, {
      foreignKey: "tenant_id",
      as: "corsOrigins",
      onDelete: "CASCADE",
    });

    // A tenant can have many environment variables
    Tenant.hasMany(models.EnvironmentVariable, {
      foreignKey: "tenant_id",
      as: "environmentVariables",
      onDelete: "CASCADE",
    });

    // A tenant has one billing record
    Tenant.hasOne(models.TenantBilling, {
      foreignKey: "tenant_id",
      as: "billing",
      onDelete: "CASCADE",
    });
  };

  return Tenant;
};
