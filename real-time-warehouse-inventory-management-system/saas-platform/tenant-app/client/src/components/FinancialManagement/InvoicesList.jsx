import React, { useState, useEffect } from "react";
import {
  fetchSalesInvoices,
  fetchPurchaseInvoices,
  fetchPayments,
  updateSalesInvoice,
  updatePurchaseInvoice,
} from "../../services/api";
import { ArrowUpDown, Filter, FileText } from "lucide-react";

const InvoicesList = ({ refreshTrigger, entityType, entityId }) => {
  const [salesInvoices, setSalesInvoices] = useState([]);
  const [purchaseInvoices, setPurchaseInvoices] = useState([]);
  const [invoicePayments, setInvoicePayments] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("sales");
  const [sortField, setSortField] = useState("invoice_date");
  const [sortDirection, setSortDirection] = useState("desc");
  const [filters, setFilters] = useState({
    status: "",
    startDate: "",
    endDate: "",
    minAmount: "",
    maxAmount: "",
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const loadInvoices = async () => {
      try {
        setLoading(true);

        // Prepare params for invoice queries
        const params = {
          sortBy: sortField,
          sortOrder: sortDirection,
          ...filters,
        };

        // Add entity filters if provided
        if (entityType === "customer") {
          params.customerId = entityId;
        } else if (entityType === "supplier") {
          params.supplierId = entityId;
        }

        // Fetch invoices with filters
        const [salesResponse, purchaseResponse] = await Promise.all([
          fetchSalesInvoices(params),
          fetchPurchaseInvoices(params),
        ]);

        const salesData =
          salesResponse.data.data?.invoices ||
          salesResponse.data?.invoices ||
          salesResponse.data ||
          [];
        const purchaseData = purchaseResponse.data.data || [];

        setSalesInvoices(salesData);
        setPurchaseInvoices(purchaseData);

        // Fetch payment data for all invoices to calculate outstanding balances
        await loadPaymentData([...salesData, ...purchaseData]);

        // If entity is customer, show sales invoices by default
        // If entity is supplier, show purchase invoices by default
        if (entityType === "customer") {
          setActiveTab("sales");
        } else if (entityType === "supplier") {
          setActiveTab("purchases");
        }

        setError(null);
      } catch (err) {
        setError(
          "Failed to load invoices: " +
            (err.response?.data?.message || err.message)
        );
        console.error(err);
        setSalesInvoices([]);
        setPurchaseInvoices([]);
      } finally {
        setLoading(false);
      }
    };

    loadInvoices();
  }, [refreshTrigger, entityType, entityId, sortField, sortDirection, filters]);

  const loadPaymentData = async (invoices) => {
    try {
      // Get all invoice IDs
      const salesInvoiceIds = invoices
        .filter((inv) => inv.customer_id)
        .map((inv) => inv.invoice_id);
      const purchaseInvoiceIds = invoices
        .filter((inv) => inv.supplier_id)
        .map((inv) => inv.invoice_id);

      const paymentPromises = [];

      // Fetch payments for sales invoices
      if (salesInvoiceIds.length > 0) {
        paymentPromises.push(
          fetchPayments({
            payment_type: "sales_payment",
            status: "completed",
          }).then((response) => ({
            type: "sales",
            payments: response.data || [],
          }))
        );
      }

      // Fetch payments for purchase invoices
      if (purchaseInvoiceIds.length > 0) {
        paymentPromises.push(
          fetchPayments({
            payment_type: "purchase_payment",
            status: "completed",
          }).then((response) => ({
            type: "purchase",
            payments: response.data || [],
          }))
        );
      }

      const paymentResults = await Promise.all(paymentPromises);

      // Organize payments by invoice
      const paymentsMap = {};

      paymentResults.forEach((result) => {
        result.payments.forEach((payment) => {
          if (payment.reference_id) {
            const key = `${result.type}_${payment.reference_id}`;
            if (!paymentsMap[key]) {
              paymentsMap[key] = 0;
            }
            paymentsMap[key] += parseFloat(payment.amount);
          }
        });
      });

      setInvoicePayments(paymentsMap);
    } catch (err) {
      console.error("Failed to load payment data:", err);
      // If payments fail to load, we can still show invoices without payment info
      setInvoicePayments({});
    }
  };

  const calculateOutstanding = (invoice, invoiceType) => {
    const key = `${invoiceType}_${invoice.invoice_id}`;
    const totalPaid = invoicePayments[key] || 0;
    const outstanding = parseFloat(invoice.total_amount) - totalPaid;
    return Math.max(0, outstanding);
  };

  const calculatePaidAmount = (invoice, invoiceType) => {
    const key = `${invoiceType}_${invoice.invoice_id}`;
    return invoicePayments[key] || 0;
  };

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
  };

  const handleFilterToggle = () => {
    setShowFilters(!showFilters);
  };

  const handleFilterReset = () => {
    setFilters({
      status: "",
      startDate: "",
      endDate: "",
      minAmount: "",
      maxAmount: "",
    });
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount || 0);
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

  // Get appropriate invoices based on active tab
  const currentInvoices =
    activeTab === "sales" ? salesInvoices : purchaseInvoices;

  // Ensure currentInvoices is always an array
  const safeCurrentInvoices = Array.isArray(currentInvoices)
    ? currentInvoices
    : [];

  if (loading && !safeCurrentInvoices.length)
    return <div className="flex justify-center p-6">Loading invoices...</div>;
  if (error) return <div className="text-red-500 p-4">{error}</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-medium text-gray-800">
            {entityType
              ? `Invoices for ${
                  entityType === "customer" ? "Customer" : "Supplier"
                } #${entityId}`
              : "All Invoices"}
          </h2>
          <div className="mt-2">
            <div className="flex space-x-4 border-b">
              <button
                className={`py-2 px-4 focus:outline-none ${
                  activeTab === "sales"
                    ? "border-b-2 border-blue-500 text-blue-600 font-medium"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => handleTabChange("sales")}
              >
                Sales Invoices
              </button>
              <button
                className={`py-2 px-4 focus:outline-none ${
                  activeTab === "purchases"
                    ? "border-b-2 border-blue-500 text-blue-600 font-medium"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => handleTabChange("purchases")}
              >
                Purchase Invoices
              </button>
            </div>
          </div>
        </div>
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
                Status
              </label>
              <select
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="">All Statuses</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="partially_paid">Partially Paid</option>
                <option value="cancelled">Cancelled</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount Range
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  name="minAmount"
                  placeholder="Min"
                  value={filters.minAmount}
                  onChange={handleFilterChange}
                  className="w-1/2 border border-gray-300 rounded px-3 py-2"
                />
                <input
                  type="number"
                  name="maxAmount"
                  placeholder="Max"
                  value={filters.maxAmount}
                  onChange={handleFilterChange}
                  className="w-1/2 border border-gray-300 rounded px-3 py-2"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date Range
              </label>
              <div className="flex space-x-2">
                <input
                  type="date"
                  name="startDate"
                  value={filters.startDate}
                  onChange={handleFilterChange}
                  className="w-1/2 border border-gray-300 rounded px-3 py-2"
                />
                <input
                  type="date"
                  name="endDate"
                  value={filters.endDate}
                  onChange={handleFilterChange}
                  className="w-1/2 border border-gray-300 rounded px-3 py-2"
                />
              </div>
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
                onClick={() => handleSort("invoice_id")}
              >
                <div className="flex items-center">
                  Invoice #
                  {sortField === "invoice_id" && (
                    <ArrowUpDown size={14} className="ml-1" />
                  )}
                </div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort("invoice_date")}
              >
                <div className="flex items-center">
                  Date
                  {sortField === "invoice_date" && (
                    <ArrowUpDown size={14} className="ml-1" />
                  )}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {activeTab === "sales" ? "Customer" : "Supplier"}
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort("total_amount")}
              >
                <div className="flex items-center">
                  Total Amount
                  {sortField === "total_amount" && (
                    <ArrowUpDown size={14} className="ml-1" />
                  )}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Paid Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Outstanding Balance
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort("due_date")}
              >
                <div className="flex items-center">
                  Due Date
                  {sortField === "due_date" && (
                    <ArrowUpDown size={14} className="ml-1" />
                  )}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {safeCurrentInvoices.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-6 py-4 text-center text-gray-500">
                  No {activeTab === "sales" ? "sales" : "purchase"} invoices
                  found
                </td>
              </tr>
            ) : (
              safeCurrentInvoices.map((invoice) => {
                const invoiceType =
                  activeTab === "sales" ? "sales" : "purchase";
                const paidAmount = calculatePaidAmount(invoice, invoiceType);
                const outstanding = calculateOutstanding(invoice, invoiceType);

                return (
                  <tr key={invoice.invoice_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FileText size={16} className="text-gray-400 mr-2" />
                        <span>
                          {invoice.invoice_number || `#${invoice.invoice_id}`}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {formatDate(invoice.invoice_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {activeTab === "sales"
                        ? invoice.customer?.name ||
                          `Customer #${invoice.customer_id}`
                        : invoice.supplier?.name ||
                          `Supplier #${invoice.supplier_id}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium">
                      {formatCurrency(invoice.total_amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-green-600 font-medium">
                        {formatCurrency(paidAmount)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`font-medium ${
                          outstanding > 0 ? "text-red-600" : "text-gray-500"
                        }`}
                      >
                        {formatCurrency(outstanding)}
                      </span>
                      {outstanding > 0 && (
                        <div className="text-xs text-gray-500">
                          {(
                            (outstanding / parseFloat(invoice.total_amount)) *
                            100
                          ).toFixed(1)}
                          % remaining
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        {formatDate(invoice.due_date)}
                        {invoice.status === "overdue" && (
                          <span className="ml-2 text-xs bg-red-100 text-red-600 py-1 px-2 rounded-full">
                            Overdue
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`capitalize px-2 py-1 rounded-full text-xs ${
                          invoice.status === "paid" || outstanding === 0
                            ? "bg-green-100 text-green-800"
                            : invoice.status === "overdue"
                            ? "bg-red-100 text-red-800"
                            : invoice.status === "cancelled"
                            ? "bg-gray-100 text-gray-800"
                            : paidAmount > 0
                            ? "bg-yellow-100 text-yellow-800" // Partially paid
                            : "bg-blue-100 text-blue-800" // Pending
                        }`}
                      >
                        {outstanding === 0 && paidAmount > 0
                          ? "Paid"
                          : paidAmount > 0 && outstanding > 0
                          ? "Partially Paid"
                          : invoice.status?.replace("_", " ") || "pending"}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Summary at bottom */}
      {safeCurrentInvoices.length > 0 && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-800 mb-2">Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Total Invoices:</span>
              <span className="ml-2 font-medium">
                {safeCurrentInvoices.length}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Total Amount:</span>
              <span className="ml-2 font-medium">
                {formatCurrency(
                  safeCurrentInvoices.reduce(
                    (sum, inv) => sum + parseFloat(inv.total_amount),
                    0
                  )
                )}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Total Paid:</span>
              <span className="ml-2 font-medium text-green-600">
                {formatCurrency(
                  safeCurrentInvoices.reduce((sum, inv) => {
                    const invoiceType =
                      activeTab === "sales" ? "sales" : "purchase";
                    return sum + calculatePaidAmount(inv, invoiceType);
                  }, 0)
                )}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Total Outstanding:</span>
              <span className="ml-2 font-medium text-red-600">
                {formatCurrency(
                  safeCurrentInvoices.reduce((sum, inv) => {
                    const invoiceType =
                      activeTab === "sales" ? "sales" : "purchase";
                    return sum + calculateOutstanding(inv, invoiceType);
                  }, 0)
                )}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoicesList;
