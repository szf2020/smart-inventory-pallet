import React, { useState, useEffect } from "react";
import axios from "axios";

// Updated API URL handling using the getApiUrl function
const getApiUrl = () => {
  if (window.location.hostname === "localhost") {
    return import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  }
  return `https://${window.location.hostname}/api`;
};

const API_URL = getApiUrl();

const AddNewStockForm = ({ onInventoryAdded }) => {
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  // Form state - Updated with invoice fields
  const [formData, setFormData] = useState({
    // Stock fields
    product_id: "",
    cases_qty: 0,
    bottles_qty: 0,
    total_bottles: 0,
    total_value: 0,
    notes: "",
    // Invoice fields
    supplier_id: "",
    invoice_date: new Date().toISOString().split("T")[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    total_amount: 0,
    paid_amount: 0,
    payment_method_id: "",
    invoice_notes: "",
    create_invoice: false,
  });

  // Supplier creation form data
  const [supplierData, setSupplierData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  // State for separate product name and size selections
  const [selectedProductName, setSelectedProductName] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [showSupplierForm, setShowSupplierForm] = useState(false);

  // Lists for dropdowns
  const [productNames, setProductNames] = useState([]);
  const [availableSizes, setAvailableSizes] = useState([]);

  // Selected product details for calculation
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Function to automatically determine status based on amounts
  const getStatusFromAmounts = (totalAmount, paidAmount) => {
    const total = parseFloat(totalAmount) || 0;
    const paid = parseFloat(paidAmount) || 0;

    if (paid === 0) return "pending";
    if (paid >= total) return "paid";
    if (paid > 0 && paid < total) return "partially_paid";
    return "pending";
  };

  // Fetch all products, suppliers, and payment methods
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // Set up axios interceptor for token
        axios.interceptors.request.use(
          (config) => {
            const token = localStorage.getItem("token");
            if (token) {
              config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
          },
          (error) => Promise.reject(error)
        );

        const [productsResponse, suppliersResponse, paymentMethodsResponse] =
          await Promise.all([
            axios.get(`${API_URL}/products`),
            axios.get(`${API_URL}/suppliers`),
            axios.get(`${API_URL}/payment-methods`),
          ]);

        setProducts(productsResponse.data);
        setSuppliers(suppliersResponse.data || []);
        setPaymentMethods(paymentMethodsResponse.data || []);

        // Extract unique product names
        const uniqueNames = [
          ...new Set(productsResponse.data.map((p) => p.product_name)),
        ].sort();
        setProductNames(uniqueNames);
      } catch (err) {
        setError(
          "Failed to fetch data: " +
            (err.response?.data?.message || err.message)
        );
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Update available sizes when product name changes
  useEffect(() => {
    if (selectedProductName) {
      const filteredProducts = products.filter(
        (p) => p.product_name === selectedProductName
      );

      const sizeOrder = {
        "175 mL": 1,
        "250 mL": 4,
        "300 mL": 2,
        "355 mL": 9,
        "400 mL": 5,
        "500 mL": 10,
        "750 mL": 3,
        "1 L": 11,
        "1050 mL": 6,
        "1.5 L": 7,
        "2 L": 8,
      };

      const sizes = [...new Set(filteredProducts.map((p) => p.size))].sort(
        (a, b) => {
          if (sizeOrder[a] !== undefined && sizeOrder[b] !== undefined) {
            return sizeOrder[a] - sizeOrder[b];
          } else if (sizeOrder[a] !== undefined) {
            return -1;
          } else if (sizeOrder[b] !== undefined) {
            return 1;
          } else {
            return a.localeCompare(b);
          }
        }
      );

      setAvailableSizes(sizes);
      setSelectedSize("");
      setSelectedProduct(null);

      setFormData((prev) => ({
        ...prev,
        product_id: "",
        cases_qty: 0,
        bottles_qty: 0,
        total_bottles: 0,
        total_value: 0,
        total_amount: 0,
      }));
    } else {
      setAvailableSizes([]);
      setSelectedSize("");
    }
  }, [selectedProductName, products]);

  // Auto-update total_amount when total_value changes
  useEffect(() => {
    if (formData.create_invoice) {
      setFormData((prev) => ({
        ...prev,
        total_amount: prev.total_value,
      }));
    }
  }, [formData.total_value, formData.create_invoice]);

  // Handle product name selection change
  const handleProductNameChange = (e) => {
    setSelectedProductName(e.target.value);
  };

  // Handle size selection change
  const handleSizeChange = (e) => {
    const size = e.target.value;
    setSelectedSize(size);

    if (selectedProductName && size) {
      const product = products.find(
        (p) => p.product_name === selectedProductName && p.size === size
      );

      if (product) {
        setSelectedProduct(product);
        setFormData((prev) => ({
          ...prev,
          product_id: product.product_id.toString(),
          cases_qty: 0,
          bottles_qty: 0,
          total_bottles: 0,
          total_value: 0,
          total_amount: 0,
        }));
      } else {
        setSelectedProduct(null);
        setError("No matching product found");
      }
    } else {
      setSelectedProduct(null);
    }
  };

  // Normalize quantities
  const normalizeQuantities = (casesQty, bottlesQty, bottlesPerCase) => {
    let finalCases = parseInt(casesQty) || 0;
    let finalBottles = parseInt(bottlesQty) || 0;

    if (finalBottles >= bottlesPerCase && bottlesPerCase > 0) {
      const additionalCases = Math.floor(finalBottles / bottlesPerCase);
      finalCases += additionalCases;
      finalBottles = finalBottles % bottlesPerCase;
    }

    return { cases: finalCases, bottles: finalBottles };
  };

  // Calculate total bottles and value when cases or bottles change
  const handleQuantityChange = (e) => {
    const { name, value } = e.target;
    const numValue = parseInt(value) || 0;

    if (!selectedProduct) return;

    const bottlesPerCase = selectedProduct.bottles_per_case || 0;

    const { cases, bottles } = normalizeQuantities(
      name === "cases_qty" ? numValue : formData.cases_qty,
      name === "bottles_qty" ? numValue : formData.bottles_qty,
      bottlesPerCase
    );

    const totalBottles = cases * bottlesPerCase + bottles;
    const totalValue = totalBottles * (selectedProduct.unit_price || 0);

    setFormData((prev) => ({
      ...prev,
      cases_qty: cases,
      bottles_qty: bottles,
      total_bottles: totalBottles,
      total_value: totalValue,
      total_amount: prev.create_invoice ? totalValue : prev.total_amount,
    }));
  };

  // Handle other form changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    let newValue = type === "checkbox" ? checked : value;

    if (name === "total_amount" || name === "paid_amount") {
      newValue = parseFloat(value) || 0;

      if (name === "paid_amount") {
        const totalAmount = parseFloat(formData.total_amount) || 0;
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

    setError(null);
    setSuccessMessage("");
  };

  // Handle supplier form changes
  const handleSupplierChange = (e) => {
    const { name, value } = e.target;
    setSupplierData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle supplier selection
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

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.product_id) {
      setError("Please select both a product name and size");
      return;
    }

    if (formData.create_invoice) {
      if (!formData.supplier_id && !showSupplierForm) {
        setError(
          "Please select a supplier or create a new one when creating an invoice"
        );
        return;
      }

      if (showSupplierForm && (!supplierData.name || !supplierData.phone)) {
        setError("Supplier name and phone are required");
        return;
      }

      if (parseFloat(formData.paid_amount) > 0 && !formData.payment_method_id) {
        setError("Payment method is required when payment amount is provided");
        return;
      }
    }

    try {
      setIsLoading(true);
      setError(null);
      setSuccessMessage("");

      const payload = {
        product_id: formData.product_id,
        cases_qty: formData.cases_qty,
        bottles_qty: formData.bottles_qty,
        total_bottles: formData.total_bottles,
        total_value: formData.total_value,
        notes: formData.notes,
        create_invoice: formData.create_invoice,
        ...(formData.create_invoice && {
          supplier_id: formData.supplier_id || null,
          supplier_data: showSupplierForm ? supplierData : null,
          invoice_date: formData.invoice_date,
          due_date: formData.due_date,
          total_amount: formData.total_amount,
          paid_amount: formData.paid_amount,
          payment_method_id:
            parseFloat(formData.paid_amount) > 0
              ? formData.payment_method_id
              : null,
          invoice_notes: formData.invoice_notes,
        }),
      };

      const response = await axios.post(`${API_URL}/stock-inventory`, payload);

      if (response.status === 201) {
        const message = formData.create_invoice
          ? "Stock added and purchase invoice created successfully!"
          : "Stock added successfully!";
        setSuccessMessage(message);

        // Reset form
        setFormData({
          product_id: "",
          cases_qty: 0,
          bottles_qty: 0,
          total_bottles: 0,
          total_value: 0,
          notes: "",
          supplier_id: "",
          invoice_date: new Date().toISOString().split("T")[0],
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          total_amount: 0,
          paid_amount: 0,
          payment_method_id: "",
          invoice_notes: "",
          create_invoice: false,
        });

        setSupplierData({
          name: "",
          email: "",
          phone: "",
          address: "",
        });

        setSelectedProductName("");
        setSelectedSize("");
        setSelectedProduct(null);
        setShowSupplierForm(false);

        if (onInventoryAdded) {
          onInventoryAdded();
        }
      }
    } catch (err) {
      setError(
        "Failed to add inventory: " +
          (err.response?.data?.message || err.message)
      );
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded">
      <h2 className="text-xl font-semibold mb-6">Add Stock</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Product Name Selection */}
          <div>
            <label
              htmlFor="product_name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Select Product Name *
            </label>
            <select
              id="product_name"
              value={selectedProductName}
              onChange={handleProductNameChange}
              className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading}
              required
            >
              <option value="">Select a product name</option>
              {productNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Size Selection */}
          <div>
            <label
              htmlFor="size"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Select Size *
            </label>
            <select
              id="size"
              value={selectedSize}
              onChange={handleSizeChange}
              className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              disabled={
                isLoading || !selectedProductName || availableSizes.length === 0
              }
              required
            >
              <option value="">Select a size</option>
              {availableSizes.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>

          {selectedProduct && (
            <>
              {/* Product Details */}
              <div className="col-span-2 p-4 bg-gray-50 rounded-md mb-2">
                <h3 className="font-medium text-gray-700 mb-2">
                  Product Details
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Unit Price:</span> Rs.{" "}
                    {selectedProduct.unit_price?.toFixed(2) || 0}
                  </div>
                  <div>
                    <span className="text-gray-500">Bottles per Case:</span>{" "}
                    {selectedProduct.bottles_per_case || 0}
                  </div>
                  <div>
                    <span className="text-gray-500">Selling Price:</span> Rs.{" "}
                    {selectedProduct.selling_price?.toFixed(2) || 0}
                  </div>
                  <div>
                    <span className="text-gray-500">Size:</span>{" "}
                    {selectedProduct.size}
                  </div>
                </div>
              </div>

              {/* Cases Quantity */}
              <div>
                <label
                  htmlFor="cases_qty"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Cases to Add *
                </label>
                <input
                  type="number"
                  id="cases_qty"
                  name="cases_qty"
                  min="0"
                  value={formData.cases_qty}
                  onChange={handleQuantityChange}
                  className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  disabled={isLoading}
                  required
                />
              </div>

              {/* Bottles Quantity */}
              <div>
                <label
                  htmlFor="bottles_qty"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Loose Bottles to Add
                </label>
                <input
                  type="number"
                  id="bottles_qty"
                  name="bottles_qty"
                  min="0"
                  value={formData.bottles_qty}
                  onChange={handleQuantityChange}
                  className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  disabled={isLoading}
                />
              </div>

              {/* Total Bottles */}
              <div>
                <label
                  htmlFor="total_bottles"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Total Bottles to Add
                </label>
                <input
                  type="number"
                  id="total_bottles"
                  value={formData.total_bottles}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 shadow-sm"
                  disabled
                />
              </div>

              {/* Total Value */}
              <div>
                <label
                  htmlFor="total_value"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Total Value to Add
                </label>
                <input
                  type="text"
                  id="total_value"
                  value={`Rs. ${formData.total_value.toFixed(2)}`}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 shadow-sm"
                  disabled
                />
              </div>

              {/* Notes */}
              <div className="col-span-2">
                <label
                  htmlFor="notes"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Stock Transaction Notes
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows="2"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Enter any notes about this stock addition"
                  className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  disabled={isLoading}
                />
              </div>

              {/* Create Invoice Toggle */}
              <div className="col-span-2">
                <div className="flex items-center">
                  <input
                    id="create_invoice"
                    name="create_invoice"
                    type="checkbox"
                    checked={formData.create_invoice}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="create_invoice"
                    className="ml-2 block text-sm text-gray-900"
                  >
                    Create Purchase Invoice for this stock addition
                  </label>
                </div>
              </div>

              {/* Invoice Section */}
              {formData.create_invoice && (
                <>
                  <div className="col-span-2 border-t pt-4 mt-2">
                    <h3 className="text-lg font-medium text-gray-800 mb-4">
                      Purchase Invoice Details
                    </h3>
                  </div>

                  {/* Supplier Selection */}
                  <div className="col-span-2">
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                      Supplier *
                    </label>
                    <select
                      value={showSupplierForm ? "new" : formData.supplier_id}
                      onChange={handleSupplierSelect}
                      className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required={formData.create_invoice}
                    >
                      <option value="">Select Supplier</option>
                      {suppliers.map((supp) => (
                        <option key={supp.supplier_id} value={supp.supplier_id}>
                          {supp.name}
                        </option>
                      ))}
                      <option value="new">+ Create New Supplier</option>
                    </select>
                  </div>

                  {/* New Supplier Form */}
                  {showSupplierForm && (
                    <div className="col-span-2 bg-gray-50 p-4 rounded-lg border">
                      <h4 className="text-md font-medium text-gray-800 mb-3">
                        New Supplier Details
                      </h4>
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
                            className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter supplier name"
                            required={showSupplierForm}
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
                            className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter phone number"
                            required={showSupplierForm}
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
                            className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                            className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter address"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Invoice Dates */}
                  <div>
                    <label
                      htmlFor="invoice_date"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Invoice Date *
                    </label>
                    <input
                      id="invoice_date"
                      name="invoice_date"
                      type="date"
                      value={formData.invoice_date}
                      onChange={handleChange}
                      className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required={formData.create_invoice}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="due_date"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Due Date *
                    </label>
                    <input
                      id="due_date"
                      name="due_date"
                      type="date"
                      value={formData.due_date}
                      onChange={handleChange}
                      className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required={formData.create_invoice}
                    />
                  </div>

                  {/* Invoice Amount Fields */}
                  <div>
                    <label
                      htmlFor="total_amount"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Invoice Total Amount *
                    </label>
                    <input
                      id="total_amount"
                      name="total_amount"
                      type="text"
                      value={`Rs. ${formData.total_amount.toFixed(2)}`}
                      className="block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm"
                      readOnly
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="paid_amount"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Paid Amount
                    </label>
                    <input
                      id="paid_amount"
                      name="paid_amount"
                      type="number"
                      value={formData.paid_amount}
                      onChange={handleChange}
                      className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      max={formData.total_amount || undefined}
                    />
                  </div>

                  {/* Payment Method */}
                  {parseFloat(formData.paid_amount) > 0 && (
                    <div className="col-span-2">
                      <label
                        htmlFor="payment_method_id"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Payment Method *
                      </label>
                      <select
                        id="payment_method_id"
                        name="payment_method_id"
                        value={formData.payment_method_id}
                        onChange={handleChange}
                        className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required={parseFloat(formData.paid_amount) > 0}
                      >
                        <option value="">Select Payment Method</option>
                        {paymentMethods.map((method) => (
                          <option
                            key={method.method_id}
                            value={method.method_id}
                          >
                            {method.name} - {method.description || ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Invoice Status */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Invoice Status
                    </label>
                    <div className="block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md">
                      <span
                        className={`font-medium ${
                          getStatusFromAmounts(
                            formData.total_amount,
                            formData.paid_amount
                          ) === "paid"
                            ? "text-green-600"
                            : getStatusFromAmounts(
                                formData.total_amount,
                                formData.paid_amount
                              ) === "partially_paid"
                            ? "text-yellow-600"
                            : "text-red-600"
                        }`}
                      >
                        {getStatusFromAmounts(
                          formData.total_amount,
                          formData.paid_amount
                        )
                          .charAt(0)
                          .toUpperCase() +
                          getStatusFromAmounts(
                            formData.total_amount,
                            formData.paid_amount
                          )
                            .slice(1)
                            .replace("_", " ")}
                      </span>
                    </div>
                  </div>

                  {/* Invoice Notes */}
                  <div className="col-span-2">
                    <label
                      htmlFor="invoice_notes"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Invoice Notes
                    </label>
                    <textarea
                      id="invoice_notes"
                      name="invoice_notes"
                      rows="2"
                      value={formData.invoice_notes}
                      onChange={handleChange}
                      placeholder="Additional notes for the purchase invoice..."
                      className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      disabled={isLoading}
                    />
                  </div>
                </>
              )}
            </>
          )}

          {/* Submit Button */}
          <div className="col-span-2 mt-6">
            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-400 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
              disabled={
                isLoading ||
                !selectedProduct ||
                (formData.cases_qty === 0 && formData.bottles_qty === 0) ||
                (formData.create_invoice &&
                  !formData.supplier_id &&
                  !showSupplierForm)
              }
            >
              {isLoading
                ? "Processing..."
                : formData.create_invoice
                ? "Add Stock & Create Invoice"
                : "Add Stock"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddNewStockForm;
