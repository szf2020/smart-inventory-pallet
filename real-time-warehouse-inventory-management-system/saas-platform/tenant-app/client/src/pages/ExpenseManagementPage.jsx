import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Filter,
  Download,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import ExpenseTable from "../components/ExpenseManagement/ExpenseTable";
import AddExpenseForm from "../components/ExpenseManagement/AddExpenseForm"; // Updated import name
import ExpenseSummaryCards from "../components/ExpenseManagement/ExpenseSummaryCards";
import ExpenseFilters from "../components/ExpenseManagement/ExpenseFilters";
import {
  fetchExpenses,
  fetchExpenseSummary,
  updateExpense,
  deleteExpense,
} from "../services/api";

const ExpenseManagementPage = () => {
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    category: "",
    status: "",
    search: "",
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
  });

  // Fetch expenses data
  const loadExpenses = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        console.log("Loading expenses with filters:", filters);
        const queryParams = {
          page,
          limit: pagination.itemsPerPage,
          ...filters,
        };

        const response = await fetchExpenses(queryParams);
        console.log("Expenses response:", response);

        if (response.success) {
          setExpenses(response.data);
          setPagination(response.pagination);
        }
      } catch (error) {
        console.error("Error loading expenses:", error);
        // Don't redirect to login here, let the axios interceptor handle it
      } finally {
        setLoading(false);
      }
    },
    [filters, pagination.itemsPerPage]
  );

  // Fetch summary data
  const loadSummary = useCallback(async () => {
    try {
      console.log("Loading expense summary with filters:", filters);
      const response = await fetchExpenseSummary(filters);
      console.log("Summary response:", response);
      if (response.success) {
        setSummary(response.data);
      }
    } catch (error) {
      console.error("Error loading expense summary:", error);
      // Don't redirect to login here, let the axios interceptor handle it
    }
  }, [filters]);

  useEffect(() => {
    loadExpenses();
    loadSummary();
  }, [loadExpenses, loadSummary]);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleExpenseAdded = () => {
    setShowAddForm(false);
    loadExpenses(1);
    loadSummary();
  };

  const handleExpenseUpdated = async (expenseId, updateData) => {
    try {
      await updateExpense(expenseId, updateData);
      // Reload the current page of expenses and summary after update
      loadExpenses(pagination.currentPage);
      loadSummary();
    } catch (error) {
      console.error("Error updating expense:", error);
      throw error; // Re-throw so the component can handle it
    }
  };

  const handleExpenseDeleted = async (expenseId) => {
    try {
      await deleteExpense(expenseId);
      // Reload the current page of expenses and summary after deletion
      loadExpenses(pagination.currentPage);
      loadSummary();
    } catch (error) {
      console.error("Error deleting expense:", error);
      throw error; // Re-throw so the component can handle it
    }
  };

  const handlePageChange = (page) => {
    loadExpenses(page);
  };

  // If showing add form, render only the form
  if (showAddForm) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <DollarSign className="h-8 w-8 text-red-600" />
                  Expense Management
                </h1>
                <p className="text-gray-600 mt-2">
                  Track and manage all business expenses
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Filter className="h-4 w-4" />
                  Filters
                </button>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add Expense
                </button>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          {summary && (
            <ExpenseSummaryCards summary={summary} className="mb-8" />
          )}
          <AddExpenseForm
            onClose={() => setShowAddForm(false)}
            onSuccess={handleExpenseAdded}
          />
        </div>
      </div>
    );
  }

  // Otherwise render the main expense management interface
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <DollarSign className="h-8 w-8 text-red-600" />
                Expense Management
              </h1>
              <p className="text-gray-600 mt-2">
                Track and manage all business expenses
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Filter className="h-4 w-4" />
                Filters
              </button>
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Expense
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && <ExpenseSummaryCards summary={summary} className="mb-8" />}

        {/* Filters */}
        {showFilters && (
          <ExpenseFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            className="mb-6"
          />
        )}

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                All Expenses
              </h2>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>
                  Showing {expenses.length} of {pagination.totalItems} expenses
                </span>
                <button className="flex items-center gap-2 text-blue-600 hover:text-blue-700">
                  <Download className="h-4 w-4" />
                  Export
                </button>
              </div>
            </div>
          </div>

          <ExpenseTable
            expenses={expenses}
            loading={loading}
            pagination={pagination}
            onPageChange={handlePageChange}
            onExpenseUpdated={handleExpenseUpdated}
            onExpenseDeleted={handleExpenseDeleted}
          />
        </div>
      </div>
    </div>
  );
};

export default ExpenseManagementPage;
