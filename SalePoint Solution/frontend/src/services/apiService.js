import axios from 'axios';
import { authService } from './authService';
import { API_ENDPOINTS, API_BASE_URL } from '../config/aws-config';
import { handleApiError, logError } from '../utils/errorHandler';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor (simplified for demo - no auth required)
apiClient.interceptors.request.use(
  async (config) => {
    // Demo mode - no authentication required
    console.log('API Request:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
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
    
    // Don't process the error here - let individual methods handle it
    return Promise.reject(error);
  }
);

class ApiService {
  // Helper method to handle API calls with error handling
  async _makeApiCall(apiCall, context) {
    try {
      return await apiCall();
    } catch (error) {
      logError(context, error);
      throw handleApiError(error);
    }
  }

  // Products API
  async getProducts(params = {}) {
    return this._makeApiCall(async () => {
      const response = await apiClient.get(API_ENDPOINTS.PRODUCTS, { params });
      return response.data;
    }, 'getProducts');
  }

  async getProduct(id) {
    return this._makeApiCall(async () => {
      const response = await apiClient.get(`${API_ENDPOINTS.PRODUCTS}/${id}`);
      return response.data;
    }, 'getProduct');
  }

  async createProduct(productData) {
    return this._makeApiCall(async () => {
      const response = await apiClient.post(API_ENDPOINTS.PRODUCTS, productData);
      return response.data;
    }, 'createProduct');
  }

  async updateProduct(id, productData) {
    return this._makeApiCall(async () => {
      const response = await apiClient.put(`${API_ENDPOINTS.PRODUCTS}/${id}`, productData);
      return response.data;
    }, 'updateProduct');
  }

  async deleteProduct(id) {
    return this._makeApiCall(async () => {
      const response = await apiClient.delete(`${API_ENDPOINTS.PRODUCTS}/${id}`);
      return response.data;
    }, 'deleteProduct');
  }

  // Customers API
  async getCustomers(params = {}) {
    return this._makeApiCall(async () => {
      const response = await apiClient.get(API_ENDPOINTS.CUSTOMERS, { params });
      return response.data;
    }, 'getCustomers');
  }

  async getCustomer(id) {
    return this._makeApiCall(async () => {
      const response = await apiClient.get(`${API_ENDPOINTS.CUSTOMERS}/${id}`);
      return response.data;
    }, 'getCustomer');
  }

  async createCustomer(customerData) {
    return this._makeApiCall(async () => {
      const response = await apiClient.post(API_ENDPOINTS.CUSTOMERS, customerData);
      return response.data;
    }, 'createCustomer');
  }

  async updateCustomer(id, customerData) {
    return this._makeApiCall(async () => {
      const response = await apiClient.put(`${API_ENDPOINTS.CUSTOMERS}/${id}`, customerData);
      return response.data;
    }, 'updateCustomer');
  }

  async deleteCustomer(id) {
    return this._makeApiCall(async () => {
      const response = await apiClient.delete(`${API_ENDPOINTS.CUSTOMERS}/${id}`);
      return response.data;
    }, 'deleteCustomer');
  }

  // Sales API
  async getSales(params = {}) {
    return this._makeApiCall(async () => {
      const response = await apiClient.get(API_ENDPOINTS.SALES, { params });
      const data = response.data;
      
      // Transform orders data to sales format if needed
      if (data.orders) {
        return {
          sales: data.orders,
          count: data.count || data.orders.length,
          message: data.message
        };
      }
      
      return data;
    }, 'getSales');
  }

  async getSale(id) {
    return this._makeApiCall(async () => {
      const response = await apiClient.get(`${API_ENDPOINTS.SALES}/${id}`);
      return response.data;
    }, 'getSale');
  }

  async createSale(saleData) {
    return this._makeApiCall(async () => {
      const response = await apiClient.post(API_ENDPOINTS.SALES, saleData);
      return response.data;
    }, 'createSale');
  }

  async updateSale(id, saleData) {
    return this._makeApiCall(async () => {
      const response = await apiClient.put(`${API_ENDPOINTS.SALES}/${id}`, saleData);
      return response.data;
    }, 'updateSale');
  }

  // Inventory API
  async getInventory(params = {}) {
    return this._makeApiCall(async () => {
      // Since INVENTORY maps to PRODUCTS, we need to transform the response
      const response = await apiClient.get(API_ENDPOINTS.INVENTORY, { params });
      const data = response.data;
      
      // Transform products data to inventory format
      if (data.products) {
        const products = data.products;
        const lowStockProducts = products.filter(p => p.stock <= 10);
        const outOfStockProducts = products.filter(p => p.stock === 0);
        
        return {
          inventory: products.map(p => ({
            productId: p.productId,
            name: p.name,
            stock: p.stock,
            price: p.price,
            category: p.category,
            status: p.stock === 0 ? 'out-of-stock' : p.stock <= 10 ? 'low-stock' : 'in-stock'
          })),
          lowStockProducts,
          outOfStockProducts,
          totalProducts: products.length,
          lowStockCount: lowStockProducts.length,
          outOfStockCount: outOfStockProducts.length
        };
      }
      
      return data;
    }, 'getInventory');
  }

  async updateStock(productId, stockData) {
    return this._makeApiCall(async () => {
      const response = await apiClient.put(`${API_ENDPOINTS.INVENTORY}/${productId}`, stockData);
      return response.data;
    }, 'updateStock');
  }

  async getStockMovements(productId) {
    return this._makeApiCall(async () => {
      const response = await apiClient.get(`${API_ENDPOINTS.INVENTORY}/${productId}/movements`);
      return response.data;
    }, 'getStockMovements');
  }

  // Analytics API
  async getAnalytics(params = {}) {
    return this._makeApiCall(async () => {
      const response = await apiClient.get(API_ENDPOINTS.ANALYTICS, { params });
      return response.data;
    }, 'getAnalytics');
  }

  async getSalesReport(dateRange) {
    return this._makeApiCall(async () => {
      const response = await apiClient.get(`${API_ENDPOINTS.ANALYTICS}/sales-report`, {
        params: dateRange
      });
      return response.data;
    }, 'getSalesReport');
  }

  async getCustomerReport(params = {}) {
    return this._makeApiCall(async () => {
      const response = await apiClient.get(`${API_ENDPOINTS.ANALYTICS}/customer-report`, {
        params
      });
      return response.data;
    }, 'getCustomerReport');
  }

  async getInventoryReport() {
    return this._makeApiCall(async () => {
      const response = await apiClient.get(`${API_ENDPOINTS.ANALYTICS}/inventory-report`);
      return response.data;
    }, 'getInventoryReport');
  }

  // Generic API call
  async makeRequest(method, url, data = null, config = {}) {
    return this._makeApiCall(async () => {
      const response = await apiClient.request({
        method,
        url,
        data,
        ...config,
      });
      return response.data;
    }, 'makeRequest');
  }
}

export const apiService = new ApiService();
