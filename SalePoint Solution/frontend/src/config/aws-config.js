// Auto-generated AWS configuration for SalePoint Solution
export const awsConfig = {
  apiGatewayUrl: 'https://8js2kt4vg7.execute-api.us-east-1.amazonaws.com/prod',
  region: 'us-east-1',
  // Demo mode - no authentication required
  demoMode: true
};

// Export individual constants for compatibility
export const API_BASE_URL = awsConfig.apiGatewayUrl;
export const API_ENDPOINTS = {
  PRODUCTS: '/products',
  CUSTOMERS: '/customers', 
  ORDERS: '/orders',
  SALES: '/orders',  // Sales data is stored in orders
  INVENTORY: '/products',  // Inventory data comes from products
  ANALYTICS: '/analytics'
};

export default awsConfig;
