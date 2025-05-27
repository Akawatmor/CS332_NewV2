const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

// Configure AWS SDK
const dynamodb = new AWS.DynamoDB.DocumentClient();

const ORDERS_TABLE = process.env.ORDERS_TABLE || 'salepoint-orders';
const CUSTOMERS_TABLE = process.env.CUSTOMERS_TABLE || 'salepoint-customers';

// Sample sales/orders data
const sampleOrders = [
  {
    orderId: '1',
    customerId: '1',
    salesPersonId: 'sp001',
    items: [
      {
        productId: '1',
        productName: 'iPhone 15',
        quantity: 2,
        unitPrice: 999.99,
        totalPrice: 1999.98
      }
    ],
    totalAmount: 1999.98,
    status: 'completed',
    orderDate: '2024-01-15T10:30:00Z',
    shippingAddress: {
      street: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94105',
      country: 'USA'
    },
    notes: 'Priority shipping requested',
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T10:30:00Z'
  },
  {
    orderId: '2',
    customerId: '2',
    salesPersonId: 'sp002',
    items: [
      {
        productId: '2',
        productName: 'Samsung Galaxy S24',
        quantity: 1,
        unitPrice: 899.99,
        totalPrice: 899.99
      },
      {
        productId: '5',
        productName: 'AirPods Pro',
        quantity: 1,
        unitPrice: 249.99,
        totalPrice: 249.99
      }
    ],
    totalAmount: 1149.98,
    status: 'pending',
    orderDate: '2024-01-20T14:15:00Z',
    shippingAddress: {
      street: '456 Oak Ave',
      city: 'Los Angeles',
      state: 'CA',
      zipCode: '90210',
      country: 'USA'
    },
    notes: 'Customer requested expedited processing',
    createdAt: '2024-01-20T14:15:00Z',
    updatedAt: '2024-01-20T14:15:00Z'
  },
  {
    orderId: '3',
    customerId: '3',
    salesPersonId: 'sp001',
    items: [
      {
        productId: '3',
        productName: 'MacBook Pro',
        quantity: 1,
        unitPrice: 1999.99,
        totalPrice: 1999.99
      }
    ],
    totalAmount: 1999.99,
    status: 'shipped',
    orderDate: '2024-02-01T09:45:00Z',
    shippingAddress: {
      street: '789 Pine St',
      city: 'Seattle',
      state: 'WA',
      zipCode: '98101',
      country: 'USA'
    },
    notes: 'Express shipping',
    createdAt: '2024-02-01T09:45:00Z',
    updatedAt: '2024-02-02T10:00:00Z'
  }
];

// Initialize DynamoDB with sample data
async function initializeData() {
  try {
    const putPromises = sampleOrders.map(order => {
      const params = {
        TableName: ORDERS_TABLE,
        Item: order,
        ConditionExpression: 'attribute_not_exists(orderId)'
      };
      return dynamodb.put(params).promise().catch(err => {
        if (err.code !== 'ConditionalCheckFailedException') {
          throw err;
        }
        // Item already exists, skip
        return null;
      });
    });

    await Promise.all(putPromises);
    
    return {
      message: 'Sales data initialized successfully',
      itemsAdded: sampleOrders.length,
      tableName: ORDERS_TABLE
    };
  } catch (error) {
    console.error('Error initializing sales data:', error);
    throw error;
  }
}

// Get all orders
async function getAllOrders() {
  try {
    const result = await dynamodb.scan({ TableName: ORDERS_TABLE }).promise();
    return result.Items || [];
  } catch (error) {
    console.error('Error getting orders:', error);
    throw error;
  }
}

// Get order by ID
async function getOrderById(orderId) {
  try {
    const result = await dynamodb.get({
      TableName: ORDERS_TABLE,
      Key: { orderId }
    }).promise();
    return result.Item;
  } catch (error) {
    console.error('Error getting order by ID:', error);
    throw error;
  }
}

// Create new order
async function createOrder(orderData) {
  try {
    const order = {
      orderId: uuidv4(),
      ...orderData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const params = {
      TableName: ORDERS_TABLE,
      Item: order
    };

    await dynamodb.put(params).promise();
    return order;
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
}

// Update order
async function updateOrder(orderId, updates) {
  try {
    const updateExpression = [];
    const expressionAttributeValues = {};
    const expressionAttributeNames = {};

    Object.keys(updates).forEach(key => {
      if (key !== 'orderId') {
        updateExpression.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = updates[key];
      }
    });

    updateExpression.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    const params = {
      TableName: ORDERS_TABLE,
      Key: { orderId },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    };

    const result = await dynamodb.update(params).promise();
    return result.Attributes;
  } catch (error) {
    console.error('Error updating order:', error);
    throw error;
  }
}

// Delete order
async function deleteOrder(orderId) {
  try {
    const params = {
      TableName: ORDERS_TABLE,
      Key: { orderId }
    };

    await dynamodb.delete(params).promise();
    return { message: 'Order deleted successfully', orderId };
  } catch (error) {
    console.error('Error deleting order:', error);
    throw error;
  }
}

exports.handler = async (event) => {
  console.log('Sales Lambda Event:', JSON.stringify(event, null, 2));
  
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
    if (path === '/init-sales' || path === '/sales/init') {
      const result = await initializeData();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result)
      };
    }
    
    // GET all orders - also handle init via query parameter
    if (httpMethod === 'GET' && (path === '/sales' || path === '/sales/')) {
      // Check if this is an init request via query parameter
      if (event.queryStringParameters && event.queryStringParameters.init === 'true') {
        const result = await initializeData();
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(result)
        };
      }
      
      const orders = await getAllOrders();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          orders,
          count: orders.length,
          message: 'Sales/Orders retrieved successfully'
        })
      };
    }
    
    // GET order by ID
    if (httpMethod === 'GET' && pathParameters && pathParameters.id) {
      const order = await getOrderById(pathParameters.id);
      if (!order) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Order not found' })
        };
      }
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(order)
      };
    }
    
    // POST - Create new order
    if (httpMethod === 'POST') {
      const orderData = JSON.parse(event.body || '{}');
      const order = await createOrder(orderData);
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(order)
      };
    }
    
    // PUT - Update order
    if (httpMethod === 'PUT' && pathParameters && pathParameters.id) {
      const updates = JSON.parse(event.body || '{}');
      const order = await updateOrder(pathParameters.id, updates);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(order)
      };
    }
    
    // DELETE - Delete order
    if (httpMethod === 'DELETE' && pathParameters && pathParameters.id) {
      const result = await deleteOrder(pathParameters.id);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result)
      };
    }
    
    // Default response for unsupported operations
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ 
        error: 'Unsupported operation',
        message: 'Sales API is working!',
        method: httpMethod,
        path: path
      })
    };
    
  } catch (error) {
    console.error('Error in sales handler:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message,
        fallback: 'Sales API is working!'
      })
    };
  }
};
