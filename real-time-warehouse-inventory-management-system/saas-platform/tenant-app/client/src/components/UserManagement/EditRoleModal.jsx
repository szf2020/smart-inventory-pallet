import React, { useState, useEffect } from "react";
import { X, Shield, AlertCircle, Save, Check } from "lucide-react";

const getApiUrl = () => {
  if (window.location.hostname === "localhost") {
    return import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  }
  return `https://${window.location.hostname}/api`;
};

const EditRoleModal = ({ isOpen, onClose, onSuccess, role }) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    tab_permissions: {
      dashboard: true,
      stock: false,
      loading: false,
      discounts: false,
      credits: false,
      expenses: false,
      reports: false,
      manage: false,
      representatives: false,
      users_roles: false,
      help: true,
    },
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const tabLabels = {
    dashboard: 'Dashboard',
    stock: 'Stock Management',
    loading: 'Loading Management',
    discounts: 'Discount Management',
    credits: 'Credit Management',
    expenses: 'Expense Management',
    reports: 'Reports',
    manage: 'Management',
    representatives: 'Representatives',
    users_roles: 'User & Role Management',
    help: 'Help'
  };

  useEffect(() => {
    if (role && isOpen) {
      setFormData({
        name: role.name || "",
        description: role.description || "",
        tab_permissions: role.tab_permissions || {
          dashboard: true,
          stock: false,
          loading: false,
          discounts: false,
          credits: false,
          expenses: false,
          reports: false,
          manage: false,
          representatives: false,
          users_roles: false,
          help: true,
        },
      });
      setErrors({});
    }
  }, [role, isOpen]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Role name is required";
    } else if (formData.name.length < 2) {
      newErrors.name = "Role name must be at least 2 characters";
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const response = await fetch(`${getApiUrl()}/roles/${role.role_id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          tab_permissions: formData.tab_permissions,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        onSuccess();
      } else {
        setErrors({ submit: data.message || "Failed to update role" });
      }
    } catch (error) {
      console.error("Error updating role:", error);
      setErrors({ submit: "Network error occurred" });
    }

    setLoading(false);
  };

  const handleClose = () => {
    onClose();
    setErrors({});
  };

  const handleTabPermissionChange = (tabKey) => {
    setFormData(prev => ({
      ...prev,
      tab_permissions: {
        ...prev.tab_permissions,
        [tabKey]: !prev.tab_permissions[tabKey]
      }
    }));
  };

  if (!isOpen || !role) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Edit Role: {role.name}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {errors.submit && (
            <div className="flex items-center space-x-2 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span className="text-red-700">{errors.submit}</span>
            </div>
          )}

          {/* System Role Warning */}
          {role.is_system_role && (
            <div className="flex items-center space-x-2 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              <span className="text-amber-700">
                This is a system role. Some modifications may be restricted.
              </span>
            </div>
          )}

          {/* Basic Information */}
          <div className="space-y-4">
            {/* Role Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                disabled={role.is_system_role}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.name ? "border-red-300" : "border-gray-300"
                } ${role.is_system_role ? "bg-gray-100 cursor-not-allowed" : ""}`}
                placeholder="Enter role name"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter role description"
              />
            </div>
          </div>

          {/* Tab Permissions */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Tab Permissions
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Select which tabs this role can access
            </p>

            <div className="space-y-3">
              {Object.entries(formData.tab_permissions).map(([tabKey, hasAccess]) => (
                <div
                  key={tabKey}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className={`w-8 h-8 rounded-md flex items-center justify-center ${
                        hasAccess ? 'bg-green-100' : 'bg-gray-100'
                      }`}>
                        <Check className={`w-4 h-4 ${
                          hasAccess ? 'text-green-600' : 'text-gray-400'
                        }`} />
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">
                        {tabLabels[tabKey]}
                      </h4>
                      <p className="text-xs text-gray-500">
                        Access to {tabLabels[tabKey].toLowerCase()} functionality
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasAccess}
                      onChange={() => handleTabPermissionChange(tabKey)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-4 h-4 mr-2" />
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditRoleModal;
