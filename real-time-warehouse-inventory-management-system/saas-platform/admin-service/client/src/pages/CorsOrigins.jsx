import React, { useState, useEffect } from "react";
import { corsAPI, tenantsAPI } from "../services/api";
import toast from "react-hot-toast";
import {
  GlobeAltIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  BuildingOfficeIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";

const CorsOrigins = () => {
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState("");
  const [corsOrigins, setCorsOrigins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingOrigin, setEditingOrigin] = useState(null);

  useEffect(() => {
    fetchTenants();
  }, []);

  useEffect(() => {
    if (selectedTenant) {
      fetchCorsOrigins();
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

  const fetchCorsOrigins = async () => {
    if (!selectedTenant) return;

    try {
      setLoading(true);
      const origins = await corsAPI.getByTenant(selectedTenant);
      setCorsOrigins(origins);
    } catch (error) {
      toast.error("Failed to fetch CORS origins");
      console.error("Error fetching CORS origins:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddOrigin = async (originData) => {
    try {
      await corsAPI.add(selectedTenant, originData);
      toast.success("CORS origin added successfully");
      setShowAddModal(false);
      fetchCorsOrigins();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add CORS origin");
    }
  };

  const handleUpdateOrigin = async (originId, originData) => {
    try {
      await corsAPI.update(originId, originData);
      toast.success("CORS origin updated successfully");
      setEditingOrigin(null);
      fetchCorsOrigins();
    } catch (error) {
      toast.error("Failed to update CORS origin");
    }
  };

  const handleDeleteOrigin = async (originId) => {
    if (window.confirm("Are you sure you want to delete this CORS origin?")) {
      try {
        await corsAPI.delete(originId);
        toast.success("CORS origin deleted successfully");
        fetchCorsOrigins();
      } catch (error) {
        toast.error("Failed to delete CORS origin");
      }
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
          <h1 className="text-2xl font-bold text-gray-900">CORS Origins</h1>
          <p className="text-gray-600">
            Manage cross-origin resource sharing settings
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          disabled={!selectedTenant}
          className="btn-primary flex items-center space-x-2 disabled:opacity-50"
        >
          <PlusIcon className="h-4 w-4" />
          <span>Add Origin</span>
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
            <div className="flex items-center space-x-3 bg-teal-50 px-4 py-3 rounded-lg">
              <BuildingOfficeIcon className="h-5 w-5 text-teal-600" />
              <div>
                <p className="font-medium text-teal-900">
                  {selectedTenantData.name}
                </p>
                <p className="text-sm text-teal-600">
                  {selectedTenantData.subdomain}.example.com
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CORS Origins List */}
      {selectedTenant && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              CORS Origins for {selectedTenantData?.name}
            </h3>
            <span className="text-sm text-gray-500">
              {corsOrigins.length} origin{corsOrigins.length !== 1 ? "s" : ""}{" "}
              configured
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
            </div>
          ) : corsOrigins.length === 0 ? (
            <div className="text-center py-8">
              <GlobeAltIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                No CORS origins configured
              </h4>
              <p className="text-gray-500 mb-4">
                Add CORS origins to allow cross-origin requests from specific
                domains.
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="btn-primary"
              >
                Add First Origin
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {corsOrigins.map((origin) => (
                <div
                  key={origin.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`h-3 w-3 rounded-full ${
                          origin.isActive ? "bg-green-500" : "bg-red-500"
                        }`}
                      ></div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {origin.origin}
                        </p>
                        <p className="text-sm text-gray-500">
                          {origin.description || "No description provided"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`status-badge ${
                          origin.isActive ? "status-active" : "status-inactive"
                        }`}
                      >
                        {origin.isActive ? "Active" : "Inactive"}
                      </span>
                      <button
                        onClick={() => setEditingOrigin(origin)}
                        className="p-1 text-teal-600 hover:text-teal-800"
                        title="Edit"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteOrigin(origin.id)}
                        className="p-1 text-red-600 hover:text-red-800"
                        title="Delete"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-4 text-sm text-gray-500">
                    <div>
                      <span className="font-medium">Methods:</span>{" "}
                      {origin.allowedMethods?.join(", ") ||
                        "GET, POST, PUT, DELETE"}
                    </div>
                    <div>
                      <span className="font-medium">Headers:</span>{" "}
                      {origin.allowedHeaders?.join(", ") ||
                        "Content-Type, Authorization"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Origin Modal */}
      {showAddModal && (
        <CorsOriginModal
          tenantId={selectedTenant}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddOrigin}
        />
      )}

      {/* Edit Origin Modal */}
      {editingOrigin && (
        <CorsOriginModal
          tenantId={selectedTenant}
          origin={editingOrigin}
          onClose={() => setEditingOrigin(null)}
          onSubmit={(data) => handleUpdateOrigin(editingOrigin.id, data)}
        />
      )}
    </div>
  );
};

// CORS Origin Modal Component
const CorsOriginModal = ({ tenantId, origin, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    origin: origin?.origin || "",
    description: origin?.description || "",
    isActive: origin?.isActive ?? true,
    allowedMethods: origin?.allowedMethods || ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: origin?.allowedHeaders || ["Content-Type", "Authorization"],
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit(formData);
    setLoading(false);
  };

  const handleMethodToggle = (method) => {
    const methods = formData.allowedMethods.includes(method)
      ? formData.allowedMethods.filter((m) => m !== method)
      : [...formData.allowedMethods, method];
    setFormData({ ...formData, allowedMethods: methods });
  };

  const availableMethods = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"];
  const commonHeaders = [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {origin ? "Edit CORS Origin" : "Add CORS Origin"}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">Origin URL</label>
            <input
              type="url"
              required
              className="form-input"
              placeholder="https://example.com"
              value={formData.origin}
              onChange={(e) =>
                setFormData({ ...formData, origin: e.target.value })
              }
            />
            <p className="text-xs text-gray-500 mt-1">
              Use * for wildcard or specify exact domain
            </p>
          </div>

          <div>
            <label className="form-label">Description</label>
            <textarea
              className="form-input"
              rows="3"
              placeholder="Description of this CORS origin..."
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
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

          <div>
            <label className="form-label">Allowed Methods</label>
            <div className="grid grid-cols-3 gap-2">
              {availableMethods.map((method) => (
                <label key={method} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.allowedMethods.includes(method)}
                    onChange={() => handleMethodToggle(method)}
                    className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-sm text-gray-700">{method}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="form-label">Allowed Headers</label>
            <div className="space-y-2">
              {commonHeaders.map((header) => (
                <label key={header} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.allowedHeaders.includes(header)}
                    onChange={(e) => {
                      const headers = e.target.checked
                        ? [...formData.allowedHeaders, header]
                        : formData.allowedHeaders.filter((h) => h !== header);
                      setFormData({ ...formData, allowedHeaders: headers });
                    }}
                    className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-sm text-gray-700">{header}</span>
                </label>
              ))}
            </div>
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
              {loading ? "Saving..." : origin ? "Update Origin" : "Add Origin"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CorsOrigins;
