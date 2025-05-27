const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    console.log('Customers Lambda Event:', JSON.stringify(event, null, 2));
    
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    };
    
    try {
        // Handle CORS preflight
        if (event.httpMethod === 'OPTIONS') {
            return { statusCode: 200, headers, body: '' };
        }
        
        const tableName = process.env.CUSTOMERS_TABLE;
        if (!tableName) {
            console.error('CUSTOMERS_TABLE environment variable not set');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Configuration error: CUSTOMERS_TABLE not set' })
            };
        }
        
        console.log('Using DynamoDB table:', tableName);
        
        const { httpMethod, pathParameters } = event;
        
        switch (httpMethod) {
            case 'GET':
                if (pathParameters && pathParameters.customerId) {
                    return await getCustomer(tableName, pathParameters.customerId, headers);
                } else {
                    return await getCustomers(tableName, event.queryStringParameters, headers);
                }
                
            case 'POST':
                return await createCustomer(tableName, JSON.parse(event.body || '{}'), headers);
                
            case 'PUT':
                if (pathParameters && pathParameters.customerId) {
                    return await updateCustomer(tableName, pathParameters.customerId, JSON.parse(event.body || '{}'), headers);
                } else {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ 
                            error: 'Customer ID is required for updates',
                            timestamp: new Date().toISOString()
                        })
                    };
                }
                
            case 'DELETE':
                if (pathParameters && pathParameters.customerId) {
                    return await deleteCustomer(tableName, pathParameters.customerId, headers);
                } else {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ 
                            error: 'Customer ID is required for deletion',
                            timestamp: new Date().toISOString()
                        })
                    };
                }
                
            default:
                return {
                    statusCode: 405,
                    headers,
                    body: JSON.stringify({ 
                        error: 'Method not allowed',
                        timestamp: new Date().toISOString()
                    })
                };
        }
        
    } catch (error) {
        console.error('Lambda execution error:', error);
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

// Get all customers with optional search
async function getCustomers(tableName, queryParams, headers) {
    console.log('Processing GET request for customers');
    
    const searchTerm = queryParams?.search;
    const page = parseInt(queryParams?.page) || 1;
    const limit = parseInt(queryParams?.limit) || 50;
    
    console.log('Query parameters:', { searchTerm, page, limit });
    
    try {
        let scanParams = { 
            TableName: tableName,
            Limit: limit
        };
        
        // Add filter expression if search term is provided
        if (searchTerm) {
            scanParams.FilterExpression = 'contains(#name, :searchTerm) OR contains(#email, :searchTerm) OR contains(#company, :searchTerm)';
            scanParams.ExpressionAttributeNames = {
                '#name': 'name',
                '#email': 'email',
                '#company': 'company'
            };
            scanParams.ExpressionAttributeValues = {
                ':searchTerm': searchTerm
            };
            console.log('Applying search filter for:', searchTerm);
        }
        
        const result = await dynamodb.scan(scanParams).promise();
        
        console.log(`Found ${result.Count} customers${searchTerm ? ` matching "${searchTerm}"` : ''}`);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                customers: result.Items || [],
                count: result.Count || 0,
                message: `Customers retrieved successfully${searchTerm ? ` (filtered by "${searchTerm}")` : ''}`,
                timestamp: new Date().toISOString(),
                searchTerm: searchTerm || null,
                page: page,
                limit: limit
            })
        };
    } catch (dbError) {
        console.error('DynamoDB scan error:', dbError);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Database error',
                message: dbError.message,
                type: 'DynamoDB_Error'
            })
        };
    }
}

// Get a single customer by ID
async function getCustomer(tableName, customerId, headers) {
    console.log('Processing GET request for customer:', customerId);
    
    try {
        const result = await dynamodb.get({
            TableName: tableName,
            Key: { customerId: customerId }
        }).promise();
        
        if (!result.Item) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({
                    error: 'Customer not found',
                    customerId: customerId,
                    timestamp: new Date().toISOString()
                })
            };
        }
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                customer: result.Item,
                message: 'Customer retrieved successfully',
                timestamp: new Date().toISOString()
            })
        };
    } catch (dbError) {
        console.error('DynamoDB get error:', dbError);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Database error',
                message: dbError.message
            })
        };
    }
}

// Create a new customer
async function createCustomer(tableName, body, headers) {
    console.log('Processing POST request for customers');
    
    const item = {
        customerId: `cust_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: body.name || 'Sample Customer',
        email: body.email || 'customer@example.com',
        phone: body.phone || '555-0123',
        address: body.address || '123 Main St',
        company: body.company || '',
        notes: body.notes || '',
        status: body.status || 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    try {
        await dynamodb.put({
            TableName: tableName,
            Item: item
        }).promise();
        
        console.log('Customer created successfully:', item.customerId);
        
        return {
            statusCode: 201,
            headers,
            body: JSON.stringify({
                message: 'Customer created successfully',
                customer: item,
                timestamp: new Date().toISOString()
            })
        };
    } catch (dbError) {
        console.error('DynamoDB put error:', dbError);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Database error',
                message: dbError.message
            })
        };
    }
}

// Update an existing customer
async function updateCustomer(tableName, customerId, body, headers) {
    console.log('Processing PUT request for customer:', customerId);
    
    try {
        // First check if customer exists
        const existingCustomer = await dynamodb.get({
            TableName: tableName,
            Key: { customerId: customerId }
        }).promise();
        
        if (!existingCustomer.Item) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({
                    error: 'Customer not found',
                    customerId: customerId,
                    timestamp: new Date().toISOString()
                })
            };
        }
        
        const updatedItem = {
            ...existingCustomer.Item,
            name: body.name || existingCustomer.Item.name,
            email: body.email || existingCustomer.Item.email,
            phone: body.phone || existingCustomer.Item.phone,
            address: body.address || existingCustomer.Item.address,
            company: body.company !== undefined ? body.company : existingCustomer.Item.company,
            notes: body.notes !== undefined ? body.notes : existingCustomer.Item.notes,
            status: body.status || existingCustomer.Item.status,
            updatedAt: new Date().toISOString()
        };
        
        await dynamodb.put({
            TableName: tableName,
            Item: updatedItem
        }).promise();
        
        console.log('Customer updated successfully:', customerId);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                message: 'Customer updated successfully',
                customer: updatedItem,
                timestamp: new Date().toISOString()
            })
        };
    } catch (dbError) {
        console.error('DynamoDB update error:', dbError);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Database error',
                message: dbError.message
            })
        };
    }
}

// Delete a customer
async function deleteCustomer(tableName, customerId, headers) {
    console.log('Processing DELETE request for customer:', customerId);
    
    try {
        // First check if customer exists
        const existingCustomer = await dynamodb.get({
            TableName: tableName,
            Key: { customerId: customerId }
        }).promise();
        
        if (!existingCustomer.Item) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({
                    error: 'Customer not found',
                    customerId: customerId,
                    timestamp: new Date().toISOString()
                })
            };
        }
        
        await dynamodb.delete({
            TableName: tableName,
            Key: { customerId: customerId }
        }).promise();
        
        console.log('Customer deleted successfully:', customerId);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                message: 'Customer deleted successfully',
                customerId: customerId,
                timestamp: new Date().toISOString()
            })
        };
    } catch (dbError) {
        console.error('DynamoDB delete error:', dbError);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Database error',
                message: dbError.message
            })
        };
    }
}
