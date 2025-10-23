import axios from "axios";

const getApiUrl = () => {
  if (window.location.hostname === "localhost") {
    return import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  }
  return `https://${window.location.hostname}/api`;
};

// Create axios instance with custom config
const api = axios.create({
  baseURL: getApiUrl(),
  headers: {
    "Content-Type": "application/json",
  },
});

// Add a request interceptor to attach the JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle 401 Unauthorized responses
    if (error.response && error.response.status === 401) {
      // Clear localStorage and reload the app
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Expense management API functions
export const fetchExpenses = async (params = {}) => {
  console.log("Fetching expenses with params:", params);
  const queryString = new URLSearchParams(params).toString();
  try {
    const response = await api.get(`/expenses?${queryString}`);
    console.log("fetchExpenses success:", response.data);
    return response.data;
  } catch (error) {
    console.error("fetchExpenses error:", error);
    throw error;
  }
};

export const fetchExpenseSummary = (params = {}) => {
  console.log("Fetching expense summary with params:", params);
  const queryString = new URLSearchParams(params).toString();
  return api
    .get(`/expenses/summary?${queryString}`)
    .then((response) => {
      console.log("fetchExpenseSummary success:", response.data);
      return response.data;
    })
    .catch((error) => {
      console.error("fetchExpenseSummary error:", error);
      throw error;
    });
};

export const fetchExpenseCategories = () => {
  return api.get("/expenses/categories").then((response) => response.data);
};

export const createExpense = (expenseData) => {
  return api.post("/expenses", expenseData).then((response) => response.data);
};

export const updateExpense = (id, expenseData) => {
  return api
    .put(`/expenses/${id}`, expenseData)
    .then((response) => response.data);
};

export const deleteExpense = (id) => {
  return api.delete(`/expenses/${id}`).then((response) => response.data);
};

export const approveExpense = (id) => {
  return api.put(`/expenses/${id}/approve`).then((response) => response.data);
};

// Financial management API functions
export const fetchCustomers = () => api.get("/customers");
export const fetchCustomerById = (id) => api.get(`/customers/${id}`);
export const createCustomer = (data) => api.post("/customers", data);
export const updateCustomer = (id, data) => api.put(`/customers/${id}`, data);
export const deleteCustomer = (id) => api.delete(`/customers/${id}`);
export const processCustomerCreditPayment = (id, data) =>
  api.post(`/customers/${id}/credit-payment`, data);
export const fetchShopsByCustomer = (customerId) =>
  api.get(`/customers/${customerId}/shops`);

export const fetchSuppliers = () => api.get("/suppliers");
export const fetchSupplierById = (id) => api.get(`/suppliers/${id}`);
export const createSupplier = (data) => api.post("/suppliers", data);
export const updateSupplier = (id, data) => api.put(`/suppliers/${id}`, data);
export const deleteSupplier = (id) => api.delete(`/suppliers/${id}`);

export const fetchTransactions = (params) =>
  api.get("/transactions", { params });
export const fetchTransactionById = (id) => api.get(`/transactions/${id}`);
export const createTransaction = (data) => api.post("/transactions", data);
export const updateTransaction = (id, data) =>
  api.put(`/transactions/${id}`, data);
export const deleteTransaction = (id) => api.delete(`/transactions/${id}`);

export const fetchTransactionDetails = (params) =>
  api.get("/transaction-details", { params });
export const createTransactionDetail = (data) =>
  api.post("/transaction-details", data);

export const fetchTransactionTypes = () => api.get("/transaction-types");
export const fetchPaymentMethods = () => api.get("/payment-methods");

export const fetchBankAccounts = () => api.get("/bank-accounts");
export const fetchBankAccountById = (id) => api.get(`/bank-accounts/${id}`);
export const createBankAccount = (data) => api.post("/bank-accounts", data);
export const updateBankAccount = (id, data) =>
  api.put(`/bank-accounts/${id}`, data);

export const fetchCashDrawers = () => api.get("/cash-drawers");
export const updateCashDrawer = (id, data) =>
  api.put(`/cash-drawers/${id}`, data);

export const fetchSalesInvoices = (params) =>
  api.get("/sales-invoices", { params });
export const fetchSalesInvoiceById = (id) => api.get(`/sales-invoices/${id}`);
export const createSalesInvoice = (data) => api.post("/sales-invoices", data);
export const updateSalesInvoice = (id, data) =>
  api.put(`/sales-invoices/${id}`, data);

export const fetchPurchaseInvoices = (params) =>
  api.get("/purchase-invoices", { params });
export const fetchPurchaseInvoiceById = (id) =>
  api.get(`/purchase-invoices/${id}`);
export const createPurchaseInvoice = (data) =>
  api.post("/purchase-invoices", data);
export const updatePurchaseInvoice = (id, data) =>
  api.put(`/purchase-invoices/${id}`, data);

export const fetchLorries = () =>
  api.get("/lorries").then((response) => response.data);

// Shop management API functions
export const fetchShops = () =>
  api.get("/shops").then((response) => response.data);
export const fetchShopsWithDiscountValues = () =>
  api.get("/shops/with-discount-values").then((response) => response.data);
export const createShop = (shopData) =>
  api.post("/shops", shopData).then((response) => response.data);
export const updateShop = (id, shopData) =>
  api.put(`/shops/${id}`, shopData).then((response) => response.data);
export const deleteShop = (id) =>
  api.delete(`/shops/${id}`).then((response) => response.data);
export const fetchShopById = (id) =>
  api.get(`/shops/${id}`).then((response) => response.data);

// Discount management API functions
export const fetchDiscounts = () =>
  api.get("/discounts").then((response) => response.data);
export const createDiscount = (discountData) =>
  api.post("/discounts", discountData).then((response) => response.data);
export const updateDiscount = (id, discountData) =>
  api.put(`/discounts/${id}`, discountData).then((response) => response.data);
export const deleteDiscount = (id) =>
  api.delete(`/discounts/${id}`).then((response) => response.data);
export const createShopDiscount = (discountData) =>
  api.post("/shops/discounts", discountData).then((response) => response.data);

// Cash Flow API functions
export const fetchCashFlow = (params) => api.get("/cash-flow", { params });
export const getCashFlowSummary = () => api.get("/cash-flow/summary");
export const createCashFlowEntry = (data) => api.post("/cash-flow", data);

// Financial reports
export const getCashFlowReport = (params) =>
  api.get("/financial/reports/cash-flow", { params });

export const getActiveRepresentatives = () =>
  api.get("/reps/active").then((response) => response.data);

export const getPaymentMethods = () =>
  api.get("/payment-methods").then((response) => response.data);

// Payment related API calls
export const createPayment = async (paymentData) => {
  const response = await api.post("/payments", paymentData);
  return response.data;
};

export const fetchPayments = async (filters = {}) => {
  // Clean up filters to remove undefined/null values
  const cleanFilters = {};
  Object.keys(filters).forEach((key) => {
    if (
      filters[key] !== undefined &&
      filters[key] !== null &&
      filters[key] !== ""
    ) {
      cleanFilters[key] = filters[key];
    }
  });

  const params = new URLSearchParams(cleanFilters);
  const response = await api.get(`/payments?${params}`);
  return response.data;
};

export const getPaymentSummary = async (dateFilters = {}) => {
  const params = new URLSearchParams(dateFilters);
  const response = await api.get(`/payments/summary?${params}`);
  return response.data;
};

export const fetchUnpaidSalesInvoices = () =>
  api.get("/payments/unpaid-sales-invoices").then((response) => response.data);

export const fetchUnpaidPurchaseInvoices = () =>
  api
    .get("/payments/unpaid-purchase-invoices")
    .then((response) => response.data);

export const getExpenseCategories = async () => {
  const response = await api.get("/expenses/categories");
  return response.data;
};

// Profile API functions
export const fetchUserProfile = async () => {
  const response = await api.get("/auth/profile");
  return response.data;
};

export const updateUserProfile = async (profileData) => {
  const response = await api.patch("/auth/profile", profileData);
  return response.data;
};

export const changePassword = async (passwordData) => {
  const response = await api.put("/auth/profile/change-password", passwordData);
  return response.data;
};

export default api;
