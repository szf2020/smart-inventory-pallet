import React, { useState } from "react";
import {
  Eye,
  Edit,
  Trash2,
  Check,
  X,
  Calendar,
  DollarSign,
  Tag,
  CreditCard,
  Save,
  FileText,
  User,
  CheckCircle,
} from "lucide-react";
import { format } from "date-fns";

const ExpenseTable = ({
  expenses,
  loading,
  pagination,
  onPageChange,
  onExpenseUpdated,
  onExpenseDeleted,
}) => {
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [editFormData, setEditFormData] = useState({});

  // Initialize edit form data when editing starts
  const handleEditClick = (expense) => {
    setEditingExpense(expense);
    setEditFormData({
      date: expense.date,
      expense_category: expense.expense_category,
      amount: expense.amount,
      status: expense.status,
      description: expense.description || "",
      supplier_name: expense.supplier_name || "",
      reference_number: expense.reference_number || "",
    });
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);

    try {
      // Call your API to update the expense
      await onExpenseUpdated(editingExpense.expense_id, {
        ...editFormData,
        amount: parseFloat(editFormData.amount),
      });

      setEditingExpense(null);
      setEditFormData({});
    } catch (error) {
      console.error("Error updating expense:", error);
      // Handle error (you might want to add error state)
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteClick = (expense) => {
    setDeleteConfirm(expense);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;

    setDeleteLoading(true);
    try {
      await onExpenseDeleted(deleteConfirm.expense_id);
      setDeleteConfirm(null);
    } catch (error) {
      console.error("Error deleting expense:", error);
      // Handle error
    } finally {
      setDeleteLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      paid: "bg-green-100 text-green-800 border-green-200",
      partially_paid: "bg-blue-100 text-blue-800 border-blue-200",
      cancelled: "bg-red-100 text-red-800 border-red-200",
    };

    const statusIcons = {
      pending: <Calendar className="h-3 w-3" />,
      paid: <Check className="h-3 w-3" />,
      partially_paid: <CreditCard className="h-3 w-3" />,
      cancelled: <X className="h-3 w-3" />,
    };

    const statusLabels = {
      pending: "Pending",
      paid: "Paid",
      partially_paid: "Partially Paid",
      cancelled: "Cancelled",
    };

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${statusStyles[status]}`}
      >
        {statusIcons[status]}
        {statusLabels[status]}
      </span>
    );
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-LK", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!expenses || expenses.length === 0) {
    return (
      <div className="p-8 text-center">
        <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No expenses found
        </h3>
        <p className="text-gray-600">
          Get started by adding your first expense.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left py-3 px-4 font-medium text-gray-700">
                Date
              </th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">
                Expense #
              </th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">
                Category
              </th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">
                Amount
              </th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">
                Paid Amount
              </th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">
                Outstanding
              </th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">
                Status
              </th>
              <th className="text-left py-3 px-4 font-medium text-gray-700">
                Created By
              </th>
              <th className="text-right py-3 px-4 font-medium text-gray-700">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {expenses.map((expense) => (
              <tr
                key={expense.expense_id}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    {format(new Date(expense.date), "MMM dd, yyyy")}
                  </div>
                </td>
                <td className="py-4 px-4">
                  <span className="text-sm font-medium text-blue-600">
                    {expense.expense_number}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-900">
                      {expense.expense_category}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency(expense.amount)}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <span className="text-sm text-green-600">
                    {formatCurrency(expense.totalPaid || 0)}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <span className="text-sm text-red-600">
                    {formatCurrency(expense.outstanding || 0)}
                  </span>
                </td>
                <td className="py-4 px-4">{getStatusBadge(expense.status)}</td>
                <td className="py-4 px-4">
                  <span className="text-sm text-gray-600">
                    {expense.createdBy?.full_name ||
                      expense.createdBy?.username ||
                      "Unknown"}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setSelectedExpense(expense)}
                      className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleEditClick(expense)}
                      className="p-1 text-gray-400 hover:text-yellow-600 transition-colors"
                      title="Edit Expense"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(expense)}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete Expense"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            Showing {(pagination.currentPage - 1) * pagination.itemsPerPage + 1}{" "}
            to{" "}
            {Math.min(
              pagination.currentPage * pagination.itemsPerPage,
              pagination.totalItems
            )}{" "}
            of {pagination.totalItems} entries
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            {[...Array(pagination.totalPages)].map((_, i) => {
              const page = i + 1;
              return (
                <button
                  key={page}
                  onClick={() => onPageChange(page)}
                  className={`px-3 py-1 text-sm border rounded-lg ${
                    page === pagination.currentPage
                      ? "bg-red-600 text-white border-red-600"
                      : "border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {page}
                </button>
              );
            })}
            <button
              onClick={() => onPageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage === pagination.totalPages}
              className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {selectedExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Expense Details</h3>
              <button
                onClick={() => setSelectedExpense(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Expense Number
                </label>
                <p className="text-sm text-gray-900">
                  {selectedExpense.expense_number}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Date
                </label>
                <p className="text-sm text-gray-900">
                  {format(new Date(selectedExpense.date), "MMMM dd, yyyy")}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Category
                </label>
                <p className="text-sm text-gray-900">
                  {selectedExpense.expense_category}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Amount
                </label>
                <p className="text-sm text-gray-900 font-semibold">
                  {formatCurrency(selectedExpense.amount)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Paid Amount
                </label>
                <p className="text-sm text-green-600 font-semibold">
                  {formatCurrency(selectedExpense.totalPaid || 0)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Outstanding
                </label>
                <p className="text-sm text-red-600 font-semibold">
                  {formatCurrency(selectedExpense.outstanding || 0)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Status
                </label>
                <div className="mt-1">
                  {getStatusBadge(selectedExpense.status)}
                </div>
              </div>
              {selectedExpense.description && (
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <p className="text-sm text-gray-900">
                    {selectedExpense.description}
                  </p>
                </div>
              )}
              {selectedExpense.supplier_name && (
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Supplier
                  </label>
                  <p className="text-sm text-gray-900">
                    {selectedExpense.supplier_name}
                  </p>
                </div>
              )}
              {selectedExpense.reference_number && (
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Reference Number
                  </label>
                  <p className="text-sm text-gray-900">
                    {selectedExpense.reference_number}
                  </p>
                </div>
              )}
              {selectedExpense.payments &&
                selectedExpense.payments.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Payment History
                    </label>
                    <div className="space-y-2">
                      {selectedExpense.payments.map((payment, index) => (
                        <div
                          key={index}
                          className="bg-gray-50 p-2 rounded text-xs"
                        >
                          <div className="flex justify-between">
                            <span>{payment.paymentMethod?.name}</span>
                            <span className="font-semibold">
                              {formatCurrency(payment.amount)}
                            </span>
                          </div>
                          <div className="text-gray-500">
                            {format(
                              new Date(payment.payment_date),
                              "MMM dd, yyyy"
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Edit className="h-5 w-5 text-blue-600" />
                Edit Expense
              </h2>
              <button
                onClick={() => {
                  setEditingExpense(null);
                  setEditFormData({});
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="inline h-4 w-4 mr-1" />
                    Date *
                  </label>
                  <input
                    type="date"
                    name="date"
                    value={editFormData.date}
                    onChange={handleEditInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Tag className="inline h-4 w-4 mr-1" />
                    Category *
                  </label>
                  <input
                    type="text"
                    name="expense_category"
                    value={editFormData.expense_category}
                    onChange={handleEditInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <DollarSign className="inline h-4 w-4 mr-1" />
                    Amount (LKR) *
                  </label>
                  <input
                    type="number"
                    name="amount"
                    value={editFormData.amount}
                    onChange={handleEditInputChange}
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <CheckCircle className="inline h-4 w-4 mr-1" />
                    Status *
                  </label>
                  <select
                    name="status"
                    value={editFormData.status}
                    onChange={handleEditInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="partially_paid">Partially Paid</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                {/* Supplier Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="inline h-4 w-4 mr-1" />
                    Supplier Name
                  </label>
                  <input
                    type="text"
                    name="supplier_name"
                    value={editFormData.supplier_name}
                    onChange={handleEditInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Reference Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FileText className="inline h-4 w-4 mr-1" />
                    Reference Number
                  </label>
                  <input
                    type="text"
                    name="reference_number"
                    value={editFormData.reference_number}
                    onChange={handleEditInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FileText className="inline h-4 w-4 mr-1" />
                  Description
                </label>
                <textarea
                  name="description"
                  value={editFormData.description}
                  onChange={handleEditInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setEditingExpense(null);
                    setEditFormData({});
                  }}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {editLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Update Expense
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-full bg-red-100">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Delete Expense
                </h3>
                <p className="text-sm text-gray-600">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700">
                <strong>Expense:</strong> {deleteConfirm.expense_number}
              </p>
              <p className="text-sm text-gray-700">
                <strong>Amount:</strong> {formatCurrency(deleteConfirm.amount)}
              </p>
              <p className="text-sm text-gray-700">
                <strong>Category:</strong> {deleteConfirm.expense_category}
              </p>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {deleteLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete Expense
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseTable;
