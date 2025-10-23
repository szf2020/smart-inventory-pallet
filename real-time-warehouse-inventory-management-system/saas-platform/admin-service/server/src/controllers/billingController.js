const { TenantBilling, Tenant } = require("../models");
const { Op } = require("sequelize");

const billingController = {
  // Get billing information for a tenant
  getBillingInfo: async (req, res) => {
    try {
      const { tenantId } = req.params;

      // Verify tenant exists
      const tenant = await Tenant.findByPk(tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      const billing = await TenantBilling.findOne({
        where: { tenant_id: tenantId },
      });

      if (!billing) {
        return res
          .status(404)
          .json({ message: "Billing information not found" });
      }

      res.json(billing);
    } catch (error) {
      console.error("Get billing info error:", error);
      res.status(500).json({ message: "Failed to get billing information" });
    }
  },

  // Create or update billing information for a tenant
  updateBillingInfo: async (req, res) => {
    try {
      const { tenantId } = req.params;
      const {
        planType,
        monthlyRate,
        yearlyRate,
        billingCycle,
        paymentMethod,
        stripeCustomerId,
        stripeSubscriptionId,
        paymentStatus,
        nextBillingDate,
        features,
      } = req.body;

      // Verify tenant exists
      const tenant = await Tenant.findByPk(tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      let billing = await TenantBilling.findOne({
        where: { tenant_id: tenantId },
      });

      if (billing) {
        // Update existing billing - map camelCase to snake_case
        const updateData = {};
        if (planType) updateData.plan = planType;
        if (monthlyRate !== undefined) updateData.monthly_rate = monthlyRate;
        if (billingCycle) updateData.billing_cycle = billingCycle;
        if (paymentStatus) updateData.status = paymentStatus;
        if (nextBillingDate) updateData.next_billing_date = new Date(nextBillingDate);

        await billing.update(updateData);

        res.json({
          message: "Billing information updated successfully",
          billing,
        });
      } else {
        // Create new billing - map camelCase to snake_case
        billing = await TenantBilling.create({
          tenant_id: tenantId,
          plan: planType || "basic",
          monthly_rate: monthlyRate || 0,
          billing_cycle: billingCycle || "monthly",
          status: paymentStatus || "pending",
          next_billing_date: nextBillingDate ? new Date(nextBillingDate) : null,
        });

        res.status(201).json({
          message: "Billing information created successfully",
          billing,
        });
      }
    } catch (error) {
      console.error("Update billing info error:", error);
      res.status(500).json({ message: "Failed to update billing information" });
    }
  },

  // Get all billing records (for admin overview)
  getAllBilling: async (req, res) => {
    try {
      const { page = 1, limit = 20, planType, paymentStatus } = req.query;
      const offset = (page - 1) * limit;

      const whereClause = {};
      if (planType) whereClause.plan = planType;
      if (paymentStatus) whereClause.status = paymentStatus;

      const { count, rows: billingRecords } =
        await TenantBilling.findAndCountAll({
          where: whereClause,
          include: [
            {
              model: Tenant,
              as: "tenant",
              attributes: ["id", "company_name", "subdomain", "status"],
            },
          ],
          limit: parseInt(limit),
          offset: parseInt(offset),
          order: [["created_at", "DESC"]],
        });

      res.json({
        billingRecords,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit),
        },
      });
    } catch (error) {
      console.error("Get all billing error:", error);
      res.status(500).json({ message: "Failed to get billing records" });
    }
  },

  // Update payment status
  updatePaymentStatus: async (req, res) => {
    try {
      const { tenantId } = req.params;
      const { paymentStatus, nextBillingDate } = req.body;

      const billing = await TenantBilling.findOne({
        where: { tenant_id: tenantId },
      });

      if (!billing) {
        return res
          .status(404)
          .json({ message: "Billing information not found" });
      }

      const updateData = {
        status: paymentStatus,
      };
      if (nextBillingDate) {
        updateData.next_billing_date = new Date(nextBillingDate);
      }

      await billing.update(updateData);

      res.json({
        message: "Payment status updated successfully",
        billing,
      });
    } catch (error) {
      console.error("Update payment status error:", error);
      res.status(500).json({ message: "Failed to update payment status" });
    }
  },

  // Calculate billing amount
  calculateBilling: async (req, res) => {
    try {
      const { tenantId } = req.params;

      const billing = await TenantBilling.findOne({
        where: { tenant_id: tenantId },
      });

      if (!billing) {
        return res
          .status(404)
          .json({ message: "Billing information not found" });
      }

      const amount = billing.monthly_rate; // Use monthly rate since yearly doesn't exist

      res.json({
        tenantId,
        planType: billing.plan,
        billingCycle: billing.billing_cycle,
        amount,
        nextBillingDate: billing.nextBillingDate,
        features: billing.features,
      });
    } catch (error) {
      console.error("Calculate billing error:", error);
      res.status(500).json({ message: "Failed to calculate billing" });
    }
  },
};

module.exports = billingController;
