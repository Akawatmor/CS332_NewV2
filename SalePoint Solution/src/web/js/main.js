/* Global configuration for the SalePoint application */

// API Configuration
const API_CONFIG = {
    baseUrl: 'https://your-api-gateway-id.execute-api.us-east-1.amazonaws.com/prod', // Replace with your actual API Gateway URL
    apiKey: '' // If using API keys for security
};

// Global Utility Functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
    }).format(amount);
}

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

function showErrorMessage(message) {
    alert(message || 'An error occurred. Please try again later.');
}

// API Request Helpers
function apiRequest(endpoint, method = 'GET', data = null) {
    const url = `${API_CONFIG.baseUrl}${endpoint}`;
    
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json'
        }
    };
    
    if (API_CONFIG.apiKey) {
        options.headers['x-api-key'] = API_CONFIG.apiKey;
    }
    
    if (data && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(data);
    }
    
    return fetch(url, options)
        .then(response => {
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            return response.json();
        })
        .catch(error => {
            console.error('API Request Error:', error);
            throw error;
        });
}

// User session management (simplified)
const userSession = {
    salesRepId: 'SR001', // Default sales rep ID for demo
    salesRepName: 'Emily Johnson', // Default sales rep name for demo
    
    // In a real application, these would be set during login
    setSalesRep: function(id, name) {
        this.salesRepId = id;
        this.salesRepName = name;
        localStorage.setItem('salesRepId', id);
        localStorage.setItem('salesRepName', name);
    },
    
    // Load session from localStorage if available
    loadSession: function() {
        const savedId = localStorage.getItem('salesRepId');
        const savedName = localStorage.getItem('salesRepName');
        if (savedId && savedName) {
            this.salesRepId = savedId;
            this.salesRepName = savedName;
        }
    }
};

// Initialize on page load
$(document).ready(function() {
    // Load user session
    userSession.loadSession();
    
    // Add event listener for logout (if implemented)
    $('#logout-link').on('click', function(e) {
        e.preventDefault();
        // Clear session data
        localStorage.removeItem('salesRepId');
        localStorage.removeItem('salesRepName');
        // Redirect to login page (if exists)
        // window.location.href = 'login.html';
    });
});
