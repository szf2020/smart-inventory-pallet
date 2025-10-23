import React, { useState, useEffect } from "react";
import {
  createExpense,
  getExpenseCategories,
  fetchPaymentMethods,
} from "../../services/api";
import { X } from "lucide-react";

const AddExpenseForm = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    expense_category: "",
    amount: "",
    description: "",
    supplier_name: "",
    reference_number: "",
    paid_amount: "0",
    payment_method_id: "",
  });

  const [categories, setCategories] = useState([
    "Fuel costs",
    "Repairs",
    "Maintenance",
    "Salaries",
    "Utilities",
    "Office Supplies",
    "Travel",
    "Marketing",
    "Insurance",
    "Taxes",
    "Other",
  ]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Load reference data
  useEffect(() => {
    const loadReferenceData = async () => {
      try {
        setDataLoading(true);
        const [categoriesResponse, paymentMethodsResponse] = await Promise.all([
          getExpenseCategories(),
          fetchPaymentMethods(),
        ]);

        // setCategories(categoriesResponse.data || []);
        setPaymentMethods(paymentMethodsResponse.data || []);
        setError(null);
      } catch (err) {
        setError(
          "Failed to load reference data: " +
            (err.response?.data?.message || err.message)
        );
        console.error(err);
      } finally {
        setDataLoading(false);
      }
    };

    loadReferenceData();
  }, []);

  // Function to automatically determine status based on amounts
  const getStatusFromAmounts = (totalAmount, paidAmount) => {
    const total = parseFloat(totalAmount) || 0;
    const paid = parseFloat(paidAmount) || 0;

    if (paid === 0) return "pending";
    if (paid >= total) return "paid";
    if (paid > 0 && paid < total) return "partially_paid";
    return "pending";
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    let newValue = value;

    // Handle numeric fields
    if (name === "amount" || name === "paid_amount") {
      newValue = parseFloat(value) || "";

      // Prevent paid amount from exceeding total amount
      if (name === "paid_amount") {
        const totalAmount = parseFloat(formData.amount) || 0;
        const paidAmount = parseFloat(value) || 0;

        if (paidAmount > totalAmount && totalAmount > 0) {
          newValue = totalAmount;
        }
      }
    }

    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }));

    // Reset success/error messages on form change
    setSuccess(false);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);

      // Validate required fields
      if (!formData.expense_category) {
        setError("Expense category is required");
        setLoading(false);
        return;
      }

      if (!formData.amount || parseFloat(formData.amount) <= 0) {
        setError("Amount must be greater than 0");
        setLoading(false);
        return;
      }

      // Validate payment method if there's a paid amount
      if (parseFloat(formData.paid_amount) > 0 && !formData.payment_method_id) {
        setError("Payment method is required when payment amount is provided");
        setLoading(false);
        return;
      }

      // Prepare expense data
      const expenseData = {
        date: formData.date,
        expense_category: formData.expense_category,
        amount: parseFloat(formData.amount),
        description: formData.description,
        supplier_name: formData.supplier_name,
        reference_number: formData.reference_number,
        paid_amount: parseFloat(formData.paid_amount || 0),
        payment_method_id:
          parseFloat(formData.paid_amount) > 0
            ? formData.payment_method_id
            : null,
      };

      // Create expense
      const response = await createExpense(expenseData);

      setSuccess(true);

      // Reset form
      setFormData({
        date: new Date().toISOString().split("T")[0],
        expense_category: "",
        amount: "",
        description: "",
        supplier_name: "",
        reference_number: "",
        paid_amount: "0",
        payment_method_id: "",
      });

      // Call success callback if provided
      if (onSuccess) {
        onSuccess(response.data);
      }

      // Close the form after a short delay
      setTimeout(() => {
        if (onClose) onClose();
      }, 1500);
    } catch (err) {
      setError(
        "Failed to create expense: " +
          (err.response?.data?.message || err.message)
      );
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentStatus = () => {
    return getStatusFromAmounts(formData.amount, formData.paid_amount);
  };

  if (dataLoading)
    return <div className="flex justify-center p-6">Loading form data...</div>;

  return (
    <div className="bg-white p-6 mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">
          Create New Expense
        </h2>
        <button className="text-gray-500 hover:text-gray-700" onClick={onClose}>
          <X size={20} />
        </button>
      </div>

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          Expense created successfully!
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="date"
            >
              Date *
            </label>
            <input
              id="date"
              name="date"
              type="date"
              value={formData.date}
              onChange={handleChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>

          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="expense_category"
            >
              Category *
            </label>
            <select
              id="expense_category"
              name="expense_category"
              value={formData.expense_category}
              onChange={handleChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            >
              <option value="">Select Category</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="amount"
            >
              Amount *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500">LKR</span>
              </div>
              <input
                id="amount"
                name="amount"
                type="number"
                value={formData.amount}
                onChange={handleChange}
                className="shadow appearance-none border rounded w-full py-2 pl-12 pr-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                placeholder="0.00"
                step="0.01"
                min="0"
                required
              />
            </div>
          </div>

          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="paid_amount"
            >
              Paid Amount
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500">LKR</span>
              </div>
              <input
                id="paid_amount"
                name="paid_amount"
                type="number"
                value={formData.paid_amount}
                onChange={handleChange}
                className="shadow appearance-none border rounded w-full py-2 pl-12 pr-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                placeholder="0.00"
                step="0.01"
                min="0"
                max={formData.amount || undefined}
              />
            </div>
          </div>
        </div>

        {/* Payment Method Field - Show only if there's a paid amount */}
        {parseFloat(formData.paid_amount) > 0 && (
          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="payment_method_id"
            >
              Payment Method *
            </label>
            <select
              id="payment_method_id"
              name="payment_method_id"
              value={formData.payment_method_id}
              onChange={handleChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required={parseFloat(formData.paid_amount) > 0}
            >
              <option value="">Select Payment Method</option>
              {paymentMethods.map((method) => (
                <option key={method.method_id} value={method.method_id}>
                  {method.name} - {method.description}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="supplier_name"
            >
              Supplier Name
            </label>
            <input
              id="supplier_name"
              name="supplier_name"
              type="text"
              value={formData.supplier_name}
              onChange={handleChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="Enter supplier name"
            />
          </div>

          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="reference_number"
            >
              Reference Number
            </label>
            <input
              id="reference_number"
              name="reference_number"
              type="text"
              value={formData.reference_number}
              onChange={handleChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="Invoice/Receipt number"
            />
          </div>
        </div>

        {/* Status Display - Read-only, automatically calculated */}
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Status
          </label>
          <div className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight bg-gray-50">
            <span
              className={`font-medium ${
                getCurrentStatus() === "paid"
                  ? "text-green-600"
                  : getCurrentStatus() === "partially_paid"
                  ? "text-yellow-600"
                  : "text-red-600"
              }`}
            >
              {getCurrentStatus().charAt(0).toUpperCase() +
                getCurrentStatus().slice(1).replace("_", " ")}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Status is automatically calculated based on payment amount
          </p>
        </div>

        <div className="mb-4">
          <label
            className="block text-gray-700 text-sm font-bold mb-2"
            htmlFor="description"
          >
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="Expense description..."
            rows="3"
          />
        </div>

        <div className="flex items-center justify-end mt-8 space-x-3">
          <button
            type="button"
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Expense"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddExpenseForm;
