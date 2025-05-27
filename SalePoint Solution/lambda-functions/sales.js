const AWS = require('aws-sdk');
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const ORDERS_TABLE = process.env.ORDERS_TABLE;
const CUSTOMERS_TABLE = process.env.CUSTOMERS_TABLE;

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 10,
  acquireTimeout: 60000,
  timeout: 60000
};

let connection = null;

async function getConnection() {
  if (!connection) {
    connection = await mysql.createConnection(dbConfig);
  }
  return connection;
}

exports.handler = async (event) => {
  console.log('Sales Lambda Event:', JSON.stringify(event, null, 2));
  
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };

  try {
    const httpMethod = event.httpMethod;
    const pathParameters = event.pathParameters;
    const queryStringParameters = event.queryStringParameters || {};
    const body = event.body ? JSON.parse(event.body) : {};

    switch (httpMethod) {
      case 'OPTIONS':
        return {
          statusCode: 200,
          headers,
          body: ''
        };

      case 'GET':
        if (pathParameters && pathParameters.id) {
          // Get specific order
          const params = {
            TableName: ORDERS_TABLE,
            Key: {
              orderId: pathParameters.id
            }
          };

          const result = await dynamodb.get(params).promise();
          
          if (!result.Item) {
            return {
              statusCode: 404,
              headers,
              body: JSON.stringify({ message: 'Order not found' })
            };
          }

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(result.Item)
          };
        } else if (queryStringParameters.customerId) {
          // Get orders by customer
          const params = {
            TableName: ORDERS_TABLE,
            IndexName: 'CustomerIndex',
            KeyConditionExpression: 'customerId = :customerId',
            ExpressionAttributeValues: {
              ':customerId': queryStringParameters.customerId
            },
            ScanIndexForward: false
          };

          const result = await dynamodb.query(params).promise();
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              orders: result.Items,
              total: result.Count
            })
          };
        } else {
          // Get all orders with optional filtering
          const params = {
            TableName: ORDERS_TABLE
          };

          if (queryStringParameters.limit) {
            params.Limit = parseInt(queryStringParameters.limit);
          }

          if (queryStringParameters.lastKey) {
            params.ExclusiveStartKey = JSON.parse(queryStringParameters.lastKey);
          }

          if (queryStringParameters.status) {
            params.FilterExpression = '#status = :status';
            params.ExpressionAttributeNames = { '#status': 'status' };
            params.ExpressionAttributeValues = { ':status': queryStringParameters.status };
          }

          const result = await dynamodb.scan(params).promise();
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              orders: result.Items,
              total: result.Count,
              lastKey: result.LastEvaluatedKey
            })
          };
        }

      case 'POST':
        // Create new order
        const { customerId, salesPersonId, items, shippingAddress, notes } = body;
        
        if (!customerId || !salesPersonId || !items || !Array.isArray(items) || items.length === 0) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              message: 'Missing required fields: customerId, salesPersonId, items (array)' 
            })
          };
        }

        const db = await getConnection();
        
        // Start transaction
        await db.beginTransaction();

        try {
          let totalAmount = 0;
          const orderItems = [];

          // Validate products and calculate total
          for (const item of items) {
            if (!item.productId || !item.quantity || item.quantity <= 0) {
              throw new Error('Invalid item: productId and positive quantity required');
            }

            // Get product details and check stock
            const [productRows] = await db.execute(
              'SELECT id, name, price, stock_quantity FROM products WHERE id = ?',
              [item.productId]
            );

            if (productRows.length === 0) {
              throw new Error(`Product not found: ${item.productId}`);
            }

            const product = productRows[0];
            
            if (product.stock_quantity < item.quantity) {
              throw new Error(`Insufficient stock for product ${product.name}. Available: ${product.stock_quantity}, Requested: ${item.quantity}`);
            }

            const itemTotal = product.price * item.quantity;
            totalAmount += itemTotal;

            orderItems.push({
              productId: item.productId,
              productName: product.name,
              quantity: item.quantity,
              unitPrice: product.price,
              totalPrice: itemTotal
            });

            // Update stock
            await db.execute(
              'UPDATE products SET stock_quantity = stock_quantity - ?, updated_at = NOW() WHERE id = ?',
              [item.quantity, item.productId]
            );
          }

          const orderId = uuidv4();
          const timestamp = new Date().toISOString();

          // Create order in DynamoDB
          const order = {
            orderId,
            customerId,
            salesPersonId,
            items: orderItems,
            totalAmount,
            status: 'pending',
            shippingAddress: shippingAddress || '',
            notes: notes || '',
            createdAt: timestamp,
            updatedAt: timestamp
          };

          const orderParams = {
            TableName: ORDERS_TABLE,
            Item: order
          };

          await dynamodb.put(orderParams).promise();

          // Update customer statistics
          const customerUpdateParams = {
            TableName: CUSTOMERS_TABLE,
            Key: { customerId },
            UpdateExpression: 'ADD totalOrders :inc, totalValue :amount SET lastOrderDate = :date, updatedAt = :timestamp',
            ExpressionAttributeValues: {
              ':inc': 1,
              ':amount': totalAmount,
              ':date': timestamp,
              ':timestamp': timestamp
            }
          };

          await dynamodb.update(customerUpdateParams).promise();

          // Commit transaction
          await db.commit();

          return {
            statusCode: 201,
            headers,
            body: JSON.stringify({
              orderId,
              totalAmount,
              message: 'Order created successfully'
            })
          };

        } catch (error) {
          // Rollback transaction
          await db.rollback();
          throw error;
        }

      case 'PUT':
        // Update order status
        if (!pathParameters || !pathParameters.id) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ message: 'Order ID is required' })
          };
        }

        const { status, notes: updateNotes } = body;
        
        if (!status) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ message: 'Status is required' })
          };
        }

        const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              message: `Invalid status. Valid options: ${validStatuses.join(', ')}` 
            })
          };
        }

        const updateExpression = ['#status = :status', 'updatedAt = :timestamp'];
        const expressionAttributeNames = { '#status': 'status' };
        const expressionAttributeValues = {
          ':status': status,
          ':timestamp': new Date().toISOString()
        };

        if (updateNotes !== undefined) {
          updateExpression.push('notes = :notes');
          expressionAttributeValues[':notes'] = updateNotes;
        }

        const updateParams = {
          TableName: ORDERS_TABLE,
          Key: { orderId: pathParameters.id },
          UpdateExpression: 'SET ' + updateExpression.join(', '),
          ExpressionAttributeNames: expressionAttributeNames,
          ExpressionAttributeValues: expressionAttributeValues,
          ConditionExpression: 'attribute_exists(orderId)',
          ReturnValues: 'ALL_NEW'
        };

        const updateResult = await dynamodb.update(updateParams).promise();

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            order: updateResult.Attributes,
            message: 'Order updated successfully'
          })
        };

      case 'DELETE':
        // Cancel order (only if status is pending)
        if (!pathParameters || !pathParameters.id) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ message: 'Order ID is required' })
          };
        }

        // Get order first to check status and restore stock
        const getParams = {
          TableName: ORDERS_TABLE,
          Key: { orderId: pathParameters.id }
        };

        const getResult = await dynamodb.get(getParams).promise();
        
        if (!getResult.Item) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ message: 'Order not found' })
          };
        }

        const orderToCancel = getResult.Item;
        
        if (orderToCancel.status !== 'pending') {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              message: 'Only pending orders can be cancelled' 
            })
          };
        }

        const dbConnection = await getConnection();
        await dbConnection.beginTransaction();

        try {
          // Restore stock for all items
          for (const item of orderToCancel.items) {
            await dbConnection.execute(
              'UPDATE products SET stock_quantity = stock_quantity + ?, updated_at = NOW() WHERE id = ?',
              [item.quantity, item.productId]
            );
          }

          // Update order status to cancelled
          const cancelParams = {
            TableName: ORDERS_TABLE,
            Key: { orderId: pathParameters.id },
            UpdateExpression: 'SET #status = :status, updatedAt = :timestamp',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: {
              ':status': 'cancelled',
              ':timestamp': new Date().toISOString()
            }
          };

          await dynamodb.update(cancelParams).promise();

          // Update customer statistics
          const customerUpdateParams = {
            TableName: CUSTOMERS_TABLE,
            Key: { customerId: orderToCancel.customerId },
            UpdateExpression: 'ADD totalOrders :dec, totalValue :amount SET updatedAt = :timestamp',
            ExpressionAttributeValues: {
              ':dec': -1,
              ':amount': -orderToCancel.totalAmount,
              ':timestamp': new Date().toISOString()
            }
          };

          await dynamodb.update(customerUpdateParams).promise();

          await dbConnection.commit();

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: 'Order cancelled successfully' })
          };

        } catch (error) {
          await dbConnection.rollback();
          throw error;
        }

      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ message: 'Method not allowed' })
        };
    }

  } catch (error) {
    console.error('Error:', error);
    
    if (error.code === 'ConditionalCheckFailedException') {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ message: 'Order not found' })
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: 'Internal server error',
        error: error.message
      })
    };
  }
};
