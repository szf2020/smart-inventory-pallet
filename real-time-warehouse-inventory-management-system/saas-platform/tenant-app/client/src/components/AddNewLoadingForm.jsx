import React, { useState, useEffect } from "react";
import axios from "axios";
import RepSelector from "./RepManagement/RepSelector";

// Updated API URL handling using the getApiUrl function
const getApiUrl = () => {
  if (window.location.hostname === "localhost") {
    return import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  }
  return `https://${window.location.hostname}/api`;
};

const API_URL = getApiUrl();

const AddNewLoadingForm = ({ onLoadingAdded, inventoryData }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [lorries, setLorries] = useState([]);
  const [products, setProducts] = useState([]);
  const [productEntries, setProductEntries] = useState([]);
  const [loadedLorries, setLoadedLorries] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    lorry_id: "",
    rep_id: "",
    loading_date: new Date().toISOString().split("T")[0],
    loading_time: new Date().toTimeString().split(" ")[0],
    loaded_by: "",
    status: "Completed",
  });

  // Get the inventory data keyed by product_id for easier lookup
  const inventoryByProductId = inventoryData.reduce((acc, item) => {
    acc[item.product_id] = item;
    return acc;
  }, {});

  // Custom size order mapping
  const sizeOrderMap = {
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

  // Helper function to get order value based on custom size order
  const getSizeOrderValue = (sizeStr) => {
    // Try direct match
    if (sizeOrderMap[sizeStr]) {
      return sizeOrderMap[sizeStr];
    }

    // Handle alternative formats (e.g., "1,5L" vs "1.5L")
    const normalizedSize = sizeStr.replace(",", ".").toUpperCase();
    if (sizeOrderMap[normalizedSize]) {
      return sizeOrderMap[normalizedSize];
    }

    // Extract numeric part for unknown sizes
    const match = sizeStr.match(/(\d+(?:[.,]\d+)?)([mL|L]+)/i);
    if (!match) return 1000; // Unknown sizes at the end

    const [, value, unit] = match;
    const numValue = parseFloat(value.replace(",", "."));

    // Convert to milliliters for consistent comparison
    return unit.toLowerCase() === "l" ? numValue * 1000 : numValue;
  };

  // Fetch lorries, products, and active loading transactions on component mount
  useEffect(() => {
    const fetchLorries = async () => {
      try {
        const response = await axios.get(`${API_URL}/lorries`);
        setLorries(response.data);
      } catch (err) {
        console.error("Failed to fetch lorries:", err);
      }
    };

    const fetchProducts = async () => {
      try {
        const response = await axios.get(`${API_URL}/products`);
        const allProducts = response.data;
        setProducts(allProducts);

        // Create product entries with inventory data and loading quantities
        const entries = allProducts.map((product) => {
          const inventory = inventoryByProductId[product.product_id] || {
            cases_qty: 0,
            bottles_qty: 0,
          };

          return {
            product_id: product.product_id,
            product_name: product.product_name,
            product_size: product.size,
            bottles_per_case: product.bottles_per_case,
            cases_loaded: 0,
            bottles_loaded: 0,
            cases_available: inventory.cases_qty || 0,
            bottles_available: inventory.bottles_qty || 0,
            validationError: "",
            isVisible: true,
            sizeOrderValue: getSizeOrderValue(product.size),
          };
        });

        // Sort by custom size order first, then by product name
        entries.sort((a, b) => {
          if (a.sizeOrderValue === b.sizeOrderValue) {
            return a.product_name.localeCompare(b.product_name);
          }
          return a.sizeOrderValue - b.sizeOrderValue;
        });

        setProductEntries(entries);
      } catch (err) {
        console.error("Failed to fetch products:", err);
      }
    };

    const fetchActiveLoadingTransactions = async () => {
      try {
        // Fetch all loading transactions that are not unloaded
        const response = await axios.get(
          `${API_URL}/loading-transactions?status=active`
        );

        // Create a map of lorry_id to active loading transaction
        const loadedLorriesMap = {};
        response.data.forEach((transaction) => {
          if (transaction.status !== "Unloaded") {
            loadedLorriesMap[transaction.lorry_id] = transaction;
          }
        });

        setLoadedLorries(loadedLorriesMap);
      } catch (err) {
        console.error("Failed to fetch active loading transactions:", err);
      }
    };

    fetchLorries();
    fetchProducts();
    fetchActiveLoadingTransactions();
  }, [inventoryData]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // If changing lorry_id, check if the lorry already has an active loading
    if (name === "lorry_id" && value) {
      if (loadedLorries[value]) {
        setError(
          `This lorry already has an active loading (ID: ${loadedLorries[value].loading_id}). It must be unloaded before creating a new loading.`
        );
        // You can optionally reset the lorry_id selection
        setFormData({ ...formData, [name]: "" });
        return;
      } else {
        // Clear any previous error if the lorry is valid
        setError(null);
      }
    }

    setFormData({ ...formData, [name]: value });
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);

    // Filter product entries based on search term
    setProductEntries((prevEntries) =>
      prevEntries.map((entry) => ({
        ...entry,
        isVisible:
          entry.product_name.toLowerCase().includes(term) ||
          entry.product_size.toLowerCase().includes(term),
      }))
    );
  };

  // Normalize inventory values (convert bottles to cases when needed)
  const normalizeInventoryQuantities = (
    productId,
    casesLoaded,
    bottlesLoaded
  ) => {
    const inventory = inventoryByProductId[productId];
    const product = products.find((p) => p.product_id === productId);

    if (!inventory || !product) {
      return {
        cases: casesLoaded,
        bottles: bottlesLoaded,
        error: "No inventory data available",
      };
    }

    const bottlesPerCase = product.bottles_per_case;

    let finalCases = parseInt(casesLoaded) || 0;
    let finalBottles = parseInt(bottlesLoaded) || 0;

    // If bottles exceeds bottles per case, convert to additional cases
    if (finalBottles >= bottlesPerCase) {
      const additionalCases = Math.floor(finalBottles / bottlesPerCase);
      finalCases += additionalCases;
      finalBottles = finalBottles % bottlesPerCase;
    }

    // Check if we have enough inventory
    const availableCases = inventory.cases_qty || 0;
    const availableBottles = inventory.bottles_qty || 0;
    const totalAvailableBottles =
      availableCases * bottlesPerCase + availableBottles;
    const totalRequestedBottles = finalCases * bottlesPerCase + finalBottles;

    if (totalRequestedBottles > totalAvailableBottles) {
      return {
        cases: finalCases,
        bottles: finalBottles,
        error: `Insufficient stock. Available: ${availableCases} cases and ${availableBottles} bottles.`,
      };
    }

    return { cases: finalCases, bottles: finalBottles, error: null };
  };

  // Handle product quantity change
  const handleQuantityChange = (productId, field, value) => {
    setProductEntries((prevEntries) =>
      prevEntries.map((entry) => {
        if (entry.product_id !== productId) return entry;

        const updatedEntry = { ...entry };
        updatedEntry[field] = value;

        // Validate and normalize quantities
        const { cases, bottles, error } = normalizeInventoryQuantities(
          productId,
          field === "cases_loaded" ? value : entry.cases_loaded,
          field === "bottles_loaded" ? value : entry.bottles_loaded
        );

        updatedEntry.cases_loaded = cases;
        updatedEntry.bottles_loaded = bottles;
        updatedEntry.validationError = error || "";

        return updatedEntry;
      })
    );
  };

  // Validate form before showing confirmation
  const validateForm = () => {
    // Validate form data
    if (!formData.lorry_id || !formData.loaded_by) {
      setError("Please fill in all required fields");
      return false;
    }

    // Double-check if the lorry already has an active loading
    if (loadedLorries[formData.lorry_id]) {
      setError(
        `This lorry already has an active loading. It must be unloaded before creating a new loading.`
      );
      return false;
    }

    // Filter out products with no quantities
    const productsToLoad = productEntries.filter(
      (entry) =>
        parseInt(entry.cases_loaded) > 0 || parseInt(entry.bottles_loaded) > 0
    );

    if (productsToLoad.length === 0) {
      setError("Please enter quantities for at least one product");
      return false;
    }

    // Check for validation errors
    const itemWithError = productsToLoad.find((item) => item.validationError);
    if (itemWithError) {
      setError(
        `Please fix validation error for ${itemWithError.product_name} ${itemWithError.product_size}: ${itemWithError.validationError}`
      );
      return false;
    }

    return true;
  };

  // Show confirmation dialog
  const handleShowConfirmation = (e) => {
    e.preventDefault();

    if (validateForm()) {
      setError(null);
      setShowConfirmation(true);
    }
  };

  // Submit the form after confirmation
  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      // Filter out products with no quantities
      const productsToLoad = productEntries.filter(
        (entry) =>
          parseInt(entry.cases_loaded) > 0 || parseInt(entry.bottles_loaded) > 0
      );

      // Prepare the request payload
      const loadingData = {
        ...formData,
        loadingDetails: productsToLoad.map((item) => ({
          product_id: item.product_id,
          cases_loaded: parseInt(item.cases_loaded),
          bottles_loaded: parseInt(item.bottles_loaded),
        })),
      };

      // Send the loading transaction request
      await axios.post(`${API_URL}/loading-transactions`, loadingData);

      setSuccess(true);
      setShowConfirmation(false);

      // Reset form
      setFormData({
        lorry_id: "",
        rep_id: "",
        loading_date: new Date().toISOString().split("T")[0],
        loading_time: new Date().toTimeString().split(" ")[0],
        loaded_by: "",
        status: "Completed",
      });

      // Reset product quantities
      setProductEntries((prevEntries) =>
        prevEntries.map((entry) => ({
          ...entry,
          cases_loaded: 0,
          bottles_loaded: 0,
          validationError: "",
        }))
      );

      // Notify parent component
      if (onLoadingAdded) {
        onLoadingAdded();
      }

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      console.error("Error creating loading transaction:", err);
      setError(
        err.response?.data?.message || "Failed to create loading transaction"
      );
      setShowConfirmation(false);
    } finally {
      setLoading(false);
    }
  };

  // Cancel confirmation
  const handleCancelConfirmation = () => {
    setShowConfirmation(false);
  };

  // Get unique product sizes for color coding
  const uniqueSizes = [
    ...new Set(productEntries.map((entry) => entry.product_size)),
  ];

  // Modern gradient colors for each unique size
  const sizeColors = {};
  const gradients = [
    "bg-gradient-to-r from-sky-50 to-sky-100", // Soft Sky Blue
    "bg-gradient-to-r from-rose-50 to-rose-100", // Soft Rose Pink
    "bg-gradient-to-r from-emerald-50 to-emerald-100", // Fresh Emerald Green
    "bg-gradient-to-r from-amber-50 to-amber-100", // Warm Amber
    "bg-gradient-to-r from-violet-50 to-violet-100", // Modern Soft Violet
    "bg-gradient-to-r from-fuchsia-50 to-fuchsia-100", // Trendy Fuchsia
    "bg-gradient-to-r from-lime-50 to-lime-100", // Refreshing Lime
    "bg-gradient-to-r from-cyan-50 to-cyan-100", // Light Cyan Blue
    "bg-gradient-to-r from-indigo-50 to-indigo-100", // Stylish Indigo
  ];

  // Ordered sizes based on our custom mapping
  const orderedSizes = [...uniqueSizes].sort((a, b) => {
    return getSizeOrderValue(a) - getSizeOrderValue(b);
  });

  // Assign gradient colors to each size in our ordered list
  orderedSizes.forEach((size, index) => {
    sizeColors[size] = gradients[index % gradients.length];
  });

  // Filter visible products and group by size
  const visibleProducts = productEntries.filter((entry) => entry.isVisible);

  // Group products by size
  const groupedProducts = {};
  visibleProducts.forEach((product) => {
    if (!groupedProducts[product.product_size]) {
      groupedProducts[product.product_size] = [];
    }
    groupedProducts[product.product_size].push(product);
  });

  // Get sizes in our custom order
  const sortedSizes = Object.keys(groupedProducts).sort((a, b) => {
    return getSizeOrderValue(a) - getSizeOrderValue(b);
  });

  // Get products to load for confirmation dialog
  const productsToLoad = productEntries
    .filter(
      (entry) =>
        parseInt(entry.cases_loaded) > 0 || parseInt(entry.bottles_loaded) > 0
    )
    // Sort products in the confirmation dialog by size then by name
    .sort((a, b) => {
      if (a.sizeOrderValue === b.sizeOrderValue) {
        return a.product_name.localeCompare(b.product_name);
      }
      return a.sizeOrderValue - b.sizeOrderValue;
    });

  // Get selected lorry details
  const selectedLorry = lorries.find(
    (lorry) => lorry.lorry_id === parseInt(formData.lorry_id)
  );

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-6">Add New Loading</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          Loading transaction created successfully!
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">
              Confirm Loading Transaction
            </h3>

            <div className="mb-4">
              <p className="font-semibold">Lorry Details:</p>
              <p>
                Lorry:{" "}
                {selectedLorry
                  ? `${selectedLorry.lorry_number} - ${selectedLorry.driver_name}`
                  : ""}
              </p>
              <p>Loaded By: {formData.loaded_by}</p>
              <p>Date: {formData.loading_date}</p>
              <p>Time: {formData.loading_time}</p>
            </div>

            <div className="mb-4">
              <p className="font-semibold mb-2">Products to Load:</p>
              <div className="overflow-x-auto">
                <table className="min-w-full border border-white">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="py-2 px-4 border-2 border-white text-left">
                        Size
                      </th>
                      <th className="py-2 px-4 border-2 border-white text-left">
                        Product Name
                      </th>
                      <th className="py-2 px-4 border-2 border-white text-center">
                        Cases
                      </th>
                      <th className="py-2 px-4 border-2 border-white text-center">
                        Bottles
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {productsToLoad.map((product) => (
                      <tr
                        key={product.product_id}
                        className={`${sizeColors[product.product_size]}`}
                      >
                        <td className="py-1 px-4 border-2 border-white font-medium">
                          {product.product_size}
                        </td>
                        <td className="py-1 px-4 border-2 border-white">
                          {product.product_name}
                        </td>
                        <td className="py-1 px-4 border-2 border-white text-center">
                          {product.cases_loaded}
                        </td>
                        <td className="py-1 px-4 border-2 border-white text-center">
                          {product.bottles_loaded}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100">
                      <td className="py-2 px-4 border-2 border-white"></td>
                      <td className="py-2 px-4 border-2 border-white text-right">
                        Total :
                      </td>
                      <td className="py-2 px-4 border-2 border-white text-center">
                        {productsToLoad.reduce(
                          (acc, item) => acc + item.cases_loaded,
                          0
                        )}
                      </td>
                      <td className="py-2 px-4 border-2 border-white text-center">
                        {productsToLoad.reduce(
                          (acc, item) => acc + item.bottles_loaded,
                          0
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <button
                onClick={handleCancelConfirmation}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="bg-[#0fb493] hover:bg-[#036c57] text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                disabled={loading}
              >
                {loading ? "Processing..." : "Confirm & Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleShowConfirmation}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Lorry Selection */}
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Lorry*
            </label>
            <select
              name="lorry_id"
              value={formData.lorry_id}
              onChange={handleInputChange}
              className="shadow appearance-none border border-gray-300 rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            >
              <option value="">Select Lorry</option>
              {lorries.map((lorry) => {
                const isLoaded = loadedLorries[lorry.lorry_id];
                return (
                  <option
                    key={lorry.lorry_id}
                    value={lorry.lorry_id}
                    disabled={isLoaded}
                  >
                    {lorry.lorry_number} - {lorry.driver_name}
                    {isLoaded ? " (Already Loaded)" : ""}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Representative Selection */}
          <div>
            <RepSelector
              value={formData.rep_id}
              onChange={(value) => setFormData({ ...formData, rep_id: value })}
              label="Representative"
              placeholder="Select representative..."
              className=""
            />
          </div>

          {/* Loaded By */}
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Loaded By*
            </label>
            <input
              type="text"
              name="loaded_by"
              value={formData.loaded_by}
              onChange={handleInputChange}
              className="shadow appearance-none border border-gray-300 rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>

          {/* Loading Date */}
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Loading Date
            </label>
            <input
              type="date"
              name="loading_date"
              value={formData.loading_date}
              onChange={handleInputChange}
              className="shadow appearance-none border border-gray-300 rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>

          {/* Loading Time */}
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Loading Time
            </label>
            <input
              type="time"
              name="loading_time"
              value={formData.loading_time}
              onChange={handleInputChange}
              className="shadow appearance-none border border-gray-300 rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Status
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="shadow appearance-none border border-gray-300 rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              disabled
            >
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>

        {/* Product Search */}
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Search Products
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Search by product name or size..."
            className="shadow appearance-none border border-gray-300 rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          />
        </div>

        {/* Products List */}
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-4">Products to Load</h3>

          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-white">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-2 px-4 border-2 border-white text-left">
                    Size
                  </th>
                  <th className="py-2 px-4 border-2 border-white text-left">
                    Product Name
                  </th>
                  <th className="py-2 px-4 border-2 border-white text-center">
                    Available
                  </th>
                  <th className="py-2 px-4 border-2 border-white text-center">
                    Cases
                  </th>
                  <th className="py-2 px-4 border-2 border-white text-center">
                    Bottles
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleProducts.length > 0 ? (
                  sortedSizes.map((size) =>
                    // For each size, render all products of that size
                    groupedProducts[size].map((entry) => {
                      return (
                        <tr
                          key={entry.product_id}
                          className={`${sizeColors[size]} ${
                            entry.validationError ? "bg-red-100" : ""
                          }`}
                        >
                          {/* product in each size group */}
                          <td className="py-1 px-4 border-2 border-white font-medium">
                            {<div className="font-medium">{size}</div>}
                          </td>
                          <td className="py-1 px-4 border-2 border-white">
                            {entry.product_name}
                          </td>
                          <td className="py-1 px-4 border-2 border-white text-center">
                            {entry.cases_available} cases,{" "}
                            {entry.bottles_available} bottles
                          </td>
                          <td className="py-1 px-4 border-2 border-white">
                            <input
                              type="number"
                              min="0"
                              value={entry.cases_loaded}
                              onChange={(e) =>
                                handleQuantityChange(
                                  entry.product_id,
                                  "cases_loaded",
                                  e.target.value
                                )
                              }
                              onWheel={(e) => e.target.blur()} // Prevent scrolling from changing values
                              className="shadow appearance-none border border-gray-300 rounded w-full py-1 px-2 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            />
                          </td>
                          <td className="py-1 px-4 border border-white">
                            <input
                              type="number"
                              min="0"
                              value={entry.bottles_loaded}
                              onChange={(e) =>
                                handleQuantityChange(
                                  entry.product_id,
                                  "bottles_loaded",
                                  e.target.value
                                )
                              }
                              onWheel={(e) => e.target.blur()} // Prevent scrolling from changing values
                              className="shadow appearance-none border border-gray-300 rounded w-full py-1 px-2 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            />
                            {entry.validationError && (
                              <p className="text-red-500 text-xs mt-1">
                                {entry.validationError}
                              </p>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )
                ) : (
                  <tr>
                    <td colSpan="5" className="py-4 text-center text-gray-500">
                      No products match your search. Try a different search
                      term.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              className="bg-[#0fb493] hover:bg-[#036c57] text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              disabled={loading}
            >
              {loading ? "Processing..." : "Review Loading Transaction"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddNewLoadingForm;
