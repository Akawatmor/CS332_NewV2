// SalePoint Solution - API Module
class SalePointAPI {
    constructor() {
        this.config = window.SalePointConfig;
        this.baseUrl = this.config.api.baseUrl;
        this.defaultHeaders = this.config.api.headers;
        this.timeout = this.config.api.timeout;
    }

    /**
     * Make HTTP request with error handling and retry logic
     * @param {string} url - Request URL
     * @param {object} options - Request options
     * @returns {Promise<object>} Response data
     */
    async request(url, options = {}) {
        const requestOptions = {
            method: 'GET',
            headers: { ...this.defaultHeaders, ...options.headers },
            ...options
        };

        // Add body for non-GET requests
        if (options.body && requestOptions.method !== 'GET') {
            requestOptions.body = typeof options.body === 'string' 
                ? options.body 
                : JSON.stringify(options.body);
        }

        const maxAttempts = this.config.errors.retry.maxAttempts;
        let lastError;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.timeout);

                const response = await fetch(url, {
                    ...requestOptions,
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                return data;

            } catch (error) {
                lastError = error;
                
                if (attempt < maxAttempts && this.shouldRetry(error)) {
                    const delay = this.calculateRetryDelay(attempt);
                    await this.sleep(delay);
                    continue;
                }
                
                break;
            }
        }

        throw this.handleError(lastError);
    }

    /**
     * Determine if request should be retried
     * @param {Error} error - Error object
     * @returns {boolean} Whether to retry
     */
    shouldRetry(error) {
        if (error.name === 'AbortError') return false;
        if (error.message.includes('401') || error.message.includes('403')) return false;
        return true;
    }

    /**
     * Calculate retry delay with exponential backoff
     * @param {number} attempt - Attempt number
     * @returns {number} Delay in milliseconds
     */
    calculateRetryDelay(attempt) {
        const baseDelay = this.config.errors.retry.baseDelay;
        const backoffFactor = this.config.errors.retry.backoffFactor;
        const maxDelay = this.config.errors.retry.maxDelay;
        
        const delay = baseDelay * Math.pow(backoffFactor, attempt - 1);
        return Math.min(delay, maxDelay);
    }

    /**
     * Sleep for specified milliseconds
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise} Promise that resolves after delay
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Handle and format errors
     * @param {Error} error - Error object
     * @returns {Error} Formatted error
     */
    handleError(error) {
        if (this.config.debug.enabled) {
            console.error('API Error:', error);
        }

        let message = this.config.errors.messages.unknown;

        if (error.name === 'AbortError') {
            message = this.config.errors.messages.timeout;
        } else if (error.message.includes('Failed to fetch')) {
            message = this.config.errors.messages.network;
        } else if (error.message.includes('401')) {
            message = this.config.errors.messages.unauthorized;
        } else if (error.message.includes('403')) {
            message = this.config.errors.messages.forbidden;
        } else if (error.message.includes('404')) {
            message = this.config.errors.messages.notFound;
        } else if (error.message.includes('400')) {
            message = this.config.errors.messages.validation;
        } else if (error.message.includes('500')) {
            message = this.config.errors.messages.server;
        }

        const apiError = new Error(message);
        apiError.originalError = error;
        return apiError;
    }

    // ===== PRODUCT API METHODS =====

    /**
     * Get all products with optional filters
     * @param {object} params - Query parameters
     * @returns {Promise<object>} Products data
     */
    async getProducts(params = {}) {
        const url = new URL(window.ConfigHelper.getApiUrl('products'));
        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== '') {
                url.searchParams.append(key, params[key]);
            }
        });

        return await this.request(url.toString());
    }

    /**
     * Get product by ID
     * @param {number} id - Product ID
     * @returns {Promise<object>} Product data
     */
    async getProduct(id) {
        const url = `${window.ConfigHelper.getApiUrl('products')}/${id}`;
        return await this.request(url);
    }

    /**
     * Create new product
     * @param {object} productData - Product data
     * @returns {Promise<object>} Created product
     */
    async createProduct(productData) {
        const url = window.ConfigHelper.getApiUrl('products');
        return await this.request(url, {
            method: 'POST',
            body: productData
        });
    }

    /**
     * Update product
     * @param {number} id - Product ID
     * @param {object} productData - Product data
     * @returns {Promise<object>} Updated product
     */
    async updateProduct(id, productData) {
        const url = `${window.ConfigHelper.getApiUrl('products')}/${id}`;
        return await this.request(url, {
            method: 'PUT',
            body: productData
        });
    }

    /**
     * Delete product
     * @param {number} id - Product ID
     * @returns {Promise<object>} Deletion result
     */
    async deleteProduct(id) {
        const url = `${window.ConfigHelper.getApiUrl('products')}/${id}`;
        return await this.request(url, {
            method: 'DELETE'
        });
    }

    // ===== CUSTOMER API METHODS =====

    /**
     * Get all customers with optional filters
     * @param {object} params - Query parameters
     * @returns {Promise<object>} Customers data
     */
    async getCustomers(params = {}) {
        const url = new URL(window.ConfigHelper.getApiUrl('customers'));
        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== '') {
                url.searchParams.append(key, params[key]);
            }
        });

        return await this.request(url.toString());
    }

    /**
     * Get customer by ID
     * @param {number} id - Customer ID
     * @returns {Promise<object>} Customer data
     */
    async getCustomer(id) {
        const url = `${window.ConfigHelper.getApiUrl('customers')}/${id}`;
        return await this.request(url);
    }

    /**
     * Create new customer
     * @param {object} customerData - Customer data
     * @returns {Promise<object>} Created customer
     */
    async createCustomer(customerData) {
        const url = window.ConfigHelper.getApiUrl('customers');
        return await this.request(url, {
            method: 'POST',
            body: customerData
        });
    }

    /**
     * Update customer
     * @param {number} id - Customer ID
     * @param {object} customerData - Customer data
     * @returns {Promise<object>} Updated customer
     */
    async updateCustomer(id, customerData) {
        const url = `${window.ConfigHelper.getApiUrl('customers')}/${id}`;
        return await this.request(url, {
            method: 'PUT',
            body: customerData
        });
    }

    /**
     * Delete customer
     * @param {number} id - Customer ID
     * @returns {Promise<object>} Deletion result
     */
    async deleteCustomer(id) {
        const url = `${window.ConfigHelper.getApiUrl('customers')}/${id}`;
        return await this.request(url, {
            method: 'DELETE'
        });
    }

    // ===== SALES API METHODS =====

    /**
     * Get all sales with optional filters
     * @param {object} params - Query parameters
     * @returns {Promise<object>} Sales data
     */
    async getSales(params = {}) {
        const url = new URL(window.ConfigHelper.getApiUrl('sales'));
        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== '') {
                url.searchParams.append(key, params[key]);
            }
        });

        return await this.request(url.toString());
    }

    /**
     * Get sale by ID
     * @param {number} id - Sale ID
     * @returns {Promise<object>} Sale data
     */
    async getSale(id) {
        const url = `${window.ConfigHelper.getApiUrl('sales')}/${id}`;
        return await this.request(url);
    }

    /**
     * Create new sale
     * @param {object} saleData - Sale data
     * @returns {Promise<object>} Created sale
     */
    async createSale(saleData) {
        const url = window.ConfigHelper.getApiUrl('sales');
        return await this.request(url, {
            method: 'POST',
            body: saleData
        });
    }

    /**
     * Update sale
     * @param {number} id - Sale ID
     * @param {object} saleData - Sale data
     * @returns {Promise<object>} Updated sale
     */
    async updateSale(id, saleData) {
        const url = `${window.ConfigHelper.getApiUrl('sales')}/${id}`;
        return await this.request(url, {
            method: 'PUT',
            body: saleData
        });
    }

    /**
     * Delete sale
     * @param {number} id - Sale ID
     * @returns {Promise<object>} Deletion result
     */
    async deleteSale(id) {
        const url = `${window.ConfigHelper.getApiUrl('sales')}/${id}`;
        return await this.request(url, {
            method: 'DELETE'
        });
    }

    // ===== SALES REPRESENTATIVE API METHODS =====

    /**
     * Get all sales representatives with optional filters
     * @param {object} params - Query parameters
     * @returns {Promise<object>} Sales reps data
     */
    async getSalesReps(params = {}) {
        const url = new URL(window.ConfigHelper.getApiUrl('salesReps'));
        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== '') {
                url.searchParams.append(key, params[key]);
            }
        });

        return await this.request(url.toString());
    }

    /**
     * Get sales representative by ID
     * @param {number} id - Sales rep ID
     * @returns {Promise<object>} Sales rep data
     */
    async getSalesRep(id) {
        const url = `${window.ConfigHelper.getApiUrl('salesReps')}/${id}`;
        return await this.request(url);
    }

    /**
     * Create new sales representative
     * @param {object} salesRepData - Sales rep data
     * @returns {Promise<object>} Created sales rep
     */
    async createSalesRep(salesRepData) {
        const url = window.ConfigHelper.getApiUrl('salesReps');
        return await this.request(url, {
            method: 'POST',
            body: salesRepData
        });
    }

    /**
     * Update sales representative
     * @param {number} id - Sales rep ID
     * @param {object} salesRepData - Sales rep data
     * @returns {Promise<object>} Updated sales rep
     */
    async updateSalesRep(id, salesRepData) {
        const url = `${window.ConfigHelper.getApiUrl('salesReps')}/${id}`;
        return await this.request(url, {
            method: 'PUT',
            body: salesRepData
        });
    }

    /**
     * Delete sales representative
     * @param {number} id - Sales rep ID
     * @returns {Promise<object>} Deletion result
     */
    async deleteSalesRep(id) {
        const url = `${window.ConfigHelper.getApiUrl('salesReps')}/${id}`;
        return await this.request(url, {
            method: 'DELETE'
        });
    }

    // ===== CUSTOMER-SALES REP TRACKING API METHODS =====

    /**
     * Get customer-sales rep assignments
     * @param {object} params - Query parameters
     * @returns {Promise<object>} Assignments data
     */
    async getCustomerSalesRepAssignments(params = {}) {
        const url = new URL(window.ConfigHelper.getApiUrl('customerSalesRep'));
        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== '') {
                url.searchParams.append(key, params[key]);
            }
        });

        return await this.request(url.toString());
    }

    /**
     * Assign customer to sales representative
     * @param {object} assignmentData - Assignment data
     * @returns {Promise<object>} Assignment result
     */
    async assignCustomerToSalesRep(assignmentData) {
        const url = window.ConfigHelper.getApiUrl('customerSalesRep');
        return await this.request(url, {
            method: 'POST',
            body: assignmentData
        });
    }

    /**
     * Update customer-sales rep assignment
     * @param {number} customerId - Customer ID
     * @param {number} salesRepId - Sales rep ID
     * @param {object} assignmentData - Assignment data
     * @returns {Promise<object>} Updated assignment
     */
    async updateCustomerSalesRepAssignment(customerId, salesRepId, assignmentData) {
        const url = `${window.ConfigHelper.getApiUrl('customerSalesRep')}/${customerId}/${salesRepId}`;
        return await this.request(url, {
            method: 'PUT',
            body: assignmentData
        });
    }

    /**
     * Remove customer-sales rep assignment
     * @param {number} customerId - Customer ID
     * @param {number} salesRepId - Sales rep ID
     * @returns {Promise<object>} Removal result
     */
    async removeCustomerSalesRepAssignment(customerId, salesRepId) {
        const url = `${window.ConfigHelper.getApiUrl('customerSalesRep')}/${customerId}/${salesRepId}`;
        return await this.request(url, {
            method: 'DELETE'
        });
    }

    // ===== DASHBOARD API METHODS =====

    /**
     * Get dashboard analytics data
     * @param {object} params - Query parameters
     * @returns {Promise<object>} Dashboard data
     */
    async getDashboardData(params = {}) {
        const url = new URL(window.ConfigHelper.getApiUrl('dashboard'));
        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== '') {
                url.searchParams.append(key, params[key]);
            }
        });

        return await this.request(url.toString());
    }

    /**
     * Get sales analytics
     * @param {object} params - Query parameters
     * @returns {Promise<object>} Sales analytics
     */
    async getSalesAnalytics(params = {}) {
        const url = new URL(`${window.ConfigHelper.getApiUrl('dashboard')}/sales-analytics`);
        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== '') {
                url.searchParams.append(key, params[key]);
            }
        });

        return await this.request(url.toString());
    }

    /**
     * Get top performing sales reps
     * @param {object} params - Query parameters
     * @returns {Promise<object>} Top sales reps
     */
    async getTopSalesReps(params = {}) {
        const url = new URL(`${window.ConfigHelper.getApiUrl('dashboard')}/top-sales-reps`);
        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== '') {
                url.searchParams.append(key, params[key]);
            }
        });

        return await this.request(url.toString());
    }

    /**
     * Get top selling products
     * @param {object} params - Query parameters
     * @returns {Promise<object>} Top products
     */
    async getTopProducts(params = {}) {
        const url = new URL(`${window.ConfigHelper.getApiUrl('dashboard')}/top-products`);
        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== '') {
                url.searchParams.append(key, params[key]);
            }
        });

        return await this.request(url.toString());
    }
}

// Create global API instance
const api = new SalePointAPI();

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SalePointAPI;
} else if (typeof window !== 'undefined') {
    window.SalePointAPI = SalePointAPI;
    window.api = api;
}
