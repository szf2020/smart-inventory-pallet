import React, { useState, useEffect } from "react";
import {
  createPurchaseInvoice,
  fetchSuppliers,
  getPaymentMethods,
} from "../../services/api";
import { X } from "lucide-react";

const PurchaseInvoiceForm = ({ onClose, supplier = null }) => {
  // Set a default due date 30 days from today
  const defaultDueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const [formData, setFormData] = useState({
    supplier_id: supplier ? supplier.supplier_id : "",
    invoice_date: new Date().toISOString().split("T")[0],
    due_date: defaultDueDate,
    total_amount: "",
    paid_amount: "0",
    status: "pending",
    notes: "",
    payment_method_id: "",
  });

  // Supplier creation form data
  const [supplierData, setSupplierData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
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
        const [suppliersResponse, paymentMethodsResponse] = await Promise.all([
          fetchSuppliers(),
          getPaymentMethods(),
        ]);

        setSuppliers(suppliersResponse.data || []);
        setPaymentMethods(
          paymentMethodsResponse.data || paymentMethodsResponse || []
        );

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
    if (name === "total_amount" || name === "paid_amount") {
      newValue = parseFloat(value) || "";

      // Prevent paid amount from exceeding total amount
      if (name === "paid_amount") {
        const totalAmount = parseFloat(formData.total_amount) || 0;
        const paidAmount = parseFloat(value) || 0;

        if (paidAmount > totalAmount && totalAmount > 0) {
          newValue = totalAmount;
        }
      }
    }

    // Calculate new status based on amounts
    let newStatus = formData.status;
    if (name === "total_amount" || name === "paid_amount") {
      const totalAmount =
        name === "total_amount" ? newValue : formData.total_amount;
      const paidAmount =
        name === "paid_amount" ? newValue : formData.paid_amount;
      newStatus = getStatusFromAmounts(totalAmount, paidAmount);
    }

    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
      status: newStatus,
    }));

    setSuccess(false);
    setError(null);
  };

  const handleSupplierChange = (e) => {
    const { name, value } = e.target;
    setSupplierData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSupplierSelect = (e) => {
    const value = e.target.value;
    if (value === "new") {
      setShowSupplierForm(true);
      setFormData((prev) => ({ ...prev, supplier_id: "" }));
    } else {
      setShowSupplierForm(false);
      setFormData((prev) => ({ ...prev, supplier_id: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);

      if (!formData.due_date) {
        setError("Due date is required");
        setLoading(false);
        return;
      }

      // Validate supplier selection or data
      if (!formData.supplier_id && !showSupplierForm) {
        setError("Please select a supplier or create a new one");
        setLoading(false);
        return;
      }

      if (showSupplierForm && (!supplierData.name || !supplierData.phone)) {
        setError("Supplier name and phone are required");
        setLoading(false);
        return;
      }

      // Validate payment method if there's a paid amount
      if (parseFloat(formData.paid_amount) > 0 && !formData.payment_method_id) {
        setError("Payment method is required when payment amount is provided");
        setLoading(false);
        return;
      }

      // Prepare invoice data
      const invoiceData = {
        supplier_id: formData.supplier_id || null,
        supplier_data: showSupplierForm ? supplierData : null,
        invoice_date: formData.invoice_date,
        due_date: formData.due_date,
        total_amount: parseFloat(formData.total_amount),
        paid_amount: parseFloat(formData.paid_amount || 0),
        payment_method_id:
          parseFloat(formData.paid_amount) > 0
            ? formData.payment_method_id
            : null,
        notes: formData.notes,
      };

      // Create invoice
      await createPurchaseInvoice(invoiceData);

      setSuccess(true);

      // Reset form
      setFormData({
        supplier_id: supplier ? supplier.supplier_id : "",
        invoice_date: new Date().toISOString().split("T")[0],
        due_date: defaultDueDate,
        total_amount: "",
        paid_amount: "0",
        status: "pending",
        notes: "",
        payment_method_id: "",
      });

      setSupplierData({
        name: "",
        email: "",
        phone: "",
        address: "",
      });

      setShowSupplierForm(false);

      // Close the form after a short delay
      setTimeout(() => {
        if (onClose) onClose();
      }, 1500);
    } catch (err) {
      setError(
        "Failed to create purchase invoice: " +
          (err.response?.data?.message || err.message)
      );
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (dataLoading)
    return <div className="flex justify-center p-6">Loading form data...</div>;

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">
          {supplier
            ? `New Purchase Invoice for Supplier #${supplier.supplier_id}`
            : "New Purchase Invoice"}
        </h2>
        <button className="text-gray-500 hover:text-gray-700" onClick={onClose}>
          <X size={20} />
        </button>
      </div>

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          Purchase invoice created successfully!
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Supplier Selection */}
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Supplier *
          </label>
          {!supplier ? (
            <select
              value={showSupplierForm ? "new" : formData.supplier_id}
              onChange={handleSupplierSelect}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            >
              <option value="">Select Supplier</option>
              {suppliers.map((supp) => (
                <option key={supp.supplier_id} value={supp.supplier_id}>
                  {supp.name}
                </option>
              ))}
              <option value="new">+ Create New Supplier</option>
            </select>
          ) : (
            <div className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight bg-gray-50">
              {supplier.name}
            </div>
          )}
        </div>

        {/* New Supplier Form */}
        {showSupplierForm && (
          <div className="bg-gray-50 p-4 rounded-lg mb-4 border">
            <h3 className="text-lg font-medium text-gray-800 mb-3">
              New Supplier Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Supplier Name *
                </label>
                <input
                  name="name"
                  type="text"
                  value={supplierData.name}
                  onChange={handleSupplierChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="Enter supplier name"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Phone *
                </label>
                <input
                  name="phone"
                  type="text"
                  value={supplierData.phone}
                  onChange={handleSupplierChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="Enter phone number"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Email
                </label>
                <input
                  name="email"
                  type="email"
                  value={supplierData.email}
                  onChange={handleSupplierChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="Enter email address"
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Address
                </label>
                <input
                  name="address"
                  type="text"
                  value={supplierData.address}
                  onChange={handleSupplierChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="Enter address"
                />
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="invoice_date"
            >
              Invoice Date *
            </label>
            <input
              id="invoice_date"
              name="invoice_date"
              type="date"
              value={formData.invoice_date}
              onChange={handleChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>

          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="due_date"
            >
              Due Date *
            </label>
            <input
              id="due_date"
              name="due_date"
              type="date"
              value={formData.due_date}
              onChange={handleChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="total_amount"
            >
              Total Amount *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500">$</span>
              </div>
              <input
                id="total_amount"
                name="total_amount"
                type="number"
                value={formData.total_amount}
                onChange={handleChange}
                className="shadow appearance-none border rounded w-full py-2 pl-7 pr-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
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
                <span className="text-gray-500">$</span>
              </div>
              <input
                id="paid_amount"
                name="paid_amount"
                type="number"
                value={formData.paid_amount}
                onChange={handleChange}
                className="shadow appearance-none border rounded w-full py-2 pl-7 pr-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                placeholder="0.00"
                step="0.01"
                min="0"
                max={formData.total_amount || undefined}
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

        {/* Status Display - Read-only, automatically calculated */}
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Status
          </label>
          <div className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight bg-gray-50">
            <span
              className={`font-medium ${
                formData.status === "paid"
                  ? "text-green-600"
                  : formData.status === "partially_paid"
                  ? "text-yellow-600"
                  : "text-red-600"
              }`}
            >
              {formData.status.charAt(0).toUpperCase() +
                formData.status.slice(1).replace("_", " ")}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Status is automatically calculated based on payment amount
          </p>
        </div>

        <div className="mb-4">
          <label
            className="block text-gray-700 text-sm font-bold mb-2"
            htmlFor="notes"
          >
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            placeholder="Additional notes..."
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
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Invoice"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PurchaseInvoiceForm;
