import React, { useState, useEffect } from "react";
import { envAPI, tenantsAPI } from "../services/api";
import toast from "react-hot-toast";
import {
  CogIcon,
  PlusIcon,
  EyeIcon,
  EyeSlashIcon,
  PencilIcon,
  TrashIcon,
  KeyIcon,
  BuildingOfficeIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

const EnvironmentVariables = () => {
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState("");
  const [variables, setVariables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingVar, setEditingVar] = useState(null);
  const [visibleValues, setVisibleValues] = useState({});

  useEffect(() => {
    fetchTenants();
  }, []);

  useEffect(() => {
    if (selectedTenant) {
      fetchVariables();
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

  const fetchVariables = async () => {
    if (!selectedTenant) return;

    try {
      setLoading(true);
      const vars = await envAPI.getByTenant(selectedTenant);
      setVariables(vars);
    } catch (error) {
      toast.error("Failed to fetch environment variables");
      console.error("Error fetching environment variables:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddVariable = async (varData) => {
    try {
      await envAPI.add(selectedTenant, varData);
      toast.success("Environment variable added successfully");
      setShowAddModal(false);
      fetchVariables();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to add environment variable"
      );
    }
  };

  const handleUpdateVariable = async (varId, varData) => {
    try {
      await envAPI.update(varId, varData);
      toast.success("Environment variable updated successfully");
      setEditingVar(null);
      fetchVariables();
    } catch (error) {
      toast.error("Failed to update environment variable");
    }
  };

  const handleDeleteVariable = async (varId) => {
    if (
      window.confirm(
        "Are you sure you want to delete this environment variable?"
      )
    ) {
      try {
        await envAPI.delete(varId);
        toast.success("Environment variable deleted successfully");
        fetchVariables();
      } catch (error) {
        toast.error("Failed to delete environment variable");
      }
    }
  };

  const toggleValueVisibility = (varId) => {
    setVisibleValues((prev) => ({
      ...prev,
      [varId]: !prev[varId],
    }));
  };

  const selectedTenantData = tenants.find(
    (t) => t.id === parseInt(selectedTenant)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Environment Variables
          </h1>
          <p className="text-gray-600">
            Manage secure environment variables for tenant applications
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          disabled={!selectedTenant}
          className="btn-primary flex items-center space-x-2 disabled:opacity-50"
        >
          <PlusIcon className="h-4 w-4" />
          <span>Add Variable</span>
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

      {/* Environment Variables List */}
      {selectedTenant && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Variables
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {variables.length}
                  </p>
                </div>
                <CogIcon className="h-8 w-8 text-blue-600" />
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Secure</p>
                  <p className="text-2xl font-bold text-green-600">
                    {variables.filter((v) => v.isEncrypted).length}
                  </p>
                </div>
                <ShieldCheckIcon className="h-8 w-8 text-green-600" />
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Unsecure</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {variables.filter((v) => !v.isEncrypted).length}
                  </p>
                </div>
                <ExclamationTriangleIcon className="h-8 w-8 text-orange-600" />
              </div>
            </div>
          </div>

          {/* Variables List */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Environment Variables for {selectedTenantData?.name}
              </h3>
              <span className="text-sm text-gray-500">
                {variables.length} variable{variables.length !== 1 ? "s" : ""}{" "}
                configured
              </span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
              </div>
            ) : variables.length === 0 ? (
              <div className="text-center py-8">
                <CogIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  No environment variables configured
                </h4>
                <p className="text-gray-500 mb-4">
                  Add environment variables to configure application settings
                  for this tenant.
                </p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="btn-primary"
                >
                  Add First Variable
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {variables.map((variable) => (
                  <div
                    key={variable.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div
                          className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                            variable.isEncrypted
                              ? "bg-green-100"
                              : "bg-orange-100"
                          }`}
                        >
                          {variable.isEncrypted ? (
                            <ShieldCheckIcon className="h-5 w-5 text-green-600" />
                          ) : (
                            <KeyIcon className="h-5 w-5 text-orange-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <p className="font-medium text-gray-900 font-mono">
                              {variable.key}
                            </p>
                            <span
                              className={`status-badge ${
                                variable.isEncrypted
                                  ? "bg-green-100 text-green-800"
                                  : "bg-orange-100 text-orange-800"
                              }`}
                            >
                              {variable.isEncrypted
                                ? "Encrypted"
                                : "Plain Text"}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <p className="text-sm text-gray-500 font-mono break-all">
                              {variable.isEncrypted
                                ? visibleValues[variable.id]
                                  ? variable.value
                                  : "••••••••••••••••"
                                : visibleValues[variable.id]
                                ? variable.value
                                : "••••••••••••••••"}
                            </p>
                            <button
                              onClick={() => toggleValueVisibility(variable.id)}
                              className="p-1 text-gray-400 hover:text-gray-600"
                              title={
                                visibleValues[variable.id]
                                  ? "Hide value"
                                  : "Show value"
                              }
                            >
                              {visibleValues[variable.id] ? (
                                <EyeSlashIcon className="h-4 w-4" />
                              ) : (
                                <EyeIcon className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                          {variable.description && (
                            <p className="text-sm text-gray-500 mt-1">
                              {variable.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setEditingVar(variable)}
                          className="p-1 text-teal-600 hover:text-teal-800"
                          title="Edit"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteVariable(variable.id)}
                          className="p-1 text-red-600 hover:text-red-800"
                          title="Delete"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Variable Modal */}
      {showAddModal && (
        <EnvironmentVariableModal
          tenantId={selectedTenant}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddVariable}
        />
      )}

      {/* Edit Variable Modal */}
      {editingVar && (
        <EnvironmentVariableModal
          tenantId={selectedTenant}
          variable={editingVar}
          onClose={() => setEditingVar(null)}
          onSubmit={(data) => handleUpdateVariable(editingVar.id, data)}
        />
      )}
    </div>
  );
};

// Environment Variable Modal Component
const EnvironmentVariableModal = ({
  tenantId,
  variable,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState({
    key: variable?.key || "",
    value: variable?.value || "",
    description: variable?.description || "",
    isEncrypted: variable?.isEncrypted ?? true,
  });
  const [loading, setLoading] = useState(false);
  const [showValue, setShowValue] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit(formData);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {variable ? "Edit Environment Variable" : "Add Environment Variable"}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">Variable Name</label>
            <input
              type="text"
              required
              className="form-input font-mono"
              placeholder="DATABASE_URL"
              value={formData.key}
              onChange={(e) =>
                setFormData({ ...formData, key: e.target.value.toUpperCase() })
              }
            />
            <p className="text-xs text-gray-500 mt-1">
              Variable names are automatically converted to uppercase
            </p>
          </div>

          <div>
            <label className="form-label">Value</label>
            <div className="relative">
              <input
                type={showValue ? "text" : "password"}
                required
                className="form-input font-mono pr-10"
                placeholder="Enter variable value"
                value={formData.value}
                onChange={(e) =>
                  setFormData({ ...formData, value: e.target.value })
                }
              />
              <button
                type="button"
                onClick={() => setShowValue(!showValue)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showValue ? (
                  <EyeSlashIcon className="h-4 w-4" />
                ) : (
                  <EyeIcon className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="form-label">Description (Optional)</label>
            <textarea
              className="form-input"
              rows="2"
              placeholder="Brief description of what this variable is used for"
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
                checked={formData.isEncrypted}
                onChange={(e) =>
                  setFormData({ ...formData, isEncrypted: e.target.checked })
                }
                className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Encrypt this variable
              </span>
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Recommended for sensitive data like API keys, passwords, and
              tokens
            </p>
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
                : variable
                ? "Update Variable"
                : "Add Variable"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EnvironmentVariables;
