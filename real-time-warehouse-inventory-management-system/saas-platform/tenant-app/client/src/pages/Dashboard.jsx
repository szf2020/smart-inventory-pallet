import React, { useState, useEffect, useContext } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  CalendarIcon,
  RefreshCcw,
  TrendingUp,
  TrendingDown,
  Package,
  DollarSign,
  Award,
  ArrowUpCircle,
  ArrowDownCircle,
  CreditCard,
  Banknote,
  FileText,
} from "lucide-react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  fetchPaymentMethods,
  fetchPayments,
  fetchExpenses,
  fetchSalesInvoices,
  fetchPurchaseInvoices,
  fetchCustomers,
  fetchSuppliers,
} from "../services/api";
import axios from "axios";

// Updated API URL handling using the getApiUrl function
const getApiUrl = () => {
  if (window.location.hostname === "localhost") {
    return import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  }
  return `https://${window.location.hostname}/api`;
};

const API_URL = getApiUrl();

const Dashboard = () => {
  // const { currentUser } = useContext(AuthContext);
  // const isAdmin = currentUser?.role === "admin";
  // const navigate = useNavigate();

  // useEffect(() => {
  //   if (!isAdmin) {
  //     console.log("User is not an admin. Redirecting...");
  //     navigate("/loading-management");
  //   }
  // }, [isAdmin, navigate]);
  // Date range state
  const [startDate, setStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30))
  );
  const [endDate, setEndDate] = useState(new Date());
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // Dashboard data states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);
  const [bestSellingProducts, setBestSellingProducts] = useState([]);

  // Aggregated metrics - Updated without profit calculations
  const [overviewMetrics, setOverviewMetrics] = useState({
    sellingBottles: 0,
    saleIncome: 0,
    totalExpenses: 0,
    netProfitLoss: 0,
  });

  const [inventoryMetrics, setInventoryMetrics] = useState({
    totalBottles: 0,
    totalValue: 0,
  });

  // New P&L metrics
  const [profitLossData, setProfitLossData] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    grossMargin: 0,
  });

  // New Cash Flow metrics
  const [cashFlowData, setCashFlowData] = useState({
    cashInflows: 0,
    cashOutflows: 0,
    netCashFlow: 0,
    paymentBreakdown: {
      cash: 0,
      cheque: 0,
      credit: 0,
    },
  });

  // Outstanding amounts metrics
  const [outstandingData, setOutstandingData] = useState({
    customerOutstanding: 0,
    supplierOutstanding: 0,
    totalOutstanding: 0,
    customerCount: 0,
    supplierCount: 0,
  });

  // Helper function to format date range display
  const formatDateRange = () => {
    if (!startDate && !endDate) return "All Time";

    if (startDate && endDate) {
      return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
    }

    if (startDate) {
      return `From ${startDate.toLocaleDateString()}`;
    }

    return `Until ${endDate.toLocaleDateString()}`;
  };

  // Clear date range function
  const clearDateRange = () => {
    setStartDate(new Date(new Date().setDate(new Date().getDate() - 30)));
    setEndDate(new Date());
  };

  useEffect(() => {
    // Set auth token for all axios requests
    const token = localStorage.getItem("token");
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }
  }, []);

  // Fetch dashboard data using existing APIs
  useEffect(() => {
    // Process monthly P&L data for chart
    const processMonthlyPLData = (salesData, purchaseInvoices, payments) => {
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      const monthlyRevenue = new Map();
      const monthlyExpenses = new Map();

      // Initialize months
      months.forEach((month) => {
        monthlyRevenue.set(month, 0);
        monthlyExpenses.set(month, 0);
      });

      // Aggregate sales revenue by month
      if (salesData && Array.isArray(salesData)) {
        salesData.forEach((item) => {
          if (item.sales_date) {
            const date = new Date(item.sales_date);
            const month = months[date.getMonth()];
            const current = monthlyRevenue.get(month) || 0;
            monthlyRevenue.set(month, current + (item.sales_income || 0));
          }
        });
      }

      // Aggregate expense payments by month
      if (payments && Array.isArray(payments)) {
        payments
          .filter(
            (payment) =>
              payment.status === "completed" &&
              (payment.payment_type === "expense_payment" ||
                payment.payment_type === "purchase_payment")
          )
          .forEach((payment) => {
            if (payment.payment_date) {
              const date = new Date(payment.payment_date);
              const month = months[date.getMonth()];
              const current = monthlyExpenses.get(month) || 0;
              monthlyExpenses.set(month, current + (payment.amount || 0));
            }
          });
      }

      // Convert to chart data
      return months.map((month) => ({
        name: month,
        revenue: monthlyRevenue.get(month) || 0,
        expenses: monthlyExpenses.get(month) || 0,
        profit:
          (monthlyRevenue.get(month) || 0) - (monthlyExpenses.get(month) || 0),
      }));
    };

    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Prepare date params
        const params = {
          startDate: startDate?.toISOString().split("T")[0],
          endDate: endDate?.toISOString().split("T")[0],
        };

        // Remove undefined/null values from params
        Object.keys(params).forEach((key) => {
          if (params[key] === undefined || params[key] === null) {
            delete params[key];
          }
        });

        // Fetch data using the same API functions as CashFlowDashboard
        const [
          dailySalesRes,
          stockInventoryRes,
          paymentMethodsResponse,
          paymentsResponse,
          expensesResponse,
          salesInvoicesResponse,
          purchaseInvoicesResponse,
          customersResponse,
          suppliersResponse,
        ] = await Promise.all([
          axios.get(`${API_URL}/daily-sales`, { params }),
          axios.get(`${API_URL}/stock-inventory`),
          fetchPaymentMethods().catch(() => ({ data: [] })),
          fetchPayments({
            limit: 1000,
            start_date: startDate?.toISOString().split("T")[0],
            end_date: endDate?.toISOString().split("T")[0],
          }).catch(() => ({ data: [] })),
          fetchExpenses({
            limit: 1000,
            start_date: startDate?.toISOString().split("T")[0],
            end_date: endDate?.toISOString().split("T")[0],
          }).catch(() => ({ data: [] })),
          fetchSalesInvoices({
            limit: 1000,
            start_date: startDate?.toISOString().split("T")[0],
            end_date: endDate?.toISOString().split("T")[0],
          }).catch(() => ({
            data: { invoices: [] },
          })),
          fetchPurchaseInvoices({
            limit: 1000,
            start_date: startDate?.toISOString().split("T")[0],
            end_date: endDate?.toISOString().split("T")[0],
          }).catch(() => []),
          fetchCustomers().catch(() => ({ data: [] })),
          fetchSuppliers().catch(() => ({ data: [] })),
        ]);

        console.log("Dashboard - Raw API responses:", {
          dailySales: dailySalesRes.data,
          payments: paymentsResponse,
          expenses: expensesResponse,
          salesInvoices: salesInvoicesResponse,
          purchaseInvoices: purchaseInvoicesResponse,
        });

        // Extract data using the same structure as CashFlowDashboard
        const paymentMethods = paymentMethodsResponse?.data || [];
        const payments = paymentsResponse?.data || [];
        const expenses = expensesResponse?.data || [];
        const salesInvoices = salesInvoicesResponse?.data?.invoices || [];
        const purchaseInvoices = purchaseInvoicesResponse?.data?.data || [];
        const customers = customersResponse?.data || [];
        const suppliers = suppliersResponse?.data || [];

        // Create payment method lookup (same as CashFlowDashboard)
        const paymentMethodMap = {};
        paymentMethods.forEach((method) => {
          paymentMethodMap[method.method_id] = method.name;
        });

        console.log("Dashboard - Processed data:", {
          paymentsCount: payments.length,
          expensesCount: expenses.length,
          salesInvoicesCount: salesInvoices.length,
          purchaseInvoicesCount: purchaseInvoices.length,
          paymentMethodsCount: paymentMethods.length,
          salesDataCount: dailySalesRes.data.salesData?.length,
          customersCount: customers.length,
          suppliersCount: suppliers.length,
          samplePayment: payments[0],
          paymentMethodMap,
        });

        // Calculate outstanding amounts
        const customerOutstanding = customers.reduce(
          (total, customer) =>
            total + (parseFloat(customer.outstanding_balance) || 0),
          0
        );

        const supplierOutstanding = suppliers.reduce(
          (total, supplier) =>
            total + (parseFloat(supplier.outstanding_balance) || 0),
          0
        );

        console.log("Outstanding amounts:", {
          customerOutstanding,
          supplierOutstanding,
          customerCount: customers.length,
          supplierCount: suppliers.length,
        });

        // Process sales data for overview metrics
        const salesMetrics = processSalesData(dailySalesRes.data.salesData);
        console.log("Sales metrics:", salesMetrics);

        // Calculate expenses and cash flow using the CashFlowDashboard logic
        const summary = {
          totalCash: 0,
          totalCheques: 0,
          totalCredit: 0,
          totalIncome: 0,
          totalExpense: 0,
        };

        // Calculate totals by payment method and type (same logic as CashFlowDashboard)
        payments.forEach((payment) => {
          if (payment.status === "completed") {
            const amount = parseFloat(payment.amount || 0);
            const methodName = paymentMethodMap[payment.method_id] || "";

            console.log("Processing payment:", {
              payment_id: payment.payment_id,
              payment_type: payment.payment_type,
              amount: amount,
              methodName: methodName,
              status: payment.status,
            });

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

        console.log("Dashboard summary:", summary);

        const overviewData = {
          sellingBottles: salesMetrics.totalBottles,
          saleIncome: summary.totalIncome, // Use calculated income from payments
          totalExpenses: summary.totalExpense, // Use calculated expenses from payments
          netProfitLoss: summary.totalIncome - summary.totalExpense,
        };
        console.log("Overview data:", overviewData);

        setOverviewMetrics(overviewData);

        // Process P&L data using the same values
        const plData = {
          totalRevenue: summary.totalIncome,
          totalExpenses: summary.totalExpense,
          netProfit: summary.totalIncome - summary.totalExpense,
          grossMargin:
            summary.totalIncome > 0
              ? ((summary.totalIncome - summary.totalExpense) /
                  summary.totalIncome) *
                100
              : 0,
        };
        setProfitLossData(plData);

        // Process Cash Flow data using CashFlowDashboard logic
        const cfData = {
          cashInflows: summary.totalIncome,
          cashOutflows: summary.totalExpense,
          netCashFlow: summary.totalIncome - summary.totalExpense,
          paymentBreakdown: {
            cash: summary.totalCash,
            cheque: summary.totalCheques,
            outstanding: customerOutstanding, // Replace credit with outstanding
          },
        };
        setCashFlowData(cfData);

        // Set outstanding data
        const outstandingInfo = {
          customerOutstanding,
          supplierOutstanding,
          totalOutstanding: customerOutstanding + supplierOutstanding,
          customerCount: customers.length,
          supplierCount: suppliers.length,
        };
        setOutstandingData(outstandingInfo);

        // Process monthly data for chart
        setMonthlyData(
          processMonthlyPLData(
            dailySalesRes.data.salesData,
            purchaseInvoices,
            payments
          )
        );

        // Process best selling products
        setBestSellingProducts(
          processBestSellingProducts(dailySalesRes.data.salesData)
        );

        // Process inventory metrics
        const inventory = processInventoryData(stockInventoryRes.data);
        setInventoryMetrics({
          totalBottles: inventory.totalBottles,
          totalValue: inventory.totalValue,
        });
      } catch (err) {
        setError("Failed to fetch dashboard data: " + err.message);
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [startDate, endDate]);

  // Process sales data to get overview metrics
  const processSalesData = (data) => {
    console.log("processSalesData input:", data?.length, "items");
    console.log("Sample sales data:", data?.[0]);

    if (!data || !Array.isArray(data)) {
      console.log("No sales data available");
      return { totalBottles: 0, totalIncome: 0 };
    }

    const result = data.reduce(
      (acc, item) => {
        console.log("Processing sales item:", {
          units_sold: item.units_sold,
          sales_income: item.sales_income,
        });
        return {
          totalBottles: acc.totalBottles + (item.units_sold || 0),
          totalIncome: acc.totalIncome + (item.sales_income || 0),
        };
      },
      { totalBottles: 0, totalIncome: 0 }
    );

    console.log("processSalesData result:", result);
    return result;
  };

  // Process sales data to get best selling products
  const processBestSellingProducts = (data) => {
    // Create a map to aggregate sales by product
    const productMap = new Map();

    // Aggregate units sold by product
    data.forEach((item) => {
      const key = `${item.product_name}-${item.product_id}`;
      const current = productMap.get(key) || {
        product_id: item.product_id,
        product_name: item.product_name,
        size: item.size || "",
        units_sold: 0,
        sales_income: 0,
      };

      current.units_sold += item.units_sold || 0;
      current.sales_income += item.sales_income || 0;
      productMap.set(key, current);
    });

    // Convert to array and sort by units sold (descending)
    return Array.from(productMap.values())
      .sort((a, b) => b.units_sold - a.units_sold)
      .slice(0, 4); // Get top 4 products
  };

  // Process inventory data
  const processInventoryData = (data) => {
    return data.reduce(
      (acc, item) => {
        return {
          totalBottles: acc.totalBottles + (item.total_bottles || 0),
          totalValue: acc.totalValue + (item.total_value || 0),
        };
      },
      { totalBottles: 0, totalValue: 0 }
    );
  };

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 2,
    }).format(value || 0);
  };

  // Color scheme for charts
  const COLORS = ["#4f46e5", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 min-h-screen p-6 flex items-center justify-center">
        <div className="text-lg font-medium text-indigo-700 flex items-center gap-3">
          <RefreshCcw className="animate-spin" size={24} />
          Loading dashboard data...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 min-h-screen p-6 flex items-center justify-center">
        <div className="bg-white p-6 rounded-xl shadow-xl text-lg font-medium text-red-600 max-w-lg w-full">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-blue-500">
            Sales Dashboard
          </h1>

          <div className="relative">
            <button
              onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
              className="bg-white border border-indigo-200 rounded-lg py-2 px-4 flex items-center gap-2 hover:bg-indigo-50 transition-colors shadow-sm"
            >
              <CalendarIcon size={16} className="text-indigo-500" />
              <span>{formatDateRange()}</span>
            </button>
            {isDatePickerOpen && (
              <div className="absolute right-0 mt-2 bg-white border border-indigo-100 rounded-lg shadow-xl z-10 p-3">
                <DatePicker
                  selected={startDate}
                  onChange={(dates) => {
                    const [start, end] = dates;
                    setStartDate(start);
                    setEndDate(end);
                    if (start && end) setIsDatePickerOpen(false);
                  }}
                  startDate={startDate}
                  endDate={endDate}
                  selectsRange
                  inline
                />
                <div className="flex justify-end mt-2">
                  <button
                    onClick={clearDateRange}
                    className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-3 py-1 rounded-md text-sm font-medium transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left section - 3/4 width */}
          <div className="lg:col-span-3 space-y-6 flex flex-col">
            {/* Overview section */}
            <div className="bg-white p-6 rounded-xl shadow-md flex-grow">
              <h2 className="text-xl font-semibold text-gray-800 mb-5 flex items-center gap-2">
                <TrendingUp size={20} className="text-indigo-500" />
                Performance Overview
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Bottles Sold */}
                <div className="relative bg-gradient-to-br from-orange-100 to-orange-200 p-5 rounded-xl shadow-sm border border-orange-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-gray-700 font-medium">Bottles Sold</p>
                      <p className="text-2xl font-bold mt-2">
                        {overviewMetrics.sellingBottles.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-orange-300 p-2 rounded-lg absolute top-2 right-2">
                      <Package size={24} className="text-orange-700" />
                    </div>
                  </div>
                </div>

                {/* Sale Income */}
                <div className="relative bg-gradient-to-br from-teal-100 to-teal-200 p-5 rounded-xl shadow-sm border border-teal-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-gray-700 font-medium">Total Revenue</p>
                      <p className="text-2xl font-bold mt-2">
                        {formatCurrency(overviewMetrics.saleIncome).replace(
                          "LKR",
                          ""
                        )}
                      </p>
                    </div>
                    <div className="bg-teal-300 p-2 rounded-lg absolute top-2 right-2">
                      <DollarSign size={24} className="text-teal-700" />
                    </div>
                  </div>
                </div>

                {/* Total Expenses */}
                <div className="relative bg-gradient-to-br from-red-100 to-red-200 p-5 rounded-xl shadow-sm border border-red-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-gray-700 font-medium">
                        Total Expenses
                      </p>
                      <p className="text-2xl font-bold mt-2">
                        {formatCurrency(overviewMetrics.totalExpenses).replace(
                          "LKR",
                          ""
                        )}
                      </p>
                    </div>
                    <div className="bg-red-300 p-2 rounded-lg absolute top-2 right-2">
                      <TrendingDown size={24} className="text-red-700" />
                    </div>
                  </div>
                </div>

                {/* Net P&L */}
                <div
                  className={`relative bg-gradient-to-br ${
                    overviewMetrics.netProfitLoss >= 0
                      ? "from-green-100 to-green-200 border-green-200"
                      : "from-red-100 to-red-200 border-red-200"
                  } p-5 rounded-xl shadow-sm border`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-gray-700 font-medium">Net P&L</p>
                      <p className="text-2xl font-bold mt-2">
                        {formatCurrency(overviewMetrics.netProfitLoss).replace(
                          "LKR",
                          ""
                        )}
                      </p>
                    </div>
                    <div
                      className={`${
                        overviewMetrics.netProfitLoss >= 0
                          ? "bg-green-300"
                          : "bg-red-300"
                      } p-2 rounded-lg absolute top-2 right-2`}
                    >
                      {overviewMetrics.netProfitLoss >= 0 ? (
                        <TrendingUp size={24} className="text-green-700" />
                      ) : (
                        <TrendingDown size={24} className="text-red-700" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Profit & Loss Section */}
            <div className="bg-white p-6 rounded-xl shadow-md flex-grow">
              <h2 className="text-xl font-semibold text-gray-800 mb-5 flex items-center gap-2">
                <FileText size={20} className="text-indigo-500" />
                Profit & Loss Summary
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-700">
                      Total Revenue
                    </p>
                    <ArrowUpCircle size={16} className="text-green-500" />
                  </div>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(profitLossData.totalRevenue).replace(
                      "LKR",
                      ""
                    )}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-700">
                      Total Expenses
                    </p>
                    <ArrowDownCircle size={16} className="text-red-500" />
                  </div>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(profitLossData.totalExpenses).replace(
                      "LKR",
                      ""
                    )}
                  </p>
                </div>

                <div
                  className={`bg-gradient-to-br ${
                    profitLossData.netProfit >= 0
                      ? "from-green-50 to-green-100"
                      : "from-red-50 to-red-100"
                  } p-4 rounded-xl`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-700">
                      Net Profit
                    </p>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        profitLossData.grossMargin >= 0
                          ? "bg-green-200 text-green-700"
                          : "bg-red-200 text-red-700"
                      }`}
                    >
                      {profitLossData.grossMargin.toFixed(1)}%
                    </span>
                  </div>
                  <p
                    className={`text-2xl font-bold ${
                      profitLossData.netProfit >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {formatCurrency(profitLossData.netProfit).replace(
                      "LKR",
                      ""
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Cash Flow Section */}
            <div className="bg-white p-6 rounded-xl shadow-md flex-grow">
              <h2 className="text-xl font-semibold text-gray-800 mb-5 flex items-center gap-2">
                <DollarSign size={20} className="text-indigo-500" />
                Cash Flow Analysis
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-gray-700">
                        Cash Inflows
                      </p>
                      <ArrowUpCircle size={16} className="text-green-500" />
                    </div>
                    <p className="text-xl font-bold text-green-600">
                      {formatCurrency(cashFlowData.cashInflows).replace(
                        "LKR",
                        ""
                      )}
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-gray-700">
                        Cash Outflows
                      </p>
                      <ArrowDownCircle size={16} className="text-red-500" />
                    </div>
                    <p className="text-xl font-bold text-red-600">
                      {formatCurrency(cashFlowData.cashOutflows).replace(
                        "LKR",
                        ""
                      )}
                    </p>
                  </div>

                  <div
                    className={`bg-gradient-to-br ${
                      cashFlowData.netCashFlow >= 0
                        ? "from-blue-50 to-blue-100"
                        : "from-orange-50 to-orange-100"
                    } p-4 rounded-xl`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-gray-700">
                        Net Cash Flow
                      </p>
                      {cashFlowData.netCashFlow >= 0 ? (
                        <TrendingUp size={16} className="text-blue-500" />
                      ) : (
                        <TrendingDown size={16} className="text-orange-500" />
                      )}
                    </div>
                    <p
                      className={`text-xl font-bold ${
                        cashFlowData.netCashFlow >= 0
                          ? "text-blue-600"
                          : "text-orange-600"
                      }`}
                    >
                      {formatCurrency(cashFlowData.netCashFlow).replace(
                        "LKR",
                        ""
                      )}
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl">
                  <h3 className="text-sm font-medium text-gray-700 mb-4">
                    Payment & Outstanding Breakdown
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Banknote size={16} className="text-green-500" />
                        <span className="text-sm text-gray-600">Cash</span>
                      </div>
                      <span className="font-medium">
                        {formatCurrency(
                          cashFlowData.paymentBreakdown.cash
                        ).replace("LKR", "")}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-blue-500" />
                        <span className="text-sm text-gray-600">Cheque</span>
                      </div>
                      <span className="font-medium">
                        {formatCurrency(
                          cashFlowData.paymentBreakdown.cheque
                        ).replace("LKR", "")}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CreditCard size={16} className="text-orange-500" />
                        <span className="text-sm text-gray-600">
                          Outstanding
                        </span>
                      </div>
                      <span className="font-medium text-orange-600">
                        {formatCurrency(
                          cashFlowData.paymentBreakdown.outstanding
                        ).replace("LKR", "")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Outstanding Amounts Section */}
            <div className="bg-white p-6 rounded-xl shadow-md flex-grow">
              <h2 className="text-xl font-semibold text-gray-800 mb-5 flex items-center gap-2">
                <CreditCard size={20} className="text-indigo-500" />
                Outstanding Amounts Analysis
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-700">
                      Customer Outstanding
                    </p>
                    <div className="text-xs bg-orange-200 text-orange-700 px-2 py-1 rounded-full">
                      {outstandingData.customerCount} customers
                    </div>
                  </div>
                  <p className="text-xl font-bold text-orange-600">
                    {formatCurrency(
                      outstandingData.customerOutstanding
                    ).replace("LKR", "")}
                  </p>
                  <p className="text-xs text-orange-500 mt-1">
                    Amount receivable
                  </p>
                </div>

                <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-700">
                      Supplier Outstanding
                    </p>
                    <div className="text-xs bg-red-200 text-red-700 px-2 py-1 rounded-full">
                      {outstandingData.supplierCount} suppliers
                    </div>
                  </div>
                  <p className="text-xl font-bold text-red-600">
                    {formatCurrency(
                      outstandingData.supplierOutstanding
                    ).replace("LKR", "")}
                  </p>
                  <p className="text-xs text-red-500 mt-1">Amount payable</p>
                </div>

                <div
                  className={`bg-gradient-to-br ${
                    outstandingData.customerOutstanding >=
                    outstandingData.supplierOutstanding
                      ? "from-green-50 to-green-100"
                      : "from-yellow-50 to-yellow-100"
                  } p-4 rounded-xl`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-700">
                      Net Outstanding
                    </p>
                    {outstandingData.customerOutstanding >=
                    outstandingData.supplierOutstanding ? (
                      <ArrowUpCircle size={16} className="text-green-500" />
                    ) : (
                      <ArrowDownCircle size={16} className="text-yellow-500" />
                    )}
                  </div>
                  <p
                    className={`text-xl font-bold ${
                      outstandingData.customerOutstanding >=
                      outstandingData.supplierOutstanding
                        ? "text-green-600"
                        : "text-yellow-600"
                    }`}
                  >
                    {formatCurrency(
                      outstandingData.customerOutstanding -
                        outstandingData.supplierOutstanding
                    ).replace("LKR", "")}
                  </p>
                  <p
                    className={`text-xs mt-1 ${
                      outstandingData.customerOutstanding >=
                      outstandingData.supplierOutstanding
                        ? "text-green-500"
                        : "text-yellow-500"
                    }`}
                  >
                    {outstandingData.customerOutstanding >=
                    outstandingData.supplierOutstanding
                      ? "Favorable position"
                      : "Net payable"}
                  </p>
                </div>
              </div>
            </div>

            {/* Monthly Best Sales */}
            <div className="bg-white p-6 rounded-xl shadow-md flex-grow">
              <h2 className="text-xl font-semibold text-gray-800 mb-5 flex items-center gap-2">
                <Award size={20} className="text-indigo-500" />
                Top Selling Products
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                {bestSellingProducts.length > 0 ? (
                  bestSellingProducts.map((product, index) => (
                    <div
                      key={index}
                      className={`bg-gradient-to-br ${
                        index === 0
                          ? "from-amber-50 to-amber-100 border-amber-200"
                          : index === 1
                          ? "from-slate-50 to-slate-100 border-slate-200"
                          : index === 2
                          ? "from-orange-50 to-orange-100 border-orange-200"
                          : "from-blue-50 to-blue-100 border-blue-200"
                      } p-4 rounded-xl shadow-sm border`}
                    >
                      <div className="flex flex-col items-center">
                        <p className="text-sm text-gray-700 font-medium text-center mb-2">
                          {product.product_name} {product.size}
                        </p>
                        <p className="text-2xl font-bold">
                          {product.units_sold.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">units sold</p>
                        <p className="text-sm font-medium text-indigo-600 mt-2">
                          {formatCurrency(product.sales_income).replace(
                            "LKR",
                            ""
                          )}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-4 text-center py-6 text-gray-500 bg-gray-50 rounded-lg">
                    No product sales data available
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right section - 1/4 width */}
          <div className="lg:col-span-1 space-y-6">
            {/* Inventory Overview */}
            <div className="bg-white p-6 rounded-xl shadow-md">
              <h2 className="text-xl font-semibold text-gray-800 mb-5 flex items-center gap-2">
                <Package size={20} className="text-indigo-500" />
                Inventory Status
              </h2>

              <div className="space-y-5">
                {/* Total Bottles */}
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-5 rounded-xl text-white shadow-md">
                  <div className="flex justify-between items-center mb-2">
                    <p className="font-medium">Total Bottles</p>
                    <div className="bg-blue-200 bg-opacity-20 p-2 rounded-lg">
                      <Package size={20} className="text-blue-500" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold">
                    {inventoryMetrics.totalBottles.toLocaleString()}
                  </p>
                  <p className="text-xs text-blue-100 mt-2">
                    Current inventory
                  </p>
                </div>

                {/* Total Value */}
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-5 rounded-xl text-white shadow-md">
                  <div className="flex justify-between items-center mb-2">
                    <p className="font-medium">Inventory Value</p>
                    <div className="bg-pink-200 bg-opacity-20 p-2 rounded-lg">
                      <DollarSign size={20} className="text-pink-500" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold">
                    {formatCurrency(inventoryMetrics.totalValue).replace(
                      "LKR",
                      ""
                    )}
                  </p>
                  <p className="text-xs text-pink-100 mt-2">
                    Total stock value
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue vs Expenses Chart */}
        <div className="bg-white p-6 rounded-xl shadow-md mt-6">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <TrendingUp size={20} className="text-indigo-500" />
              Revenue vs Expenses Analysis
            </h2>
          </div>

          <div className="h-80">
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={monthlyData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f0f0f0"
                  />
                  <XAxis dataKey="name" stroke="#6b7280" />
                  <YAxis
                    tickFormatter={(value) => `${value / 1000}k`}
                    stroke="#6b7280"
                  />
                  <Tooltip
                    contentStyle={{
                      background: "white",
                      borderRadius: "8px",
                      boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
                    }}
                    formatter={(value) => [`${formatCurrency(value)}`, ""]}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="#4f46e5"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "#4f46e5" }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="expenses"
                    name="Expenses"
                    stroke="#ef4444"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "#ef4444" }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    name="Net Profit"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "#10b981" }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 bg-gray-50 rounded-lg">
                No financial data available for the selected period
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
