// Get CORS origins for a tenant
exports.getCorsOrigins = async (req, res) => {
  try {
    const { tenantId } = req.params;

    const corsOrigins = await req.db.CorsOrigin.findAll({
      where: { tenant_id: tenantId },
      order: [["created_at", "DESC"]],
    });

    res.json({ success: true, corsOrigins });
  } catch (error) {
    console.error("Get CORS origins error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Add CORS origin
exports.addCorsOrigin = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { origin_url, description } = req.body;

    if (!origin_url) {
      return res.status(400).json({ message: "Origin URL is required" });
    }

    const corsOrigin = await req.db.CorsOrigin.create({
      tenant_id: tenantId,
      origin_url,
      description,
      active: true,
    });

    res.status(201).json({ success: true, corsOrigin });
  } catch (error) {
    console.error("Add CORS origin error:", error);
    if (error.name === "SequelizeUniqueConstraintError") {
      return res
        .status(409)
        .json({ message: "Origin already exists for this tenant" });
    }
    res.status(500).json({ message: "Internal server error" });
  }
};

// Update CORS origin
exports.updateCorsOrigin = async (req, res) => {
  try {
    const { id } = req.params;
    const { origin_url, description, active } = req.body;

    const corsOrigin = await req.db.CorsOrigin.findByPk(id);
    if (!corsOrigin) {
      return res.status(404).json({ message: "CORS origin not found" });
    }

    await corsOrigin.update({
      origin_url: origin_url || corsOrigin.origin_url,
      description: description || corsOrigin.description,
      active: active !== undefined ? active : corsOrigin.active,
    });

    res.json({ success: true, corsOrigin });
  } catch (error) {
    console.error("Update CORS origin error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Delete CORS origin
exports.deleteCorsOrigin = async (req, res) => {
  try {
    const { id } = req.params;

    const corsOrigin = await req.db.CorsOrigin.findByPk(id);
    if (!corsOrigin) {
      return res.status(404).json({ message: "CORS origin not found" });
    }

    await corsOrigin.destroy();

    res.json({ success: true, message: "CORS origin deleted successfully" });
  } catch (error) {
    console.error("Delete CORS origin error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
