module.exports = (sequelize, DataTypes) => {
  const CorsOrigin = sequelize.define(
    "CorsOrigin",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      origin_url: {
        type: DataTypes.STRING(500),
        allowNull: false,
        validate: {
          isUrl: true,
        },
      },
      tenant_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "tenants",
          key: "id",
        },
      },
      active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      description: {
        type: DataTypes.STRING(255),
        allowNull: true,
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
      tableName: "cors_origins",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        {
          fields: ["tenant_id"],
        },
        {
          fields: ["active"],
        },
        {
          unique: true,
          fields: ["origin_url", "tenant_id"],
        },
      ],
    }
  );

  CorsOrigin.associate = (models) => {
    // CORS origin belongs to a tenant
    CorsOrigin.belongsTo(models.Tenant, {
      foreignKey: "tenant_id",
      as: "tenant",
    });
  };

  return CorsOrigin;
};
