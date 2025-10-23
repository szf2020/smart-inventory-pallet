import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  Banknote,
  Filter,
  Download,
  Calendar,
  RefreshCw,
} from "lucide-react";
import {
  fetchPaymentMethods,
  fetchPayments,
  fetchExpenses,
  fetchSalesInvoices,
  fetchPurchaseInvoices,
} from "../../services/api";

const CashFlowDashboard = ({ refreshTrigger }) => {
  const [cashFlowData, setCashFlowData] = useState([]);
  const [summaryData, setSummaryData] = useState({
    totalCash: 0,
    totalCheques: 0,
    totalCredit: 0,
    totalIncome: 0,
    totalExpense: 0,
    runningBalance: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    date_from: "",
    date_to: "",
    payment_method: "",
    category: "",
    page: 1,
    limit: 20,
  });

  useEffect(() => {
    loadCashFlowData();
  }, [refreshTrigger, filters]);

  const loadCashFlowData = async () => {
    try {
      setLoading(true);

      // Fetch all data using your existing APIs
      const [
        paymentMethodsResponse,
        paymentsResponse,
        expensesResponse,
        salesInvoicesResponse,
        purchaseInvoicesResponse,
      ] = await Promise.all([
        fetchPaymentMethods().catch((err) => ({ data: [] })),
        fetchPayments({ limit: 1000 }).catch((err) => ({ data: [] })),
        fetchExpenses({ limit: 1000 }).catch((err) => ({ data: [] })),
        fetchSalesInvoices({ limit: 1000 }).catch((err) => ({
          data: { invoices: [] },
        })),
        fetchPurchaseInvoices({ limit: 1000 }).catch((err) => []),
      ]);

      console.log("Cash Flow - Raw API responses:", {
        payments: paymentsResponse,
        expenses: expensesResponse,
        salesInvoices: salesInvoicesResponse,
        purchaseInvoices: purchaseInvoicesResponse,
      });

      // Extract data
      const paymentMethods = paymentMethodsResponse?.data || [];
      const payments = paymentsResponse?.data || [];
      const expenses = expensesResponse?.data || [];
      const salesInvoices = salesInvoicesResponse?.data?.invoices || [];
      const purchaseInvoices = purchaseInvoicesResponse?.data?.data || [];

      // Create payment method lookup
      const paymentMethodMap = {};
      paymentMethods.forEach((method) => {
        paymentMethodMap[method.method_id] = method.name;
      });

      // Build cash flow transactions array
      const transactions = [];

      // Add payments as cash flow transactions
      payments.forEach((payment) => {
        if (payment.status === "completed") {
          const methodName = paymentMethodMap[payment.method_id] || "unknown";
          const isIncoming =
            payment.payment_type === "sales_payment" ||
            payment.payment_type === "advance_payment";

          transactions.push({
            id: `payment_${payment.payment_id}`,
            ledger_id: payment.payment_id,
            reference_number: `PAY-${payment.payment_id}`,
            transaction_date: payment.payment_date,
            description:
              payment.notes ||
              `${payment.payment_type} - ${payment.reference_type} #${payment.reference_id}`,
            transaction_type: isIncoming ? "income" : "expense",
            payment_method: methodName.toLowerCase(),
            amount: parseFloat(payment.amount || 0),
            cash_flow: isIncoming
              ? parseFloat(payment.amount || 0)
              : -parseFloat(payment.amount || 0),
            source_type: "payment",
            source_id: payment.payment_id,
          });
        }
      });

      // Add sales invoices (as potential income)
      // salesInvoices.forEach((invoice) => {
      //   transactions.push({
      //     id: `invoice_${invoice.invoice_id}`,
      //     ledger_id: invoice.invoice_id,
      //     reference_number: invoice.invoice_number,
      //     transaction_date: invoice.invoice_date,
      //     description: `Sales Invoice - ${
      //       invoice.customer?.name || "Unknown Customer"
      //     }`,
      //     transaction_type: "invoice",
      //     payment_method: "pending",
      //     amount: parseFloat(invoice.total_amount || 0),
      //     cash_flow: 0, // Invoice doesn't affect cash flow until paid
      //     source_type: "sales_invoice",
      //     source_id: invoice.invoice_id,
      //     status: invoice.status,
      //   });
      // });

      // // Add purchase invoices (as potential expense)
      // purchaseInvoices.forEach((invoice) => {
      //   transactions.push({
      //     id: `purchase_${invoice.invoice_id}`,
      //     ledger_id: invoice.invoice_id,
      //     reference_number:
      //       invoice.invoice_number || `PURCH-${invoice.invoice_id}`,
      //     transaction_date: invoice.invoice_date || invoice.created_at,
      //     description: `Purchase Invoice - ${
      //       invoice.supplier?.name || "Supplier"
      //     }`,
      //     transaction_type: "purchase",
      //     payment_method: "pending",
      //     amount: parseFloat(invoice.total_amount || 0),
      //     cash_flow: 0, // Purchase invoice doesn't affect cash flow until paid
      //     source_type: "purchase_invoice",
      //     source_id: invoice.invoice_id,
      //     status: invoice.status,
      //   });
      // });

      // Add expenses (as potential expense)
      // expenses.forEach((expense) => {
      //   // Only add if not already covered by payments
      //   const hasPayment = payments.some(
      //     (payment) =>
      //       payment.reference_type === "Expense" &&
      //       payment.reference_id === expense.expense_id &&
      //       payment.status === "completed"
      //   );

      //   if (!hasPayment) {
      //     transactions.push({
      //       id: `expense_${expense.expense_id}`,
      //       ledger_id: expense.expense_id,
      //       reference_number: expense.expense_number,
      //       transaction_date: expense.date,
      //       description: `Expense - ${expense.description}`,
      //       transaction_type: "expense",
      //       payment_method: "pending",
      //       amount: parseFloat(expense.amount || 0),
      //       cash_flow: 0, // Expense doesn't affect cash flow until paid
      //       source_type: "expense",
      //       source_id: expense.expense_id,
      //       status: expense.status,
      //     });
      //   }
      // });

      // Sort transactions by date
      transactions.sort(
        (a, b) => new Date(a.transaction_date) - new Date(b.transaction_date)
      );

      // Calculate running balance and apply filters
      let runningBalance = 0;
      const filteredTransactions = transactions.filter((transaction) => {
        // Apply date filters
        if (
          filters.date_from &&
          transaction.transaction_date < filters.date_from
        ) {
          return false;
        }
        if (filters.date_to && transaction.transaction_date > filters.date_to) {
          return false;
        }

        // Apply payment method filter
        if (
          filters.payment_method &&
          transaction.payment_method !== filters.payment_method
        ) {
          return false;
        }

        // Apply category filter
        if (filters.category) {
          if (
            filters.category === "income" &&
            !["income", "invoice"].includes(transaction.transaction_type)
          ) {
            return false;
          }
          if (
            filters.category === "expense" &&
            !["expense", "purchase"].includes(transaction.transaction_type)
          ) {
            return false;
          }
        }

        return true;
      });

      // Calculate running balances for filtered transactions
      filteredTransactions.forEach((transaction) => {
        runningBalance += transaction.cash_flow;
        transaction.running_balance = runningBalance;
      });

      // Apply pagination
      const startIndex = (filters.page - 1) * filters.limit;
      const paginatedTransactions = filteredTransactions.slice(
        startIndex,
        startIndex + filters.limit
      );

      // Calculate summary data
      const summary = {
        totalCash: 0,
        totalCheques: 0,
        totalCredit: 0,
        totalIncome: 0,
        totalExpense: 0,
        runningBalance: runningBalance,
      };

      // Calculate totals by payment method and type
      payments.forEach((payment) => {
        if (payment.status === "completed") {
          const amount = parseFloat(payment.amount || 0);
          const methodName = paymentMethodMap[payment.method_id] || "";

          // Categorize by payment method
          if (methodName.toLowerCase().includes("cash")) {
            if (
              payment.payment_type === "sales_payment" ||
              payment.payment_type === "advance_payment"
            ) {
              summary.totalCash += amount;
            } else {
              summary.totalCash -= amount;
            }
          } else if (methodName.toLowerCase().includes("cheque")) {
            if (
              payment.payment_type === "sales_payment" ||
              payment.payment_type === "advance_payment"
            ) {
              summary.totalCheques += amount;
            } else {
              summary.totalCheques -= amount;
            }
          } else if (methodName.toLowerCase().includes("credit")) {
            if (
              payment.payment_type === "sales_payment" ||
              payment.payment_type === "advance_payment"
            ) {
              summary.totalCredit += amount;
            } else {
              summary.totalCredit -= amount;
            }
          }

          // Categorize by transaction type
          if (
            payment.payment_type === "sales_payment" ||
            payment.payment_type === "advance_payment"
          ) {
            summary.totalIncome += amount;
          } else {
            summary.totalExpense += amount;
          }
        }
      });

      setCashFlowData(paginatedTransactions);
      setSummaryData(summary);
      setError(null);

      console.log("Cash Flow - Processed data:", {
        transactionsTotal: transactions.length,
        filteredTotal: filteredTransactions.length,
        paginatedTotal: paginatedTransactions.length,
        summary,
      });
    } catch (err) {
      setError(
        "Failed to load cash flow data: " +
          (err.response?.data?.message || err.message)
      );
      console.error("Cash Flow Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = () => {
    loadCashFlowData();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 2,
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

  const getPaymentMethodIcon = (method) => {
    const methodLower = method?.toLowerCase() || "";
    if (methodLower.includes("cash")) {
      return <Banknote className="h-4 w-4 text-green-600" />;
    } else if (methodLower.includes("cheque")) {
      return <CreditCard className="h-4 w-4 text-blue-600" />;
    } else if (methodLower.includes("credit")) {
      return <TrendingUp className="h-4 w-4 text-orange-600" />;
    } else if (method === "pending") {
      return <Calendar className="h-4 w-4 text-gray-400" />;
    }
    return <DollarSign className="h-4 w-4 text-gray-600" />;
  };

  const getTransactionTypeColor = (type, cashFlow) => {
    if (cashFlow > 0) {
      return "text-green-600 bg-green-50";
    } else if (cashFlow < 0) {
      return "text-red-600 bg-red-50";
    }
    return "text-gray-600 bg-gray-50";
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
      page: 1,
    }));
  };

  const clearFilters = () => {
    setFilters({
      date_from: "",
      date_to: "",
      payment_method: "",
      category: "",
      page: 1,
      limit: 20,
    });
  };

  if (loading && cashFlowData.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading cash flow data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="relative bg-gradient-to-r from-green-400 to-green-600 rounded-lg shadow p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm mt-6">Cash Flow</p>
              <p className="text-xl font-bold">
                {formatCurrency(summaryData.totalCash)}
              </p>
            </div>
            <Banknote className="absolute top-2 right-2 h-8 w-8 text-green-200" />
          </div>
        </div>

        <div className="relative bg-gradient-to-r from-blue-400 to-blue-600 rounded-lg shadow p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm mt-6">Cheques</p>
              <p className="text-xl font-bold">
                {formatCurrency(summaryData.totalCheques)}
              </p>
            </div>
            <CreditCard className="absolute top-2 right-2 h-8 w-8 text-blue-200" />
          </div>
        </div>

        <div className="relative bg-gradient-to-r from-orange-400 to-orange-600 rounded-lg shadow p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm mt-6">Credit</p>
              <p className="text-xl font-bold">
                {formatCurrency(summaryData.totalCredit)}
              </p>
            </div>
            <TrendingUp className="absolute top-2 right-2 h-8 w-8 text-orange-200" />
          </div>
        </div>

        <div className="relative bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-lg shadow p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm mt-6">Total Income</p>
              <p className="text-xl font-bold">
                {formatCurrency(summaryData.totalIncome)}
              </p>
            </div>
            <TrendingUp className="absolute top-2 right-2 h-8 w-8 text-emerald-200" />
          </div>
        </div>

        <div className="relative bg-gradient-to-r from-red-400 to-red-600 rounded-lg shadow p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm mt-6">Total Expense</p>
              <p className="text-xl font-bold">
                {formatCurrency(summaryData.totalExpense)}
              </p>
            </div>
            <TrendingDown className="absolute top-2 right-2 h-8 w-8 text-red-200" />
          </div>
        </div>

        <div className="relative bg-gradient-to-r from-purple-400 to-purple-600 rounded-lg shadow p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm mt-6">Running Balance</p>
              <p className="text-xl font-bold">
                {formatCurrency(summaryData.runningBalance)}
              </p>
            </div>
            <DollarSign className="absolute top-2 right-2 h-8 w-8 text-purple-200" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filters & Search
          </h3>
          <div className="flex space-x-2">
            <button
              onClick={clearFilters}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
            >
              Clear
            </button>
            <button
              onClick={refreshData}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => handleFilterChange("date_from", e.target.value)}
              className="w-full border rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => handleFilterChange("date_to", e.target.value)}
              className="w-full border rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Method
            </label>
            <select
              value={filters.payment_method}
              onChange={(e) =>
                handleFilterChange("payment_method", e.target.value)
              }
              className="w-full border rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Methods</option>
              <option value="cash">Cash</option>
              <option value="cheque">Cheque</option>
              <option value="credit">Credit</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange("category", e.target.value)}
              className="w-full border rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Categories</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Records per page
            </label>
            <select
              value={filters.limit}
              onChange={(e) =>
                handleFilterChange("limit", parseInt(e.target.value))
              }
              className="w-full border rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Cash Flow Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-800">
            Cash Flow Transactions ({cashFlowData.length} records)
          </h3>
          <button className="flex items-center px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700">
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reference
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Method
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cash Flow
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Balance
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {cashFlowData.map((transaction, index) => (
                <tr key={transaction.id || index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {transaction.reference_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(transaction.transaction_date)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                    {transaction.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTransactionTypeColor(
                        transaction.transaction_type,
                        transaction.cash_flow
                      )}`}
                    >
                      {transaction.transaction_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      {getPaymentMethodIcon(transaction.payment_method)}
                      <span className="ml-2 capitalize">
                        {transaction.payment_method}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(transaction.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    <span
                      className={`font-medium ${
                        transaction.cash_flow > 0
                          ? "text-green-600"
                          : transaction.cash_flow < 0
                          ? "text-red-600"
                          : "text-gray-600"
                      }`}
                    >
                      {transaction.cash_flow > 0 ? "+" : ""}
                      {transaction.cash_flow === 0
                        ? "-"
                        : formatCurrency(Math.abs(transaction.cash_flow))}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                    {formatCurrency(transaction.running_balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {cashFlowData.length === 0 && !loading && (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No cash flow transactions found</p>
              <p className="text-sm text-gray-400">
                Try adjusting your filters or date range
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CashFlowDashboard;
