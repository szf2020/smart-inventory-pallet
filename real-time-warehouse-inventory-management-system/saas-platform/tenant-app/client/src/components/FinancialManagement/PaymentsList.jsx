import React, { useState, useEffect } from "react";
import {
  fetchPayments,
  fetchPaymentMethods,
  getPaymentSummary,
} from "../../services/api";
import { ArrowUpDown, Filter, TrendingUp, TrendingDown } from "lucide-react";

const PaymentsList = ({ refreshTrigger, entityType, entityId }) => {
  const [payments, setPayments] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortField, setSortField] = useState("payment_date");
  const [sortDirection, setSortDirection] = useState("desc");
  const [filters, setFilters] = useState({
    payment_type: "",
    party_type: "",
    status: "",
    method_id: "",
    start_date: "",
    end_date: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    const loadPaymentsData = async () => {
      try {
        setLoading(true);

        // Fetch reference data
        const [methodsResponse] = await Promise.all([fetchPaymentMethods()]);

        setPaymentMethods(methodsResponse.data || []);

        // Prepare params for payment query
        const params = {
          page: pagination.page,
          limit: pagination.limit,
          ...filters,
        };

        // Add entity filters if provided
        if (entityType === "customer") {
          params.party_type = "customer";
          params.party_id = entityId;
        } else if (entityType === "supplier") {
          params.party_type = "supplier";
          params.party_id = entityId;
        }

        // Fetch payments with filters
        const paymentsResponse = await fetchPayments(params);
        setPayments(paymentsResponse.data || []);
        setPagination(paymentsResponse.pagination || pagination);

        // Fetch summary data
        const summaryParams = { ...filters };
        if (entityType === "customer") {
          summaryParams.party_type = "customer";
          summaryParams.party_id = entityId;
        } else if (entityType === "supplier") {
          summaryParams.party_type = "supplier";
          summaryParams.party_id = entityId;
        }

        const summaryResponse = await getPaymentSummary(summaryParams);
        setSummary(summaryResponse.data || null);

        setError(null);
      } catch (err) {
        setError(
          "Failed to load payments: " +
            (err.response?.data?.message || err.message)
        );
        console.error(err);
        setPayments([]);
        setSummary(null);
      } finally {
        setLoading(false);
      }
    };

    loadPaymentsData();
  }, [
    refreshTrigger,
    entityType,
    entityId,
    sortField,
    sortDirection,
    filters,
    pagination.page,
  ]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
    setPagination((prev) => ({ ...prev, page: 1 })); // Reset to first page
  };

  const handleFilterToggle = () => {
    setShowFilters(!showFilters);
  };

  const handleFilterReset = () => {
    setFilters({
      payment_type: "",
      party_type: "",
      status: "",
      method_id: "",
      start_date: "",
      end_date: "",
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const formatCurrency = (amount) => {
    const numAmount = Number(amount);
    if (isNaN(numAmount)) {
      return "$0.00";
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(numAmount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  };

  const getPaymentMethodName = (methodId) => {
    const method = paymentMethods.find((m) => m.method_id === methodId);
    return method ? method.name : "Unknown";
  };

  const getPaymentTypeDisplay = (paymentType) => {
    const types = {
      sales_payment: {
        label: "Sales Payment",
        color: "text-green-600",
        icon: TrendingUp,
      },
      purchase_payment: {
        label: "Purchase Payment",
        color: "text-red-600",
        icon: TrendingDown,
      },
      advance_payment: {
        label: "Advance Payment",
        color: "text-blue-600",
        icon: TrendingUp,
      },
      refund: { label: "Refund", color: "text-orange-600", icon: TrendingDown },
    };
    return (
      types[paymentType] || {
        label: paymentType,
        color: "text-gray-600",
        icon: null,
      }
    );
  };

  const getAmountColor = (paymentType) => {
    return paymentType === "sales_payment" || paymentType === "advance_payment"
      ? "text-green-600"
      : "text-red-600";
  };

  const getAmountPrefix = (paymentType) => {
    return paymentType === "sales_payment" || paymentType === "advance_payment"
      ? "+"
      : "-";
  };

  if (loading && payments.length === 0)
    return <div className="flex justify-center p-6">Loading payments...</div>;
  if (error) return <div className="text-red-500 p-4">{error}</div>;

  return (
    <div>
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-500">Total Income</p>
                <p className="text-lg font-semibold text-green-600">
                  {formatCurrency(summary.summary.totalIncome)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-500">Total Expenses</p>
                <p className="text-lg font-semibold text-red-600">
                  {formatCurrency(summary.summary.totalExpenses)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center">
              <div
                className={`p-2 rounded-lg ${
                  summary.summary.netCashFlow >= 0
                    ? "bg-green-100"
                    : "bg-red-100"
                }`}
              >
                {summary.summary.netCashFlow >= 0 ? (
                  <TrendingUp className="h-6 w-6 text-green-600" />
                ) : (
                  <TrendingDown className="h-6 w-6 text-red-600" />
                )}
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-500">Net Cash Flow</p>
                <p
                  className={`text-lg font-semibold ${
                    summary.summary.netCashFlow >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {formatCurrency(summary.summary.netCashFlow)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Filter className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-500">Total Payments</p>
                <p className="text-lg font-semibold text-blue-600">
                  {summary.counts.totalPayments}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium text-gray-800">
          {entityType
            ? `Payments for ${
                entityType === "customer" ? "Customer" : "Supplier"
              } #${entityId}`
            : "All Payments"}
        </h2>
        <button
          onClick={handleFilterToggle}
          className="flex items-center gap-2 px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          <Filter size={16} />
          <span>{showFilters ? "Hide Filters" : "Show Filters"}</span>
        </button>
      </div>

      {showFilters && (
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Type
              </label>
              <select
                name="payment_type"
                value={filters.payment_type}
                onChange={handleFilterChange}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="">All Types</option>
                <option value="sales_payment">Sales Payment</option>
                <option value="purchase_payment">Purchase Payment</option>
                <option value="advance_payment">Advance Payment</option>
                <option value="refund">Refund</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Party Type
              </label>
              <select
                name="party_type"
                value={filters.party_type}
                onChange={handleFilterChange}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="">All Parties</option>
                <option value="customer">Customer</option>
                <option value="supplier">Supplier</option>
                <option value="expense">Expense</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Method
              </label>
              <select
                name="method_id"
                value={filters.method_id}
                onChange={handleFilterChange}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="">All Methods</option>
                {paymentMethods.map((method) => (
                  <option key={method.method_id} value={method.method_id}>
                    {method.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date Range
              </label>
              <div className="flex space-x-2">
                <input
                  type="date"
                  name="start_date"
                  value={filters.start_date}
                  onChange={handleFilterChange}
                  className="w-1/2 border border-gray-300 rounded px-3 py-2"
                />
                <input
                  type="date"
                  name="end_date"
                  value={filters.end_date}
                  onChange={handleFilterChange}
                  className="w-1/2 border border-gray-300 rounded px-3 py-2"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleFilterReset}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              Reset Filters
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg shadow">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-100">
            <tr>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort("payment_id")}
              >
                <div className="flex items-center">
                  ID
                  {sortField === "payment_id" && (
                    <ArrowUpDown size={14} className="ml-1" />
                  )}
                </div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort("payment_date")}
              >
                <div className="flex items-center">
                  Date
                  {sortField === "payment_date" && (
                    <ArrowUpDown size={14} className="ml-1" />
                  )}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Reference
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort("amount")}
              >
                <div className="flex items-center">
                  Amount
                  {sortField === "amount" && (
                    <ArrowUpDown size={14} className="ml-1" />
                  )}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Method
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Notes
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {!Array.isArray(payments) || payments.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-6 py-4 text-center text-gray-500">
                  No payments found
                </td>
              </tr>
            ) : (
              payments.map((payment) => {
                const typeDisplay = getPaymentTypeDisplay(payment.payment_type);
                const IconComponent = typeDisplay.icon;

                return (
                  <tr key={payment.payment_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      #{payment.payment_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {formatDate(payment.payment_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {IconComponent && (
                          <IconComponent
                            size={16}
                            className={`mr-2 ${typeDisplay.color}`}
                          />
                        )}
                        <span className={typeDisplay.color}>
                          {typeDisplay.label}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {payment.reference_id ? (
                        <div>
                          <span className="text-blue-600">
                            {payment.reference_type} #{payment.reference_id}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400">Manual Payment</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getAmountColor(payment.payment_type)}>
                        {getAmountPrefix(payment.payment_type)}
                        {formatCurrency(payment.amount)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {payment.paymentMethod?.name ||
                        getPaymentMethodName(payment.method_id)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`capitalize px-2 py-1 rounded-full text-xs ${
                          payment.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : payment.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : payment.status === "failed"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs truncate text-sm text-gray-600">
                        {payment.notes || "-"}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
          <div className="flex justify-between flex-1 sm:hidden">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing{" "}
                <span className="font-medium">
                  {(pagination.page - 1) * pagination.limit + 1}
                </span>{" "}
                to{" "}
                <span className="font-medium">
                  {Math.min(
                    pagination.page * pagination.limit,
                    pagination.total
                  )}
                </span>{" "}
                of <span className="font-medium">{pagination.total}</span>{" "}
                results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>

                {/* Page numbers */}
                {Array.from(
                  { length: Math.min(5, pagination.totalPages) },
                  (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          pagination.page === pageNum
                            ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                            : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                )}

                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentsList;
