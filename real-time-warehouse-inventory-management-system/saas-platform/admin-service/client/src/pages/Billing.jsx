import React, { useState, useEffect, useCallback } from "react";
import { billingAPI } from "../services/api";
import toast from "react-hot-toast";
import {
  CreditCardIcon,
  BanknotesIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  PencilIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

const Billing = () => {
  const [billingRecords, setBillingRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPlan, setFilterPlan] = useState("");

  const fetchBillingRecords = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 10,
        ...(searchQuery && { search: searchQuery }),
        ...(filterStatus && { paymentStatus: filterStatus }),
        ...(filterPlan && { planType: filterPlan }),
      };
      const response = await billingAPI.getAll(params);
      setBillingRecords(response.billingRecords);
      setTotalPages(response.pagination.totalPages);
    } catch (error) {
      toast.error("Failed to fetch billing records");
      console.error("Error fetching billing records:", error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery, filterStatus, filterPlan]);

  useEffect(() => {
    fetchBillingRecords();
  }, [fetchBillingRecords]);

  const handleUpdatePaymentStatus = async (record, newStatus) => {
    try {
      const updateData = {
        paymentStatus: newStatus,
      };

      // If marking as paid, set next billing date according to billing cycle
      if (newStatus === "paid") {
        const now = new Date();
        let nextBillingDate;
        if (record.billingCycle === "monthly") {
          nextBillingDate = new Date(now.setMonth(now.getMonth() + 1));
        } else if (record.billingCycle === "yearly") {
          nextBillingDate = new Date(now.setFullYear(now.getFullYear() + 1));
        }
        updateData.nextBillingDate = nextBillingDate.toISOString();
      }

      await billingAPI.updatePaymentStatus(record.tenantId, updateData);
      toast.success(`Payment status updated to ${newStatus}`);
      fetchBillingRecords();
    } catch (error) {
      console.error("Failed to update payment status:", error);
      toast.error(
        error.response?.data?.message || "Failed to update payment status"
      );
    }
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      paid: "status-badge bg-green-100 text-green-800",
      pending: "status-badge status-pending",
      failed: "status-badge bg-red-100 text-red-800",
      overdue: "status-badge bg-orange-100 text-orange-800",
    };
    return statusClasses[status] || "status-badge bg-gray-100 text-gray-800";
  };

  const getPlanBadge = (plan) => {
    const planClasses = {
      basic: "status-badge bg-blue-100 text-blue-800",
      pro: "status-badge bg-purple-100 text-purple-800",
      enterprise: "status-badge bg-teal-100 text-teal-800",
    };
    return planClasses[plan] || "status-badge bg-gray-100 text-gray-800";
  };

  const calculateMRR = () => {
    return billingRecords.reduce((total, record) => {
      if (
        record.paymentStatus === "paid" &&
        record.billingCycle === "monthly"
      ) {
        return total + Number(record.monthlyRate);
      }
      return total;
    }, 0);
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
          <h1 className="text-2xl font-bold text-gray-900">
            Billing Management
          </h1>
          <p className="text-gray-600">Monitor payments and subscriptions</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Monthly Revenue
              </p>
              <p className="text-2xl font-bold text-gray-900">
                ${calculateMRR().toLocaleString()}
              </p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center">
              <BanknotesIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Active Subscriptions
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {
                  billingRecords.filter((r) => r.paymentStatus === "paid")
                    .length
                }
              </p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-gradient-to-r from-teal-500 to-teal-600 flex items-center justify-center">
              <CreditCardIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Pending Payments
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {
                  billingRecords.filter((r) => r.paymentStatus === "pending")
                    .length
                }
              </p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-gradient-to-r from-yellow-500 to-yellow-600 flex items-center justify-center">
              <ClockIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Failed Payments
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {
                  billingRecords.filter((r) => r.paymentStatus === "failed")
                    .length
                }
              </p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-gradient-to-r from-red-500 to-red-600 flex items-center justify-center">
              <ChartBarIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
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
          <select
            className="form-input w-auto"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="overdue">Overdue</option>
          </select>
          <select
            className="form-input w-auto"
            value={filterPlan}
            onChange={(e) => setFilterPlan(e.target.value)}
          >
            <option value="">All Plans</option>
            <option value="basic">Basic</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>
      </div>

      {/* Billing Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Tenant</th>
                <th className="table-header">Plan</th>
                <th className="table-header">Amount</th>
                <th className="table-header">Billing Cycle</th>
                <th className="table-header">Status</th>
                <th className="table-header">Next Billing</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {billingRecords.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="table-cell">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center mr-3">
                        <CreditCardIcon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {record.tenant?.company_name ||
                            record.tenant?.subdomain ||
                            "Unknown Tenant"}
                        </div>
                        <div className="text-sm text-gray-500">
                          {record.tenant?.email || record.tenant?.subdomain
                            ? `${record.tenant.subdomain}.zendensolutions.store`
                            : "No domain info"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className={getPlanBadge(record.planType)}>
                      {record.planType}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className="font-medium text-gray-900">
                      $
                      {record.billingCycle === "monthly"
                        ? record.monthlyRate
                        : record.yearlyRate}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className="text-sm text-gray-900 capitalize">
                      {record.billingCycle}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className={getStatusBadge(record.paymentStatus)}>
                      {record.paymentStatus}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className="text-sm text-gray-500">
                      {record.nextBillingDate
                        ? new Date(record.nextBillingDate).toLocaleDateString()
                        : "N/A"}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedRecord(record)}
                        className="p-1 text-blue-600 hover:text-blue-800"
                        title="View Details"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setSelectedRecord(record)}
                        className="p-1 text-teal-600 hover:text-teal-800"
                        title="Edit Billing"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <div className="relative">
                        <select
                          value={record.paymentStatus}
                          onChange={(e) =>
                            handleUpdatePaymentStatus(record, e.target.value)
                          }
                          className={`text-xs border rounded px-2 py-1 min-w-[80px] ${
                            record.paymentStatus === "paid"
                              ? "border-green-300 bg-green-50 text-green-800"
                              : record.paymentStatus === "pending"
                              ? "border-yellow-300 bg-yellow-50 text-yellow-800"
                              : record.paymentStatus === "failed"
                              ? "border-red-300 bg-red-50 text-red-800"
                              : "border-orange-300 bg-orange-50 text-orange-800"
                          }`}
                          title="Update Payment Status"
                        >
                          <option value="pending">Pending</option>
                          <option value="paid">Paid</option>
                          <option value="failed">Failed</option>
                          <option value="overdue">Overdue</option>
                        </select>
                      </div>
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

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => {
              const overdueBilling = billingRecords.filter(
                (r) => r.paymentStatus === "overdue"
              );
              if (overdueBilling.length > 0) {
                toast.success(
                  `Found ${overdueBilling.length} overdue payments`
                );
              } else {
                toast.info("No overdue payments found");
              }
            }}
            className="p-4 text-left border border-orange-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-colors"
          >
            <ClockIcon className="h-6 w-6 text-orange-600 mb-2" />
            <p className="font-medium text-gray-900">Check Overdue</p>
            <p className="text-sm text-gray-500">Review overdue payments</p>
          </button>

          <button
            onClick={() => {
              const pendingCount = billingRecords.filter(
                (r) => r.paymentStatus === "pending"
              ).length;
              toast.info(`${pendingCount} pending payments need attention`);
            }}
            className="p-4 text-left border border-yellow-200 rounded-lg hover:border-yellow-300 hover:bg-yellow-50 transition-colors"
          >
            <BanknotesIcon className="h-6 w-6 text-yellow-600 mb-2" />
            <p className="font-medium text-gray-900">Pending Payments</p>
            <p className="text-sm text-gray-500">Review pending payments</p>
          </button>

          <button
            onClick={() => {
              const totalRevenue = billingRecords
                .filter((r) => r.paymentStatus === "paid")
                .reduce(
                  (sum, r) =>
                    sum +
                    (r.billingCycle === "yearly"
                      ? r.yearlyRate
                      : r.monthlyRate),
                  0
                );
              toast.success(`Total revenue: $${totalRevenue.toFixed(2)}`);
            }}
            className="p-4 text-left border border-green-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors"
          >
            <ChartBarIcon className="h-6 w-6 text-green-600 mb-2" />
            <p className="font-medium text-gray-900">Calculate Revenue</p>
            <p className="text-sm text-gray-500">View total revenue</p>
          </button>
        </div>
      </div>

      {/* Billing Details Modal */}
      {selectedRecord && (
        <BillingDetailsModal
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          onUpdate={fetchBillingRecords}
        />
      )}
    </div>
  );
};

// Billing Details Modal
const BillingDetailsModal = ({ record, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    planType: record.planType || "basic",
    monthlyRate: record.monthlyRate || 0,
    yearlyRate: record.yearlyRate || 0,
    billingCycle: record.billingCycle || "monthly",
    paymentStatus: record.paymentStatus || "pending",
    paymentMethod: record.paymentMethod || "",
    nextBillingDate: record.nextBillingDate
      ? new Date(record.nextBillingDate).toISOString().split("T")[0]
      : "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!formData.planType) {
      newErrors.planType = "Plan type is required";
    }

    if (formData.monthlyRate < 0) {
      newErrors.monthlyRate = "Monthly rate cannot be negative";
    }

    if (formData.yearlyRate < 0) {
      newErrors.yearlyRate = "Yearly rate cannot be negative";
    }

    if (formData.billingCycle === "monthly" && formData.monthlyRate <= 0) {
      newErrors.monthlyRate =
        "Monthly rate must be greater than 0 for monthly billing";
    }

    if (formData.billingCycle === "yearly" && formData.yearlyRate <= 0) {
      newErrors.yearlyRate =
        "Yearly rate must be greater than 0 for yearly billing";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please correct the errors in the form");
      return;
    }

    setLoading(true);
    try {
      const updateData = {
        ...formData,
        monthlyRate: parseFloat(formData.monthlyRate),
        yearlyRate: parseFloat(formData.yearlyRate),
        nextBillingDate: formData.nextBillingDate
          ? new Date(formData.nextBillingDate).toISOString()
          : null,
      };

      await billingAPI.update(record.tenantId, updateData);
      toast.success("Billing information updated successfully");
      onUpdate();
      onClose();
    } catch (error) {
      console.error("Failed to update billing:", error);
      toast.error(
        error.response?.data?.message || "Failed to update billing information"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Update Billing Information
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            <strong>Tenant:</strong> {record.tenant?.company_name || "Unknown"}
          </p>
          <p className="text-sm text-gray-600">
            <strong>Current Status:</strong>
            <span
              className={`ml-2 px-2 py-1 rounded-full text-xs ${
                record.paymentStatus === "paid"
                  ? "bg-green-100 text-green-800"
                  : record.paymentStatus === "pending"
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {record.paymentStatus}
            </span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">Plan Type</label>
            <select
              className={`form-input ${
                errors.planType ? "border-red-500" : ""
              }`}
              value={formData.planType}
              onChange={(e) => handleInputChange("planType", e.target.value)}
            >
              <option value="basic">Basic</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
            {errors.planType && (
              <p className="text-red-500 text-xs mt-1">{errors.planType}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Monthly Rate ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className={`form-input ${
                  errors.monthlyRate ? "border-red-500" : ""
                }`}
                value={formData.monthlyRate}
                onChange={(e) =>
                  handleInputChange("monthlyRate", e.target.value)
                }
              />
              {errors.monthlyRate && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.monthlyRate}
                </p>
              )}
            </div>
            <div>
              <label className="form-label">Yearly Rate ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className={`form-input ${
                  errors.yearlyRate ? "border-red-500" : ""
                }`}
                value={formData.yearlyRate}
                onChange={(e) =>
                  handleInputChange("yearlyRate", e.target.value)
                }
              />
              {errors.yearlyRate && (
                <p className="text-red-500 text-xs mt-1">{errors.yearlyRate}</p>
              )}
            </div>
          </div>

          <div>
            <label className="form-label">Billing Cycle</label>
            <select
              className="form-input"
              value={formData.billingCycle}
              onChange={(e) =>
                handleInputChange("billingCycle", e.target.value)
              }
            >
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          <div>
            <label className="form-label">Payment Status</label>
            <select
              className="form-input"
              value={formData.paymentStatus}
              onChange={(e) =>
                handleInputChange("paymentStatus", e.target.value)
              }
            >
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>

          <div>
            <label className="form-label">Payment Method</label>
            <select
              className="form-input"
              value={formData.paymentMethod}
              onChange={(e) =>
                handleInputChange("paymentMethod", e.target.value)
              }
            >
              <option value="">Select payment method</option>
              <option value="credit_card">Credit Card</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="paypal">PayPal</option>
              <option value="stripe">Stripe</option>
              <option value="manual">Manual</option>
            </select>
          </div>

          <div>
            <label className="form-label">Next Billing Date</label>
            <input
              type="date"
              className="form-input"
              value={formData.nextBillingDate}
              onChange={(e) =>
                handleInputChange("nextBillingDate", e.target.value)
              }
            />
          </div>

          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Current Amount:</strong> $
              {formData.billingCycle === "yearly"
                ? formData.yearlyRate
                : formData.monthlyRate}{" "}
              per {formData.billingCycle === "yearly" ? "year" : "month"}
            </p>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-outline flex-1"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1"
            >
              {loading ? "Updating..." : "Update Billing"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Billing;
