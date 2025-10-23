import React from "react";
import {
  DollarSign,
  TrendingUp,
  Calendar,
  CreditCard,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

const ExpenseSummaryCards = ({ summary }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  const getOverallTotals = () => {
    const overall = summary?.overallTotal || {};
    return {
      totalAmount: parseFloat(overall.total_amount || 0),
      totalCount: parseInt(overall.total_count || 0),
      totalPaid: parseFloat(overall.total_paid || 0),
      outstanding: parseFloat(overall.outstanding || 0),
    };
  };

  const getStatusTotals = () => {
    const statusData = summary?.totalExpenses || [];
    return statusData.reduce((acc, item) => {
      acc[item.status] = {
        count: parseInt(item.count || 0),
        amount: parseFloat(item.total_amount || 0),
      };
      return acc;
    }, {});
  };

  const getPaymentMethodTotals = () => {
    const paymentData = summary?.expensePayments || [];
    return paymentData.reduce((acc, item) => {
      const methodName = item.paymentMethod?.name || "Unknown";
      acc[methodName] = {
        count: parseInt(item.payment_count || 0),
        amount: parseFloat(item.total_paid || 0),
      };
      return acc;
    }, {});
  };

  const overall = getOverallTotals();
  const statusTotals = getStatusTotals();
  const paymentMethodTotals = getPaymentMethodTotals();

  const cards = [
    {
      title: "Total Expenses",
      value: formatCurrency(overall.totalAmount),
      subtitle: `${overall.totalCount} expenses`,
      icon: DollarSign,
      color: "blue",
      gradient: "from-blue-500 to-blue-600",
    },
    {
      title: "Total Paid",
      value: formatCurrency(overall.totalPaid),
      subtitle: `${Object.values(paymentMethodTotals).reduce(
        (sum, method) => sum + method.count,
        0
      )} payments`,
      icon: CheckCircle,
      color: "green",
      gradient: "from-green-500 to-green-600",
    },
    {
      title: "Outstanding Amount",
      value: formatCurrency(overall.outstanding),
      subtitle: `${
        (statusTotals.pending?.count || 0) +
        (statusTotals.partially_paid?.count || 0)
      } unpaid`,
      icon: AlertCircle,
      color: "red",
      gradient: "from-red-500 to-red-600",
    },
    {
      title: "Pending Expenses",
      value: formatCurrency(statusTotals.pending?.amount || 0),
      subtitle: `${statusTotals.pending?.count || 0} pending`,
      icon: Calendar,
      color: "yellow",
      gradient: "from-yellow-500 to-yellow-600",
    },
    {
      title: "Paid Expenses",
      value: formatCurrency(statusTotals.paid?.amount || 0),
      subtitle: `${statusTotals.paid?.count || 0} completed`,
      icon: TrendingUp,
      color: "emerald",
      gradient: "from-emerald-500 to-emerald-600",
    },
    {
      title: "Partial Payments",
      value: formatCurrency(statusTotals.partially_paid?.amount || 0),
      subtitle: `${statusTotals.partially_paid?.count || 0} partial`,
      icon: CreditCard,
      color: "orange",
      gradient: "from-orange-500 to-orange-600",
    },
  ];

  // Calculate payment completion percentage
  const paymentCompletionRate =
    overall.totalAmount > 0
      ? ((overall.totalPaid / overall.totalAmount) * 100).toFixed(1)
      : 0;

  return (
    <div className="space-y-6 mb-10">
      {/* Main Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">
                      {card.title}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 mb-1">
                      {card.value}
                    </p>
                    <p className="text-sm text-gray-500">{card.subtitle}</p>
                  </div>
                  <div
                    className={`p-3 rounded-lg bg-gradient-to-r ${card.gradient} shadow-lg`}
                  >
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
              <div className={`h-1 bg-gradient-to-r ${card.gradient}`}></div>
            </div>
          );
        })}
      </div>

      {/* Payment Progress Bar */}
      {/* {overall.totalAmount > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              Payment Progress
            </h3>
            <span className="text-sm font-medium text-gray-600">
              {paymentCompletionRate}% completed
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
            <div
              className="bg-gradient-to-r from-green-400 to-green-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(paymentCompletionRate, 100)}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Paid: {formatCurrency(overall.totalPaid)}</span>
            <span>Outstanding: {formatCurrency(overall.outstanding)}</span>
          </div>
        </div>
      )} */}

      {/* Payment Methods Breakdown */}
      {/* {Object.keys(paymentMethodTotals).length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Payment Methods Used
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(paymentMethodTotals).map(([method, data]) => (
              <div
                key={method}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-800">{method}</p>
                  <p className="text-sm text-gray-600">{data.count} payments</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    {formatCurrency(data.amount)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )} */}

      {/* Category Breakdown */}
      {/* {summary?.expensesByCategory && summary.expensesByCategory.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Expenses by Category
          </h3>
          <div className="space-y-3">
            {summary.expensesByCategory.map((category, index) => {
              const percentage =
                overall.totalAmount > 0
                  ? (
                      (parseFloat(category.total_amount) /
                        overall.totalAmount) *
                      100
                    ).toFixed(1)
                  : 0;

              return (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">
                        {category.expense_category}
                      </span>
                      <span className="text-sm text-gray-500">
                        {percentage}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-400 to-blue-600 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="ml-4 text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      {formatCurrency(category.total_amount)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {category.count} expenses
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )} */}
    </div>
  );
};

export default ExpenseSummaryCards;
