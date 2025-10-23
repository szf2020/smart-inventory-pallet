const crypto = require("crypto");

module.exports = (sequelize, DataTypes) => {
  const EnvironmentVariable = sequelize.define(
    "EnvironmentVariable",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      tenant_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "tenants",
          key: "id",
        },
      },
      var_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
          len: [1, 100],
          is: /^[A-Z_][A-Z0-9_]*$/i, // Environment variable naming convention
        },
      },
      var_value: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      encrypted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      description: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      category: {
        type: DataTypes.ENUM(
          "database",
          "api",
          "email",
          "storage",
          "payment",
          "other"
        ),
        allowNull: false,
        defaultValue: "other",
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
      tableName: "environment_variables",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        {
          fields: ["tenant_id"],
        },
        {
          unique: true,
          fields: ["tenant_id", "var_name"],
        },
        {
          fields: ["category"],
        },
      ],
      hooks: {
        beforeCreate: (envVar) => {
          if (envVar.encrypted && envVar.var_value) {
            envVar.var_value = EnvironmentVariable.encryptValue(
              envVar.var_value
            );
          }
        },
        beforeUpdate: (envVar) => {
          if (envVar.encrypted && envVar.changed("var_value")) {
            envVar.var_value = EnvironmentVariable.encryptValue(
              envVar.var_value
            );
          }
        },
      },
    }
  );

  // Encryption methods
  EnvironmentVariable.encryptValue = (value) => {
    const algorithm = "aes-256-cbc";
    const key =
      process.env.ENCRYPTION_KEY || "default-key-change-in-production-32-chars";
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(
      algorithm,
      Buffer.from(key.slice(0, 32)),
      iv
    );
    let encrypted = cipher.update(value, "utf8", "hex");
    encrypted += cipher.final("hex");

    return iv.toString("hex") + ":" + encrypted;
  };

  EnvironmentVariable.decryptValue = (encryptedValue) => {
    try {
      const algorithm = "aes-256-cbc";
      const key =
        process.env.ENCRYPTION_KEY ||
        "default-key-change-in-production-32-chars";

      const parts = encryptedValue.split(":");
      const iv = Buffer.from(parts[0], "hex");
      const encryptedText = parts[1];

      const decipher = crypto.createDecipheriv(
        algorithm,
        Buffer.from(key.slice(0, 32)),
        iv
      );
      let decrypted = decipher.update(encryptedText, "hex", "utf8");
      decrypted += decipher.final("utf8");

      return decrypted;
    } catch (error) {
      console.error("Decryption error:", error);
      return null;
    }
  };

  // Instance method to get decrypted value
  EnvironmentVariable.prototype.getDecryptedValue = function () {
    if (this.encrypted) {
      return EnvironmentVariable.decryptValue(this.var_value);
    }
    return this.var_value;
  };

  EnvironmentVariable.associate = (models) => {
    // Environment variable belongs to a tenant
    EnvironmentVariable.belongsTo(models.Tenant, {
      foreignKey: "tenant_id",
      as: "tenant",
    });
  };

  return EnvironmentVariable;
};
