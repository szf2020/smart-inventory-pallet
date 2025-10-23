import axios from "axios";
import toast from "react-hot-toast";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:7000/api/super-admin";

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("adminToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("adminToken");
      localStorage.removeItem("adminUser");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (credentials) => {
    const response = await api.post("/auth/login", credentials);
    return response.data;
  },

  getProfile: async () => {
    const response = await api.get("/auth/profile");
    return response.data;
  },
};

// Tenants API
export const tenantsAPI = {
  getAll: async (params = {}) => {
    const response = await api.get("/tenants", { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/tenants/${id}`);
    return response.data;
  },

  create: async (tenantData) => {
    const response = await api.post("/tenants", tenantData);
    return response.data;
  },

  update: async (id, tenantData) => {
    const response = await api.put(`/tenants/${id}`, tenantData);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/tenants/${id}`);
    return response.data;
  },

  updateStatus: async (id, status) => {
    const response = await api.put(`/tenants/${id}/status`, { status });
    return response.data;
  },
};

// CORS API
export const corsAPI = {
  getByTenant: async (tenantId) => {
    const response = await api.get(`/cors/tenant/${tenantId}`);
    return response.data;
  },

  add: async (tenantId, originData) => {
    const response = await api.post(`/cors/tenant/${tenantId}`, originData);
    return response.data;
  },

  update: async (id, originData) => {
    const response = await api.put(`/cors/${id}`, originData);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/cors/${id}`);
    return response.data;
  },
};

// SSL API
export const sslAPI = {
  getByTenant: async (tenantId) => {
    const response = await api.get(`/ssl/tenant/${tenantId}`);
    return response.data;
  },

  add: async (tenantId, sslData) => {
    const response = await api.post(`/ssl/tenant/${tenantId}`, sslData);
    return response.data;
  },

  update: async (id, sslData) => {
    const response = await api.put(`/ssl/${id}`, sslData);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/ssl/${id}`);
    return response.data;
  },
};

// Environment Variables API
export const envAPI = {
  getByTenant: async (tenantId) => {
    const response = await api.get(`/env/tenant/${tenantId}`);
    return response.data;
  },

  add: async (tenantId, envData) => {
    const response = await api.post(`/env/tenant/${tenantId}`, envData);
    return response.data;
  },

  update: async (id, envData) => {
    const response = await api.put(`/env/${id}`, envData);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/env/${id}`);
    return response.data;
  },
};

// Billing API
export const billingAPI = {
  getAll: async (params = {}) => {
    const response = await api.get("/billing/all", { params });
    return response.data;
  },

  getByTenant: async (tenantId) => {
    const response = await api.get(`/billing/tenant/${tenantId}`);
    return response.data;
  },

  update: async (tenantId, billingData) => {
    const response = await api.put(`/billing/tenant/${tenantId}`, billingData);
    return response.data;
  },

  updatePaymentStatus: async (tenantId, statusData) => {
    const response = await api.put(
      `/billing/tenant/${tenantId}/payment-status`,
      statusData
    );
    return response.data;
  },

  calculate: async (tenantId) => {
    const response = await api.get(`/billing/tenant/${tenantId}/calculate`);
    return response.data;
  },
};

// System Admins API
export const adminsAPI = {
  getAll: async (params = {}) => {
    const response = await api.get("/admins", { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/admins/${id}`);
    return response.data;
  },

  create: async (adminData) => {
    const response = await api.post("/admins", adminData);
    return response.data;
  },

  update: async (id, adminData) => {
    const response = await api.put(`/admins/${id}`, adminData);
    return response.data;
  },

  changePassword: async (id, passwordData) => {
    const response = await api.put(`/admins/${id}/password`, passwordData);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/admins/${id}`);
    return response.data;
  },
};

export default api;
