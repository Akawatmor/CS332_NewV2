const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    console.log('Products Lambda Event:', JSON.stringify(event, null, 2));
    
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
        
        const tableName = process.env.PRODUCTS_TABLE;
        if (!tableName) {
            console.error('PRODUCTS_TABLE environment variable not set');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Configuration error: PRODUCTS_TABLE not set' })
            };
        }
        
        console.log('Using DynamoDB table:', tableName);
        
        if (event.httpMethod === 'GET') {
            console.log('Processing GET request for products');
            
            try {
                const result = await dynamodb.scan({ 
                    TableName: tableName,
                    Limit: 50  // Limit to avoid timeout
                }).promise();
                
                console.log(`Found ${result.Count} products`);
                
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        products: result.Items || [],
                        count: result.Count || 0,
                        message: 'Products retrieved successfully',
                        timestamp: new Date().toISOString()
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
            console.log('Processing POST request for products');
            
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
                productId: `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                name: body.name || 'Sample Product',
                price: parseFloat(body.price) || 29.99,
                category: body.category || 'General',
                stock: parseInt(body.stock) || 100,
                description: body.description || 'Sample product description',
                specifications: body.specifications || {},
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            console.log('Creating product:', item);
            
            try {
                await dynamodb.put({ 
                    TableName: tableName, 
                    Item: item 
                }).promise();
                
                console.log('Product created successfully');
                
                return {
                    statusCode: 201,
                    headers,
                    body: JSON.stringify({
                        product: item,
                        message: 'Product created successfully'
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
        
        if (event.httpMethod === 'PUT') {
            const productId = event.pathParameters?.productId || event.pathParameters?.id;
            if (!productId) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Product ID is required for updates' })
                };
            }
            
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
            
            const updateExpression = [];
            const expressionAttributeValues = {};
            const expressionAttributeNames = {};
            
            if (body.name) {
                updateExpression.push('#name = :name');
                expressionAttributeNames['#name'] = 'name';
                expressionAttributeValues[':name'] = body.name;
            }
            
            if (body.price !== undefined) {
                updateExpression.push('price = :price');
                expressionAttributeValues[':price'] = parseFloat(body.price);
            }
            
            if (body.category) {
                updateExpression.push('category = :category');
                expressionAttributeValues[':category'] = body.category;
            }
            
            if (body.stock !== undefined) {
                updateExpression.push('stock = :stock');
                expressionAttributeValues[':stock'] = parseInt(body.stock);
            }
            
            if (body.description) {
                updateExpression.push('description = :description');
                expressionAttributeValues[':description'] = body.description;
            }
            
            updateExpression.push('updatedAt = :updatedAt');
            expressionAttributeValues[':updatedAt'] = new Date().toISOString();
            
            try {
                const result = await dynamodb.update({
                    TableName: tableName,
                    Key: { productId: productId },
                    UpdateExpression: `SET ${updateExpression.join(', ')}`,
                    ExpressionAttributeValues: expressionAttributeValues,
                    ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
                    ReturnValues: 'ALL_NEW'
                }).promise();
                
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        product: result.Attributes,
                        message: 'Product updated successfully'
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
        
        if (event.httpMethod === 'DELETE') {
            const productId = event.pathParameters?.productId || event.pathParameters?.id;
            if (!productId) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Product ID is required for deletion' })
                };
            }
            
            try {
                await dynamodb.delete({
                    TableName: tableName,
                    Key: { productId: productId }
                }).promise();
                
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ message: 'Product deleted successfully' })
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
