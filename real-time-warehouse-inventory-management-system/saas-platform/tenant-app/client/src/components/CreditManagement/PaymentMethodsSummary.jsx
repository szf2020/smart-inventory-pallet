import React, { useState, useEffect } from "react";
import {
  Banknote,
  CreditCard,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  DollarSign,
} from "lucide-react";
import {
  fetchPaymentMethods,
  fetchPayments,
  fetchExpenses,
  fetchSalesInvoices,
  fetchPurchaseInvoices,
} from "../../services/api";

const PaymentMethodsSummary = ({ refreshTrigger }) => {
  const [paymentMethodsData, setPaymentMethodsData] = useState([]);
  const [summaryData, setSummaryData] = useState({
    totalInvoices: 0,
    totalAmount: 0,
    totalPaid: 0,
    totalOutstanding: 0,
    creditBalance: 0,
    payableBalance: 0,
    totalExpenseAmount: 0,
    totalExpensePaid: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPaymentMethodsData();
  }, [refreshTrigger]);

  const loadPaymentMethodsData = async () => {
    try {
      setLoading(true);

      // Fetch all required data
      const [
        paymentMethodsResponse,
        paymentsResponse,
        expensesResponse,
        salesInvoicesResponse,
        purchaseInvoicesResponse,
      ] = await Promise.all([
        fetchPaymentMethods(),
        fetchPayments({ limit: 1000 }),
        fetchExpenses({ limit: 1000 }),
        fetchSalesInvoices({ limit: 1000 }),
        fetchPurchaseInvoices({ limit: 1000 }),
      ]);

      // Extract data safely based on actual response formats
      const paymentMethods = paymentMethodsResponse?.data || [];
      const payments = paymentsResponse?.data || [];
      const expenses = expensesResponse?.data || [];

      console.log("invoices response", salesInvoicesResponse);

      // Sales invoices: {success: true, data: {invoices: [], pagination: {...}}}
      const salesInvoices = salesInvoicesResponse?.data?.data?.invoices || [];

      // Purchase invoices: direct array []
      const purchaseInvoices = purchaseInvoicesResponse?.data?.data || [];

      console.log("Debug - Data extracted:", {
        paymentMethods: paymentMethods.length,
        payments: payments.length,
        expenses: expenses.length,
        salesInvoices: salesInvoices.length,
        purchaseInvoices: purchaseInvoices.length,
      });

      // Initialize payment methods data structure
      const methodsData = paymentMethods.map((method) => ({
        id: method.method_id,
        name: method.name,
        description: method.description,
        totalIncoming: 0,
        totalOutgoing: 0,
        transactionCount: 0,
        invoiceCount: 0,
        expenseCount: 0,
        icon: getPaymentMethodIcon(method.name),
        color: getPaymentMethodColor(method.name),
      }));

      // Process payments to calculate totals for each method
      payments.forEach((payment) => {
        const methodData = methodsData.find((m) => m.id === payment.method_id);
        if (methodData && payment.status === "completed") {
          methodData.transactionCount += 1;

          if (
            payment.payment_type === "sales_payment" ||
            payment.payment_type === "advance_payment"
          ) {
            methodData.totalIncoming += parseFloat(payment.amount || 0);
          } else if (
            payment.payment_type === "purchase_payment" ||
            payment.payment_type === "refund"
          ) {
            methodData.totalOutgoing += parseFloat(payment.amount || 0);
          }
        }
      });

      // Helper function to calculate payments for specific invoice
      const getInvoicePayments = (invoiceId, referenceType) => {
        const relatedPayments = payments.filter(
          (payment) =>
            payment.reference_id === invoiceId &&
            payment.reference_type === referenceType &&
            payment.status === "completed"
        );

        const totalPaid = relatedPayments.reduce(
          (sum, payment) => sum + parseFloat(payment.amount || 0),
          0
        );

        console.log(
          `Invoice ${invoiceId} (${referenceType}): Found ${relatedPayments.length} payments totaling ${totalPaid}`
        );
        return { payments: relatedPayments, totalPaid };
      };

      // Calculate totals
      let totalInvoiceAmount = 0;
      let totalInvoicePaid = 0;
      let totalInvoices = 0;
      let creditBalance = 0; // Money customers owe us (unpaid sales invoices)
      let payableBalance = 0; // Money we owe (unpaid purchases + expenses)

      // Process sales invoices
      console.log("Processing sales invoices:", salesInvoices);
      if (Array.isArray(salesInvoices)) {
        salesInvoices.forEach((invoice) => {
          totalInvoices += 1;
          const invoiceAmount = parseFloat(invoice.total_amount || 0);
          totalInvoiceAmount += invoiceAmount;

          // Get payments for this specific sales invoice
          const { payments: invoicePayments, totalPaid } = getInvoicePayments(
            invoice.invoice_id,
            "SalesInvoice"
          );

          totalInvoicePaid += totalPaid;

          // Calculate outstanding amount for sales invoice (money owed to us)
          const outstanding = invoiceAmount - totalPaid;
          if (outstanding > 0) {
            creditBalance += outstanding;
          }

          console.log(
            `Sales Invoice ${invoice.invoice_number}: Amount=${invoiceAmount}, Paid=${totalPaid}, Outstanding=${outstanding}`
          );

          // Count payments by method for this invoice
          invoicePayments.forEach((payment) => {
            const methodData = methodsData.find(
              (m) => m.id === payment.method_id
            );
            if (methodData) {
              methodData.invoiceCount += 1;
            }
          });
        });
      }

      // Process purchase invoices
      console.log("Processing purchase invoices:", purchaseInvoices);
      if (Array.isArray(purchaseInvoices)) {
        purchaseInvoices.forEach((invoice) => {
          totalInvoices += 1;
          const invoiceAmount = parseFloat(invoice.total_amount || 0);
          totalInvoiceAmount += invoiceAmount;

          // Get payments for this specific purchase invoice
          const { payments: invoicePayments, totalPaid } = getInvoicePayments(
            invoice.invoice_id,
            "PurchaseInvoice"
          );

          totalInvoicePaid += totalPaid;

          // Calculate outstanding amount for purchase invoice (money we owe)
          const outstanding = invoiceAmount - totalPaid;
          if (outstanding > 0) {
            payableBalance += outstanding;
          }

          console.log(
            `Purchase Invoice ${
              invoice.invoice_number || invoice.invoice_id
            }: Amount=${invoiceAmount}, Paid=${totalPaid}, Outstanding=${outstanding}`
          );

          // Count payments by method for this invoice
          invoicePayments.forEach((payment) => {
            const methodData = methodsData.find(
              (m) => m.id === payment.method_id
            );
            if (methodData) {
              methodData.invoiceCount += 1;
            }
          });
        });
      }

      // Process expenses
      let totalExpenseAmount = 0;
      let totalExpensePaid = 0;

      console.log("Processing expenses:", expenses);
      expenses.forEach((expense) => {
        const expenseAmount = parseFloat(expense.amount || 0);
        totalExpenseAmount += expenseAmount;

        // Get payments for this specific expense
        const { payments: expensePayments, totalPaid } = getInvoicePayments(
          expense.expense_id,
          "Expense"
        );

        totalExpensePaid += totalPaid;

        // Calculate outstanding expense amount (money we owe)
        const outstanding = expenseAmount - totalPaid;
        if (outstanding > 0) {
          payableBalance += outstanding;
        }

        console.log(
          `Expense ${expense.expense_number}: Amount=${expenseAmount}, Paid=${totalPaid}, Outstanding=${outstanding}`
        );

        // Count expense payments by method
        expensePayments.forEach((payment) => {
          const methodData = methodsData.find(
            (m) => m.id === payment.method_id
          );
          if (methodData) {
            methodData.expenseCount += 1;
          }
        });
      });

      const totalOutstanding = totalInvoiceAmount - totalInvoicePaid;
      const totalAmountIncludingExpenses =
        totalInvoiceAmount + totalExpenseAmount;
      const totalPaidIncludingExpenses = totalInvoicePaid + totalExpensePaid;

      console.log("Final calculations:", {
        totalInvoices: totalInvoices + expenses.length,
        totalInvoiceAmount,
        totalInvoicePaid,
        totalExpenseAmount,
        totalExpensePaid,
        creditBalance,
        payableBalance,
        totalOutstanding,
      });

      setPaymentMethodsData(methodsData);
      setSummaryData({
        totalInvoices: totalInvoices + expenses.length,
        totalAmount: totalAmountIncludingExpenses,
        totalPaid: totalPaidIncludingExpenses,
        totalOutstanding,
        creditBalance,
        payableBalance,
        totalExpenseAmount,
        totalExpensePaid,
      });

      setError(null);
    } catch (err) {
      setError(
        "Failed to load payment methods data: " +
          (err.response?.data?.message || err.message)
      );
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getPaymentMethodIcon = (methodName) => {
    const name = methodName?.toLowerCase();
    if (name?.includes("cash")) return Banknote;
    if (name?.includes("cheque") || name?.includes("check")) return CreditCard;
    if (name?.includes("credit") || name?.includes("card")) return TrendingUp;
    if (name?.includes("bank") || name?.includes("transfer")) return DollarSign;
    return DollarSign;
  };

  const getPaymentMethodColor = (methodName) => {
    const name = methodName?.toLowerCase();
    if (name?.includes("cash")) return "green";
    if (name?.includes("cheque") || name?.includes("check")) return "blue";
    if (name?.includes("credit") || name?.includes("card")) return "orange";
    if (name?.includes("bank") || name?.includes("transfer")) return "purple";
    return "gray";
  };

  const getColorClasses = (color) => {
    const colorMap = {
      green: {
        gradient: "from-green-500 to-green-600",
        light: "text-green-100",
        text: "text-green-600",
      },
      blue: {
        gradient: "from-blue-500 to-blue-600",
        light: "text-blue-100",
        text: "text-blue-600",
      },
      orange: {
        gradient: "from-orange-500 to-orange-600",
        light: "text-orange-100",
        text: "text-orange-600",
      },
      purple: {
        gradient: "from-purple-500 to-purple-600",
        light: "text-purple-100",
        text: "text-purple-600",
      },
      gray: {
        gradient: "from-gray-500 to-gray-600",
        light: "text-gray-100",
        text: "text-gray-600",
      },
    };
    return colorMap[color] || colorMap.gray;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">
          Loading payment methods data...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">{error}</p>
        <button
          onClick={loadPaymentMethodsData}
          className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Payment Methods Overview
      </h3>

      {/* Payment Methods Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paymentMethodsData.map((method) => {
          const Icon = method.icon;
          const colors = getColorClasses(method.color);
          const netAmount = method.totalIncoming - method.totalOutgoing;

          return (
            <div
              key={method.id}
              className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden"
            >
              <div className={`bg-gradient-to-r ${colors.gradient} px-6 py-4`}>
                <div className="flex items-center">
                  <Icon className="h-8 w-8 text-white mr-3" />
                  <div>
                    <h4 className="text-white text-lg font-semibold">
                      {method.name}
                    </h4>
                    <p className={`${colors.light} text-sm`}>
                      {method.transactionCount} transactions
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Money In</span>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(method.totalIncoming)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Money Out</span>
                  <span className="font-semibold text-red-600">
                    {formatCurrency(method.totalOutgoing)}
                  </span>
                </div>

                <div className="flex justify-between items-center border-t pt-2">
                  <span className="text-gray-600 font-medium">Net Amount</span>
                  <span
                    className={`font-semibold ${
                      netAmount >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {formatCurrency(netAmount)}
                  </span>
                </div>

                <div className="text-center text-sm text-gray-500 border-t pt-2">
                  <p>
                    {method.invoiceCount} invoices • {method.expenseCount}{" "}
                    expenses
                  </p>
                  {method.description && (
                    <p className="text-xs mt-1">{method.description}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Overall Summary */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-6 border">
        <h4 className="text-lg font-semibold text-gray-800 mb-4">
          Financial Overview
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Receivables Section */}
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <h5 className="text-green-800 font-semibold mb-2 flex items-center">
              <CheckCircle className="h-4 w-4 mr-2" />
              Receivables (Money Owed to Us)
            </h5>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-green-700">Unpaid Sales Invoices:</span>
                <span className="font-semibold text-green-800">
                  {formatCurrency(summaryData.creditBalance)}
                </span>
              </div>
            </div>
          </div>

          {/* Payables Section */}
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <h5 className="text-red-800 font-semibold mb-2 flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              Payables (Money We Owe)
            </h5>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-red-700">
                  Unpaid Expenses & Purchases:
                </span>
                <span className="font-semibold text-red-800">
                  {formatCurrency(summaryData.payableBalance)}
                </span>
              </div>
            </div>
          </div>

          {/* Net Position */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h5 className="text-blue-800 font-semibold mb-2 flex items-center">
              <DollarSign className="h-4 w-4 mr-2" />
              Net Financial Position
            </h5>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-blue-700">Net Outstanding:</span>
                <span
                  className={`font-semibold ${
                    summaryData.creditBalance - summaryData.payableBalance >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {formatCurrency(
                    summaryData.creditBalance - summaryData.payableBalance
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">
              {summaryData.totalInvoices}
            </p>
            <p className="text-sm text-gray-600">Total Transactions</p>
          </div>

          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(summaryData.totalAmount)}
            </p>
            <p className="text-sm text-gray-600">Total Value</p>
          </div>

          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(summaryData.totalPaid)}
            </p>
            <p className="text-sm text-gray-600">Total Paid</p>
          </div>

          <div className="text-center">
            <p className="text-2xl font-bold text-orange-600">
              {formatCurrency(summaryData.totalAmount - summaryData.totalPaid)}
            </p>
            <p className="text-sm text-gray-600">Total Outstanding</p>
          </div>
        </div>
      </div>

      {/* Payment Method Usage Chart */}
      {paymentMethodsData.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-4">
            Payment Method Usage
          </h4>
          <div className="space-y-4">
            {paymentMethodsData.map((method) => {
              const totalTransactions = paymentMethodsData.reduce(
                (sum, m) => sum + m.transactionCount,
                0
              );
              const percentage =
                totalTransactions > 0
                  ? (
                      (method.transactionCount / totalTransactions) *
                      100
                    ).toFixed(1)
                  : 0;
              const colors = getColorClasses(method.color);

              return (
                <div key={method.id} className="flex items-center space-x-4">
                  <div className="flex-shrink-0 w-24 text-sm font-medium text-gray-700">
                    {method.name}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-600">
                        {method.transactionCount} transactions
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {percentage}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`bg-gradient-to-r ${colors.gradient} h-2 rounded-full transition-all duration-300`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentMethodsSummary;
