const { EnvironmentVariable, Tenant } = require("../models");
const { Op } = require("sequelize");

const envController = {
  // Get environment variables for a tenant
  getEnvironmentVariables: async (req, res) => {
    try {
      const { tenantId } = req.params;

      // Verify tenant exists
      const tenant = await Tenant.findByPk(tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      const envVars = await EnvironmentVariable.findAll({
        where: { tenantId },
        order: [["key", "ASC"]],
      });

      // Return decrypted values
      const decryptedVars = envVars.map((envVar) => ({
        id: envVar.id,
        key: envVar.key,
        value: envVar.decryptedValue,
        description: envVar.description,
        isActive: envVar.isActive,
        createdAt: envVar.createdAt,
        updatedAt: envVar.updatedAt,
      }));

      res.json(decryptedVars);
    } catch (error) {
      console.error("Get environment variables error:", error);
      res.status(500).json({ message: "Failed to get environment variables" });
    }
  },

  // Add environment variable for a tenant
  addEnvironmentVariable: async (req, res) => {
    try {
      const { tenantId } = req.params;
      const { key, value, description } = req.body;

      // Verify tenant exists
      const tenant = await Tenant.findByPk(tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      // Check if environment variable already exists
      const existingVar = await EnvironmentVariable.findOne({
        where: {
          tenantId,
          key: key.toUpperCase(),
        },
      });

      if (existingVar) {
        return res.status(400).json({
          message: "Environment variable already exists",
        });
      }

      const envVar = await EnvironmentVariable.create({
        tenantId,
        key: key.toUpperCase(),
        value, // Will be automatically encrypted
        description,
      });

      res.status(201).json({
        message: "Environment variable added successfully",
        environmentVariable: {
          id: envVar.id,
          key: envVar.key,
          value: envVar.decryptedValue,
          description: envVar.description,
          isActive: envVar.isActive,
          createdAt: envVar.createdAt,
        },
      });
    } catch (error) {
      console.error("Add environment variable error:", error);
      res.status(500).json({ message: "Failed to add environment variable" });
    }
  },

  // Update environment variable
  updateEnvironmentVariable: async (req, res) => {
    try {
      const { id } = req.params;
      const { value, description, isActive } = req.body;

      const envVar = await EnvironmentVariable.findByPk(id);
      if (!envVar) {
        return res
          .status(404)
          .json({ message: "Environment variable not found" });
      }

      await envVar.update({
        ...(value !== undefined && { value }), // Will be automatically encrypted
        ...(description !== undefined && { description }),
        ...(typeof isActive === "boolean" && { isActive }),
      });

      res.json({
        message: "Environment variable updated successfully",
        environmentVariable: {
          id: envVar.id,
          key: envVar.key,
          value: envVar.decryptedValue,
          description: envVar.description,
          isActive: envVar.isActive,
          updatedAt: envVar.updatedAt,
        },
      });
    } catch (error) {
      console.error("Update environment variable error:", error);
      res
        .status(500)
        .json({ message: "Failed to update environment variable" });
    }
  },

  // Delete environment variable
  deleteEnvironmentVariable: async (req, res) => {
    try {
      const { id } = req.params;

      const envVar = await EnvironmentVariable.findByPk(id);
      if (!envVar) {
        return res
          .status(404)
          .json({ message: "Environment variable not found" });
      }

      await envVar.destroy();

      res.json({ message: "Environment variable deleted successfully" });
    } catch (error) {
      console.error("Delete environment variable error:", error);
      res
        .status(500)
        .json({ message: "Failed to delete environment variable" });
    }
  },
};

module.exports = envController;
