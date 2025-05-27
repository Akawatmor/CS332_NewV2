const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, PutCommand, UpdateCommand, DeleteCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(client);

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
            throw new Error('CUSTOMERS_TABLE environment variable not set');
        }
        
        const method = event.httpMethod;
        const pathParameters = event.pathParameters || {};
        const customerId = pathParameters.id;
        
        let body;
        try {
            body = event.body ? JSON.parse(event.body) : {};
        } catch (e) {
            body = {};
        }
        
        let result;
        
        switch (method) {
            case 'GET':
                if (customerId) {
                    // Get single customer
                    const getParams = {
                        TableName: tableName,
                        Key: { customerId: customerId }
                    };
                    const getResult = await docClient.send(new GetCommand(getParams));
                    
                    if (!getResult.Item) {
                        return {
                            statusCode: 404,
                            headers,
                            body: JSON.stringify({ message: 'Customer not found' })
                        };
                    }
                    
                    result = { customer: getResult.Item };
                } else {
                    // Get all customers
                    const scanParams = {
                        TableName: tableName
                    };
                    const scanResult = await docClient.send(new ScanCommand(scanParams));
                    result = { customers: scanResult.Items || [] };
                }
                break;
                
            case 'POST':
                // Create new customer
                if (!body.name || !body.email) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ message: 'Name and email are required' })
                    };
                }
                
                const newCustomer = {
                    customerId: generateId(),
                    name: body.name,
                    email: body.email,
                    phone: body.phone || '',
                    address: body.address || '',
                    company: body.company || '',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                
                const putParams = {
                    TableName: tableName,
                    Item: newCustomer
                };
                await docClient.send(new PutCommand(putParams));
                
                result = { customer: newCustomer };
                break;
                
            case 'PUT':
                // Update customer
                if (!customerId) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ message: 'Customer ID is required' })
                    };
                }
                
                // Check if customer exists
                const checkParams = {
                    TableName: tableName,
                    Key: { customerId: customerId }
                };
                const checkResult = await docClient.send(new GetCommand(checkParams));
                
                if (!checkResult.Item) {
                    return {
                        statusCode: 404,
                        headers,
                        body: JSON.stringify({ message: 'Customer not found' })
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
                
                updateExpression.push('updatedAt = :updatedAt');
                expressionAttributeValues[':updatedAt'] = new Date().toISOString();
                
                const updateParams = {
                    TableName: tableName,
                    Key: { customerId: customerId },
                    UpdateExpression: 'SET ' + updateExpression.join(', '),
                    ExpressionAttributeValues: expressionAttributeValues,
                    ReturnValues: 'ALL_NEW'
                };
                
                if (Object.keys(expressionAttributeNames).length > 0) {
                    updateParams.ExpressionAttributeNames = expressionAttributeNames;
                }
                
                const updateResult = await docClient.send(new UpdateCommand(updateParams));
                
                result = { customer: updateResult.Attributes };
                break;
                
            case 'DELETE':
                // Delete customer
                if (!customerId) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ message: 'Customer ID is required' })
                    };
                }
                
                // Check if customer exists before deleting
                const deleteCheckParams = {
                    TableName: tableName,
                    Key: { customerId: customerId }
                };
                const deleteCheckResult = await docClient.send(new GetCommand(deleteCheckParams));
                
                if (!deleteCheckResult.Item) {
                    return {
                        statusCode: 404,
                        headers,
                        body: JSON.stringify({ message: 'Customer not found' })
                    };
                }
                
                const deleteParams = {
                    TableName: tableName,
                    Key: { customerId: customerId }
                };
                await docClient.send(new DeleteCommand(deleteParams));
                
                result = { message: 'Customer deleted successfully' };
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
    return 'cust_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}