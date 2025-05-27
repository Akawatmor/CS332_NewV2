const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, GetCommand, PutCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

const CUSTOMERS_TABLE = process.env.CUSTOMERS_TABLE || 'salepoint-customers';

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
        
        const method = event.httpMethod;
        const pathParameters = event.pathParameters || {};
        const customerId = pathParameters.id || pathParameters.customerId;
        
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
                        TableName: CUSTOMERS_TABLE,
                        Key: { customerId: customerId }
                    };
                    const getCommand = new GetCommand(getParams);
                    const getResult = await dynamodb.send(getCommand);
                    
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
                        TableName: CUSTOMERS_TABLE
                    };
                    const scanCommand = new ScanCommand(scanParams);
                    const scanResult = await dynamodb.send(scanCommand);
                    
                    // If no customers exist, create sample data
                    if (!scanResult.Items || scanResult.Items.length === 0) {
                        console.log('No customers found, creating sample data...');
                        await createSampleCustomers();
                        
                        // Scan again to get the created customers
                        const newScanResult = await dynamodb.send(scanCommand);
                        result = { 
                            customers: newScanResult.Items || [],
                            count: newScanResult.Count || 0,
                            message: 'Sample customers created and returned'
                        };
                    } else {
                        result = { 
                            customers: scanResult.Items || [],
                            count: scanResult.Count || 0
                        };
                    }
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
                    customerId: body.customerId || generateId(),
                    name: body.name,
                    email: body.email,
                    phone: body.phone || '',
                    address: body.address || '',
                    company: body.company || '',
                    salesPersonId: body.salesPersonId || '',
                    status: body.status || 'active',
                    totalOrders: 0,
                    totalValue: 0,
                    lastOrderDate: null,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                
                const putParams = {
                    TableName: CUSTOMERS_TABLE,
                    Item: newCustomer
                };
                const putCommand = new PutCommand(putParams);
                await dynamodb.send(putCommand);
                
                result = { customer: newCustomer, message: 'Customer created successfully' };
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
                    TableName: CUSTOMERS_TABLE,
                    Key: { customerId: customerId }
                };
                const checkCommand = new GetCommand(checkParams);
                const checkResult = await dynamodb.send(checkCommand);
                
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
                
                // Add updatedAt automatically
                body.updatedAt = new Date().toISOString();
                
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
                
                if (body.salesPersonId !== undefined) {
                    updateExpression.push('salesPersonId = :salesPersonId');
                    expressionAttributeValues[':salesPersonId'] = body.salesPersonId;
                }
                
                if (body.status) {
                    updateExpression.push('#status = :status');
                    expressionAttributeNames['#status'] = 'status';
                    expressionAttributeValues[':status'] = body.status;
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
                    TableName: CUSTOMERS_TABLE,
                    Key: { customerId: customerId },
                    UpdateExpression: 'SET ' + updateExpression.join(', '),
                    ExpressionAttributeValues: expressionAttributeValues,
                    ReturnValues: 'ALL_NEW'
                };
                
                if (Object.keys(expressionAttributeNames).length > 0) {
                    updateParams.ExpressionAttributeNames = expressionAttributeNames;
                }
                
                const updateCommand = new UpdateCommand(updateParams);
                const updateResult = await dynamodb.send(updateCommand);
                
                result = { customer: updateResult.Attributes, message: 'Customer updated successfully' };
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
                    TableName: CUSTOMERS_TABLE,
                    Key: { customerId: customerId }
                };
                const deleteCheckCommand = new GetCommand(deleteCheckParams);
                const deleteCheckResult = await dynamodb.send(deleteCheckCommand);
                
                if (!deleteCheckResult.Item) {
                    return {
                        statusCode: 404,
                        headers,
                        body: JSON.stringify({ message: 'Customer not found' })
                    };
                }
                
                const deleteParams = {
                    TableName: CUSTOMERS_TABLE,
                    Key: { customerId: customerId }
                };
                const deleteCommand = new DeleteCommand(deleteParams);
                await dynamodb.send(deleteCommand);
                
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
    return `cust_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

async function createSampleCustomers() {
    const sampleCustomers = [
        {
            customerId: 'cust_1',
            name: 'John Smith',
            email: 'john.smith@email.com',
            phone: '555-0101',
            address: '123 Main St, Anytown, CA 90210',
            company: 'Tech Solutions Inc.',
            salesPersonId: 'sp_1',
            status: 'active',
            totalOrders: 5,
            totalValue: 2499.95,
            lastOrderDate: '2024-01-15T10:30:00Z',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            customerId: 'cust_2',
            name: 'Sarah Johnson',
            email: 'sarah.johnson@company.com',
            phone: '555-0102',
            address: '456 Business Ave, Corporate City, NY 10001',
            company: 'Business Corp',
            salesPersonId: 'sp_2',
            status: 'active',
            totalOrders: 3,
            totalValue: 1299.97,
            lastOrderDate: '2024-02-20T14:45:00Z',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            customerId: 'cust_3',
            name: 'Michael Brown',
            email: 'michael.brown@startup.io',
            phone: '555-0103',
            address: '789 Innovation Dr, Tech Valley, CA 94025',
            company: 'Startup Innovations',
            salesPersonId: 'sp_1',
            status: 'active',
            totalOrders: 8,
            totalValue: 4599.92,
            lastOrderDate: '2024-03-10T09:20:00Z',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            customerId: 'cust_4',
            name: 'Emily Davis',
            email: 'emily.davis@freelance.com',
            phone: '555-0104',
            address: '321 Creative St, Art District, TX 75201',
            company: 'Freelance Design Studio',
            salesPersonId: 'sp_3',
            status: 'active',
            totalOrders: 2,
            totalValue: 849.98,
            lastOrderDate: '2024-01-25T16:15:00Z',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        },
        {
            customerId: 'cust_5',
            name: 'David Wilson',
            email: 'david.wilson@enterprise.com',
            phone: '555-0105',
            address: '654 Enterprise Blvd, Business Park, FL 33101',
            company: 'Enterprise Solutions',
            salesPersonId: 'sp_2',
            status: 'active',
            totalOrders: 12,
            totalValue: 8799.88,
            lastOrderDate: '2024-03-05T11:30:00Z',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
    ];
    
    for (const customer of sampleCustomers) {
        const params = {
            TableName: CUSTOMERS_TABLE,
            Item: customer
        };
        
        try {
            const putCommand = new PutCommand(params);
            await dynamodb.send(putCommand);
            console.log('Created sample customer:', customer.name);
        } catch (error) {
            console.error('Error creating sample customer:', error);
        }
    }
}
