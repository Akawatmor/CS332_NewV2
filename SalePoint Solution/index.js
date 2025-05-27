const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    };
    
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }
    
    try {
        // Determine which table to use based on the resource path
        let tableName;
        let resourceType = '';
        
        if (event.path && (event.path.startsWith('/orders') || event.resource === '/orders' || event.resource === '/orders/{id}')) {
            tableName = process.env.ORDERS_TABLE || 'salepoint-orders';
            resourceType = 'orders';
        } else if (event.path && (event.path.startsWith('/customers') || event.resource === '/customers' || event.resource === '/customers/{id}')) {
            tableName = process.env.CUSTOMERS_TABLE || 'salepoint-customers';
            resourceType = 'customers';
        } else {
            tableName = process.env.PRODUCTS_TABLE;
            resourceType = 'products';
        }('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    };
    
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }
    
    try {
        // Determine which table to use based on the resource path
        let tableName;
        if (event.path.startsWith('/orders') || event.resource === '/orders' || event.resource === '/orders/{id}') {
            tableName = process.env.ORDERS_TABLE || 'salepoint-orders';
        } else if (event.path.startsWith('/customers') || event.resource === '/customers' || event.resource === '/customers/{id}') {
            tableName = process.env.CUSTOMERS_TABLE || 'salepoint-customers';
        } else {
            tableName = process.env.PRODUCTS_TABLE;
        
        if (event.httpMethod === 'GET') {
            const result = await dynamodb.scan({ TableName: tableName }).promise();
            
            // Format the response based on the resource type
            let responseBody = {};
            if (resourceType === 'products') {
                responseBody = {
                    products: result.Items || [],
                    count: result.Count || 0
                };
            } else if (resourceType === 'customers') {
                responseBody = {
                    customers: result.Items || [],
                    count: result.Count || 0
                };
            } else if (resourceType === 'orders') {
                responseBody = {
                    orders: result.Items || [],
                    count: result.Count || 0
                };
            }
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(responseBody)
            };
        }
        
        if (event.httpMethod === 'POST') {
            const body = JSON.parse(event.body || '{}');
            let item = {};
            
            if (resourceType === 'products') {
                item = {
                    productId: 'prod_' + Date.now(),
                    name: body.name || 'Sample Product',
                    price: body.price || 29.99,
                    category: body.category || 'General',
                    stock: body.stock || 100,
                    createdAt: new Date().toISOString()
                };
            } else if (resourceType === 'customers') {
                item = {
                    customerId: 'cust_' + Date.now(),
                    ...body,
                    createdAt: new Date().toISOString()
                };
            } else if (resourceType === 'orders') {
                item = {
                    orderId: 'order_' + Date.now(),
                    ...body,
                    createdAt: new Date().toISOString(),
                    status: body.status || 'pending'
                };
            }
            
            await dynamodb.put({ TableName: tableName, Item: item }).promise();
            return {
                statusCode: 201,
                headers,
                body: JSON.stringify(item)
            };
        }
        
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
        
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};
