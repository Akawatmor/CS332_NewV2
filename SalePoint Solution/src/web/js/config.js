// SalePoint Solution - Configuration
const config = {
    // API Configuration
    api: {
        // Base URL for API Gateway (to be replaced with actual endpoint)
        baseUrl: 'https://your-api-id.execute-api.us-east-1.amazonaws.com/prod',
        
        // Lambda function endpoints
        endpoints: {
            products: '/products',
            customers: '/customers',
            sales: '/sales',
            salesReps: '/salesreps',
            dashboard: '/dashboard',
            customerSalesRep: '/customer-salesrep'
        },
        
        // Default headers for API requests
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        
        // Request timeout in milliseconds
        timeout: 30000
    },
    
    // AWS Configuration
    aws: {
        region: 'us-east-1',
        
        // DynamoDB configuration
        dynamodb: {
            tableName: 'SalePointLogs',
            partitionKey: 'logId',
            sortKey: 'timestamp'
        },
        
        // S3 configuration
        s3: {
            bucketName: 'salepoint-assets',
            region: 'us-east-1'
        }
    },
    
    // Database Configuration
    database: {
        // MySQL RDS configuration (used by Lambda functions)
        mysql: {
            host: process.env.DB_HOST || 'your-rds-endpoint.amazonaws.com',
            user: process.env.DB_USER || 'admin',
            password: process.env.DB_PASSWORD || 'your-password',
            database: process.env.DB_NAME || 'salepoint_db',
            port: process.env.DB_PORT || 3306,
            connectionLimit: 10,
            acquireTimeout: 60000,
            timeout: 60000,
            reconnect: true
        }
    },
    
    // Application Configuration
    app: {
        name: 'SalePoint Solution',
        version: '1.0.0',
        description: 'AWS-based Sales Management System',
        
        // Pagination settings
        pagination: {
            defaultPageSize: 10,
            maxPageSize: 100,
            pageSizeOptions: [5, 10, 25, 50, 100]
        },
        
        // Table settings
        table: {
            defaultSortColumn: 'id',
            defaultSortDirection: 'asc',
            rowsPerPageOptions: [10, 25, 50, 100]
        },
        
        // Date format settings
        dateFormat: {
            display: 'MM/DD/YYYY',
            api: 'YYYY-MM-DD',
            datetime: 'MM/DD/YYYY HH:mm:ss'
        },
        
        // Currency settings
        currency: {
            symbol: '$',
            locale: 'en-US',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        },
        
        // Validation rules
        validation: {
            name: {
                minLength: 2,
                maxLength: 100
            },
            email: {
                pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            },
            phone: {
                pattern: /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/
            },
            price: {
                min: 0,
                max: 999999.99
            },
            quantity: {
                min: 1,
                max: 10000
            }
        }
    },
    
    // UI Configuration
    ui: {
        // Theme settings
        theme: {
            primaryColor: '#007bff',
            secondaryColor: '#6c757d',
            successColor: '#28a745',
            dangerColor: '#dc3545',
            warningColor: '#ffc107',
            infoColor: '#17a2b8'
        },
        
        // Loading settings
        loading: {
            showSpinner: true,
            spinnerDelay: 200,
            messageDelay: 1000
        },
        
        // Toast notification settings
        toast: {
            duration: 5000,
            position: 'top-right',
            showProgress: true
        },
        
        // Modal settings
        modal: {
            backdrop: 'static',
            keyboard: false,
            focus: true
        },
        
        // Chart settings
        charts: {
            backgroundColor: '#ffffff',
            gridColor: '#e9ecef',
            textColor: '#495057',
            fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif'
        }
    },
    
    // Error handling configuration
    errors: {
        // Retry configuration
        retry: {
            maxAttempts: 3,
            baseDelay: 1000,
            maxDelay: 10000,
            backoffFactor: 2
        },
        
        // Error message mapping
        messages: {
            network: 'Network connection error. Please check your connection and try again.',
            timeout: 'Request timed out. Please try again.',
            server: 'Server error occurred. Please try again later.',
            unauthorized: 'You are not authorized to perform this action.',
            forbidden: 'Access forbidden. Please contact administrator.',
            notFound: 'The requested resource was not found.',
            validation: 'Please check your input and try again.',
            unknown: 'An unexpected error occurred. Please try again.'
        }
    },
    
    // Feature flags
    features: {
        enableCharts: true,
        enableExport: true,
        enableImport: true,
        enableAdvancedSearch: true,
        enableBulkOperations: true,
        enableAuditLog: true,
        enableNotifications: true
    },
    
    // Development/Debug settings
    debug: {
        enabled: process.env.NODE_ENV !== 'production',
        logLevel: process.env.LOG_LEVEL || 'info',
        showSqlQueries: process.env.SHOW_SQL === 'true',
        mockData: process.env.USE_MOCK_DATA === 'true'
    }
};

// Environment-specific overrides
if (typeof window !== 'undefined') {
    // Browser environment - check for environment variables from build process
    if (window.ENV) {
        config.api.baseUrl = window.ENV.API_BASE_URL || config.api.baseUrl;
        config.aws.region = window.ENV.AWS_REGION || config.aws.region;
        config.debug.enabled = window.ENV.NODE_ENV !== 'production';
    }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    // Node.js environment
    module.exports = config;
} else if (typeof window !== 'undefined') {
    // Browser environment
    window.SalePointConfig = config;
}

// Helper functions for configuration
const ConfigHelper = {
    /**
     * Get API endpoint URL
     * @param {string} endpoint - Endpoint name
     * @returns {string} Full URL
     */
    getApiUrl(endpoint) {
        const baseUrl = config.api.baseUrl.replace(/\/$/, '');
        const endpointPath = config.api.endpoints[endpoint] || endpoint;
        return `${baseUrl}${endpointPath}`;
    },
    
    /**
     * Get configuration value by path
     * @param {string} path - Dot-separated path (e.g., 'app.pagination.defaultPageSize')
     * @param {*} defaultValue - Default value if path not found
     * @returns {*} Configuration value
     */
    get(path, defaultValue = null) {
        const keys = path.split('.');
        let value = config;
        
        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return defaultValue;
            }
        }
        
        return value;
    },
    
    /**
     * Check if feature is enabled
     * @param {string} feature - Feature name
     * @returns {boolean} Whether feature is enabled
     */
    isFeatureEnabled(feature) {
        return config.features[feature] === true;
    },
    
    /**
     * Format currency value
     * @param {number} amount - Amount to format
     * @returns {string} Formatted currency string
     */
    formatCurrency(amount) {
        if (typeof amount !== 'number' || isNaN(amount)) {
            return `${config.app.currency.symbol}0.00`;
        }
        
        return new Intl.NumberFormat(config.app.currency.locale, {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: config.app.currency.minimumFractionDigits,
            maximumFractionDigits: config.app.currency.maximumFractionDigits
        }).format(amount);
    },
    
    /**
     * Format date value
     * @param {Date|string} date - Date to format
     * @param {string} format - Format type ('display', 'api', 'datetime')
     * @returns {string} Formatted date string
     */
    formatDate(date, format = 'display') {
        if (!date) return '';
        
        const dateObj = date instanceof Date ? date : new Date(date);
        if (isNaN(dateObj.getTime())) return '';
        
        const formatStr = config.app.dateFormat[format] || config.app.dateFormat.display;
        
        // Simple date formatting (in production, consider using a library like moment.js or date-fns)
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        const hours = String(dateObj.getHours()).padStart(2, '0');
        const minutes = String(dateObj.getMinutes()).padStart(2, '0');
        const seconds = String(dateObj.getSeconds()).padStart(2, '0');
        
        switch (format) {
            case 'api':
                return `${year}-${month}-${day}`;
            case 'datetime':
                return `${month}/${day}/${year} ${hours}:${minutes}:${seconds}`;
            case 'display':
            default:
                return `${month}/${day}/${year}`;
        }
    },
    
    /**
     * Validate input based on configuration rules
     * @param {string} field - Field name
     * @param {*} value - Value to validate
     * @returns {object} Validation result {isValid: boolean, message: string}
     */
    validate(field, value) {
        const rules = config.app.validation[field];
        if (!rules) {
            return { isValid: true, message: '' };
        }
        
        // Name validation
        if (field === 'name') {
            if (!value || value.trim().length < rules.minLength) {
                return { isValid: false, message: `Name must be at least ${rules.minLength} characters long` };
            }
            if (value.trim().length > rules.maxLength) {
                return { isValid: false, message: `Name must be no more than ${rules.maxLength} characters long` };
            }
        }
        
        // Email validation
        if (field === 'email') {
            if (!value || !rules.pattern.test(value)) {
                return { isValid: false, message: 'Please enter a valid email address' };
            }
        }
        
        // Phone validation
        if (field === 'phone') {
            if (!value || !rules.pattern.test(value)) {
                return { isValid: false, message: 'Please enter a valid phone number' };
            }
        }
        
        // Price validation
        if (field === 'price') {
            const numValue = parseFloat(value);
            if (isNaN(numValue) || numValue < rules.min || numValue > rules.max) {
                return { isValid: false, message: `Price must be between ${rules.min} and ${rules.max}` };
            }
        }
        
        // Quantity validation
        if (field === 'quantity') {
            const numValue = parseInt(value);
            if (isNaN(numValue) || numValue < rules.min || numValue > rules.max) {
                return { isValid: false, message: `Quantity must be between ${rules.min} and ${rules.max}` };
            }
        }
        
        return { isValid: true, message: '' };
    }
};

// Make helper available globally in browser
if (typeof window !== 'undefined') {
    window.ConfigHelper = ConfigHelper;
}
