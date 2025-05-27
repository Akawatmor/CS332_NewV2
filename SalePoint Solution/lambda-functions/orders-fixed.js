const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

const ORDERS_TABLE = process.env.ORDERS_TABLE || 'salepoint-orders';

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    };

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    try {
        const { httpMethod, pathParameters } = event;
        let response;

        switch (httpMethod) {
            case 'GET':
                if (pathParameters && pathParameters.orderId) {
                    response = await getOrder(pathParameters.orderId);
                } else {
                    response = await getOrders();
                }
                break;
            
            case 'POST':
                response = await createOrder(JSON.parse(event.body));
                break;
            
            case 'PUT':
                if (pathParameters && pathParameters.orderId) {
                    response = await updateOrder(pathParameters.orderId, JSON.parse(event.body));
                } else {
                    throw new Error('Order ID is required for updates');
                }
                break;
            
            case 'DELETE':
                if (pathParameters && pathParameters.orderId) {
                    response = await deleteOrder(pathParameters.orderId);
                } else {
                    throw new Error('Order ID is required for deletion');
                }
                break;
            
            default:
                throw new Error(`Unsupported method: ${httpMethod}`);
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(response)
        };

    } catch (error) {
        console.error('Error:', error);
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

async function getOrders() {
    try {
        console.log('Getting all orders from table:', ORDERS_TABLE);
        
        const params = {
            TableName: ORDERS_TABLE
        };
        
        const result = await dynamodb.scan(params).promise();
        console.log('Scan result:', result);
        
        // If no orders exist, create sample data
        if (!result.Items || result.Items.length === 0) {
            console.log('No orders found, creating sample data...');
            await createSampleOrders();
            
            // Scan again to get the created orders
            const newResult = await dynamodb.scan(params).promise();
            return {
                orders: newResult.Items || [],
                count: newResult.Count || 0
            };
        }
        
        return {
            orders: result.Items,
            count: result.Count
        };
    } catch (error) {
        console.error('Error getting orders:', error);
        throw error;
    }
}

async function getOrder(orderId) {
    const params = {
        TableName: ORDERS_TABLE,
        Key: { orderId }
    };
    
    const result = await dynamodb.get(params).promise();
    
    if (!result.Item) {
        throw new Error('Order not found');
    }
    
    return result.Item;
}

async function createOrder(orderData) {
    const orderId = orderData.orderId || `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    const order = {
        orderId,
        customerId: orderData.customerId,
        customerName: orderData.customerName || '',
        items: orderData.items || [],
        totalAmount: orderData.totalAmount || 0,
        status: orderData.status || 'pending',
        orderDate: orderData.orderDate || new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    const params = {
        TableName: ORDERS_TABLE,
        Item: order
    };
    
    await dynamodb.put(params).promise();
    return order;
}

async function updateOrder(orderId, updates) {
    updates.updatedAt = new Date().toISOString();
    
    const params = {
        TableName: ORDERS_TABLE,
        Key: { orderId },
        UpdateExpression: 'SET',
        ExpressionAttributeValues: {},
        ReturnValues: 'ALL_NEW'
    };
    
    const updateParts = [];
    Object.keys(updates).forEach((key, index) => {
        if (key !== 'orderId') {
            updateParts.push(`${key} = :val${index}`);
            params.ExpressionAttributeValues[`:val${index}`] = updates[key];
        }
    });
    
    params.UpdateExpression += ' ' + updateParts.join(', ');
    
    const result = await dynamodb.update(params).promise();
    return result.Attributes;
}

async function deleteOrder(orderId) {
    const params = {
        TableName: ORDERS_TABLE,
        Key: { orderId }
    };
    
    await dynamodb.delete(params).promise();
    return { message: 'Order deleted successfully' };
}

async function createSampleOrders() {
    const sampleOrders = [
        {
            orderId: 'ord_001',
            customerId: 'cust_001',
            customerName: 'John Smith',
            items: [
                { productId: 'prod_001', productName: 'Laptop Computer', quantity: 1, price: 999.99 }
            ],
            totalAmount: 999.99,
            status: 'completed',
            orderDate: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            orderId: 'ord_002',
            customerId: 'cust_002',
            customerName: 'Jane Doe',
            items: [
                { productId: 'prod_002', productName: 'Wireless Mouse', quantity: 2, price: 29.99 },
                { productId: 'prod_003', productName: 'Office Chair', quantity: 1, price: 299.99 }
            ],
            totalAmount: 359.97,
            status: 'processing',
            orderDate: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            orderId: 'ord_003',
            customerId: 'cust_003',
            customerName: 'Bob Johnson',
            items: [
                { productId: 'prod_002', productName: 'Wireless Mouse', quantity: 1, price: 29.99 }
            ],
            totalAmount: 29.99,
            status: 'shipped',
            orderDate: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
    ];
    
    for (const order of sampleOrders) {
        const params = {
            TableName: ORDERS_TABLE,
            Item: order
        };
        
        try {
            await dynamodb.put(params).promise();
            console.log('Created sample order:', order.orderId);
        } catch (error) {
            console.error('Error creating sample order:', error);
        }
    }
}
