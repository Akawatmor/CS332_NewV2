const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

// Configure AWS SDK
const dynamodb = new AWS.DynamoDB.DocumentClient();

const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE || 'salepoint-products';

// Sample inventory data
const sampleInventory = [
  {
    inventoryId: '1',
    productId: '1',
    productName: 'iPhone 15',
    currentStock: 50,
    minimumStock: 10,
    maximumStock: 100,
    location: 'Warehouse A',
    binLocation: 'A-12-3',
    lastStockUpdate: '2024-01-15T10:30:00Z',
    stockMovements: [
      {
        movementId: 'mv001',
        type: 'IN',
        quantity: 60,
        reason: 'Initial stock',
        date: '2024-01-01T09:00:00Z',
        reference: 'PO-2024-001'
      },
      {
        movementId: 'mv002',
        type: 'OUT',
        quantity: 10,
        reason: 'Sale',
        date: '2024-01-15T10:30:00Z',
        reference: 'SO-2024-001'
      }
    ],
    createdAt: '2024-01-01T09:00:00Z',
    updatedAt: '2024-01-15T10:30:00Z'
  },
  {
    inventoryId: '2',
    productId: '2',
    productName: 'Samsung Galaxy S24',
    currentStock: 45,
    minimumStock: 15,
    maximumStock: 80,
    location: 'Warehouse A',
    binLocation: 'A-12-4',
    lastStockUpdate: '2024-01-20T14:15:00Z',
    stockMovements: [
      {
        movementId: 'mv003',
        type: 'IN',
        quantity: 50,
        reason: 'Initial stock',
        date: '2024-01-01T09:00:00Z',
        reference: 'PO-2024-002'
      },
      {
        movementId: 'mv004',
        type: 'OUT',
        quantity: 5,
        reason: 'Sale',
        date: '2024-01-20T14:15:00Z',
        reference: 'SO-2024-002'
      }
    ],
    createdAt: '2024-01-01T09:00:00Z',
    updatedAt: '2024-01-20T14:15:00Z'
  },
  {
    inventoryId: '3',
    productId: '3',
    productName: 'MacBook Pro',
    currentStock: 25,
    minimumStock: 5,
    maximumStock: 30,
    location: 'Warehouse B',
    binLocation: 'B-15-2',
    lastStockUpdate: '2024-02-01T09:45:00Z',
    stockMovements: [
      {
        movementId: 'mv005',
        type: 'IN',
        quantity: 30,
        reason: 'Initial stock',
        date: '2024-01-01T09:00:00Z',
        reference: 'PO-2024-003'
      },
      {
        movementId: 'mv006',
        type: 'OUT',
        quantity: 5,
        reason: 'Sale',
        date: '2024-02-01T09:45:00Z',
        reference: 'SO-2024-003'
      }
    ],
    createdAt: '2024-01-01T09:00:00Z',
    updatedAt: '2024-02-01T09:45:00Z'
  },
  {
    inventoryId: '4',
    productId: '4',
    productName: 'Dell XPS 13',
    currentStock: 30,
    minimumStock: 8,
    maximumStock: 40,
    location: 'Warehouse B',
    binLocation: 'B-15-3',
    lastStockUpdate: '2024-02-01T09:45:00Z',
    stockMovements: [
      {
        movementId: 'mv007',
        type: 'IN',
        quantity: 35,
        reason: 'Initial stock',
        date: '2024-01-01T09:00:00Z',
        reference: 'PO-2024-004'
      },
      {
        movementId: 'mv008',
        type: 'OUT',
        quantity: 5,
        reason: 'Sale',
        date: '2024-02-01T09:45:00Z',
        reference: 'SO-2024-004'
      }
    ],
    createdAt: '2024-01-01T09:00:00Z',
    updatedAt: '2024-02-01T09:45:00Z'
  },
  {
    inventoryId: '5',
    productId: '5',
    productName: 'AirPods Pro',
    currentStock: 100,
    minimumStock: 20,
    maximumStock: 150,
    location: 'Warehouse A',
    binLocation: 'A-10-1',
    lastStockUpdate: '2024-01-20T14:15:00Z',
    stockMovements: [
      {
        movementId: 'mv009',
        type: 'IN',
        quantity: 120,
        reason: 'Initial stock',
        date: '2024-01-01T09:00:00Z',
        reference: 'PO-2024-005'
      },
      {
        movementId: 'mv010',
        type: 'OUT',
        quantity: 20,
        reason: 'Sale',
        date: '2024-01-20T14:15:00Z',
        reference: 'SO-2024-005'
      }
    ],
    createdAt: '2024-01-01T09:00:00Z',
    updatedAt: '2024-01-20T14:15:00Z'
  }
];

// Initialize DynamoDB with sample data
async function initializeData() {
  try {
    // Create a separate inventory table using the products table
    const putPromises = sampleInventory.map(inventory => {
      const params = {
        TableName: PRODUCTS_TABLE,
        Item: {
          productId: inventory.productId + '_inventory',
          ...inventory
        },
        ConditionExpression: 'attribute_not_exists(productId)'
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
      message: 'Inventory data initialized successfully',
      itemsAdded: sampleInventory.length,
      tableName: PRODUCTS_TABLE
    };
  } catch (error) {
    console.error('Error initializing inventory data:', error);
    throw error;
  }
}

// Get all inventory items
async function getAllInventory() {
  try {
    const result = await dynamodb.scan({ 
      TableName: PRODUCTS_TABLE,
      FilterExpression: 'contains(productId, :suffix)',
      ExpressionAttributeValues: {
        ':suffix': '_inventory'
      }
    }).promise();
    return result.Items || [];
  } catch (error) {
    console.error('Error getting inventory:', error);
    throw error;
  }
}

// Get inventory by product ID
async function getInventoryByProductId(productId) {
  try {
    const result = await dynamodb.get({
      TableName: PRODUCTS_TABLE,
      Key: { productId: productId + '_inventory' }
    }).promise();
    return result.Item;
  } catch (error) {
    console.error('Error getting inventory by product ID:', error);
    throw error;
  }
}

// Update stock
async function updateStock(productId, stockData) {
  try {
    const inventoryKey = productId + '_inventory';
    const timestamp = new Date().toISOString();
    
    // Add stock movement
    const movement = {
      movementId: uuidv4(),
      type: stockData.type || 'ADJUSTMENT',
      quantity: stockData.quantity,
      reason: stockData.reason || 'Manual adjustment',
      date: timestamp,
      reference: stockData.reference || 'Manual'
    };

    const params = {
      TableName: PRODUCTS_TABLE,
      Key: { productId: inventoryKey },
      UpdateExpression: `
        SET currentStock = currentStock + :adjustment,
            lastStockUpdate = :timestamp,
            updatedAt = :timestamp,
            stockMovements = list_append(if_not_exists(stockMovements, :emptyList), :movement)
      `,
      ExpressionAttributeValues: {
        ':adjustment': stockData.type === 'OUT' ? -Math.abs(stockData.quantity) : Math.abs(stockData.quantity),
        ':timestamp': timestamp,
        ':emptyList': [],
        ':movement': [movement]
      },
      ReturnValues: 'ALL_NEW'
    };

    const result = await dynamodb.update(params).promise();
    return result.Attributes;
  } catch (error) {
    console.error('Error updating stock:', error);
    throw error;
  }
}

// Get stock movements for a product
async function getStockMovements(productId) {
  try {
    const inventory = await getInventoryByProductId(productId);
    return inventory ? inventory.stockMovements || [] : [];
  } catch (error) {
    console.error('Error getting stock movements:', error);
    throw error;
  }
}

// Get low stock alerts
async function getLowStockAlerts() {
  try {
    const allInventory = await getAllInventory();
    const lowStockItems = allInventory.filter(item => 
      item.currentStock <= item.minimumStock
    );
    return lowStockItems;
  } catch (error) {
    console.error('Error getting low stock alerts:', error);
    throw error;
  }
}

exports.handler = async (event) => {
  console.log('Inventory Lambda Event:', JSON.stringify(event, null, 2));
  
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
    if (path === '/init-inventory' || path === '/inventory/init') {
      const result = await initializeData();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result)
      };
    }
    
    // GET all inventory - also handle init via query parameter
    if (httpMethod === 'GET' && (path === '/inventory' || path === '/inventory/')) {
      // Check if this is an init request via query parameter
      if (event.queryStringParameters && event.queryStringParameters.init === 'true') {
        const result = await initializeData();
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(result)
        };
      }
      
      // Check for low stock alerts
      if (event.queryStringParameters && event.queryStringParameters.alerts === 'true') {
        const alerts = await getLowStockAlerts();
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            alerts,
            count: alerts.length,
            message: 'Low stock alerts retrieved successfully'
          })
        };
      }
      
      const inventory = await getAllInventory();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          inventory,
          count: inventory.length,
          message: 'Inventory retrieved successfully'
        })
      };
    }
    
    // GET inventory by product ID
    if (httpMethod === 'GET' && pathParameters && pathParameters.id) {
      // Check if requesting stock movements
      if (path.includes('/movements')) {
        const movements = await getStockMovements(pathParameters.id);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            productId: pathParameters.id,
            movements,
            count: movements.length
          })
        };
      }
      
      const inventory = await getInventoryByProductId(pathParameters.id);
      if (!inventory) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Inventory not found for this product' })
        };
      }
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(inventory)
      };
    }
    
    // PUT - Update stock
    if (httpMethod === 'PUT' && pathParameters && pathParameters.id) {
      const stockData = JSON.parse(event.body || '{}');
      const inventory = await updateStock(pathParameters.id, stockData);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(inventory)
      };
    }
    
    // Default response for unsupported operations
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        message: 'Inventory API is working!',
        method: httpMethod,
        path: path,
        supportedOperations: [
          'GET /inventory - Get all inventory',
          'GET /inventory?init=true - Initialize sample data',
          'GET /inventory?alerts=true - Get low stock alerts',
          'GET /inventory/{productId} - Get inventory for specific product',
          'GET /inventory/{productId}/movements - Get stock movements',
          'PUT /inventory/{productId} - Update stock'
        ]
      })
    };
    
  } catch (error) {
    console.error('Error in inventory handler:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message,
        fallback: 'Inventory API is working!'
      })
    };
  }
};
