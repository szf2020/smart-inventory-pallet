module.exports = (sequelize, DataTypes) => {
  const TenantBilling = sequelize.define(
    "TenantBilling",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      tenant_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: "tenants",
          key: "id",
        },
      },
      plan: {
        type: DataTypes.ENUM("free", "basic", "pro", "premium", "enterprise"),
        allowNull: false,
        defaultValue: "free",
      },
      status: {
        type: DataTypes.ENUM(
          "active",
          "suspended",
          "cancelled",
          "trial",
          "overdue",
          "pending",
          "paid",
          "failed"
        ),
        allowNull: false,
        defaultValue: "trial",
      },
      monthly_rate: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: "LKR",
      },
      billing_cycle: {
        type: DataTypes.ENUM("monthly", "yearly"),
        allowNull: false,
        defaultValue: "monthly",
      },
      next_billing_date: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      trial_ends_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      last_payment_date: {
        type: DataTypes.DATE,
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
      tableName: "tenant_billing",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        {
          unique: true,
          fields: ["tenant_id"],
        },
        {
          fields: ["plan"],
        },
        {
          fields: ["status"],
        },
        {
          fields: ["next_billing_date"],
        },
      ],
    }
  );

  // Virtual getters for camelCase field names (for frontend compatibility)
  TenantBilling.prototype.toJSON = function () {
    const values = { ...this.dataValues };

    // Map snake_case to camelCase for frontend
    return {
      ...values,
      tenantId: values.tenant_id,
      planType: values.plan,
      paymentStatus: values.status,
      monthlyRate: values.monthly_rate,
      yearlyRate: values.monthly_rate, // Use monthly rate as yearly for now
      paymentMethod: "", // Default empty for now
      billingCycle: values.billing_cycle,
      nextBillingDate: values.next_billing_date,
      trialEndsAt: values.trial_ends_at,
      lastPaymentDate: values.last_payment_date,
      createdAt: values.created_at,
      updatedAt: values.updated_at,
    };
  };

  // Instance methods
  TenantBilling.prototype.isTrialExpired = function () {
    if (!this.trial_ends_at) return false;
    return new Date() > new Date(this.trial_ends_at);
  };

  TenantBilling.prototype.isPlanActive = function () {
    return ["active", "trial"].includes(this.status);
  };

  TenantBilling.prototype.getDaysUntilTrialExpiry = function () {
    if (!this.trial_ends_at) return null;
    const now = new Date();
    const trialEnd = new Date(this.trial_ends_at);
    const diffTime = trialEnd - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  TenantBilling.associate = (models) => {
    // Billing belongs to a tenant
    TenantBilling.belongsTo(models.Tenant, {
      foreignKey: "tenant_id",
      as: "tenant",
    });
  };

  return TenantBilling;
};
