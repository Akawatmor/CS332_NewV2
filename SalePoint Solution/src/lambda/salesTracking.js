// Lambda function for sales tracking
// This would be deployed to AWS Lambda and connected to API Gateway

const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const mysql = require('mysql');

exports.handler = async (event) => {
    console.log('Event received:', JSON.stringify(event));
    
    // Determine operation based on HTTP method and path
    const operation = event.httpMethod;
    const path = event.path || '';
    
    try {
        // GET sales tracking data
        if (operation === 'GET') {
            // If getting by sales ID
            if (event.pathParameters && event.pathParameters.saleId) {
                const saleId = event.pathParameters.saleId;
                return await getSaleById(saleId);
            }
            
            // If getting by sales rep ID
            else if (event.queryStringParameters && event.queryStringParameters.salesRepId) {
                const salesRepId = event.queryStringParameters.salesRepId;
                return await getSalesBySalesRep(salesRepId);
            }
            
            // If getting by customer ID
            else if (event.queryStringParameters && event.queryStringParameters.customerId) {
                const customerId = event.queryStringParameters.customerId;
                return await getSalesByCustomer(customerId);
            }
            
            // If no filters, get all sales (with optional pagination)
            else {
                const limit = event.queryStringParameters?.limit || 50;
                const startKey = event.queryStringParameters?.startKey;
                return await getAllSales(limit, startKey);
            }
        }
        
        // POST create new sale record
        else if (operation === 'POST') {
            const requestBody = JSON.parse(event.body);
            return await createSale(requestBody);
        }
        
        // PUT update sale status
        else if (operation === 'PUT' && path.includes('/sales/')) {
            const saleId = event.pathParameters.saleId;
            const requestBody = JSON.parse(event.body);
            return await updateSaleStatus(saleId, requestBody);
        }
        
        else {
            return formatResponse(400, { message: 'Invalid operation' });
        }
    } catch (error) {
        console.error('Error:', error);
        return formatResponse(500, { message: 'Error processing request', error: error.message });
    }
};

// Function to get a specific sale by ID
async function getSaleById(saleId) {
    if (!saleId) {
        return formatResponse(400, { message: 'Sale ID is required' });
    }
    
    const params = {
        TableName: 'SalesTracking',
        Key: {
            'SaleID': saleId
        }
    };
    
    try {
        const result = await dynamoDB.get(params).promise();
        
        if (!result.Item) {
            return formatResponse(404, { message: 'Sale not found' });
        }
        
        return formatResponse(200, result.Item);
    } catch (error) {
        console.error('Error getting sale:', error);
        throw error;
    }
}

// Function to get all sales by a specific sales rep
async function getSalesBySalesRep(salesRepId) {
    if (!salesRepId) {
        return formatResponse(400, { message: 'Sales Rep ID is required' });
    }
    
    const params = {
        TableName: 'SalesTracking',
        IndexName: 'SalesRepID-index',  // GSI for querying by salesRepId
        KeyConditionExpression: 'SalesRepID = :salesRepId',
        ExpressionAttributeValues: {
            ':salesRepId': salesRepId
        }
    };
    
    try {
        const result = await dynamoDB.query(params).promise();
        return formatResponse(200, result.Items);
    } catch (error) {
        console.error('Error getting sales by sales rep:', error);
        throw error;
    }
}

// Function to get all sales for a specific customer
async function getSalesByCustomer(customerId) {
    if (!customerId) {
        return formatResponse(400, { message: 'Customer ID is required' });
    }
    
    const params = {
        TableName: 'SalesTracking',
        IndexName: 'CustomerID-index',  // GSI for querying by customerId
        KeyConditionExpression: 'CustomerID = :customerId',
        ExpressionAttributeValues: {
            ':customerId': customerId
        }
    };
    
    try {
        const result = await dynamoDB.query(params).promise();
        return formatResponse(200, result.Items);
    } catch (error) {
        console.error('Error getting sales by customer:', error);
        throw error;
    }
}

// Function to get all sales with optional pagination
async function getAllSales(limit, startKey) {
    const params = {
        TableName: 'SalesTracking',
        Limit: parseInt(limit)
    };
    
    // Add pagination if startKey is provided
    if (startKey) {
        params.ExclusiveStartKey = JSON.parse(decodeURIComponent(startKey));
    }
    
    try {
        const result = await dynamoDB.scan(params).promise();
        
        // Prepare response
        const response = {
            items: result.Items,
            count: result.Count
        };
        
        // Add pagination token if there are more results
        if (result.LastEvaluatedKey) {
            response.nextKey = encodeURIComponent(JSON.stringify(result.LastEvaluatedKey));
        }
        
        return formatResponse(200, response);
    } catch (error) {
        console.error('Error getting all sales:', error);
        throw error;
    }
}

// Function to create a new sale
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
    
    const params = {
        TableName: 'SalesTracking',
        Item: saleItem
    };
    
    try {
        // Save the sale record to DynamoDB
        await dynamoDB.put(params).promise();
        
        // Update inventory in RDS for each product
        await updateInventory(requestBody.products);
        
        return formatResponse(201, { 
            message: 'Sale record created successfully',
            saleId: saleId,
            saleDetails: saleItem
        });
    } catch (error) {
        console.error('Error creating sale:', error);
        throw error;
    }
}

// Function to update sale status
async function updateSaleStatus(saleId, requestBody) {
    // Validate required fields
    if (!saleId || !requestBody.status) {
        return formatResponse(400, { message: 'Sale ID and Status are required' });
    }
    
    // First, get the current sale record
    const getSaleParams = {
        TableName: 'SalesTracking',
        Key: {
            'SaleID': saleId
        }
    };
    
    try {
        const currentSale = await dynamoDB.get(getSaleParams).promise();
        
        if (!currentSale.Item) {
            return formatResponse(404, { message: 'Sale not found' });
        }
        
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
                ':notes': requestBody.notes || currentSale.Item.Notes || ''
            },
            ReturnValues: 'UPDATED_NEW'
        };
        
        const result = await dynamoDB.update(updateParams).promise();
        
        // Special handling for "Cancelled" status - restore inventory
        if (requestBody.status === 'Cancelled' && currentSale.Item.Status !== 'Cancelled') {
            // Restore inventory for cancelled sales
            await restoreInventory(currentSale.Item.Products);
        }
        
        return formatResponse(200, {
            message: 'Sale status updated successfully',
            updates: result.Attributes
        });
    } catch (error) {
        console.error('Error updating sale status:', error);
        throw error;
    }
}

// Helper function to update inventory in RDS
async function updateInventory(products) {
    // Only proceed if there are products
    if (!products || products.length === 0) {
        return;
    }
    
    // Create RDS connection
    const connection = mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });
    
    try {
        // Update inventory for each product
        for (const product of products) {
            await new Promise((resolve, reject) => {
                const query = 'UPDATE products SET stock_quantity = stock_quantity - ? WHERE product_id = ? AND stock_quantity >= ?';
                connection.query(
                    query,
                    [product.quantity, product.productId, product.quantity],
                    (error, results) => {
                        if (error) reject(error);
                        else resolve(results);
                    }
                );
            });
        }
    } catch (error) {
        console.error('Error updating inventory:', error);
        throw error;
    } finally {
        // Close the connection
        connection.end();
    }
}

// Helper function to restore inventory for cancelled sales
async function restoreInventory(products) {
    // Only proceed if there are products
    if (!products || products.length === 0) {
        return;
    }
    
    // Create RDS connection
    const connection = mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });
    
    try {
        // Restore inventory for each product
        for (const product of products) {
            await new Promise((resolve, reject) => {
                const query = 'UPDATE products SET stock_quantity = stock_quantity + ? WHERE product_id = ?';
                connection.query(
                    query,
                    [product.quantity, product.productId],
                    (error, results) => {
                        if (error) reject(error);
                        else resolve(results);
                    }
                );
            });
        }
    } catch (error) {
        console.error('Error restoring inventory:', error);
        throw error;
    } finally {
        // Close the connection
        connection.end();
    }
}

// Helper function to format the API response
function formatResponse(statusCode, body) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*' // Enable CORS for all origins
        },
        body: JSON.stringify(body)
    };
}
