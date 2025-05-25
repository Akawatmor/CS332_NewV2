const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

// Configure AWS SDK
const dynamodb = new AWS.DynamoDB.DocumentClient();

const CUSTOMERS_TABLE = process.env.CUSTOMERS_TABLE || 'salepoint-customers';

// Sample customers data
const sampleCustomers = [
  {
    customerId: '1',
    name: 'John Doe',
    email: 'john.doe@email.com',
    phone: '+1-555-0101',
    company: 'Tech Solutions Inc.',
    address: {
      street: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94105',
      country: 'USA'
    },
    type: 'business',
    status: 'active',
    totalOrders: 5,
    totalSpent: 15750.50,
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T10:30:00Z'
  },
  {
    customerId: '2',
    name: 'Sarah Johnson',
    email: 'sarah.j@email.com',
    phone: '+1-555-0102',
    company: 'Marketing Pro LLC',
    address: {
      street: '456 Oak Ave',
      city: 'Los Angeles',
      state: 'CA',
      zipCode: '90210',
      country: 'USA'
    },
    type: 'business',
    status: 'active',
    totalOrders: 3,
    totalSpent: 8900.25,
    createdAt: '2024-01-20T14:15:00Z',
    updatedAt: '2024-01-20T14:15:00Z'
  },
  {
    customerId: '3',
    name: 'Mike Davis',
    email: 'mike.davis@email.com',
    phone: '+1-555-0103',
    company: null,
    address: {
      street: '789 Pine St',
      city: 'Seattle',
      state: 'WA',
      zipCode: '98101',
      country: 'USA'
    },
    type: 'individual',
    status: 'active',
    totalOrders: 2,
    totalSpent: 2599.98,
    createdAt: '2024-02-01T09:45:00Z',
    updatedAt: '2024-02-01T09:45:00Z'
  },
  {
    customerId: '4',
    name: 'Emily Chen',
    email: 'emily.chen@email.com',
    phone: '+1-555-0104',
    company: 'Creative Studio',
    address: {
      street: '321 Cedar Blvd',
      city: 'Austin',
      state: 'TX',
      zipCode: '73301',
      country: 'USA'
    },
    type: 'business',
    status: 'active',
    totalOrders: 7,
    totalSpent: 12450.75,
    createdAt: '2024-02-10T16:20:00Z',
    updatedAt: '2024-02-10T16:20:00Z'
  },
  {
    customerId: '5',
    name: 'Robert Wilson',
    email: 'robert.w@email.com',
    phone: '+1-555-0105',
    company: null,
    address: {
      street: '654 Elm St',
      city: 'Miami',
      state: 'FL',
      zipCode: '33101',
      country: 'USA'
    },
    type: 'individual',
    status: 'inactive',
    totalOrders: 1,
    totalSpent: 999.99,
    createdAt: '2024-02-15T11:30:00Z',
    updatedAt: '2024-02-15T11:30:00Z'
  }
];

// Initialize DynamoDB with sample data
async function initializeData() {
  console.log('Initializing customers data in DynamoDB...');
  
  try {
    // Check if data already exists
    const existingData = await dynamodb.scan({ TableName: CUSTOMERS_TABLE }).promise();
    
    if (existingData.Items && existingData.Items.length > 0) {
      console.log('Data already exists, skipping initialization');
      return { message: 'Data already initialized', count: existingData.Items.length };
    }
    
    // Insert sample customers
    const promises = sampleCustomers.map(customer => {
      return dynamodb.put({
        TableName: CUSTOMERS_TABLE,
        Item: customer
      }).promise();
    });
    
    await Promise.all(promises);
    console.log('Sample customers inserted successfully');
    
    return { message: 'Data initialized successfully', count: sampleCustomers.length };
  } catch (error) {
    console.error('Error initializing data:', error);
    throw error;
  }
}

// Get all customers
async function getAllCustomers() {
  try {
    const result = await dynamodb.scan({ TableName: CUSTOMERS_TABLE }).promise();
    return result.Items || [];
  } catch (error) {
    console.error('Error getting customers:', error);
    throw error;
  }
}

// Get customer by ID
async function getCustomerById(customerId) {
  try {
    const result = await dynamodb.get({
      TableName: CUSTOMERS_TABLE,
      Key: { customerId }
    }).promise();
    return result.Item;
  } catch (error) {
    console.error('Error getting customer by ID:', error);
    throw error;
  }
}

// Create new customer
async function createCustomer(customerData) {
  try {
    const customer = {
      customerId: uuidv4(),
      ...customerData,
      totalOrders: 0,
      totalSpent: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await dynamodb.put({
      TableName: CUSTOMERS_TABLE,
      Item: customer
    }).promise();
    
    return customer;
  } catch (error) {
    console.error('Error creating customer:', error);
    throw error;
  }
}

// Update customer
async function updateCustomer(customerId, updates) {
  try {
    const customer = {
      ...updates,
      customerId,
      updatedAt: new Date().toISOString()
    };
    
    await dynamodb.put({
      TableName: CUSTOMERS_TABLE,
      Item: customer
    }).promise();
    
    return customer;
  } catch (error) {
    console.error('Error updating customer:', error);
    throw error;
  }
}

// Delete customer
async function deleteCustomer(customerId) {
  try {
    await dynamodb.delete({
      TableName: CUSTOMERS_TABLE,
      Key: { customerId }
    }).promise();
    
    return { message: 'Customer deleted successfully' };
  } catch (error) {
    console.error('Error deleting customer:', error);
    throw error;
  }
}

exports.handler = async (event) => {
  console.log('Customers Lambda Event:', JSON.stringify(event, null, 2));
  
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
    if (path === '/init-customers' || path === '/customers/init') {
      const result = await initializeData();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result)
      };
    }
    
    // GET all customers - also handle init via query parameter
    if (httpMethod === 'GET' && (path === '/customers' || path === '/customers/')) {
      // Check if this is an init request via query parameter
      if (event.queryStringParameters && event.queryStringParameters.init === 'true') {
        const result = await initializeData();
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(result)
        };
      }
      
      const customers = await getAllCustomers();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          customers,
          count: customers.length,
          message: 'Customers retrieved successfully'
        })
      };
    }
    
    // GET customer by ID
    if (httpMethod === 'GET' && pathParameters && pathParameters.id) {
      const customer = await getCustomerById(pathParameters.id);
      if (!customer) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Customer not found' })
        };
      }
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(customer)
      };
    }
    
    // POST - Create new customer
    if (httpMethod === 'POST') {
      const customerData = JSON.parse(event.body || '{}');
      const customer = await createCustomer(customerData);
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(customer)
      };
    }
    
    // PUT - Update customer
    if (httpMethod === 'PUT' && pathParameters && pathParameters.id) {
      const updates = JSON.parse(event.body || '{}');
      const customer = await updateCustomer(pathParameters.id, updates);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(customer)
      };
    }
    
    // DELETE - Delete customer
    if (httpMethod === 'DELETE' && pathParameters && pathParameters.id) {
      const result = await deleteCustomer(pathParameters.id);
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
          'GET /customers',
          'GET /customers/{id}',
          'POST /customers',
          'PUT /customers/{id}',
          'DELETE /customers/{id}',
          'GET /customers/init'
        ]
      })
    };
    
  } catch (error) {
    console.error('Error in customers handler:', error);
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
