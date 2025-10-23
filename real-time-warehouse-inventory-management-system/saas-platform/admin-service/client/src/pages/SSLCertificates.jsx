import React, { useState, useEffect } from "react";
import { sslAPI, tenantsAPI } from "../services/api";
import toast from "react-hot-toast";
import {
  ShieldCheckIcon,
  PlusIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  PencilIcon,
  TrashIcon,
  DocumentTextIcon,
  BuildingOfficeIcon,
} from "@heroicons/react/24/outline";

const SSLCertificates = () => {
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState("");
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCert, setEditingCert] = useState(null);

  useEffect(() => {
    fetchTenants();
  }, []);

  useEffect(() => {
    if (selectedTenant) {
      fetchCertificates();
    }
  }, [selectedTenant]);

  const fetchTenants = async () => {
    try {
      const response = await tenantsAPI.getAll({ limit: 100 });
      setTenants(response.tenants);
      if (response.tenants.length > 0) {
        setSelectedTenant(response.tenants[0].id);
      }
    } catch (error) {
      toast.error("Failed to fetch tenants");
    }
  };

  const fetchCertificates = async () => {
    if (!selectedTenant) return;

    try {
      setLoading(true);
      const certs = await sslAPI.getByTenant(selectedTenant);
      setCertificates(certs);
    } catch (error) {
      toast.error("Failed to fetch SSL certificates");
      console.error("Error fetching SSL certificates:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCertificate = async (certData) => {
    try {
      await sslAPI.add(selectedTenant, certData);
      toast.success("SSL certificate added successfully");
      setShowAddModal(false);
      fetchCertificates();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to add SSL certificate"
      );
    }
  };

  const handleUpdateCertificate = async (certId, certData) => {
    try {
      await sslAPI.update(certId, certData);
      toast.success("SSL certificate updated successfully");
      setEditingCert(null);
      fetchCertificates();
    } catch (error) {
      toast.error("Failed to update SSL certificate");
    }
  };

  const handleDeleteCertificate = async (certId) => {
    if (
      window.confirm("Are you sure you want to delete this SSL certificate?")
    ) {
      try {
        await sslAPI.delete(certId);
        toast.success("SSL certificate deleted successfully");
        fetchCertificates();
      } catch (error) {
        toast.error("Failed to delete SSL certificate");
      }
    }
  };

  const getCertificateStatus = (cert) => {
    const now = new Date();
    const validTo = new Date(cert.validTo);
    const daysUntilExpiry = Math.ceil((validTo - now) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      return {
        status: "expired",
        color: "bg-red-100 text-red-800",
        days: Math.abs(daysUntilExpiry),
      };
    } else if (daysUntilExpiry <= 30) {
      return {
        status: "expiring",
        color: "bg-yellow-100 text-yellow-800",
        days: daysUntilExpiry,
      };
    } else {
      return {
        status: "valid",
        color: "bg-green-100 text-green-800",
        days: daysUntilExpiry,
      };
    }
  };

  const selectedTenantData = tenants.find(
    (t) => t.id === parseInt(selectedTenant)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SSL Certificates</h1>
          <p className="text-gray-600">
            Manage SSL/TLS certificates for tenant domains
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          disabled={!selectedTenant}
          className="btn-primary flex items-center space-x-2 disabled:opacity-50"
        >
          <PlusIcon className="h-4 w-4" />
          <span>Add Certificate</span>
        </button>
      </div>

      {/* Tenant Selection */}
      <div className="card">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <label className="form-label">Select Tenant</label>
            <select
              className="form-input"
              value={selectedTenant}
              onChange={(e) => setSelectedTenant(e.target.value)}
            >
              <option value="">Choose a tenant...</option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name} ({tenant.subdomain})
                </option>
              ))}
            </select>
          </div>
          {selectedTenantData && (
            <div className="flex items-center space-x-3 bg-blue-50 px-4 py-3 rounded-lg">
              <BuildingOfficeIcon className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium text-blue-900">
                  {selectedTenantData.name}
                </p>
                <p className="text-sm text-blue-600">
                  {selectedTenantData.subdomain}.example.com
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SSL Certificates List */}
      {selectedTenant && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Certificates
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {certificates.length}
                  </p>
                </div>
                <ShieldCheckIcon className="h-8 w-8 text-blue-600" />
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active</p>
                  <p className="text-2xl font-bold text-green-600">
                    {
                      certificates.filter(
                        (c) => getCertificateStatus(c).status === "valid"
                      ).length
                    }
                  </p>
                </div>
                <ShieldCheckIcon className="h-8 w-8 text-green-600" />
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Expiring Soon
                  </p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {
                      certificates.filter(
                        (c) => getCertificateStatus(c).status === "expiring"
                      ).length
                    }
                  </p>
                </div>
                <ExclamationTriangleIcon className="h-8 w-8 text-yellow-600" />
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Expired</p>
                  <p className="text-2xl font-bold text-red-600">
                    {
                      certificates.filter(
                        (c) => getCertificateStatus(c).status === "expired"
                      ).length
                    }
                  </p>
                </div>
                <ClockIcon className="h-8 w-8 text-red-600" />
              </div>
            </div>
          </div>

          {/* Certificates List */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                SSL Certificates for {selectedTenantData?.name}
              </h3>
              <span className="text-sm text-gray-500">
                {certificates.length} certificate
                {certificates.length !== 1 ? "s" : ""} installed
              </span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
              </div>
            ) : certificates.length === 0 ? (
              <div className="text-center py-8">
                <ShieldCheckIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  No SSL certificates installed
                </h4>
                <p className="text-gray-500 mb-4">
                  Add SSL certificates to secure this tenant's domains with
                  HTTPS.
                </p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="btn-primary"
                >
                  Add First Certificate
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {certificates.map((cert) => {
                  const statusInfo = getCertificateStatus(cert);
                  return (
                    <div
                      key={cert.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                              statusInfo.status === "valid"
                                ? "bg-green-100"
                                : statusInfo.status === "expiring"
                                ? "bg-yellow-100"
                                : "bg-red-100"
                            }`}
                          >
                            <ShieldCheckIcon
                              className={`h-5 w-5 ${
                                statusInfo.status === "valid"
                                  ? "text-green-600"
                                  : statusInfo.status === "expiring"
                                  ? "text-yellow-600"
                                  : "text-red-600"
                              }`}
                            />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {cert.domain}
                            </p>
                            <p className="text-sm text-gray-500">
                              {statusInfo.status === "expired"
                                ? `Expired ${statusInfo.days} day${
                                    statusInfo.days !== 1 ? "s" : ""
                                  } ago`
                                : statusInfo.status === "expiring"
                                ? `Expires in ${statusInfo.days} day${
                                    statusInfo.days !== 1 ? "s" : ""
                                  }`
                                : `Valid for ${statusInfo.days} day${
                                    statusInfo.days !== 1 ? "s" : ""
                                  }`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`status-badge ${statusInfo.color}`}>
                            {statusInfo.status === "valid"
                              ? "Valid"
                              : statusInfo.status === "expiring"
                              ? "Expiring"
                              : "Expired"}
                          </span>
                          <span
                            className={`status-badge ${
                              cert.isActive
                                ? "status-active"
                                : "status-inactive"
                            }`}
                          >
                            {cert.isActive ? "Active" : "Inactive"}
                          </span>
                          <button
                            onClick={() => setEditingCert(cert)}
                            className="p-1 text-teal-600 hover:text-teal-800"
                            title="Edit"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCertificate(cert.id)}
                            className="p-1 text-red-600 hover:text-red-800"
                            title="Delete"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-4 text-sm text-gray-500">
                        <div>
                          <span className="font-medium">Valid From:</span>{" "}
                          {new Date(cert.validFrom).toLocaleDateString()}
                        </div>
                        <div>
                          <span className="font-medium">Valid To:</span>{" "}
                          {new Date(cert.validTo).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Certificate Modal */}
      {showAddModal && (
        <SSLCertificateModal
          tenantId={selectedTenant}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddCertificate}
        />
      )}

      {/* Edit Certificate Modal */}
      {editingCert && (
        <SSLCertificateModal
          tenantId={selectedTenant}
          certificate={editingCert}
          onClose={() => setEditingCert(null)}
          onSubmit={(data) => handleUpdateCertificate(editingCert.id, data)}
        />
      )}
    </div>
  );
};

// SSL Certificate Modal Component
const SSLCertificateModal = ({ tenantId, certificate, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    domain: certificate?.domain || "",
    certificate: certificate?.certificate || "",
    privateKey: certificate?.privateKey || "",
    validFrom: certificate?.validFrom
      ? new Date(certificate.validFrom).toISOString().split("T")[0]
      : "",
    validTo: certificate?.validTo
      ? new Date(certificate.validTo).toISOString().split("T")[0]
      : "",
    isActive: certificate?.isActive ?? true,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit(formData);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {certificate ? "Edit SSL Certificate" : "Add SSL Certificate"}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">Domain</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="example.com"
              value={formData.domain}
              onChange={(e) =>
                setFormData({ ...formData, domain: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Valid From</label>
              <input
                type="date"
                required
                className="form-input"
                value={formData.validFrom}
                onChange={(e) =>
                  setFormData({ ...formData, validFrom: e.target.value })
                }
              />
            </div>
            <div>
              <label className="form-label">Valid To</label>
              <input
                type="date"
                required
                className="form-input"
                value={formData.validTo}
                onChange={(e) =>
                  setFormData({ ...formData, validTo: e.target.value })
                }
              />
            </div>
          </div>

          <div>
            <label className="form-label">Certificate (PEM format)</label>
            <textarea
              required
              className="form-input font-mono text-sm"
              rows="8"
              placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
              value={formData.certificate}
              onChange={(e) =>
                setFormData({ ...formData, certificate: e.target.value })
              }
            />
          </div>

          <div>
            <label className="form-label">Private Key (PEM format)</label>
            <textarea
              required
              className="form-input font-mono text-sm"
              rows="8"
              placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
              value={formData.privateKey}
              onChange={(e) =>
                setFormData({ ...formData, privateKey: e.target.value })
              }
            />
            <p className="text-xs text-gray-500 mt-1">
              Private key will be encrypted and stored securely
            </p>
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) =>
                  setFormData({ ...formData, isActive: e.target.checked })
                }
                className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="text-sm font-medium text-gray-700">Active</span>
            </label>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-outline flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1"
            >
              {loading
                ? "Saving..."
                : certificate
                ? "Update Certificate"
                : "Add Certificate"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SSLCertificates;
