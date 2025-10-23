const { TenantSSLCertificate, Tenant } = require("../models");
const { Op } = require("sequelize");

const sslController = {
  // Get SSL certificates for a tenant
  getSSLCertificates: async (req, res) => {
    try {
      const { tenantId } = req.params;

      // Verify tenant exists
      const tenant = await Tenant.findByPk(tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      const certificates = await TenantSSLCertificate.findAll({
        where: { tenantId },
        order: [["created_at", "DESC"]],
      });

      res.json(certificates);
    } catch (error) {
      console.error("Get SSL certificates error:", error);
      res.status(500).json({ message: "Failed to get SSL certificates" });
    }
  },

  // Add SSL certificate for a tenant
  addSSLCertificate: async (req, res) => {
    try {
      const { tenantId } = req.params;
      const { domain, certificate, privateKey, validFrom, validTo } = req.body;

      // Verify tenant exists
      const tenant = await Tenant.findByPk(tenantId);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }

      // Check if certificate already exists for this domain
      const existingCert = await TenantSSLCertificate.findOne({
        where: {
          tenantId,
          domain: domain.toLowerCase(),
        },
      });

      if (existingCert) {
        return res.status(400).json({
          message: "SSL certificate already exists for this domain",
        });
      }

      const sslCertificate = await TenantSSLCertificate.create({
        tenantId,
        domain: domain.toLowerCase(),
        certificate,
        privateKey,
        validFrom: new Date(validFrom),
        validTo: new Date(validTo),
      });

      res.status(201).json({
        message: "SSL certificate added successfully",
        certificate: {
          id: sslCertificate.id,
          domain: sslCertificate.domain,
          validFrom: sslCertificate.validFrom,
          validTo: sslCertificate.validTo,
          isActive: sslCertificate.isActive,
          createdAt: sslCertificate.createdAt,
        },
      });
    } catch (error) {
      console.error("Add SSL certificate error:", error);
      res.status(500).json({ message: "Failed to add SSL certificate" });
    }
  },

  // Update SSL certificate
  updateSSLCertificate: async (req, res) => {
    try {
      const { id } = req.params;
      const { certificate, privateKey, validFrom, validTo, isActive } =
        req.body;

      const sslCert = await TenantSSLCertificate.findByPk(id);
      if (!sslCert) {
        return res.status(404).json({ message: "SSL certificate not found" });
      }

      await sslCert.update({
        ...(certificate && { certificate }),
        ...(privateKey && { privateKey }),
        ...(validFrom && { validFrom: new Date(validFrom) }),
        ...(validTo && { validTo: new Date(validTo) }),
        ...(typeof isActive === "boolean" && { isActive }),
      });

      res.json({
        message: "SSL certificate updated successfully",
        certificate: {
          id: sslCert.id,
          domain: sslCert.domain,
          validFrom: sslCert.validFrom,
          validTo: sslCert.validTo,
          isActive: sslCert.isActive,
          updatedAt: sslCert.updatedAt,
        },
      });
    } catch (error) {
      console.error("Update SSL certificate error:", error);
      res.status(500).json({ message: "Failed to update SSL certificate" });
    }
  },

  // Delete SSL certificate
  deleteSSLCertificate: async (req, res) => {
    try {
      const { id } = req.params;

      const sslCert = await TenantSSLCertificate.findByPk(id);
      if (!sslCert) {
        return res.status(404).json({ message: "SSL certificate not found" });
      }

      await sslCert.destroy();

      res.json({ message: "SSL certificate deleted successfully" });
    } catch (error) {
      console.error("Delete SSL certificate error:", error);
      res.status(500).json({ message: "Failed to delete SSL certificate" });
    }
  },
};

module.exports = sslController;
