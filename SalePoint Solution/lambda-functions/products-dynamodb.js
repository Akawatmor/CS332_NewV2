const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

// Configure AWS SDK
const dynamodb = new AWS.DynamoDB.DocumentClient();

const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE || 'salepoint-products';

// Sample products data
const sampleProducts = [
  {
    productId: '1',
    name: 'iPhone 15',
    description: 'Latest Apple smartphone with advanced features',
    price: 999.99,
    category: 'Smartphones',
    stockQuantity: 50,
    specifications: {
      storage: '128GB',
      color: 'Blue',
      screen: '6.1 inch'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    productId: '2',
    name: 'Samsung Galaxy S24',
    description: 'Flagship Android smartphone',
    price: 899.99,
    category: 'Smartphones',
    stockQuantity: 45,
    specifications: {
      storage: '256GB',
      color: 'Black',
      screen: '6.2 inch'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    productId: '3',
    name: 'MacBook Pro 14"',
    description: 'Professional laptop for creative work',
    price: 1999.99,
    category: 'Laptops',
    stockQuantity: 25,
    specifications: {
      processor: 'M3',
      ram: '16GB',
      storage: '512GB'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    productId: '4',
    name: 'Dell XPS 13',
    description: 'Ultrabook for business and productivity',
    price: 1299.99,
    category: 'Laptops',
    stockQuantity: 30,
    specifications: {
      processor: 'Intel i7',
      ram: '16GB',
      storage: '512GB'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    productId: '5',
    name: 'AirPods Pro',
    description: 'Wireless earbuds with noise cancellation',
    price: 249.99,
    category: 'Accessories',
    stockQuantity: 100,
    specifications: {
      battery: '6 hours',
      features: 'ANC, Transparency mode'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Initialize DynamoDB with sample data
async function initializeData() {
  console.log('Initializing products data in DynamoDB...');
  
  try {
    // Check if data already exists
    const existingData = await dynamodb.scan({ TableName: PRODUCTS_TABLE }).promise();
    
    if (existingData.Items && existingData.Items.length > 0) {
      console.log('Data already exists, skipping initialization');
      return { message: 'Data already initialized', count: existingData.Items.length };
    }
    
    // Insert sample products
    const promises = sampleProducts.map(product => {
      return dynamodb.put({
        TableName: PRODUCTS_TABLE,
        Item: product
      }).promise();
    });
    
    await Promise.all(promises);
    console.log('Sample products inserted successfully');
    
    return { message: 'Data initialized successfully', count: sampleProducts.length };
  } catch (error) {
    console.error('Error initializing data:', error);
    throw error;
  }
}

// Get all products
async function getAllProducts() {
  try {
    const result = await dynamodb.scan({ TableName: PRODUCTS_TABLE }).promise();
    return result.Items || [];
  } catch (error) {
    console.error('Error getting products:', error);
    throw error;
  }
}

// Get product by ID
async function getProductById(productId) {
  try {
    const result = await dynamodb.get({
      TableName: PRODUCTS_TABLE,
      Key: { productId }
    }).promise();
    return result.Item;
  } catch (error) {
    console.error('Error getting product by ID:', error);
    throw error;
  }
}

// Create new product
async function createProduct(productData) {
  try {
    const product = {
      productId: uuidv4(),
      ...productData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await dynamodb.put({
      TableName: PRODUCTS_TABLE,
      Item: product
    }).promise();
    
    return product;
  } catch (error) {
    console.error('Error creating product:', error);
    throw error;
  }
}

// Update product
async function updateProduct(productId, updates) {
  try {
    const product = {
      ...updates,
      productId,
      updatedAt: new Date().toISOString()
    };
    
    await dynamodb.put({
      TableName: PRODUCTS_TABLE,
      Item: product
    }).promise();
    
    return product;
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
}

// Delete product
async function deleteProduct(productId) {
  try {
    await dynamodb.delete({
      TableName: PRODUCTS_TABLE,
      Key: { productId }
    }).promise();
    
    return { message: 'Product deleted successfully' };
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
}

exports.handler = async (event) => {
  console.log('Products Lambda Event:', JSON.stringify(event, null, 2));
  
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,DELETE'
  };
  
  try {
    const httpMethod = event.httpMethod;
    const path = event.path;
    const pathParameters = event.pathParameters;
    
    // Handle CORS preflight
    if (httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'CORS preflight' })
      };
    }
    
    // Initialize data endpoint
    if (path === '/init-products' || path === '/products/init') {
      const result = await initializeData();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result)
      };
    }
    
    // GET all products - also handle init via query parameter
    if (httpMethod === 'GET' && (path === '/products' || path === '/products/')) {
      // Check if this is an init request via query parameter
      if (event.queryStringParameters && event.queryStringParameters.init === 'true') {
        const result = await initializeData();
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(result)
        };
      }
      
      const products = await getAllProducts();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          products,
          count: products.length,
          message: 'Products retrieved successfully'
        })
      };
    }
    
    // GET product by ID
    if (httpMethod === 'GET' && pathParameters && pathParameters.id) {
      const product = await getProductById(pathParameters.id);
      if (!product) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Product not found' })
        };
      }
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(product)
      };
    }
    
    // POST - Create new product
    if (httpMethod === 'POST') {
      const productData = JSON.parse(event.body || '{}');
      const product = await createProduct(productData);
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(product)
      };
    }
    
    // PUT - Update product
    if (httpMethod === 'PUT' && pathParameters && pathParameters.id) {
      const updates = JSON.parse(event.body || '{}');
      const product = await updateProduct(pathParameters.id, updates);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(product)
      };
    }
    
    // DELETE - Delete product
    if (httpMethod === 'DELETE' && pathParameters && pathParameters.id) {
      const result = await deleteProduct(pathParameters.id);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result)
      };
    }
    
    // Default response for unsupported operations
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ 
        error: 'Not found',
        availableEndpoints: [
          'GET /products',
          'GET /products/{id}',
          'POST /products',
          'PUT /products/{id}',
          'DELETE /products/{id}',
          'GET /products/init'
        ]
      })
    };
    
  } catch (error) {
    console.error('Error in products handler:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};
