import React, { useState, useEffect } from "react";
import {
  createSalesInvoice,
  fetchCustomers,
  fetchLorries,
  getActiveRepresentatives,
  getPaymentMethods,
} from "../../services/api";
import { X, Plus, Trash2, Percent } from "lucide-react";
import axios from "axios";

// API URL handling
const getApiUrl = () => {
  if (window.location.hostname === "localhost") {
    return import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  }
  return `https://${window.location.hostname}/api`;
};

const API_URL = getApiUrl();

const SalesInvoiceForm = ({ onClose, customer = null }) => {
  // Set a default due date 30 days from today
  const defaultDueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const [formData, setFormData] = useState({
    customer_id: customer ? customer.customer_id : "",
    invoice_date: new Date().toISOString().split("T")[0],
    due_date: defaultDueDate,
    subtotal: "", // Original amount before discount
    total_amount: "", // Final amount after discount
    paid_amount: "0",
    status: "pending",
    notes: "",
    lorry_id: "",
    payment_method_id: "",
    rep_id: "",
  });

  // Customer creation form data
  const [customerData, setCustomerData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  // Discount form data - similar to AddDiscountTab structure
  const [discountData, setDiscountData] = useState({
    shop_id: "",
    discountItems: [],
  });

  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showDiscountForm, setShowDiscountForm] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [lorries, setLorries] = useState([]);
  const [reps, setRepresentatives] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [allDiscountShops, setAllDiscountShops] = useState([]);
  const [selectedShopDetails, setSelectedShopDetails] = useState(null);
  const [shopDiscountValues, setShopDiscountValues] = useState([]);
  const [discountInputs, setDiscountInputs] = useState({});
  const [addedDiscounts, setAddedDiscounts] = useState([]);
  const [totalDiscountedCases, setTotalDiscountedCases] = useState(0);
  const [availableCases, setAvailableCases] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [discountsLoading, setDiscountsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Load reference data
  useEffect(() => {
    const loadReferenceData = async () => {
      try {
        setDataLoading(true);
        const [
          customersResponse,
          lorriesResponse,
          representativesResponse,
          paymentMethodsResponse,
          allShopsResponse,
        ] = await Promise.all([
          fetchCustomers(),
          fetchLorries(),
          getActiveRepresentatives(),
          getPaymentMethods(),
          axios.get(`${API_URL}/shops/with-discounts`),
        ]);

        setCustomers(customersResponse.data || []);
        setLorries(lorriesResponse.data || lorriesResponse || []);
        setRepresentatives(representativesResponse.data || []);
        setPaymentMethods(
          paymentMethodsResponse.data || paymentMethodsResponse || []
        );
        setAllDiscountShops(allShopsResponse.data || []);

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

  // Reset discount data when customer changes
  useEffect(() => {
    if (!formData.customer_id) {
      setDiscountData((prev) => ({ ...prev, shop_id: "" }));
      return;
    }

    // Reset shop selection and discount data when customer changes
    setDiscountData({
      shop_id: "",
      discountItems: [],
    });
    setSelectedShopDetails(null);
    setShopDiscountValues([]);
    setAddedDiscounts([]);
    setTotalDiscountedCases(0);
    setDiscountInputs({});
  }, [formData.customer_id]);

  // Load shop details when shop is selected (similar to AddDiscountTab)
  useEffect(() => {
    if (!discountData.shop_id) {
      setSelectedShopDetails(null);
      setShopDiscountValues([]);
      setAddedDiscounts([]);
      setTotalDiscountedCases(0);
      setAvailableCases(0);
      setDiscountInputs({});
      return;
    }

    const getShopDetails = async () => {
      try {
        setDiscountsLoading(true);
        // Get shop details with discount values
        const shopResponse = await axios.get(
          `${API_URL}/shops/${discountData.shop_id}`
        );

        if (shopResponse.data) {
          const shopData = shopResponse.data;
          setSelectedShopDetails(shopData);

          // Set shop discount values
          if (
            shopData.shopDiscountValues &&
            shopData.shopDiscountValues.length > 0
          ) {
            setShopDiscountValues(shopData.shopDiscountValues);

            // Initialize discount inputs with zero cases
            const initialInputs = {};
            shopData.shopDiscountValues.forEach((value) => {
              initialInputs[value.sub_discount_type_id] = "";
            });
            setDiscountInputs(initialInputs);
          }

          // Get discounts already used to calculate available cases
          try {
            const discountsResponse = await axios.get(
              `${API_URL}/discounts/shop/${discountData.shop_id}`
            );

            const usedCases = discountsResponse.data.reduce(
              (total, discount) => total + parseInt(discount.discounted_cases),
              0
            );

            setAvailableCases(
              Math.max(0, shopData.max_discounted_cases - usedCases)
            );
          } catch (discountErr) {
            console.error("Failed to fetch existing discounts:", discountErr);
            setAvailableCases(shopData.max_discounted_cases || 0);
          }
        }
      } catch (err) {
        console.error("Failed to fetch shop details:", err);
        setError("Failed to fetch shop details");
      } finally {
        setDiscountsLoading(false);
      }
    };

    getShopDetails();
  }, [discountData.shop_id]);

  // Calculate totals when subtotal or discount changes
  useEffect(() => {
    const calculateTotals = () => {
      const subtotalValue = parseFloat(formData.subtotal) || 0;
      let totalDiscountAmount = 0;

      // Calculate total discount from all discount items
      addedDiscounts.forEach((item) => {
        totalDiscountAmount += item.discount_amount * item.discounted_cases;
      });

      const finalTotal = subtotalValue - totalDiscountAmount;

      setFormData((prev) => ({
        ...prev,
        total_amount: finalTotal > 0 ? finalTotal.toFixed(2) : "0",
      }));
    };

    calculateTotals();
  }, [formData.subtotal, addedDiscounts]);

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
    if (
      name === "subtotal" ||
      name === "total_amount" ||
      name === "paid_amount"
    ) {
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

  const handleCustomerChange = (e) => {
    const { name, value } = e.target;
    setCustomerData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCustomerSelect = (e) => {
    const value = e.target.value;
    if (value === "new") {
      setShowCustomerForm(true);
      setFormData((prev) => ({ ...prev, customer_id: "" }));
    } else {
      setShowCustomerForm(false);
      setFormData((prev) => ({ ...prev, customer_id: value }));
    }
  };

  // Discount handling functions (similar to AddDiscountTab)
  const handleDiscountToggle = () => {
    setShowDiscountForm(!showDiscountForm);
    if (!showDiscountForm) {
      // Reset discount data when opening
      setDiscountData({
        shop_id: "",
        discountItems: [],
      });
      setAddedDiscounts([]);
      setTotalDiscountedCases(0);
    }
  };

  const handleDiscountChange = (e) => {
    const { name, value } = e.target;
    setDiscountData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle discount input change (from AddDiscountTab)
  const handleDiscountInputChange = (typeId, value) => {
    setDiscountInputs({
      ...discountInputs,
      [typeId]: value,
    });
  };

  // Add all discount items to the list (from AddDiscountTab)
  const addAllDiscountItems = () => {
    // Check if any cases are entered
    let hasCases = false;
    let totalCases = 0;

    // Create new discounts array
    const newDiscounts = [];

    for (const [typeId, casesValue] of Object.entries(discountInputs)) {
      if (casesValue && parseFloat(casesValue) > 0) {
        hasCases = true;
        const casesNum = parseFloat(casesValue);
        totalCases += casesNum;

        // Find the discount details
        const discountValue = shopDiscountValues.find(
          (value) => value.sub_discount_type_id.toString() === typeId
        );

        if (discountValue) {
          newDiscounts.push({
            sub_discount_type_id: typeId,
            sub_discount_type:
              discountValue.subDiscountType?.sub_discount_name || "Unknown",
            discount_amount: discountValue.discount_value,
            discounted_cases: casesNum,
          });
        }
      }
    }

    if (!hasCases) {
      setError("Please enter cases for at least one discount type");
      return;
    }

    // Check if adding these cases exceeds the available cases
    if (totalCases > availableCases) {
      setError(
        `Adding ${totalCases} cases would exceed available cases (${availableCases})`
      );
      return;
    }

    setAddedDiscounts(newDiscounts);
    setTotalDiscountedCases(totalCases);
    setError(null);
  };

  // Remove a discount item (from AddDiscountTab)
  const removeDiscountItem = (index) => {
    const updatedDiscounts = [...addedDiscounts];
    const removedCases = parseFloat(updatedDiscounts[index].discounted_cases);
    updatedDiscounts.splice(index, 1);

    setAddedDiscounts(updatedDiscounts);
    setTotalDiscountedCases(totalDiscountedCases - removedCases);
  };

  // Auto-select single shop if only one discount shop is available
  useEffect(() => {
    if (allDiscountShops.length === 1 && !discountData.shop_id) {
      setDiscountData((prev) => ({
        ...prev,
        shop_id: allDiscountShops[0].shop_id,
      }));
    }
  }, [allDiscountShops, discountData.shop_id]);

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

      // Validate customer selection or data
      if (!formData.customer_id && !showCustomerForm) {
        setError("Please select a customer or create a new one");
        setLoading(false);
        return;
      }

      if (showCustomerForm && (!customerData.name || !customerData.phone)) {
        setError("Customer name and phone are required");
        setLoading(false);
        return;
      }

      // Validate payment method if there's a paid amount
      if (parseFloat(formData.paid_amount) > 0 && !formData.payment_method_id) {
        setError("Payment method is required when payment amount is provided");
        setLoading(false);
        return;
      }

      // Validate discount data if discount form is shown
      if (showDiscountForm && addedDiscounts.length > 0) {
        if (!discountData.shop_id) {
          setError("Please select a shop for the discount");
          setLoading(false);
          return;
        }
      }

      // Prepare invoice data
      const invoiceData = {
        customer_id: formData.customer_id || null,
        customer_data: showCustomerForm ? customerData : null,
        rep_id: formData.rep_id || null,
        lorry_id: formData.lorry_id || null,
        invoice_date: formData.invoice_date,
        due_date: formData.due_date,
        subtotal: parseFloat(formData.subtotal) || 0,
        total_amount: parseFloat(formData.total_amount),
        paid_amount: parseFloat(formData.paid_amount || 0),
        payment_method_id:
          parseFloat(formData.paid_amount) > 0
            ? formData.payment_method_id
            : null,
        notes: formData.notes,
        // Include discount data if applicable
        discount_data:
          showDiscountForm && addedDiscounts.length > 0
            ? {
                shop_id: discountData.shop_id,
                discountItems: addedDiscounts.map((discount) => ({
                  sub_discount_type_id: discount.sub_discount_type_id,
                  discounted_cases: discount.discounted_cases,
                })),
              }
            : null,
      };

      // Create invoice
      await createSalesInvoice(invoiceData);

      setSuccess(true);

      // Reset form
      setFormData({
        customer_id: customer ? customer.customer_id : "",
        invoice_date: new Date().toISOString().split("T")[0],
        due_date: defaultDueDate,
        subtotal: "",
        total_amount: "",
        paid_amount: "0",
        status: "pending",
        notes: "",
        lorry_id: "",
        payment_method_id: "",
        rep_id: "",
      });

      setCustomerData({
        name: "",
        email: "",
        phone: "",
        address: "",
      });

      setDiscountData({
        shop_id: "",
        discountItems: [],
      });

      setAddedDiscounts([]);
      setTotalDiscountedCases(0);
      setShowCustomerForm(false);
      setShowDiscountForm(false);

      // Close the form after a short delay
      setTimeout(() => {
        if (onClose) onClose();
      }, 1500);
    } catch (err) {
      setError(
        "Failed to create sales invoice: " +
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
    <div className="bg-white p-6 rounded-lg shadow max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">
          {customer
            ? `New Sales Invoice for Customer #${customer.customer_id}`
            : "New Sales Invoice"}
        </h2>
        <button className="text-gray-500 hover:text-gray-700" onClick={onClose}>
          <X size={20} />
        </button>
      </div>

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          Sales invoice created successfully!
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Customer Selection */}
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Customer *
          </label>
          {!customer ? (
            <select
              value={showCustomerForm ? "new" : formData.customer_id}
              onChange={handleCustomerSelect}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            >
              <option value="">Select Customer</option>
              {customers.map((cust) => (
                <option key={cust.customer_id} value={cust.customer_id}>
                  {cust.name}
                </option>
              ))}
              <option value="new">+ Create New Customer</option>
            </select>
          ) : (
            <div className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight bg-gray-50">
              {customer.name}
            </div>
          )}
        </div>

        {/* New Customer Form */}
        {showCustomerForm && (
          <div className="bg-gray-50 p-4 rounded-lg mb-4 border">
            <h3 className="text-lg font-medium text-gray-800 mb-3">
              New Customer Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Customer Name *
                </label>
                <input
                  name="name"
                  type="text"
                  value={customerData.name}
                  onChange={handleCustomerChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="Enter customer name"
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
                  value={customerData.phone}
                  onChange={handleCustomerChange}
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
                  value={customerData.email}
                  onChange={handleCustomerChange}
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
                  value={customerData.address}
                  onChange={handleCustomerChange}
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="subtotal"
            >
              Subtotal (Before Discount) *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500">LKR</span>
              </div>
              <input
                id="subtotal"
                name="subtotal"
                type="number"
                value={formData.subtotal}
                onChange={handleChange}
                className="shadow appearance-none border rounded w-full py-2 pl-10 pr-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
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
              htmlFor="total_amount"
            >
              Total (After Discount)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500">LKR</span>
              </div>
              <input
                id="total_amount"
                name="total_amount"
                type="number"
                value={formData.total_amount}
                className="shadow appearance-none border rounded w-full py-2 pl-10 pr-3 text-gray-700 leading-tight bg-gray-50 focus:outline-none focus:shadow-outline"
                placeholder="0.00"
                step="0.01"
                min="0"
                readOnly
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
                className="shadow appearance-none border rounded w-full py-2 pl-10 pr-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                placeholder="0.00"
                step="0.01"
                min="0"
                max={formData.total_amount || undefined}
              />
            </div>
          </div>
        </div>

        {/* Discount Toggle Button - Show if customer is selected OR creating new customer, and discount shops are available */}
        {(formData.customer_id || showCustomerForm) &&
          allDiscountShops.length > 0 && (
            <div className="mb-4">
              <button
                type="button"
                onClick={handleDiscountToggle}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                  showDiscountForm
                    ? "bg-orange-100 border-orange-300 text-orange-700"
                    : "bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <Percent size={16} />
                {showDiscountForm ? "Remove Discount" : "Add Discount"}
              </button>
            </div>
          )}

        {/* Discount Form */}
        {showDiscountForm && (
          <div className="bg-orange-50 p-4 rounded-lg mb-4 border border-orange-200">
            <h3 className="text-lg font-medium text-orange-800 mb-3 flex items-center gap-2">
              <Percent size={20} />
              Discount Details
            </h3>

            {/* Shop Selection */}
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Shop *
              </label>
              {allDiscountShops.length === 0 ? (
                <div className="text-sm text-gray-500 p-2 border rounded">
                  No shops with discount configurations found
                </div>
              ) : allDiscountShops.length === 1 ? (
                <div className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight bg-gray-50">
                  {allDiscountShops[0].shop_name}
                </div>
              ) : (
                <select
                  name="shop_id"
                  value={discountData.shop_id}
                  onChange={handleDiscountChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required={showDiscountForm}
                >
                  <option value="">Select Shop</option>
                  {allDiscountShops.map((shop) => (
                    <option key={shop.shop_id} value={shop.shop_id}>
                      {shop.shop_name} - {shop.customer?.name || "No Customer"}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Show discount options only if shop is selected */}
            {discountData.shop_id && (
              <>
                {/* Shop Details Display */}
                {selectedShopDetails && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-md">
                    <div className="text-sm">
                      <div className="flex justify-between">
                        <span>Maximum Discounted Cases:</span>
                        <span className="font-medium">
                          {selectedShopDetails.max_discounted_cases}
                        </span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span>Used Cases This Month:</span>
                        <span className="font-medium">
                          {selectedShopDetails.max_discounted_cases -
                            availableCases}
                        </span>
                      </div>
                      <div className="flex justify-between mt-1 text-blue-700 font-medium">
                        <span>Available Cases:</span>
                        <span>{availableCases}</span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span>Cases Being Added:</span>
                        <span className="font-medium">
                          {totalDiscountedCases}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {discountsLoading ? (
                  <div className="text-sm text-gray-500">
                    Loading shop discounts...
                  </div>
                ) : shopDiscountValues.length === 0 ? (
                  <div className="text-sm text-yellow-600 p-2 bg-yellow-100 rounded">
                    No discount options available for this shop
                  </div>
                ) : (
                  <>
                    {/* Discount Types and Cases Input - Similar to AddDiscountTab */}
                    <div className="mb-4 border border-gray-200 rounded-md p-4 bg-white">
                      <h4 className="font-medium mb-3">
                        Available Discount Types
                      </h4>

                      <div className="mb-3">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Discount Type
                              </th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                                Amount (LKR)
                              </th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                                Cases
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {shopDiscountValues.map((value) => (
                              <tr key={value.sub_discount_type_id}>
                                <td className="px-4 py-2 text-sm text-gray-900">
                                  {value.subDiscountType?.sub_discount_name ||
                                    "Unknown"}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-900 text-right">
                                  {value.discount_value}
                                </td>
                                <td className="px-4 py-2 text-right">
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={
                                      discountInputs[
                                        value.sub_discount_type_id
                                      ] || ""
                                    }
                                    onChange={(e) =>
                                      handleDiscountInputChange(
                                        value.sub_discount_type_id,
                                        e.target.value
                                      )
                                    }
                                    className="w-20 border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        <div className="mt-3 text-right">
                          <button
                            type="button"
                            onClick={addAllDiscountItems}
                            className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                          >
                            Add All Discount Items
                          </button>
                        </div>
                      </div>

                      {/* Added Discount Items Table */}
                      {addedDiscounts.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-sm font-medium mb-2">
                            Added Discount Items:
                          </h4>
                          <div className="border rounded-md overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-100">
                                <tr>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                    Discount Type
                                  </th>
                                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                                    Amount
                                  </th>
                                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                                    Cases
                                  </th>
                                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                                    Total
                                  </th>
                                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                                    Action
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {addedDiscounts.map((item, index) => (
                                  <tr key={index}>
                                    <td className="px-4 py-2 text-sm text-gray-900">
                                      {item.sub_discount_type}
                                    </td>
                                    <td className="px-4 py-2 text-sm text-gray-900 text-right">
                                      LKR {item.discount_amount}
                                    </td>
                                    <td className="px-4 py-2 text-sm text-gray-900 text-right">
                                      {item.discounted_cases}
                                    </td>
                                    <td className="px-4 py-2 text-sm text-gray-900 text-right">
                                      LKR{" "}
                                      {(
                                        item.discount_amount *
                                        item.discounted_cases
                                      ).toFixed(2)}
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          removeDiscountItem(index)
                                        }
                                        className="text-red-600 hover:text-red-900 text-sm"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                                <tr className="bg-gray-50">
                                  <td
                                    className="px-4 py-2 text-sm font-medium"
                                    colSpan="2"
                                  >
                                    Total
                                  </td>
                                  <td className="px-4 py-2 text-sm font-medium text-right">
                                    {totalDiscountedCases.toFixed(1)}
                                  </td>
                                  <td className="px-4 py-2 text-sm font-medium text-right">
                                    LKR{" "}
                                    {addedDiscounts
                                      .reduce(
                                        (sum, item) =>
                                          sum +
                                          item.discount_amount *
                                            item.discounted_cases,
                                        0
                                      )
                                      .toFixed(2)}
                                  </td>
                                  <td></td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {addedDiscounts.length === 0 && (
                        <div className="text-center py-4 text-gray-500 text-sm">
                          No discount items added yet. Enter cases above and
                          click "Add All Discount Items" to get started.
                        </div>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}

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
              htmlFor="lorry_id"
            >
              Delivery Lorry
            </label>
            <select
              id="lorry_id"
              name="lorry_id"
              value={formData.lorry_id}
              onChange={handleChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            >
              <option value="">Select Lorry</option>
              {lorries.map((lorry) => (
                <option key={lorry.lorry_id} value={lorry.lorry_id}>
                  {lorry.lorry_number} - {lorry.driver_name}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="rep_id"
            >
              Representative
            </label>
            <select
              id="rep_id"
              name="rep_id"
              value={formData.rep_id}
              onChange={handleChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            >
              <option value="">Select Representative</option>
              {reps.map((rep) => (
                <option key={rep.rep_id} value={rep.rep_id}>
                  {rep.rep_name} - {rep.territory}
                </option>
              ))}
            </select>
          </div>
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

export default SalesInvoiceForm;
