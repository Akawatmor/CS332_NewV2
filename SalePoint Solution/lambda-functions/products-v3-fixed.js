const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, GetCommand, PutCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE || 'salepoint-products';

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
        
        const method = event.httpMethod;
        const pathParameters = event.pathParameters || {};
        const productId = pathParameters.id || pathParameters.productId;
        
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
                        TableName: PRODUCTS_TABLE,
                        Key: { productId: productId }
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
                        TableName: PRODUCTS_TABLE
                    };
                    const scanCommand = new ScanCommand(scanParams);
                    const scanResult = await dynamodb.send(scanCommand);
                    
                    // If no products exist, create sample data
                    if (!scanResult.Items || scanResult.Items.length === 0) {
                        console.log('No products found, creating sample data...');
                        await createSampleProducts();
                        
                        // Scan again to get the created products
                        const newScanResult = await dynamodb.send(scanCommand);
                        result = { 
                            products: newScanResult.Items || [],
                            count: newScanResult.Count || 0,
                            message: 'Sample products created and returned'
                        };
                    } else {
                        result = { 
                            products: scanResult.Items || [],
                            count: scanResult.Count || 0
                        };
                    }
                }
                break;
                
            case 'POST':
                // Create new product
                if (!body.name) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ message: 'Product name is required' })
                    };
                }
                
                const newProduct = {
                    productId: body.productId || generateId(),
                    name: body.name,
                    description: body.description || '',
                    price: parseFloat(body.price) || 0,
                    category: body.category || 'General',
                    stock: parseInt(body.stock) || 0,
                    sku: body.sku || '',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                
                const putParams = {
                    TableName: PRODUCTS_TABLE,
                    Item: newProduct
                };
                const putCommand = new PutCommand(putParams);
                await dynamodb.send(putCommand);
                
                result = { product: newProduct, message: 'Product created successfully' };
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
                    TableName: PRODUCTS_TABLE,
                    Key: { productId: productId }
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
                
                // Add updatedAt automatically
                body.updatedAt = new Date().toISOString();
                
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
                
                if (body.stock !== undefined) {
                    updateExpression.push('stock = :stock');
                    expressionAttributeValues[':stock'] = parseInt(body.stock);
                }
                
                if (body.sku !== undefined) {
                    updateExpression.push('sku = :sku');
                    expressionAttributeValues[':sku'] = body.sku;
                }
                
                if (body.updatedAt) {
                    updateExpression.push('updatedAt = :updatedAt');
                    expressionAttributeValues[':updatedAt'] = body.updatedAt;
                }
                
                if (updateExpression.length === 0) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ message: 'No valid fields to update' })
                    };
                }
                
                const updateParams = {
                    TableName: PRODUCTS_TABLE,
                    Key: { productId: productId },
                    UpdateExpression: 'SET ' + updateExpression.join(', '),
                    ExpressionAttributeValues: expressionAttributeValues,
                    ReturnValues: 'ALL_NEW'
                };
                
                if (Object.keys(expressionAttributeNames).length > 0) {
                    updateParams.ExpressionAttributeNames = expressionAttributeNames;
                }
                
                const updateCommand = new UpdateCommand(updateParams);
                const updateResult = await dynamodb.send(updateCommand);
                
                result = { product: updateResult.Attributes, message: 'Product updated successfully' };
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
                    TableName: PRODUCTS_TABLE,
                    Key: { productId: productId }
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
                    TableName: PRODUCTS_TABLE,
                    Key: { productId: productId }
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
    return `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

async function createSampleProducts() {
    const sampleProducts = [
        {
            productId: 'prod_1',
            name: 'iPhone 15 Pro',
            description: 'Latest iPhone with A17 Pro chip',
            price: 999.99,
            category: 'Electronics',
            stock: 50,
            sku: 'IPHONE15PRO',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            productId: 'prod_2',
            name: 'MacBook Air M3',
            description: '13-inch MacBook Air with M3 chip',
            price: 1099.99,
            category: 'Computers',
            stock: 25,
            sku: 'MBA13M3',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            productId: 'prod_3',
            name: 'AirPods Pro',
            description: 'Wireless earbuds with noise cancellation',
            price: 249.99,
            category: 'Audio',
            stock: 100,
            sku: 'AIRPODSPRO',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            productId: 'prod_4',
            name: 'iPad Air',
            description: '10.9-inch iPad Air with M1 chip',
            price: 599.99,
            category: 'Tablets',
            stock: 75,
            sku: 'IPADAIR',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            productId: 'prod_5',
            name: 'Apple Watch Series 9',
            description: 'Smartwatch with health monitoring',
            price: 399.99,
            category: 'Wearables',
            stock: 60,
            sku: 'AWSERIES9',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
    ];
    
    for (const product of sampleProducts) {
        const params = {
            TableName: PRODUCTS_TABLE,
            Item: product
        };
        
        try {
            const putCommand = new PutCommand(params);
            await dynamodb.send(putCommand);
            console.log('Created sample product:', product.name);
        } catch (error) {
            console.error('Error creating sample product:', error);
        }
    }
}
