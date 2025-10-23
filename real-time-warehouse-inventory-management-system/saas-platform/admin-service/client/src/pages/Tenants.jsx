import React, { useState, useEffect, useCallback } from "react";
import { tenantsAPI } from "../services/api";
import toast from "react-hot-toast";
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  BuildingOfficeIcon,
  InformationCircleIcon,
  ServerIcon,
  CreditCardIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

const Tenants = () => {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchTenants = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 10,
        ...(searchQuery && { search: searchQuery }),
      };
      const response = await tenantsAPI.getAll(params);
      setTenants(response.tenants);
      setTotalPages(response.pagination.totalPages);
    } catch (error) {
      toast.error("Failed to fetch tenants");
      console.error("Error fetching tenants:", error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const handleCreateTenant = async (tenantData) => {
    try {
      await tenantsAPI.create(tenantData);
      toast.success("Tenant created successfully");
      setShowCreateModal(false);
      fetchTenants();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create tenant");
    }
  };

  const handleUpdateStatus = async (tenantId, newStatus) => {
    try {
      await tenantsAPI.updateStatus(tenantId, newStatus);
      toast.success(`Tenant ${newStatus} successfully`);
      fetchTenants();
    } catch (error) {
      console.error("Failed to update tenant status:", error);
      toast.error("Failed to update tenant status");
    }
  };

  const handleDeleteTenant = async (tenantId) => {
    if (window.confirm("Are you sure you want to delete this tenant?")) {
      try {
        await tenantsAPI.delete(tenantId);
        toast.success("Tenant deleted successfully");
        fetchTenants();
      } catch (error) {
        console.error("Failed to delete tenant:", error);
        toast.error("Failed to delete tenant");
      }
    }
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      active: "status-badge status-active",
      inactive: "status-badge status-inactive",
      suspended: "status-badge bg-red-100 text-red-800",
    };
    return statusClasses[status] || "status-badge bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tenants</h1>
          <p className="text-gray-600">Manage all tenant accounts</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <PlusIcon className="h-4 w-4" />
          <span>Add Tenant</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="card">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search tenants..."
              className="form-input pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select className="form-input w-auto">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Tenant</th>
                <th className="table-header">Subdomain</th>
                <th className="table-header">Status</th>
                <th className="table-header">Plan</th>
                <th className="table-header">Created</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-gray-50">
                  <td className="table-cell">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-r from-teal-500 to-blue-600 flex items-center justify-center mr-3">
                        <BuildingOfficeIcon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {tenant.company_name || "Unnamed Company"}
                        </div>
                        <div className="text-sm text-gray-500">
                          {tenant.contact_email || "No email provided"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                      {tenant.subdomain}.zendensolutions.store
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className={getStatusBadge(tenant.status)}>
                      {tenant.status}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className="text-sm text-gray-900">
                      {tenant.billing?.plan || "Free"}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className="text-sm text-gray-500">
                      {new Date(tenant.created_at).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedTenant(tenant)}
                        className="p-1 text-blue-600 hover:text-blue-800"
                        title="View Details"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setSelectedTenant(tenant)}
                        className="p-1 text-teal-600 hover:text-teal-800"
                        title="Edit"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTenant(tenant.id)}
                        className="p-1 text-red-600 hover:text-red-800"
                        title="Delete"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              className="btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <TenantModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateTenant}
        />
      )}

      {selectedTenant && (
        <TenantDetailsModal
          tenant={selectedTenant}
          onClose={() => setSelectedTenant(null)}
          onStatusUpdate={handleUpdateStatus}
        />
      )}
    </div>
  );
};

// Create Tenant Modal Component
const TenantModal = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    // Tenant Basic Info
    subdomain: "",
    database_name: "",
    status: "pending",
    company_name: "",
    contact_email: "",
    contact_phone: "",

    // Database Configuration
    database_user: "postgres",
    database_password: "",
    database_host: "localhost",
    database_port: 5432,

    // Billing Information
    billing_status: "trial",
    plan: "free",
    monthly_rate: 0.0,
    billing_cycle: "monthly",
    trial_ends_at: "",

    // SSL Certificate (Optional)
    ssl_domain: "",
    certificate_path: "",
    private_key_path: "",
    ssl_expires_at: "",

    // Domain Setup (Optional)
    auto_setup_domain: true,
    generate_ssl: true,
  });

  const [loading, setLoading] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);

  const sections = [
    { title: "Basic Information", icon: InformationCircleIcon },
    { title: "Database Configuration", icon: ServerIcon },
    { title: "Billing Setup", icon: CreditCardIcon },
    { title: "Domain & SSL Setup", icon: ShieldCheckIcon },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Only allow submission on the final step
    if (currentSection !== sections.length - 1) {
      console.log("Form submission prevented - not on final step");
      return;
    }

    // Validate final step before submission
    const sslErrors = validateSSLConfig();
    if (sslErrors.length > 0) {
      toast.error(sslErrors[0]);
      return;
    }

    setLoading(true);

    // Set trial end date if not specified (14 days from now)
    if (!formData.trial_ends_at && formData.billing_status === "trial") {
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 14);
      formData.trial_ends_at = trialEnd.toISOString().split("T")[0];
    }

    await onSubmit(formData);
    setLoading(false);
  };

  const handleInputChange = (field, value) => {
    // Validate subdomain input to only allow lowercase letters and numbers
    if (field === "subdomain") {
      value = value.toLowerCase().replace(/[^a-z0-9]/g, "");
    }

    setFormData((prev) => ({ ...prev, [field]: value }));

    // Auto-generate database name from subdomain
    if (field === "subdomain" && value) {
      setFormData((prev) => ({
        ...prev,
        database_name: `cnh_${value.toLowerCase()}_${Date.now()
          .toString()
          .slice(-6)}`,
      }));
    }
  };

  // Validation functions for each section
  const validateBasicInfo = () => {
    const errors = [];
    if (!formData.subdomain) errors.push("Subdomain is required");
    if (!formData.company_name) errors.push("Company name is required");
    if (formData.subdomain && formData.subdomain.length < 3)
      errors.push("Subdomain must be at least 3 characters");
    if (formData.subdomain && !/^[a-z0-9]+$/.test(formData.subdomain))
      errors.push("Subdomain can only contain lowercase letters and numbers");
    if (formData.contact_email && !/\S+@\S+\.\S+/.test(formData.contact_email))
      errors.push("Please enter a valid email address");
    return errors;
  };

  const validateDatabaseConfig = () => {
    const errors = [];
    if (!formData.database_name) errors.push("Database name is required");
    if (!formData.database_user) errors.push("Database user is required");
    if (!formData.database_password)
      errors.push("Database password is required");
    if (!formData.database_host) errors.push("Database host is required");
    return errors;
  };

  const validateBillingSetup = () => {
    const errors = [];
    if (formData.monthly_rate < 0)
      errors.push("Monthly rate cannot be negative");
    return errors;
  };

  const validateSSLConfig = () => {
    const errors = [];

    // Only validate manual SSL fields if auto setup is disabled
    if (!formData.auto_setup_domain) {
      if (formData.ssl_domain && !formData.certificate_path) {
        errors.push("Certificate path is required when SSL domain is provided");
      }
      if (formData.certificate_path && !formData.ssl_domain) {
        errors.push("SSL domain is required when certificate path is provided");
      }
    }

    return errors;
  };

  const nextSection = () => {
    console.log("Next section clicked, current section:", currentSection);

    // Validate current section before proceeding
    let errors = [];

    switch (currentSection) {
      case 0:
        errors = validateBasicInfo();
        break;
      case 1:
        errors = validateDatabaseConfig();
        break;
      case 2:
        errors = validateBillingSetup();
        break;
      case 3:
        errors = validateSSLConfig();
        break;
      default:
        break;
    }

    if (errors.length > 0) {
      console.log("Validation errors:", errors);
      toast.error(errors[0]); // Show first error
      return;
    }

    if (currentSection < sections.length - 1) {
      const newSection = currentSection + 1;
      console.log("Moving to section:", newSection);
      setCurrentSection(newSection);
    } else {
      console.log("Already at last section");
    }
  };

  const prevSection = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
    }
  };

  const renderBasicInfo = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Company Name *</label>
          <input
            type="text"
            required
            className="form-input"
            value={formData.company_name}
            onChange={(e) => handleInputChange("company_name", e.target.value)}
            placeholder="Enter company name"
          />
        </div>
        <div>
          <label className="form-label">Subdomain *</label>
          <div className="relative">
            <input
              type="text"
              required
              className="form-input pr-32"
              value={formData.subdomain}
              onChange={(e) => handleInputChange("subdomain", e.target.value)}
              placeholder="mycompany"
              pattern="[a-z0-9]{3,50}"
              title="Only lowercase letters and numbers allowed (3-50 characters)"
              minLength="3"
              maxLength="50"
            />
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
              .zendensolutions.store
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Only lowercase letters and numbers (3-50 characters)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Contact Email</label>
          <input
            type="email"
            className="form-input"
            value={formData.contact_email}
            onChange={(e) => handleInputChange("contact_email", e.target.value)}
            placeholder="contact@company.com"
          />
        </div>
        <div>
          <label className="form-label">Contact Phone</label>
          <input
            type="tel"
            className="form-input"
            value={formData.contact_phone}
            onChange={(e) => handleInputChange("contact_phone", e.target.value)}
            placeholder="+1 (555) 123-4567"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Database Name *</label>
          <input
            type="text"
            required
            className="form-input bg-gray-50"
            value={formData.database_name}
            onChange={(e) => handleInputChange("database_name", e.target.value)}
            placeholder="Auto-generated from subdomain"
          />
          <p className="text-xs text-gray-500 mt-1">
            Auto-generated, but can be modified
          </p>
        </div>
        <div>
          <label className="form-label">Initial Status</label>
          <select
            className="form-input"
            value={formData.status}
            onChange={(e) => handleInputChange("status", e.target.value)}
          >
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderDatabaseConfig = () => (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <h4 className="text-sm font-medium text-blue-800 mb-1">
          Database Configuration
        </h4>
        <p className="text-xs text-blue-600">
          Configure the dedicated database connection for this tenant
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Database User</label>
          <input
            type="text"
            className="form-input"
            value={formData.database_user}
            onChange={(e) => handleInputChange("database_user", e.target.value)}
            placeholder="postgres"
          />
        </div>
        <div>
          <label className="form-label">Database Password</label>
          <input
            type="password"
            className="form-input"
            value={formData.database_password}
            onChange={(e) =>
              handleInputChange("database_password", e.target.value)
            }
            placeholder="Enter database password"
          />
          <p className="text-xs text-gray-500 mt-1">
            Will be encrypted automatically
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Database Host</label>
          <input
            type="text"
            className="form-input"
            value={formData.database_host}
            onChange={(e) => handleInputChange("database_host", e.target.value)}
            placeholder="localhost"
          />
        </div>
        <div>
          <label className="form-label">Database Port</label>
          <input
            type="number"
            className="form-input"
            value={formData.database_port}
            onChange={(e) =>
              handleInputChange(
                "database_port",
                parseInt(e.target.value) || 5432
              )
            }
            placeholder="5432"
            min="1"
            max="65535"
          />
        </div>
      </div>
    </div>
  );

  const renderBillingSetup = () => (
    <div className="space-y-4">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
        <h4 className="text-sm font-medium text-green-800 mb-1">
          Billing Configuration
        </h4>
        <p className="text-xs text-green-600">
          Set up billing plan and trial information for this tenant
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Billing Status</label>
          <select
            className="form-input"
            value={formData.billing_status}
            onChange={(e) =>
              handleInputChange("billing_status", e.target.value)
            }
          >
            <option value="trial">Trial</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="cancelled">Cancelled</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
        <div>
          <label className="form-label">Plan</label>
          <select
            className="form-input"
            value={formData.plan}
            onChange={(e) => handleInputChange("plan", e.target.value)}
          >
            <option value="free">Free</option>
            <option value="basic">Basic</option>
            <option value="premium">Premium</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Monthly Rate (LKR)</label>
          <input
            type="number"
            step="0.01"
            className="form-input"
            value={formData.monthly_rate}
            onChange={(e) =>
              handleInputChange("monthly_rate", parseFloat(e.target.value) || 0)
            }
            placeholder="0.00"
            min="0"
          />
        </div>
        <div>
          <label className="form-label">Billing Cycle</label>
          <select
            className="form-input"
            value={formData.billing_cycle}
            onChange={(e) => handleInputChange("billing_cycle", e.target.value)}
          >
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
      </div>

      <div>
        <label className="form-label">Trial Ends At</label>
        <input
          type="date"
          className="form-input"
          value={formData.trial_ends_at}
          onChange={(e) => handleInputChange("trial_ends_at", e.target.value)}
          min={new Date().toISOString().split("T")[0]}
        />
        <p className="text-xs text-gray-500 mt-1">
          Leave empty for default 14-day trial
        </p>
      </div>
    </div>
  );

  const renderSSLConfig = () => (
    <div className="space-y-4">
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
        <h4 className="text-sm font-medium text-purple-800 mb-1">
          SSL Certificate & Domain Setup
        </h4>
        <p className="text-xs text-purple-600">
          Configure SSL certificate and automatic domain setup
        </p>
      </div>

      {/* Auto Domain Setup */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h5 className="text-sm font-medium text-blue-800">
            Automatic Domain Setup
          </h5>
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              className="form-checkbox h-4 w-4 text-blue-600"
              checked={formData.auto_setup_domain}
              onChange={(e) =>
                handleInputChange("auto_setup_domain", e.target.checked)
              }
            />
            <span className="ml-2 text-sm text-blue-700">
              Enable Auto Setup
            </span>
          </label>
        </div>
        <p className="text-xs text-blue-600 mb-3">
          Automatically configure Nginx and SSL certificates for{" "}
          {formData.subdomain
            ? `${formData.subdomain}.zendensolutions.store`
            : "your domain"}
        </p>
        {formData.auto_setup_domain && (
          <div className="mt-3">
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                className="form-checkbox h-4 w-4 text-green-600"
                checked={formData.generate_ssl}
                onChange={(e) =>
                  handleInputChange("generate_ssl", e.target.checked)
                }
              />
              <span className="ml-2 text-sm text-green-700">
                Generate SSL Certificate (Let's Encrypt)
              </span>
            </label>
          </div>
        )}
      </div>

      {/* Manual SSL Configuration */}
      {!formData.auto_setup_domain && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">SSL Domain</label>
              <input
                type="text"
                className="form-input"
                value={formData.ssl_domain}
                onChange={(e) =>
                  handleInputChange("ssl_domain", e.target.value)
                }
                placeholder="mycompany.zendensolutions.store"
              />
            </div>
            <div>
              <label className="form-label">Certificate Expires At</label>
              <input
                type="date"
                className="form-input"
                value={formData.ssl_expires_at}
                onChange={(e) =>
                  handleInputChange("ssl_expires_at", e.target.value)
                }
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Certificate Path *</label>
              <input
                type="text"
                className="form-input"
                value={formData.certificate_path}
                onChange={(e) =>
                  handleInputChange("certificate_path", e.target.value)
                }
                placeholder="/path/to/certificate.crt"
                required={formData.ssl_domain}
              />
            </div>
            <div>
              <label className="form-label">Private Key Path</label>
              <input
                type="text"
                className="form-input"
                value={formData.private_key_path}
                onChange={(e) =>
                  handleInputChange("private_key_path", e.target.value)
                }
                placeholder="/path/to/private.key"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-gray-900">
              Create New Tenant
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center mt-4 space-x-4">
            {sections.map((section, index) => (
              <div key={index} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                    index === currentSection
                      ? "bg-teal-600 text-white"
                      : index < currentSection
                      ? "bg-green-600 text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {index < currentSection ? "✓" : index + 1}
                </div>
                <span className="ml-2 text-sm font-medium text-gray-600">
                  {section.title}
                </span>
                {index < sections.length - 1 && (
                  <div
                    className={`w-8 h-0.5 mx-4 ${
                      index < currentSection ? "bg-green-600" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="mb-6">
              <h4 className="text-lg font-medium text-gray-900 flex items-center">
                {(() => {
                  const IconComponent = sections[currentSection].icon;
                  return (
                    <IconComponent className="h-6 w-6 mr-3 text-teal-600" />
                  );
                })()}
                {sections[currentSection].title}
              </h4>
            </div>

            {currentSection === 0 && renderBasicInfo()}
            {currentSection === 1 && renderDatabaseConfig()}
            {currentSection === 2 && renderBillingSetup()}
            {currentSection === 3 && renderSSLConfig()}
          </div>

          {/* Footer with Navigation */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex justify-between">
              <button
                type="button"
                onClick={prevSection}
                disabled={currentSection === 0}
                className="btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              <div className="flex space-x-3">
                <button type="button" onClick={onClose} className="btn-outline">
                  Cancel
                </button>

                {currentSection < sections.length - 1 ? (
                  <button
                    type="button"
                    onClick={nextSection}
                    className="btn-primary"
                  >
                    Next
                  </button>
                ) : (
                  <form onSubmit={handleSubmit}>
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-primary"
                    >
                      {loading ? "Creating..." : "Create Tenant"}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Tenant Details Modal Component
const TenantDetailsModal = ({ tenant, onClose, onStatusUpdate }) => {
  const getStatusBadge = (status) => {
    const statusClasses = {
      active: "status-badge status-active",
      inactive: "status-badge status-inactive",
      pending: "status-badge bg-yellow-100 text-yellow-800",
      suspended: "status-badge bg-red-100 text-red-800",
    };
    return statusClasses[status] || "status-badge bg-gray-100 text-gray-800";
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          Tenant Details
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 border-b pb-2">
              Basic Information
            </h4>
            <div>
              <label className="text-sm font-medium text-gray-500">
                Company Name
              </label>
              <p className="text-gray-900">
                {tenant.company_name || "Not provided"}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">
                Contact Email
              </label>
              <p className="text-gray-900">
                {tenant.contact_email || "Not provided"}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">
                Contact Phone
              </label>
              <p className="text-gray-900">
                {tenant.contact_phone || "Not provided"}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">
                Subdomain
              </label>
              <p className="text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded">
                {tenant.subdomain}.zendensolutions.store
              </p>
            </div>
          </div>

          {/* Technical Information */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 border-b pb-2">
              Technical Details
            </h4>
            <div>
              <label className="text-sm font-medium text-gray-500">
                Database Name
              </label>
              <p className="text-gray-900 font-mono text-sm">
                {tenant.database_name}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">
                Database Host
              </label>
              <p className="text-gray-900">
                {tenant.database_host}:{tenant.database_port}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">
                Database User
              </label>
              <p className="text-gray-900">{tenant.database_user}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">
                Created
              </label>
              <p className="text-gray-900">
                {new Date(tenant.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Status Update */}
        <div className="mt-6 pt-4 border-t">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-500">
                Current Status
              </label>
              <div className="flex items-center space-x-3 mt-1">
                <span
                  className={`status-badge ${getStatusBadge(tenant.status)}`}
                >
                  {tenant.status}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">
                Update Status:
              </label>
              <select
                value={tenant.status}
                onChange={(e) => onStatusUpdate(tenant.id, e.target.value)}
                className="form-input w-auto"
              >
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>
        </div>

        {/* Billing Information */}
        {tenant.billing && (
          <div className="mt-6 pt-4 border-t">
            <h4 className="font-medium text-gray-900 mb-3">
              Billing Information
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <label className="text-gray-500">Plan</label>
                <p className="font-medium">{tenant.billing.plan}</p>
              </div>
              <div>
                <label className="text-gray-500">Status</label>
                <p className="font-medium">{tenant.billing.status}</p>
              </div>
              <div>
                <label className="text-gray-500">Monthly Rate</label>
                <p className="font-medium">LKR {tenant.billing.monthly_rate}</p>
              </div>
              <div>
                <label className="text-gray-500">Billing Cycle</label>
                <p className="font-medium">{tenant.billing.billing_cycle}</p>
              </div>
            </div>
            {tenant.billing.trial_ends_at && (
              <div className="mt-3">
                <label className="text-gray-500">Trial Ends</label>
                <p className="font-medium">
                  {new Date(tenant.billing.trial_ends_at).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        )}

        {/* SSL Certificate Information */}
        {tenant.sslCertificates && tenant.sslCertificates.length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <h4 className="font-medium text-gray-900 mb-3">SSL Certificates</h4>
            {tenant.sslCertificates.map((ssl, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4 mb-3">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <label className="text-gray-500">Domain</label>
                    <p className="font-medium">{ssl.domain}</p>
                  </div>
                  <div>
                    <label className="text-gray-500">Status</label>
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        ssl.status === "active"
                          ? "bg-green-100 text-green-800"
                          : ssl.status === "expired"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {ssl.status}
                    </span>
                  </div>
                  <div>
                    <label className="text-gray-500">Expires</label>
                    <p className="font-medium">
                      {new Date(ssl.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
          <button onClick={onClose} className="btn-outline">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default Tenants;
