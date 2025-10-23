module.exports = (sequelize, DataTypes) => {
  const TenantSSLCertificate = sequelize.define(
    "TenantSSLCertificate",
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
      domain: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
          isUrl: true,
        },
      },
      certificate_path: {
        type: DataTypes.STRING(500),
        allowNull: false,
      },
      private_key_path: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      certificate_chain_path: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      auto_renew: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      status: {
        type: DataTypes.ENUM("active", "expired", "pending", "failed"),
        allowNull: false,
        defaultValue: "active",
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
      tableName: "tenant_ssl_certificates",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        {
          fields: ["tenant_id"],
        },
        {
          fields: ["domain"],
        },
        {
          fields: ["expires_at"],
        },
        {
          fields: ["status"],
        },
      ],
    }
  );

  TenantSSLCertificate.associate = (models) => {
    // SSL certificate belongs to a tenant
    TenantSSLCertificate.belongsTo(models.Tenant, {
      foreignKey: "tenant_id",
      as: "tenant",
    });
  };

  return TenantSSLCertificate;
};
