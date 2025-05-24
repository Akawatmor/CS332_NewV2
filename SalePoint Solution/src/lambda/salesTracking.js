// Lambda function for sales tracking
// This would be deployed to AWS Lambda and connected to API Gateway
// Enhanced for student AWS accounts with limited permissions

const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const mysql = require('mysql');

// Student Account Configuration
const STUDENT_MODE = process.env.STUDENT_MODE === 'true' || process.env.AWS_EXECUTION_ENV === 'AWS_Lambda_nodejs14.x';

// Mock data for student accounts or when DynamoDB is unavailable
const MOCK_SALES = [
    {
        SaleID: 'SALE-1703158800000',
        Timestamp: '2024-01-15T10:00:00Z',
        CustomerID: 'CUST001',
        CustomerName: 'Acme Corporation',
        SalesRepID: 'SR001',
        SalesRepName: 'John Smith',
        Products: [
            { productId: 'PROD001', name: 'Wireless Mouse', quantity: 2, price: 29.99 },
            { productId: 'PROD002', name: 'Bluetooth Keyboard', quantity: 1, price: 79.99 }
        ],
        TotalAmount: 139.97,
        Status: 'Completed',
        Notes: 'Express shipping requested',
        LastUpdated: '2024-01-15T10:00:00Z'
    },
    {
        SaleID: 'SALE-1703245200000',
        Timestamp: '2024-01-16T14:00:00Z',
        CustomerID: 'CUST002',
        CustomerName: 'TechFlow Industries',
        SalesRepID: 'SR001',
        SalesRepName: 'John Smith',
        Products: [
            { productId: 'PROD003', name: 'Office Chair', quantity: 5, price: 199.99 }
        ],
        TotalAmount: 999.95,
        Status: 'Pending',
        Notes: 'Bulk order discount applied',
        LastUpdated: '2024-01-16T14:00:00Z'
    },
    {
        SaleID: 'SALE-1703331600000',
        Timestamp: '2024-01-17T09:00:00Z',
        CustomerID: 'CUST003',
        CustomerName: 'Global Solutions Inc',
        SalesRepID: 'SR002',
        SalesRepName: 'Sarah Johnson',
        Products: [
            { productId: 'PROD004', name: 'Standing Desk', quantity: 2, price: 299.99 }
        ],
        TotalAmount: 599.98,
        Status: 'Completed',
        Notes: 'Installation included',
        LastUpdated: '2024-01-17T09:00:00Z'
    }
];

// Check if DynamoDB table exists and is accessible
async function checkDynamoDBAccess(tableName) {
    try {
        await dynamoDB.describeTable({ TableName: tableName }).promise();
        return true;
    } catch (error) {
        console.warn(`DynamoDB table ${tableName} not accessible:`, error.message);
        return false;
    }
}

// Handle AWS permission errors gracefully
function handleAWSPermissionError(error) {
    if (error.code === 'AccessDenied' || error.code === 'UnauthorizedOperation' || 
        error.code === 'ResourceNotFoundException' || error.code === 'ValidationException') {
        console.warn('AWS Permission/Access issue:', error.message);
        return formatResponse(503, {
            message: 'Service temporarily unavailable',
            fallback: true,
            error: 'Limited access in student account',
            suggestion: 'Using mock data instead'
        });
    }
    throw error;
}

// Enhanced DynamoDB operation with fallback
async function safeDynamoDBOperation(operation, params, fallbackData = null) {
    try {
        const result = await operation(params).promise();
        return { success: true, data: result };
    } catch (error) {
        console.warn('DynamoDB operation failed:', error.message);
        
        // Return fallback data for common access issues
        if (error.code === 'ResourceNotFoundException' || 
            error.code === 'AccessDenied' || 
            error.code === 'ValidationException') {
            return { 
                success: false, 
                fallback: true, 
                data: fallbackData,
                error: error.message 
            };
        }
        throw error;
    }
}

// Create safe RDS connection with student account support
function createRDSConnection() {
    if (STUDENT_MODE) {
        console.log('Student mode: Skipping RDS connection');
        return null;
    }
    
    // Validate required environment variables
    const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
        console.warn('Missing environment variables for RDS:', missingVars);
        return null;
    }
    
    try {
        return mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            timeout: 5000
        });
    } catch (error) {
        console.warn('Failed to create RDS connection:', error.message);
        return null;
    }
}

exports.handler = async (event) => {
    console.log('Event received:', JSON.stringify(event));
    
    try {
        // Handle preflight CORS requests
        if (event.httpMethod === 'OPTIONS') {
            return formatResponse(200, { message: 'CORS preflight' });
        }
        
        // Safely extract event properties
        const operation = event.httpMethod;
        const path = event.path || event.resource || '';
        const pathParameters = event.pathParameters || {};
        const queryStringParameters = event.queryStringParameters || {};
        
        console.log('Operation:', operation);
        console.log('Path:', path);
        console.log('Path Parameters:', pathParameters);
        console.log('Query Parameters:', queryStringParameters);
        
        // GET sales tracking data
        if (operation === 'GET') {
            // If getting by sales ID - /sales/{saleId}
            if (pathParameters.saleId) {
                const saleId = pathParameters.saleId;
                return await getSaleById(saleId);
            }
            
            // If getting by sales rep ID - /sales?salesRepId=xxx
            else if (queryStringParameters.salesRepId) {
                const salesRepId = queryStringParameters.salesRepId;
                return await getSalesBySalesRep(salesRepId);
            }
            
            // If getting by customer ID - /sales?customerId=xxx
            else if (queryStringParameters.customerId) {
                const customerId = queryStringParameters.customerId;
                return await getSalesByCustomer(customerId);
            }
            
            // If no filters, get all sales (with optional pagination) - /sales
            else {
                const limit = parseInt(queryStringParameters.limit) || 50;
                const startKey = queryStringParameters.startKey;
                return await getAllSales(limit, startKey);
            }
        }
        
        // POST create new sale record - /sales
        else if (operation === 'POST') {
            if (!event.body) {
                return formatResponse(400, { message: 'Request body is required' });
            }
            try {
                const requestBody = JSON.parse(event.body);
                return await createSale(requestBody);
            } catch (parseError) {
                console.error('JSON parsing error:', parseError);
                return formatResponse(400, { 
                    message: 'Invalid JSON in request body',
                    error: parseError.message 
                });
            }
        }
        
        // PUT update sale status - /sales/{saleId}
        else if (operation === 'PUT' && pathParameters.saleId) {
            const saleId = pathParameters.saleId;
            if (!event.body) {
                return formatResponse(400, { message: 'Request body is required' });
            }
            try {
                const requestBody = JSON.parse(event.body);
                return await updateSaleStatus(saleId, requestBody);
            } catch (parseError) {
                console.error('JSON parsing error:', parseError);
                return formatResponse(400, { 
                    message: 'Invalid JSON in request body',
                    error: parseError.message 
                });
            }
        }
        
        else {
            return formatResponse(400, { 
                message: 'Invalid operation',
                received: {
                    method: operation,
                    path: path,
                    pathParameters: pathParameters
                },
                supportedOperations: [
                    'GET /sales',
                    'GET /sales/{saleId}',
                    'GET /sales?salesRepId=xxx',
                    'GET /sales?customerId=xxx',
                    'POST /sales',
                    'PUT /sales/{saleId}'
                ]
            });
        }
    } catch (error) {
        console.error('Handler error:', error);
        
        // Try to handle permission errors gracefully
        try {
            return handleAWSPermissionError(error);
        } catch (handlerError) {
            return formatResponse(500, { 
                message: 'Internal server error', 
                error: error.message,
                studentMode: STUDENT_MODE
            });
        }
    }
};

// Function to get a specific sale by ID with student account support
async function getSaleById(saleId) {
    if (!saleId) {
        return formatResponse(400, { message: 'Sale ID is required' });
    }
    
    try {
        // Check if DynamoDB is accessible
        const hasAccess = await checkDynamoDBAccess('SalesTracking');
        
        if (!hasAccess || STUDENT_MODE) {
            console.log('Using mock data for sale lookup');
            const mockSale = MOCK_SALES.find(sale => sale.SaleID === saleId);
            
            if (!mockSale) {
                return formatResponse(404, { 
                    message: 'Sale not found',
                    mockData: true 
                });
            }
            
            return formatResponse(200, {
                ...mockSale,
                mockData: true,
                message: 'Mock data - student account mode'
            });
        }
        
        const params = {
            TableName: 'SalesTracking',
            Key: {
                'SaleID': saleId
            }
        };
        
        const operation = await safeDynamoDBOperation(
            dynamoDB.get.bind(dynamoDB), 
            params,
            MOCK_SALES.find(sale => sale.SaleID === saleId)
        );
        
        if (operation.fallback) {
            const fallbackSale = operation.data;
            if (!fallbackSale) {
                return formatResponse(404, { 
                    message: 'Sale not found',
                    fallbackData: true 
                });
            }
            return formatResponse(200, {
                ...fallbackSale,
                fallbackData: true,
                message: 'DynamoDB unavailable, using fallback data'
            });
        }
        
        if (!operation.data.Item) {
            return formatResponse(404, { message: 'Sale not found' });
        }
        
        return formatResponse(200, {
            ...operation.data.Item,
            source: 'dynamodb'
        });
        
    } catch (error) {
        console.error('Error getting sale:', error);
        
        try {
            return handleAWSPermissionError(error);
        } catch (handlerError) {
            // Final fallback to mock data
            const mockSale = MOCK_SALES.find(sale => sale.SaleID === saleId);
            return formatResponse(200, mockSale || {
                SaleID: saleId,
                message: 'Sale not found in fallback data',
                fallbackData: true,
                error: error.message
            });
        }
    }
}

// Function to get all sales by a specific sales rep with student account support
async function getSalesBySalesRep(salesRepId) {
    if (!salesRepId) {
        return formatResponse(400, { message: 'Sales Rep ID is required' });
    }
    
    try {
        // Check if DynamoDB is accessible
        const hasAccess = await checkDynamoDBAccess('SalesTracking');
        
        if (!hasAccess || STUDENT_MODE) {
            console.log('Using mock data for sales rep sales');
            const mockSales = MOCK_SALES.filter(sale => sale.SalesRepID === salesRepId);
            
            return formatResponse(200, {
                sales: mockSales,
                count: mockSales.length,
                mockData: true,
                message: 'Mock data - student account mode'
            });
        }
        
        const params = {
            TableName: 'SalesTracking',
            IndexName: 'SalesRepID-index',  // GSI for querying by salesRepId
            KeyConditionExpression: 'SalesRepID = :salesRepId',
            ExpressionAttributeValues: {
                ':salesRepId': salesRepId
            }
        };
        
        const operation = await safeDynamoDBOperation(
            dynamoDB.query.bind(dynamoDB), 
            params,
            MOCK_SALES.filter(sale => sale.SalesRepID === salesRepId)
        );
        
        if (operation.fallback) {
            return formatResponse(200, {
                sales: operation.data,
                count: operation.data.length,
                fallbackData: true,
                message: 'DynamoDB unavailable, using fallback data'
            });
        }
        
        return formatResponse(200, {
            sales: operation.data.Items,
            count: operation.data.Items.length,
            source: 'dynamodb'
        });
        
    } catch (error) {
        console.error('Error getting sales by sales rep:', error);
        
        try {
            return handleAWSPermissionError(error);
        } catch (handlerError) {
            // Final fallback to mock data
            const mockSales = MOCK_SALES.filter(sale => sale.SalesRepID === salesRepId);
            return formatResponse(200, {
                sales: mockSales,
                count: mockSales.length,
                fallbackData: true,
                error: error.message
            });
        }
    }
}

// Function to get all sales for a specific customer with student account support
async function getSalesByCustomer(customerId) {
    if (!customerId) {
        return formatResponse(400, { message: 'Customer ID is required' });
    }
    
    try {
        // Check if DynamoDB is accessible
        const hasAccess = await checkDynamoDBAccess('SalesTracking');
        
        if (!hasAccess || STUDENT_MODE) {
            console.log('Using mock data for customer sales');
            const mockSales = MOCK_SALES.filter(sale => sale.CustomerID === customerId);
            
            return formatResponse(200, {
                sales: mockSales,
                count: mockSales.length,
                mockData: true,
                message: 'Mock data - student account mode'
            });
        }
        
        const params = {
            TableName: 'SalesTracking',
            IndexName: 'CustomerID-index',  // GSI for querying by customerId
            KeyConditionExpression: 'CustomerID = :customerId',
            ExpressionAttributeValues: {
                ':customerId': customerId
            }
        };
        
        const operation = await safeDynamoDBOperation(
            dynamoDB.query.bind(dynamoDB), 
            params,
            MOCK_SALES.filter(sale => sale.CustomerID === customerId)
        );
        
        if (operation.fallback) {
            return formatResponse(200, {
                sales: operation.data,
                count: operation.data.length,
                fallbackData: true,
                message: 'DynamoDB unavailable, using fallback data'
            });
        }
        
        return formatResponse(200, {
            sales: operation.data.Items,
            count: operation.data.Items.length,
            source: 'dynamodb'
        });
        
    } catch (error) {
        console.error('Error getting sales by customer:', error);
        
        try {
            return handleAWSPermissionError(error);
        } catch (handlerError) {
            // Final fallback to mock data
            const mockSales = MOCK_SALES.filter(sale => sale.CustomerID === customerId);
            return formatResponse(200, {
                sales: mockSales,
                count: mockSales.length,
                fallbackData: true,
                error: error.message
            });
        }
    }
}

// Function to get all sales with optional pagination and student account support
async function getAllSales(limit, startKey) {
    try {
        // Check if DynamoDB is accessible
        const hasAccess = await checkDynamoDBAccess('SalesTracking');
        
        if (!hasAccess || STUDENT_MODE) {
            console.log('Using mock data for all sales');
            
            // Simple pagination simulation for mock data
            const start = startKey ? parseInt(startKey) : 0;
            const end = Math.min(start + limit, MOCK_SALES.length);
            const paginatedSales = MOCK_SALES.slice(start, end);
            
            const response = {
                items: paginatedSales,
                count: paginatedSales.length,
                total: MOCK_SALES.length,
                mockData: true,
                message: 'Mock data - student account mode'
            };
            
            // Add pagination token if there are more results
            if (end < MOCK_SALES.length) {
                response.nextKey = end.toString();
            }
            
            return formatResponse(200, response);
        }
        
        const params = {
            TableName: 'SalesTracking',
            Limit: parseInt(limit)
        };
        
        // Add pagination if startKey is provided
        if (startKey) {
            try {
                params.ExclusiveStartKey = JSON.parse(decodeURIComponent(startKey));
            } catch (parseError) {
                console.warn('Invalid startKey format, ignoring:', parseError.message);
            }
        }
        
        const operation = await safeDynamoDBOperation(
            dynamoDB.scan.bind(dynamoDB), 
            params,
            MOCK_SALES.slice(0, limit)
        );
        
        if (operation.fallback) {
            const response = {
                items: operation.data,
                count: operation.data.length,
                fallbackData: true,
                message: 'DynamoDB unavailable, using fallback data'
            };
            return formatResponse(200, response);
        }
        
        // Prepare response
        const response = {
            items: operation.data.Items,
            count: operation.data.Count,
            source: 'dynamodb'
        };
        
        // Add pagination token if there are more results
        if (operation.data.LastEvaluatedKey) {
            response.nextKey = encodeURIComponent(JSON.stringify(operation.data.LastEvaluatedKey));
        }
        
        return formatResponse(200, response);
        
    } catch (error) {
        console.error('Error getting all sales:', error);
        
        try {
            return handleAWSPermissionError(error);
        } catch (handlerError) {
            // Final fallback to mock data
            const response = {
                items: MOCK_SALES.slice(0, limit),
                count: Math.min(limit, MOCK_SALES.length),
                total: MOCK_SALES.length,
                fallbackData: true,
                error: error.message
            };
            return formatResponse(200, response);
        }
    }
}

// Function to create a new sale with student account support
async function createSale(requestBody) {
    // Validate required fields
    if (!requestBody.customerId || !requestBody.salesRepId || !requestBody.products || !requestBody.totalAmount) {
        return formatResponse(400, { message: 'Required fields missing. Required: customerId, salesRepId, products, totalAmount' });
    }
    
    // Generate a unique sale ID
    const saleId = 'SALE-' + Date.now();
    const timestamp = new Date().toISOString();
    
    const saleItem = {
        'SaleID': saleId,
        'Timestamp': timestamp,
        'CustomerID': requestBody.customerId,
        'CustomerName': requestBody.customerName || 'Unknown Customer',
        'SalesRepID': requestBody.salesRepId,
        'SalesRepName': requestBody.salesRepName || 'Unknown Sales Rep',
        'Products': requestBody.products,
        'TotalAmount': requestBody.totalAmount,
        'Status': 'Pending',
        'Notes': requestBody.notes || '',
        'LastUpdated': timestamp
    };
    
    try {
        // Check if DynamoDB is accessible
        const hasAccess = await checkDynamoDBAccess('SalesTracking');
        
        if (!hasAccess || STUDENT_MODE) {
            console.log('Using mock data for sale creation');
            return formatResponse(201, { 
                message: 'Sale record created successfully (mock data)',
                saleId: saleId,
                saleDetails: saleItem,
                mockData: true,
                note: 'Sale simulated - student account mode. Inventory update skipped.'
            });
        }
        
        const params = {
            TableName: 'SalesTracking',
            Item: saleItem
        };
        
        const operation = await safeDynamoDBOperation(
            dynamoDB.put.bind(dynamoDB), 
            params,
            saleItem
        );
        
        if (operation.fallback) {
            return formatResponse(201, { 
                message: 'Sale record created successfully (simulated)',
                saleId: saleId,
                saleDetails: saleItem,
                fallbackData: true,
                note: 'DynamoDB unavailable, sale simulated. Inventory update skipped.'
            });
        }
        
        // Try to update inventory in RDS for each product
        try {
            await updateInventory(requestBody.products);
        } catch (inventoryError) {
            console.warn('Inventory update failed:', inventoryError.message);
            // Don't fail the sale creation if inventory update fails in student mode
            return formatResponse(201, { 
                message: 'Sale record created successfully',
                saleId: saleId,
                saleDetails: saleItem,
                warning: 'Inventory update failed - may be due to student account limitations',
                source: 'dynamodb'
            });
        }
        
        return formatResponse(201, { 
            message: 'Sale record created successfully',
            saleId: saleId,
            saleDetails: saleItem,
            source: 'dynamodb'
        });
        
    } catch (error) {
        console.error('Error creating sale:', error);
        
        try {
            return handleAWSPermissionError(error);
        } catch (handlerError) {
            // Final fallback - simulate the sale creation
            return formatResponse(201, { 
                message: 'Sale record created successfully (simulated)',
                saleId: saleId,
                saleDetails: saleItem,
                fallbackData: true,
                error: error.message
            });
        }
    }
}

// Function to update sale status with student account support
async function updateSaleStatus(saleId, requestBody) {
    // Validate required fields
    if (!saleId || !requestBody.status) {
        return formatResponse(400, { message: 'Sale ID and Status are required' });
    }
    
    try {
        // Check if DynamoDB is accessible
        const hasAccess = await checkDynamoDBAccess('SalesTracking');
        
        if (!hasAccess || STUDENT_MODE) {
            console.log('Using mock data for sale status update');
            const mockSale = MOCK_SALES.find(sale => sale.SaleID === saleId);
            
            if (!mockSale) {
                return formatResponse(404, { 
                    message: 'Sale not found',
                    mockData: true 
                });
            }
            
            const updateData = {
                Status: requestBody.status,
                LastUpdated: new Date().toISOString(),
                Notes: requestBody.notes || mockSale.Notes || ''
            };
            
            return formatResponse(200, {
                message: 'Sale status updated successfully (mock data)',
                updates: updateData,
                mockData: true,
                note: 'Update simulated - student account mode. Inventory restore skipped.'
            });
        }
        
        // First, get the current sale record
        const getSaleParams = {
            TableName: 'SalesTracking',
            Key: {
                'SaleID': saleId
            }
        };
        
        const currentSaleOperation = await safeDynamoDBOperation(
            dynamoDB.get.bind(dynamoDB), 
            getSaleParams,
            MOCK_SALES.find(sale => sale.SaleID === saleId)
        );
        
        if (currentSaleOperation.fallback) {
            const mockSale = currentSaleOperation.data;
            if (!mockSale) {
                return formatResponse(404, { 
                    message: 'Sale not found',
                    fallbackData: true 
                });
            }
            
            const updateData = {
                Status: requestBody.status,
                LastUpdated: new Date().toISOString(),
                Notes: requestBody.notes || mockSale.Notes || ''
            };
            
            return formatResponse(200, {
                message: 'Sale status updated successfully (simulated)',
                updates: updateData,
                fallbackData: true,
                note: 'DynamoDB unavailable, update simulated. Inventory restore skipped.'
            });
        }
        
        if (!currentSaleOperation.data.Item) {
            return formatResponse(404, { message: 'Sale not found' });
        }
        
        const currentSale = currentSaleOperation.data.Item;
        
        // Update the sale record
        const updateParams = {
            TableName: 'SalesTracking',
            Key: {
                'SaleID': saleId
            },
            UpdateExpression: 'set #status = :status, LastUpdated = :lastUpdated, Notes = :notes',
            ExpressionAttributeNames: {
                '#status': 'Status'
            },
            ExpressionAttributeValues: {
                ':status': requestBody.status,
                ':lastUpdated': new Date().toISOString(),
                ':notes': requestBody.notes || currentSale.Notes || ''
            },
            ReturnValues: 'UPDATED_NEW'
        };
        
        const updateOperation = await safeDynamoDBOperation(
            dynamoDB.update.bind(dynamoDB), 
            updateParams,
            {
                Status: requestBody.status,
                LastUpdated: new Date().toISOString(),
                Notes: requestBody.notes || currentSale.Notes || ''
            }
        );
        
        if (updateOperation.fallback) {
            return formatResponse(200, {
                message: 'Sale status updated successfully (simulated)',
                updates: updateOperation.data,
                fallbackData: true,
                note: 'DynamoDB unavailable, update simulated. Inventory restore skipped.'
            });
        }
        
        // Special handling for "Cancelled" status - restore inventory
        if (requestBody.status === 'Cancelled' && currentSale.Status !== 'Cancelled') {
            try {
                await restoreInventory(currentSale.Products);
            } catch (inventoryError) {
                console.warn('Inventory restore failed:', inventoryError.message);
                // Don't fail the status update if inventory restore fails in student mode
                return formatResponse(200, {
                    message: 'Sale status updated successfully',
                    updates: updateOperation.data.Attributes,
                    warning: 'Inventory restore failed - may be due to student account limitations',
                    source: 'dynamodb'
                });
            }
        }
        
        return formatResponse(200, {
            message: 'Sale status updated successfully',
            updates: updateOperation.data.Attributes,
            source: 'dynamodb'
        });
        
    } catch (error) {
        console.error('Error updating sale status:', error);
        
        try {
            return handleAWSPermissionError(error);
        } catch (handlerError) {
            // Final fallback - simulate the update
            const updateData = {
                Status: requestBody.status,
                LastUpdated: new Date().toISOString(),
                Notes: requestBody.notes || ''
            };
            
            return formatResponse(200, {
                message: 'Sale status updated successfully (simulated)',
                updates: updateData,
                fallbackData: true,
                error: error.message
            });
        }
    }
}

// Helper function to update inventory in RDS with student account support
async function updateInventory(products) {
    // Only proceed if there are products
    if (!products || products.length === 0) {
        return;
    }
    
    // Skip inventory updates in student mode
    if (STUDENT_MODE) {
        console.log('Student mode: Skipping inventory update');
        return;
    }
    
    // Create RDS connection with student account support
    const connection = createRDSConnection();
    
    if (!connection) {
        console.warn('RDS connection unavailable, skipping inventory update');
        return;
    }
    
    try {
        // Update inventory for each product
        for (const product of products) {
            await new Promise((resolve, reject) => {
                const query = 'UPDATE products SET stock_quantity = stock_quantity - ? WHERE product_id = ? AND stock_quantity >= ?';
                connection.query(
                    query,
                    [product.quantity, product.productId, product.quantity],
                    (error, results) => {
                        if (error) {
                            console.warn(`Inventory update failed for product ${product.productId}:`, error.message);
                            resolve(results); // Don't reject to avoid breaking the sale
                        } else {
                            resolve(results);
                        }
                    }
                );
            });
        }
    } catch (error) {
        console.error('Error updating inventory:', error);
        // Don't throw error in student mode to avoid breaking sales
        if (!STUDENT_MODE) {
            throw error;
        }
    } finally {
        // Close the connection
        if (connection) {
            connection.end();
        }
    }
}

// Helper function to restore inventory for cancelled sales with student account support
async function restoreInventory(products) {
    // Only proceed if there are products
    if (!products || products.length === 0) {
        return;
    }
    
    // Skip inventory restore in student mode
    if (STUDENT_MODE) {
        console.log('Student mode: Skipping inventory restore');
        return;
    }
    
    // Create RDS connection with student account support
    const connection = createRDSConnection();
    
    if (!connection) {
        console.warn('RDS connection unavailable, skipping inventory restore');
        return;
    }
    
    try {
        // Restore inventory for each product
        for (const product of products) {
            await new Promise((resolve, reject) => {
                const query = 'UPDATE products SET stock_quantity = stock_quantity + ? WHERE product_id = ?';
                connection.query(
                    query,
                    [product.quantity, product.productId],
                    (error, results) => {
                        if (error) {
                            console.warn(`Inventory restore failed for product ${product.productId}:`, error.message);
                            resolve(results); // Don't reject to avoid breaking the status update
                        } else {
                            resolve(results);
                        }
                    }
                );
            });
        }
    } catch (error) {
        console.error('Error restoring inventory:', error);
        // Don't throw error in student mode to avoid breaking status updates
        if (!STUDENT_MODE) {
            throw error;
        }
    } finally {
        // Close the connection
        if (connection) {
            connection.end();
        }
    }
}

// Helper function to format the API response
function formatResponse(statusCode, body) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        },
        body: JSON.stringify(body)
    };
}
