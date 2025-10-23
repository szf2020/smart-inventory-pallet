import React, { useState, useEffect } from "react";
import {
  createPayment,
  fetchPaymentMethods,
  fetchUnpaidSalesInvoices,
  fetchUnpaidPurchaseInvoices,
} from "../../services/api";
import { X } from "lucide-react";

const PaymentForm = ({ onClose }) => {
  const [formData, setFormData] = useState({
    payment_type: "",
    payment_date: new Date().toISOString().split("T")[0],
    amount: "",
    method_id: "",
    reference_id: "",
    notes: "",
  });

  const [paymentMethods, setPaymentMethods] = useState([]);
  const [salesInvoices, setSalesInvoices] = useState([]);
  const [purchaseInvoices, setPurchaseInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Load reference data
  useEffect(() => {
    const loadReferenceData = async () => {
      try {
        setDataLoading(true);
        const [methodsResponse] = await Promise.all([fetchPaymentMethods()]);

        setPaymentMethods(methodsResponse.data || []);
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

  // Load invoices based on payment type
  useEffect(() => {
    const loadInvoices = async () => {
      if (formData.payment_type === "sales_payment") {
        try {
          const response = await fetchUnpaidSalesInvoices();
          setSalesInvoices(response.data || []);
        } catch (err) {
          console.error("Failed to load sales invoices:", err);
        }
      } else if (formData.payment_type === "purchase_payment") {
        try {
          const response = await fetchUnpaidPurchaseInvoices();
          setPurchaseInvoices(response.data || []);
        } catch (err) {
          console.error("Failed to load purchase invoices:", err);
        }
      }
    };

    if (
      formData.payment_type === "sales_payment" ||
      formData.payment_type === "purchase_payment"
    ) {
      loadInvoices();
    }
  }, [formData.payment_type]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Reset related fields when payment type changes
    if (name === "payment_type") {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
        reference_id: "",
        amount: "",
        notes: "",
      }));
      setSelectedInvoice(null);
    } else if (name === "reference_id") {
      // Find selected invoice and set amount
      let invoice = null;
      if (formData.payment_type === "sales_payment") {
        invoice = salesInvoices.find(
          (inv) => inv.invoice_id === parseInt(value)
        );
      } else if (formData.payment_type === "purchase_payment") {
        invoice = purchaseInvoices.find(
          (inv) => inv.invoice_id === parseInt(value)
        );
      }

      setSelectedInvoice(invoice);

      if (invoice) {
        const balance =
          parseFloat(invoice.total_amount) -
          parseFloat(invoice.paid_amount || 0);
        setFormData((prev) => ({
          ...prev,
          [name]: value,
          amount: balance.toFixed(2),
          notes: `Payment for ${
            formData.payment_type === "sales_payment" ? "Sales" : "Purchase"
          } Invoice #${invoice.invoice_number}`,
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          [name]: value,
        }));
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: name === "amount" ? parseFloat(value) || "" : value,
      }));
    }

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
      if (!formData.payment_type) {
        setError("Payment type is required");
        setLoading(false);
        return;
      }

      if (!formData.amount || parseFloat(formData.amount) <= 0) {
        setError("Amount must be greater than 0");
        setLoading(false);
        return;
      }

      if (!formData.method_id) {
        setError("Payment method is required");
        setLoading(false);
        return;
      }

      // For invoice payments, reference_id is required
      if (
        (formData.payment_type === "sales_payment" ||
          formData.payment_type === "purchase_payment") &&
        !formData.reference_id
      ) {
        setError("Please select an invoice");
        setLoading(false);
        return;
      }

      // Prepare payment data
      const paymentData = {
        payment_type: formData.payment_type,
        payment_date: formData.payment_date,
        amount: parseFloat(formData.amount),
        method_id: parseInt(formData.method_id),
        notes: formData.notes,
      };

      // Add reference_id for invoice payments
      if (formData.reference_id) {
        paymentData.reference_id = parseInt(formData.reference_id);
      }

      // Create payment
      await createPayment(paymentData);

      setSuccess(true);

      // Reset form
      setFormData({
        payment_type: "",
        payment_date: new Date().toISOString().split("T")[0],
        amount: "",
        method_id: "",
        reference_id: "",
        notes: "",
      });
      setSelectedInvoice(null);

      // Close the form after a short delay
      setTimeout(() => {
        if (onClose) onClose();
      }, 1500);
    } catch (err) {
      setError(
        "Failed to create payment: " +
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
    <div className="bg-white p-6 mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Create Payment</h2>
        <button className="text-gray-500 hover:text-gray-700" onClick={onClose}>
          <X size={20} />
        </button>
      </div>

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          Payment created successfully!
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Payment Type */}
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Payment Type *
          </label>
          <select
            name="payment_type"
            value={formData.payment_type}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            required
          >
            <option value="">Select Payment Type</option>
            <option value="sales_payment">
              Sales Invoice Payment (Money In)
            </option>
            <option value="purchase_payment">
              Purchase Invoice Payment (Money Out)
            </option>
            <option value="advance_payment">Advance Payment (Money In)</option>
            <option value="refund">Refund (Money Out)</option>
          </select>
        </div>

        {/* Invoice Selection for Sales/Purchase Payments */}
        {(formData.payment_type === "sales_payment" ||
          formData.payment_type === "purchase_payment") && (
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Select Invoice *
            </label>
            <select
              name="reference_id"
              value={formData.reference_id}
              onChange={handleChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            >
              <option value="">Select Invoice</option>
              {formData.payment_type === "sales_payment" &&
                salesInvoices.map((invoice) => {
                  const balance =
                    parseFloat(invoice.total_amount) -
                    parseFloat(invoice.paid_amount || 0);
                  return (
                    <option key={invoice.invoice_id} value={invoice.invoice_id}>
                      #{invoice.invoice_number} - {invoice.customer?.name} -
                      Total: ${invoice.total_amount} - Paid: $
                      {invoice.paid_amount || 0} - Balance: $
                      {balance.toFixed(2)}
                    </option>
                  );
                })}
              {formData.payment_type === "purchase_payment" &&
                purchaseInvoices.map((invoice) => {
                  const balance =
                    parseFloat(invoice.total_amount) -
                    parseFloat(invoice.paid_amount || 0);
                  return (
                    <option key={invoice.invoice_id} value={invoice.invoice_id}>
                      #{invoice.invoice_number} - {invoice.supplier?.name} -
                      Total: ${invoice.total_amount} - Paid: $
                      {invoice.paid_amount || 0} - Balance: $
                      {balance.toFixed(2)}
                    </option>
                  );
                })}
            </select>
          </div>
        )}

        {/* Selected Invoice Details */}
        {selectedInvoice && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border">
            <h4 className="font-medium text-gray-800 mb-2">Invoice Details</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Invoice #:</span>{" "}
                {selectedInvoice.invoice_number}
              </div>
              <div>
                <span className="font-medium">Date:</span>{" "}
                {selectedInvoice.invoice_date}
              </div>
              <div>
                <span className="font-medium">
                  {formData.payment_type === "sales_payment"
                    ? "Customer"
                    : "Supplier"}
                  :
                </span>{" "}
                {selectedInvoice.customer?.name ||
                  selectedInvoice.supplier?.name}
              </div>
              <div>
                <span className="font-medium">Total:</span> $
                {selectedInvoice.total_amount}
              </div>
              <div>
                <span className="font-medium">Paid:</span> $
                {selectedInvoice.paid_amount || 0}
              </div>
              <div>
                <span className="font-medium">Balance:</span> $
                {(
                  parseFloat(selectedInvoice.total_amount) -
                  parseFloat(selectedInvoice.paid_amount || 0)
                ).toFixed(2)}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="payment_date"
            >
              Payment Date *
            </label>
            <input
              id="payment_date"
              name="payment_date"
              type="date"
              value={formData.payment_date}
              onChange={handleChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>

          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="amount"
            >
              Amount *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500">$</span>
              </div>
              <input
                id="amount"
                name="amount"
                type="number"
                value={formData.amount}
                onChange={handleChange}
                className="shadow appearance-none border rounded w-full py-2 pl-7 pr-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                placeholder="0.00"
                step="0.01"
                min="0"
                required
              />
            </div>
          </div>
        </div>

        <div className="mb-4">
          <label
            className="block text-gray-700 text-sm font-bold mb-2"
            htmlFor="method_id"
          >
            Payment Method *
          </label>
          <select
            id="method_id"
            name="method_id"
            value={formData.method_id}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            required
          >
            <option value="">Select Payment Method</option>
            {paymentMethods.map((method) => (
              <option key={method.method_id} value={method.method_id}>
                {method.name} - {method.description}
              </option>
            ))}
          </select>
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
            placeholder="Payment notes..."
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
            className={`font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${
              formData.payment_type === "sales_payment" ||
              formData.payment_type === "advance_payment"
                ? "bg-green-500 hover:bg-green-700 text-white"
                : formData.payment_type === "purchase_payment" ||
                  formData.payment_type === "refund"
                ? "bg-red-500 hover:bg-red-700 text-white"
                : "bg-blue-500 hover:bg-blue-700 text-white"
            }`}
            disabled={loading}
          >
            {loading
              ? "Processing..."
              : formData.payment_type === "sales_payment" ||
                formData.payment_type === "advance_payment"
              ? "Receive Payment"
              : formData.payment_type === "purchase_payment" ||
                formData.payment_type === "refund"
              ? "Make Payment"
              : "Create Payment"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PaymentForm;
