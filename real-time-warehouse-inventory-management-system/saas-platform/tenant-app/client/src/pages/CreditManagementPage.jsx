import React, { useState, useEffect, useContext } from "react";
import { Tab } from "@headlessui/react";
import {
  Users,
  Truck,
  RefreshCcw,
  DollarSign,
  FileText,
  CreditCard,
  Building,
  Plus,
  TrendingUp,
  BarChart3,
  Activity,
} from "lucide-react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  fetchCustomers,
  fetchSuppliers,
  fetchSalesInvoices,
  fetchPurchaseInvoices,
  fetchPayments,
  fetchExpenses,
} from "../services/api";
import CustomersList from "../components/FinancialManagement/CustomersList";
import SuppliersList from "../components/FinancialManagement/SuppliersList";
import CustomerForm from "../components/FinancialManagement/CustomerForm";
import SupplierForm from "../components/FinancialManagement/SupplierForm";
import PaymentsList from "../components/FinancialManagement/PaymentsList";
import PaymentForm from "../components/FinancialManagement/PaymentForm";
import InvoicesList from "../components/FinancialManagement/InvoicesList";
import SalesInvoiceForm from "../components/FinancialManagement/SalesInvoiceForm";
import PurchaseInvoiceForm from "../components/FinancialManagement/PurchaseInvoiceForm";
import CashFlowDashboard from "../components/CreditManagement/CashFlowDashboard";
import PaymentMethodsSummary from "../components/CreditManagement/PaymentMethodsSummary";
import NewCreditAccountsTable from "../components/CreditManagement/NewCreditAccountsTable";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

const CreditManagementPage = () => {
  const { currentUser } = useContext(AuthContext);
  const isAdmin = currentUser?.userRole?.name === "admin";
  const navigate = useNavigate();

  // useEffect(() => {
  //   if (!isAdmin) {
  //     console.log("User is not an admin. Redirecting...");
  //     navigate("/unauthorized");
  //   }
  // }, [isAdmin, navigate]);

  const [activeTab, setActiveTab] = useState("cashflow");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [invoiceFormType, setInvoiceFormType] = useState("sales");
  const [summaryData, setSummaryData] = useState({
    customerCount: 0,
    totalCredits: 0,
    supplierCount: 0,
    totalOutstanding: 0,
    recentTransactions: 0,
    overdueInvoices: 0,
  });
  const [loading, setLoading] = useState(false);

  // Load summary data using your actual APIs
  useEffect(() => {
    const loadSummaryData = async () => {
      try {
        setLoading(true);
        console.log("Loading summary data...");

        // Fetch data using your existing APIs
        const [
          customersResponse,
          suppliersResponse,
          salesInvoicesResponse,
          purchaseInvoicesResponse,
          paymentsResponse,
          expensesResponse,
        ] = await Promise.all([
          fetchCustomers().catch((err) => {
            console.error("fetchCustomers error:", err);
            return { data: [] };
          }),
          fetchSuppliers().catch((err) => {
            console.error("fetchSuppliers error:", err);
            return { data: [] };
          }),
          fetchSalesInvoices({ limit: 1000 }).catch((err) => {
            console.error("fetchSalesInvoices error:", err);
            return { data: { invoices: [] } };
          }),
          fetchPurchaseInvoices({ limit: 1000 }).catch((err) => {
            console.error("fetchPurchaseInvoices error:", err);
            return { data: [] };
          }),
          fetchPayments({ limit: 1000 }).catch((err) => {
            console.error("fetchPayments error:", err);
            return { data: [] };
          }),
          fetchExpenses({ limit: 1000 }).catch((err) => {
            console.error("fetchExpenses error:", err);
            return { data: [] };
          }),
        ]);

        console.log("Raw API responses for summary:", {
          customers: customersResponse,
          suppliers: suppliersResponse,
          salesInvoices: salesInvoicesResponse,
          purchaseInvoices: purchaseInvoicesResponse,
          payments: paymentsResponse,
          expenses: expensesResponse,
        });

        // Extract data safely
        const customers = customersResponse?.data || [];
        const suppliers = suppliersResponse?.data || [];
        const salesInvoices = salesInvoicesResponse?.data?.data?.invoices || [];
        const purchaseInvoices = purchaseInvoicesResponse?.data?.data || [];
        const payments = paymentsResponse?.data || [];
        const expenses = expensesResponse?.data || [];

        console.log("Extracted data:", {
          customersCount: customers.length,
          suppliersCount: suppliers.length,
          salesInvoicesCount: salesInvoices.length,
          purchaseInvoicesCount: purchaseInvoices.length,
          paymentsCount: payments.length,
          expensesCount: expenses.length,
        });

        console.log(
          "Customer credit limits:",
          customers.map((c) => ({
            name: c.name,
            credit_limit: c.credit_limit,
          }))
        );

        // Helper function to calculate outstanding amounts from invoices and payments
        const calculateOutstanding = (invoices, referenceType) => {
          return invoices.reduce((total, invoice) => {
            const invoiceAmount = parseFloat(invoice.total_amount || 0);

            // Find all payments for this invoice
            const relatedPayments = payments.filter(
              (payment) =>
                payment.reference_id === invoice.invoice_id &&
                payment.reference_type === referenceType &&
                payment.status === "completed"
            );

            const totalPaid = relatedPayments.reduce(
              (sum, payment) => sum + parseFloat(payment.amount || 0),
              0
            );

            const outstanding = invoiceAmount - totalPaid;
            return total + (outstanding > 0 ? outstanding : 0);
          }, 0);
        };

        // Calculate outstanding amounts
        const salesOutstanding = calculateOutstanding(
          salesInvoices,
          "SalesInvoice"
        );
        const purchaseOutstanding = calculateOutstanding(
          purchaseInvoices,
          "PurchaseInvoice"
        );

        // Calculate outstanding expenses
        const expenseOutstanding = expenses.reduce((total, expense) => {
          const expenseAmount = parseFloat(expense.amount || 0);

          // Find payments for this expense
          const relatedPayments = payments.filter(
            (payment) =>
              payment.reference_id === expense.expense_id &&
              payment.reference_type === "Expense" &&
              payment.status === "completed"
          );

          const totalPaid = relatedPayments.reduce(
            (sum, payment) => sum + parseFloat(payment.amount || 0),
            0
          );

          const outstanding = expenseAmount - totalPaid;
          return total + (outstanding > 0 ? outstanding : 0);
        }, 0);

        const totalOutstanding = purchaseOutstanding + expenseOutstanding;

        // Calculate total credits (sum of customer credit limits)
        const totalCredits = salesOutstanding;

        // Count overdue invoices (assuming invoices with 'overdue' status or past due date)
        const currentDate = new Date();
        const overdueInvoices = [
          ...salesInvoices.filter((invoice) => {
            if (invoice.status === "overdue") return true;
            if (invoice.due_date) {
              const dueDate = new Date(invoice.due_date);
              return dueDate < currentDate && invoice.status !== "paid";
            }
            return false;
          }),
          ...purchaseInvoices.filter((invoice) => {
            if (invoice.status === "overdue") return true;
            if (invoice.due_date) {
              const dueDate = new Date(invoice.due_date);
              return dueDate < currentDate && invoice.status !== "paid";
            }
            return false;
          }),
        ].length;

        // Count recent transactions (payments in the last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentTransactions = payments.filter((payment) => {
          const paymentDate = new Date(payment.payment_date);
          return paymentDate >= thirtyDaysAgo && payment.status === "completed";
        }).length;

        const calculatedSummary = {
          customerCount: customers.length,
          totalCredits,
          supplierCount: suppliers.length,
          totalOutstanding,
          recentTransactions,
          overdueInvoices,
        };

        console.log("Calculated summary:", calculatedSummary);

        setSummaryData(calculatedSummary);
      } catch (err) {
        console.error("Failed to load summary data:", err);
        // Set default values on error
        setSummaryData({
          customerCount: 0,
          totalCredits: 0,
          supplierCount: 0,
          totalOutstanding: 0,
          recentTransactions: 0,
          overdueInvoices: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    loadSummaryData();
  }, [refreshTrigger]);

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
    setSelectedItem(null);
    setShowForm(false);
    setShowInvoiceForm(false);
  };

  const handleItemSelect = (item) => {
    setSelectedItem(item);
  };

  const handleAddNew = () => {
    setSelectedItem(null);
    setShowForm(true);
    setShowInvoiceForm(false);
  };

  const handleAddNewInvoice = (type) => {
    setSelectedItem(null);
    setShowForm(false);
    setShowInvoiceForm(true);
    setInvoiceFormType(type);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setShowInvoiceForm(false);
    handleRefresh();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Credit & Cash Flow Management
          </h1>
          <p className="text-gray-600 mt-2">
            Monitor cash flow, manage credit accounts, and track payment methods
          </p>
        </div>
        <div className="flex space-x-3">
          {activeTab === "invoices" ? (
            <>
              <button
                onClick={() => handleAddNewInvoice("sales")}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
              >
                <Plus size={16} />
                <span>New Sales Invoice</span>
              </button>
              <button
                onClick={() => handleAddNewInvoice("purchase")}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition"
              >
                <Plus size={16} />
                <span>New Purchase Invoice</span>
              </button>
            </>
          ) : activeTab !== "cashflow" && activeTab !== "accounts" ? (
            <button
              onClick={handleAddNew}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
            >
              <Plus size={16} />
              <span>Add New</span>
            </button>
          ) : null}
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
          >
            <RefreshCcw size={16} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Summary Cards */}
        <div className="bg-white rounded-lg shadow p-5 flex items-center">
          <div className="rounded-full bg-blue-100 p-3 mr-4">
            <Users className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Customers / Credits</p>
            <p className="text-xl font-semibold">
              {loading
                ? "Loading..."
                : `${summaryData.customerCount} / ${formatCurrency(
                    summaryData.totalCredits
                  )}`}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-5 flex items-center">
          <div className="rounded-full bg-green-100 p-3 mr-4">
            <Building className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Suppliers / Outstanding</p>
            <p className="text-xl font-semibold">
              {loading
                ? "Loading..."
                : `${summaryData.supplierCount} / ${formatCurrency(
                    summaryData.totalOutstanding
                  )}`}
            </p>
          </div>
        </div>

        {/* <div className="bg-white rounded-lg shadow p-5 flex items-center">
          <div className="rounded-full bg-red-100 p-3 mr-4">
            <FileText className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Overdue Invoices</p>
            <p className="text-xl font-semibold">
              {loading ? "Loading..." : summaryData.overdueInvoices}
            </p>
          </div>
        </div> */}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <Tab.Group>
          <Tab.List className="flex bg-gray-100 p-1">
            <Tab
              className={({ selected }) =>
                classNames(
                  "w-full py-2.5 text-sm font-medium rounded-md",
                  "focus:outline-none focus:ring-2 ring-offset-2 ring-offset-blue-400 ring-white ring-opacity-60",
                  selected
                    ? "bg-white shadow"
                    : "text-gray-500 hover:bg-white/[0.12] hover:text-gray-700"
                )
              }
              onClick={() => setActiveTab("cashflow")}
            >
              <div className="flex items-center justify-center space-x-2">
                <Activity size={16} />
                <span>Cash Flow</span>
              </div>
            </Tab>
            <Tab
              className={({ selected }) =>
                classNames(
                  "w-full py-2.5 text-sm font-medium rounded-md",
                  "focus:outline-none focus:ring-2 ring-offset-2 ring-offset-blue-400 ring-white ring-opacity-60",
                  selected
                    ? "bg-white shadow"
                    : "text-gray-500 hover:bg-white/[0.12] hover:text-gray-700"
                )
              }
              onClick={() => setActiveTab("payment-methods")}
            >
              <div className="flex items-center justify-center space-x-2">
                <BarChart3 size={16} />
                <span>Payment Methods</span>
              </div>
            </Tab>
            <Tab
              className={({ selected }) =>
                classNames(
                  "w-full py-2.5 text-sm font-medium rounded-md",
                  "focus:outline-none focus:ring-2 ring-offset-2 ring-offset-blue-400 ring-white ring-opacity-60",
                  selected
                    ? "bg-white shadow"
                    : "text-gray-500 hover:bg-white/[0.12] hover:text-gray-700"
                )
              }
              onClick={() => setActiveTab("accounts")}
            >
              <div className="flex items-center justify-center space-x-2">
                <CreditCard size={16} />
                <span>Accounts</span>
              </div>
            </Tab>
            <Tab
              className={({ selected }) =>
                classNames(
                  "w-full py-2.5 text-sm font-medium rounded-md",
                  "focus:outline-none focus:ring-2 ring-offset-2 ring-offset-blue-400 ring-white ring-opacity-60",
                  selected
                    ? "bg-white shadow"
                    : "text-gray-500 hover:bg-white/[0.12] hover:text-gray-700"
                )
              }
              onClick={() => setActiveTab("customers")}
            >
              <div className="flex items-center justify-center space-x-2">
                <Users size={16} />
                <span>Customers</span>
              </div>
            </Tab>
            <Tab
              className={({ selected }) =>
                classNames(
                  "w-full py-2.5 text-sm font-medium rounded-md",
                  "focus:outline-none focus:ring-2 ring-offset-2 ring-offset-blue-400 ring-white ring-opacity-60",
                  selected
                    ? "bg-white shadow"
                    : "text-gray-500 hover:bg-white/[0.12] hover:text-gray-700"
                )
              }
              onClick={() => setActiveTab("suppliers")}
            >
              <div className="flex items-center justify-center space-x-2">
                <Truck size={16} />
                <span>Suppliers</span>
              </div>
            </Tab>
            <Tab
              className={({ selected }) =>
                classNames(
                  "w-full py-2.5 text-sm font-medium rounded-md",
                  "focus:outline-none focus:ring-2 ring-offset-2 ring-offset-blue-400 ring-white ring-opacity-60",
                  selected
                    ? "bg-white shadow"
                    : "text-gray-500 hover:bg-white/[0.12] hover:text-gray-700"
                )
              }
              onClick={() => setActiveTab("transactions")}
            >
              <div className="flex items-center justify-center space-x-2">
                <DollarSign size={16} />
                <span>Transactions</span>
              </div>
            </Tab>
            <Tab
              className={({ selected }) =>
                classNames(
                  "w-full py-2.5 text-sm font-medium rounded-md",
                  "focus:outline-none focus:ring-2 ring-offset-2 ring-offset-blue-400 ring-white ring-opacity-60",
                  selected
                    ? "bg-white shadow"
                    : "text-gray-500 hover:bg-white/[0.12] hover:text-gray-700"
                )
              }
              onClick={() => setActiveTab("invoices")}
            >
              <div className="flex items-center justify-center space-x-2">
                <FileText size={16} />
                <span>Invoices</span>
              </div>
            </Tab>
          </Tab.List>
          <Tab.Panels>
            <Tab.Panel className="p-4">
              <CashFlowDashboard refreshTrigger={refreshTrigger} />
            </Tab.Panel>
            <Tab.Panel className="p-4">
              <PaymentMethodsSummary refreshTrigger={refreshTrigger} />
            </Tab.Panel>
            <Tab.Panel className="p-4">
              <NewCreditAccountsTable
                refreshTrigger={refreshTrigger}
                onAccountSelect={handleItemSelect}
              />
            </Tab.Panel>
            <Tab.Panel className="p-4">
              {showForm && activeTab === "customers" ? (
                <CustomerForm
                  customer={selectedItem}
                  onClose={handleFormClose}
                />
              ) : (
                <CustomersList
                  refreshTrigger={refreshTrigger}
                  onCustomerSelect={handleItemSelect}
                  selectedCustomer={selectedItem}
                />
              )}
            </Tab.Panel>
            <Tab.Panel className="p-4">
              {showForm && activeTab === "suppliers" ? (
                <SupplierForm
                  supplier={selectedItem}
                  onClose={handleFormClose}
                />
              ) : (
                <SuppliersList
                  refreshTrigger={refreshTrigger}
                  onSupplierSelect={handleItemSelect}
                  selectedSupplier={selectedItem}
                />
              )}
            </Tab.Panel>
            <Tab.Panel className="p-4">
              {showForm && activeTab === "transactions" ? (
                <PaymentForm
                  onClose={handleFormClose}
                  entityType={selectedItem?.type}
                  entityId={selectedItem?.id}
                />
              ) : (
                <PaymentsList
                  refreshTrigger={refreshTrigger}
                  entityType={selectedItem?.type}
                  entityId={selectedItem?.id}
                />
              )}
            </Tab.Panel>
            <Tab.Panel className="p-4">
              {showInvoiceForm && invoiceFormType === "sales" ? (
                <SalesInvoiceForm
                  onClose={handleFormClose}
                  customer={
                    selectedItem?.type === "customer" ? selectedItem : null
                  }
                />
              ) : showInvoiceForm && invoiceFormType === "purchase" ? (
                <PurchaseInvoiceForm
                  onClose={handleFormClose}
                  supplier={
                    selectedItem?.type === "supplier" ? selectedItem : null
                  }
                />
              ) : (
                <InvoicesList
                  refreshTrigger={refreshTrigger}
                  entityType={selectedItem?.type}
                  entityId={selectedItem?.id}
                />
              )}
            </Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
      </div>
    </div>
  );
};

export default CreditManagementPage;
