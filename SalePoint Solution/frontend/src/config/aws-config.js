// AWS Configuration for Sale Point App
export const awsConfig = {
  Auth: {
    region: process.env.REACT_APP_AWS_REGION || 'us-east-1',
    userPoolId: process.env.REACT_APP_USER_POOL_ID,
    userPoolWebClientId: process.env.REACT_APP_USER_POOL_CLIENT_ID,
    mandatorySignIn: true,
    authenticationFlowType: 'USER_PASSWORD_AUTH'
  },
  API: {
    endpoints: [
      {
        name: "SalePointAPI",
        endpoint: process.env.REACT_APP_API_GATEWAY_URL || 'https://your-api-gateway-url',
        region: process.env.REACT_APP_AWS_REGION || 'us-east-1'
      }
    ]
  },
  Storage: {
    AWSS3: {
      bucket: process.env.REACT_APP_S3_BUCKET,
      region: process.env.REACT_APP_AWS_REGION || 'us-east-1'
    }
  }
};

// API Endpoints
export const API_ENDPOINTS = {
  PRODUCTS: '/products',
  CUSTOMERS: '/customers',
  SALES: '/sales',
  INVENTORY: '/inventory',
  ANALYTICS: '/analytics'
};

// App Configuration
export const APP_CONFIG = {
  name: 'Sale Point',
  version: '1.0.0',
  description: 'Centralized sales data platform',
  pagination: {
    defaultPageSize: 20,
    pageSizeOptions: [10, 20, 50, 100]
  },
  lowStockThreshold: 10,
  currency: 'THB'
};
