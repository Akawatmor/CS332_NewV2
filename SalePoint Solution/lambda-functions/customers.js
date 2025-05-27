const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const CUSTOMERS_TABLE = process.env.CUSTOMERS_TABLE;
const ORDERS_TABLE = process.env.ORDERS_TABLE;

// Helper function to standardize response format
function formatResponse(statusCode, body, additionalHeaders = {}) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      ...additionalHeaders
    },
    body: JSON.stringify(body)
  };
}

exports.handler = async (event) => {
  console.log('Customers Lambda Event:', JSON.stringify(event, null, 2));
  
  // Standard response headers for CORS
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
        // CORS preflight response
        return formatResponse(200, '');

      case 'GET':
        if (pathParameters && pathParameters.id) {
          // Get specific customer
          const params = {
            TableName: CUSTOMERS_TABLE,
            Key: {
              customerId: pathParameters.id
            }
          };

          const result = await dynamodb.get(params).promise();
          
          if (!result.Item) {
            return formatResponse(404, { message: 'Customer not found' });
          }

          // Get customer's order history
          const orderParams = {
            TableName: ORDERS_TABLE,
            IndexName: 'CustomerIndex',
            KeyConditionExpression: 'customerId = :customerId',
            ExpressionAttributeValues: {
              ':customerId': pathParameters.id
            },
            ScanIndexForward: false // Sort by createdAt descending
          };

          const orderResult = await dynamodb.query(orderParams).promise();
          
          return formatResponse(200, {
            customer: result.Item,
            orders: orderResult.Items
          });
        } else if (queryStringParameters.salesPersonId) {
          // Get customers by sales person
          const params = {
            TableName: CUSTOMERS_TABLE,
            IndexName: 'SalesPersonIndex',
            KeyConditionExpression: 'salesPersonId = :salesPersonId',
            ExpressionAttributeValues: {
              ':salesPersonId': queryStringParameters.salesPersonId
            }
          };

          const result = await dynamodb.query(params).promise();
          
          return formatResponse(200, {
            customers: result.Items,
            total: result.Count
          });
        } else {
          // Get all customers (scan operation)
          const params = {
            TableName: CUSTOMERS_TABLE
          };

          if (queryStringParameters.limit) {
            params.Limit = parseInt(queryStringParameters.limit);
          }

          if (queryStringParameters.lastKey) {
            params.ExclusiveStartKey = JSON.parse(queryStringParameters.lastKey);
          }

          const result = await dynamodb.scan(params).promise();
          
          return formatResponse(200, {
            customers: result.Items,
            total: result.Count,
            lastKey: result.LastEvaluatedKey
          });
        }

      case 'POST':
        // Create new customer
        const { name, email, phone, address, company, salesPersonId } = body;
        
        if (!name || !email || !salesPersonId) {
          return formatResponse(400, { message: 'Missing required fields: name, email, salesPersonId' });
        }

        const customerId = uuidv4();
        const timestamp = new Date().toISOString();

        const customer = {
          customerId,
          name,
          email,
          phone: phone || '',
          address: address || '',
          company: company || '',
          salesPersonId,
          status: 'active',
          totalOrders: 0,
          totalValue: 0,
          lastOrderDate: null,
          createdAt: timestamp,
          updatedAt: timestamp
        };

        const params = {
          TableName: CUSTOMERS_TABLE,
          Item: customer,
          ConditionExpression: 'attribute_not_exists(customerId)'
        };

        await dynamodb.put(params).promise();

        return formatResponse(201, {
          customerId,
          message: 'Customer created successfully'
        });

      case 'PUT':
        // Update customer
        if (!pathParameters || !pathParameters.id) {
          return formatResponse(400, { message: 'Customer ID is required' });
        }

        const updateExpression = [];
        const expressionAttributeNames = {};
        const expressionAttributeValues = {};

        if (body.name) {
          updateExpression.push('#name = :name');
          expressionAttributeNames['#name'] = 'name';
          expressionAttributeValues[':name'] = body.name;
        }

        if (body.email) {
          updateExpression.push('email = :email');
          expressionAttributeValues[':email'] = body.email;
        }

        if (body.phone !== undefined) {
          updateExpression.push('phone = :phone');
          expressionAttributeValues[':phone'] = body.phone;
        }

        if (body.address !== undefined) {
          updateExpression.push('address = :address');
          expressionAttributeValues[':address'] = body.address;
        }

        if (body.company !== undefined) {
          updateExpression.push('company = :company');
          expressionAttributeValues[':company'] = body.company;
        }

        if (body.status) {
          updateExpression.push('#status = :status');
          expressionAttributeNames['#status'] = 'status';
          expressionAttributeValues[':status'] = body.status;
        }

        if (body.salesPersonId) {
          updateExpression.push('salesPersonId = :salesPersonId');
          expressionAttributeValues[':salesPersonId'] = body.salesPersonId;
        }

        if (updateExpression.length === 0) {
          return formatResponse(400, { message: 'No fields to update' });
        }

        updateExpression.push('updatedAt = :updatedAt');
        expressionAttributeValues[':updatedAt'] = new Date().toISOString();

        const updateParams = {
          TableName: CUSTOMERS_TABLE,
          Key: {
            customerId: pathParameters.id
          },
          UpdateExpression: 'SET ' + updateExpression.join(', '),
          ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
          ExpressionAttributeValues: expressionAttributeValues,
          ConditionExpression: 'attribute_exists(customerId)',
          ReturnValues: 'ALL_NEW'
        };

        const updateResult = await dynamodb.update(updateParams).promise();

        return formatResponse(200, {
          customer: updateResult.Attributes,
          message: 'Customer updated successfully'
        });

      case 'DELETE':
        // Delete customer
        if (!pathParameters || !pathParameters.id) {
          return formatResponse(400, { message: 'Customer ID is required' });
        }

        const deleteParams = {
          TableName: CUSTOMERS_TABLE,
          Key: {
            customerId: pathParameters.id
          },
          ConditionExpression: 'attribute_exists(customerId)'
        };

        await dynamodb.delete(deleteParams).promise();

        return formatResponse(200, { message: 'Customer deleted successfully' });

      default:
        return formatResponse(405, { message: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Error:', error);
    
    if (error.code === 'ConditionalCheckFailedException') {
      return formatResponse(404, { message: 'Customer not found' });
    }

    return formatResponse(500, {
      message: 'Internal server error',
      error: error.message
    });
  }
};
