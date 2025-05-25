import axios from 'axios';
import { authService } from './authService';
import { API_ENDPOINTS } from '../config/aws-config';

// Create axios instance
const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_GATEWAY_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  async (config) => {
    const token = await authService.getJwtToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { response } = error;
    
    if (response?.status === 401) {
      // Token expired, try to refresh
      try {
        await authService.refreshSession();
        const newToken = await authService.getJwtToken();
        if (newToken) {
          error.config.headers.Authorization = `Bearer ${newToken}`;
          return apiClient.request(error.config);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        await authService.signOut();
        window.location.href = '/';
      }
    }
    
    return Promise.reject(error);
  }
);

class ApiService {
  // Products API
  async getProducts(params = {}) {
    const response = await apiClient.get(API_ENDPOINTS.PRODUCTS, { params });
    return response.data;
  }

  async getProduct(id) {
    const response = await apiClient.get(`${API_ENDPOINTS.PRODUCTS}/${id}`);
    return response.data;
  }

  async createProduct(productData) {
    const response = await apiClient.post(API_ENDPOINTS.PRODUCTS, productData);
    return response.data;
  }

  async updateProduct(id, productData) {
    const response = await apiClient.put(`${API_ENDPOINTS.PRODUCTS}/${id}`, productData);
    return response.data;
  }

  async deleteProduct(id) {
    const response = await apiClient.delete(`${API_ENDPOINTS.PRODUCTS}/${id}`);
    return response.data;
  }

  // Customers API
  async getCustomers(params = {}) {
    const response = await apiClient.get(API_ENDPOINTS.CUSTOMERS, { params });
    return response.data;
  }

  async getCustomer(id) {
    const response = await apiClient.get(`${API_ENDPOINTS.CUSTOMERS}/${id}`);
    return response.data;
  }

  async createCustomer(customerData) {
    const response = await apiClient.post(API_ENDPOINTS.CUSTOMERS, customerData);
    return response.data;
  }

  async updateCustomer(id, customerData) {
    const response = await apiClient.put(`${API_ENDPOINTS.CUSTOMERS}/${id}`, customerData);
    return response.data;
  }

  async deleteCustomer(id) {
    const response = await apiClient.delete(`${API_ENDPOINTS.CUSTOMERS}/${id}`);
    return response.data;
  }

  // Sales API
  async getSales(params = {}) {
    const response = await apiClient.get(API_ENDPOINTS.SALES, { params });
    return response.data;
  }

  async getSale(id) {
    const response = await apiClient.get(`${API_ENDPOINTS.SALES}/${id}`);
    return response.data;
  }

  async createSale(saleData) {
    const response = await apiClient.post(API_ENDPOINTS.SALES, saleData);
    return response.data;
  }

  async updateSale(id, saleData) {
    const response = await apiClient.put(`${API_ENDPOINTS.SALES}/${id}`, saleData);
    return response.data;
  }

  // Inventory API
  async getInventory(params = {}) {
    const response = await apiClient.get(API_ENDPOINTS.INVENTORY, { params });
    return response.data;
  }

  async updateStock(productId, stockData) {
    const response = await apiClient.put(`${API_ENDPOINTS.INVENTORY}/${productId}`, stockData);
    return response.data;
  }

  async getStockMovements(productId) {
    const response = await apiClient.get(`${API_ENDPOINTS.INVENTORY}/${productId}/movements`);
    return response.data;
  }

  // Analytics API
  async getAnalytics(params = {}) {
    const response = await apiClient.get(API_ENDPOINTS.ANALYTICS, { params });
    return response.data;
  }

  async getSalesReport(dateRange) {
    const response = await apiClient.get(`${API_ENDPOINTS.ANALYTICS}/sales-report`, {
      params: dateRange
    });
    return response.data;
  }

  async getCustomerReport(params = {}) {
    const response = await apiClient.get(`${API_ENDPOINTS.ANALYTICS}/customer-report`, {
      params
    });
    return response.data;
  }

  async getInventoryReport() {
    const response = await apiClient.get(`${API_ENDPOINTS.ANALYTICS}/inventory-report`);
    return response.data;
  }

  // Generic API call
  async makeRequest(method, url, data = null, config = {}) {
    const response = await apiClient.request({
      method,
      url,
      data,
      ...config,
    });
    return response.data;
  }
}

export const apiService = new ApiService();
