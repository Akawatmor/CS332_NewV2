const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, GetCommand, PutCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

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
            throw new Error('PRODUCTS_TABLE environment variable not set');
        }
        
        const method = event.httpMethod;
        const pathParameters = event.pathParameters || {};
        const productId = pathParameters.id;
        
        let body;
        try {
            body = event.body ? JSON.parse(event.body) : {};
        } catch (e) {
            body = {};
        }
        
        let result;
        
        switch (method) {
            case 'GET':
                if (productId) {
                    // Get single product
                    const getParams = {
                        TableName: tableName,
                        Key: { id: productId }
                    };
                    const getCommand = new GetCommand(getParams);
                    const getResult = await dynamodb.send(getCommand);
                    
                    if (!getResult.Item) {
                        return {
                            statusCode: 404,
                            headers,
                            body: JSON.stringify({ message: 'Product not found' })
                        };
                    }
                    
                    result = { product: getResult.Item };
                } else {
                    // Get all products
                    const scanParams = {
                        TableName: tableName
                    };
                    const scanCommand = new ScanCommand(scanParams);
                    const scanResult = await dynamodb.send(scanCommand);
                    result = { products: scanResult.Items || [] };
                }
                break;
                
            case 'POST':
                // Create new product
                if (!body.name || !body.price) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ message: 'Name and price are required' })
                    };
                }
                
                const newProduct = {
                    id: generateId(),
                    name: body.name,
                    description: body.description || '',
                    price: parseFloat(body.price),
                    category: body.category || 'General',
                    stockQuantity: parseInt(body.stockQuantity) || 0,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                
                const putParams = {
                    TableName: tableName,
                    Item: newProduct
                };
                const putCommand = new PutCommand(putParams);
                await dynamodb.send(putCommand);
                
                result = { product: newProduct };
                break;
                
            case 'PUT':
                // Update product
                if (!productId) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ message: 'Product ID is required' })
                    };
                }
                
                // Check if product exists
                const checkParams = {
                    TableName: tableName,
                    Key: { id: productId }
                };
                const checkCommand = new GetCommand(checkParams);
                const checkResult = await dynamodb.send(checkCommand);
                
                if (!checkResult.Item) {
                    return {
                        statusCode: 404,
                        headers,
                        body: JSON.stringify({ message: 'Product not found' })
                    };
                }
                
                const updateExpression = [];
                const expressionAttributeNames = {};
                const expressionAttributeValues = {};
                
                if (body.name) {
                    updateExpression.push('#name = :name');
                    expressionAttributeNames['#name'] = 'name';
                    expressionAttributeValues[':name'] = body.name;
                }
                
                if (body.description !== undefined) {
                    updateExpression.push('description = :description');
                    expressionAttributeValues[':description'] = body.description;
                }
                
                if (body.price !== undefined) {
                    updateExpression.push('price = :price');
                    expressionAttributeValues[':price'] = parseFloat(body.price);
                }
                
                if (body.category) {
                    updateExpression.push('category = :category');
                    expressionAttributeValues[':category'] = body.category;
                }
                
                if (body.stockQuantity !== undefined) {
                    updateExpression.push('stockQuantity = :stockQuantity');
                    expressionAttributeValues[':stockQuantity'] = parseInt(body.stockQuantity);
                }
                
                updateExpression.push('updatedAt = :updatedAt');
                expressionAttributeValues[':updatedAt'] = new Date().toISOString();
                
                const updateParams = {
                    TableName: tableName,
                    Key: { id: productId },
                    UpdateExpression: 'SET ' + updateExpression.join(', '),
                    ExpressionAttributeValues: expressionAttributeValues,
                    ReturnValues: 'ALL_NEW'
                };
                
                if (Object.keys(expressionAttributeNames).length > 0) {
                    updateParams.ExpressionAttributeNames = expressionAttributeNames;
                }
                
                const updateCommand = new UpdateCommand(updateParams);
                const updateResult = await dynamodb.send(updateCommand);
                
                result = { product: updateResult.Attributes };
                break;
                
            case 'DELETE':
                // Delete product
                if (!productId) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ message: 'Product ID is required' })
                    };
                }
                
                // Check if product exists before deleting
                const deleteCheckParams = {
                    TableName: tableName,
                    Key: { id: productId }
                };
                const deleteCheckCommand = new GetCommand(deleteCheckParams);
                const deleteCheckResult = await dynamodb.send(deleteCheckCommand);
                
                if (!deleteCheckResult.Item) {
                    return {
                        statusCode: 404,
                        headers,
                        body: JSON.stringify({ message: 'Product not found' })
                    };
                }
                
                const deleteParams = {
                    TableName: tableName,
                    Key: { id: productId }
                };
                const deleteCommand = new DeleteCommand(deleteParams);
                await dynamodb.send(deleteCommand);
                
                result = { message: 'Product deleted successfully' };
                break;
                
            default:
                return {
                    statusCode: 405,
                    headers,
                    body: JSON.stringify({ message: 'Method not allowed' })
                };
        }
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(result)
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

function generateId() {
    return 'prod_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}
