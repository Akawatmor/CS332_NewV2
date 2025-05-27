const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE || 'salepoint-products';

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
                if (pathParameters && pathParameters.productId) {
                    response = await getProduct(pathParameters.productId);
                } else {
                    response = await getProducts();
                }
                break;
            
            case 'POST':
                response = await createProduct(JSON.parse(event.body));
                break;
            
            case 'PUT':
                if (pathParameters && pathParameters.productId) {
                    response = await updateProduct(pathParameters.productId, JSON.parse(event.body));
                } else {
                    throw new Error('Product ID is required for updates');
                }
                break;
            
            case 'DELETE':
                if (pathParameters && pathParameters.productId) {
                    response = await deleteProduct(pathParameters.productId);
                } else {
                    throw new Error('Product ID is required for deletion');
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

async function getProducts() {
    try {
        console.log('Getting all products from table:', PRODUCTS_TABLE);
        
        const params = {
            TableName: PRODUCTS_TABLE
        };
        
        const result = await dynamodb.scan(params).promise();
        console.log('Scan result:', result);
        
        // If no products exist, create sample data
        if (!result.Items || result.Items.length === 0) {
            console.log('No products found, creating sample data...');
            await createSampleProducts();
            
            // Scan again to get the created products
            const newResult = await dynamodb.scan(params).promise();
            return {
                products: newResult.Items || [],
                count: newResult.Count || 0
            };
        }
        
        return {
            products: result.Items,
            count: result.Count
        };
    } catch (error) {
        console.error('Error getting products:', error);
        throw error;
    }
}

async function getProduct(productId) {
    const params = {
        TableName: PRODUCTS_TABLE,
        Key: { productId }
    };
    
    const result = await dynamodb.get(params).promise();
    
    if (!result.Item) {
        throw new Error('Product not found');
    }
    
    return result.Item;
}

async function createProduct(productData) {
    const productId = productData.productId || `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    const product = {
        productId,
        name: productData.name,
        description: productData.description || '',
        price: productData.price || 0,
        category: productData.category || 'General',
        stock: productData.stock || 0,
        sku: productData.sku || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    const params = {
        TableName: PRODUCTS_TABLE,
        Item: product
    };
    
    await dynamodb.put(params).promise();
    return product;
}

async function updateProduct(productId, updates) {
    updates.updatedAt = new Date().toISOString();
    
    const params = {
        TableName: PRODUCTS_TABLE,
        Key: { productId },
        UpdateExpression: 'SET',
        ExpressionAttributeValues: {},
        ReturnValues: 'ALL_NEW'
    };
    
    const updateParts = [];
    Object.keys(updates).forEach((key, index) => {
        if (key !== 'productId') {
            updateParts.push(`${key} = :val${index}`);
            params.ExpressionAttributeValues[`:val${index}`] = updates[key];
        }
    });
    
    params.UpdateExpression += ' ' + updateParts.join(', ');
    
    const result = await dynamodb.update(params).promise();
    return result.Attributes;
}

async function deleteProduct(productId) {
    const params = {
        TableName: PRODUCTS_TABLE,
        Key: { productId }
    };
    
    await dynamodb.delete(params).promise();
    return { message: 'Product deleted successfully' };
}

async function createSampleProducts() {
    const sampleProducts = [
        {
            productId: 'prod_001',
            name: 'Laptop Computer',
            description: 'High-performance laptop for business',
            price: 999.99,
            category: 'Electronics',
            stock: 25,
            sku: 'LAP-001',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            productId: 'prod_002',
            name: 'Wireless Mouse',
            description: 'Ergonomic wireless mouse',
            price: 29.99,
            category: 'Electronics',
            stock: 100,
            sku: 'MOU-002',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            productId: 'prod_003',
            name: 'Office Chair',
            description: 'Comfortable ergonomic office chair',
            price: 299.99,
            category: 'Furniture',
            stock: 15,
            sku: 'CHR-003',
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
            await dynamodb.put(params).promise();
            console.log('Created sample product:', product.name);
        } catch (error) {
            console.error('Error creating sample product:', error);
        }
    }
}
