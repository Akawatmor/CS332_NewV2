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
        
        if (event.httpMethod === 'GET') {
            console.log('Processing GET request for customers');
            
            // Extract query parameters for search and pagination
            const queryParams = event.queryStringParameters || {};
            const searchTerm = queryParams.search;
            const page = parseInt(queryParams.page) || 1;
            const limit = parseInt(queryParams.limit) || 50;
            
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
        
        if (event.httpMethod === 'POST') {
            console.log('Processing POST request for customers');
            
            let body;
            try {
                body = JSON.parse(event.body || '{}');
            } catch (parseError) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Invalid JSON in request body' })
                };
            }
            
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
            
            console.log('Creating customer:', item);
            
            try {
                await dynamodb.put({ 
                    TableName: tableName, 
                    Item: item 
                }).promise();
                
                console.log('Customer created successfully');
                
                return {
                    statusCode: 201,
                    headers,
                    body: JSON.stringify({
                        customer: item,
                        message: 'Customer created successfully'
                    })
                };
            } catch (dbError) {
                console.error('DynamoDB put error:', dbError);
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
        
        // Handle other HTTP methods...
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: `Method ${event.httpMethod} not allowed` })
        };
        
    } catch (error) {
        console.error('Lambda execution error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Internal server error',
                message: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            })
        };
    }
};
