const mysql = require('mysql2/promise');
const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB.DocumentClient();

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
            body: JSON.stringify({ message: 'CORS preflight successful' })
        };
    }
    
    try {
        // Database connection
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: 3306,
            connectTimeout: 10000,
            acquireTimeout: 10000
        });
        
        const method = event.httpMethod;
        const pathParameters = event.pathParameters || {};
        const queryStringParameters = event.queryStringParameters || {};
        const body = event.body ? JSON.parse(event.body) : {};
        
        let result;
        
        switch (method) {
            case 'GET':
                if (pathParameters.customerId) {
                    // Get customer's sales rep assignment
                    const [rows] = await connection.execute(`
                        SELECT c.customer_id, c.name as customer_name, c.company,
                               csr.sales_rep_id, sr.name as sales_rep_name, sr.email as sales_rep_email,
                               csr.assigned_date, csr.notes
                        FROM customers c
                        LEFT JOIN customer_sales_rep_assignments csr ON c.customer_id = csr.customer_id AND csr.is_active = TRUE
                        LEFT JOIN sales_representatives sr ON csr.sales_rep_id = sr.sales_rep_id
                        WHERE c.customer_id = ?
                    `, [pathParameters.customerId]);
                    
                    if (rows.length === 0) {
                        await connection.end();
                        return {
                            statusCode: 404,
                            headers,
                            body: JSON.stringify({ message: 'Customer not found' })
                        };
                    }
                    
                    result = rows[0];
                    
                    // Also get tracking data from DynamoDB
                    try {
                        const dynamoParams = {
                            TableName: 'CustomerSalesRepTracking',
                            Key: {
                                CustomerID: pathParameters.customerId,
                                SalesRepID: result.sales_rep_id || 'UNASSIGNED'
                            }
                        };
                        
                        const dynamoResult = await dynamodb.get(dynamoParams).promise();
                        if (dynamoResult.Item) {
                            result.tracking_data = dynamoResult.Item;
                        }
                    } catch (dynamoError) {
                        console.warn('DynamoDB error (non-critical):', dynamoError);
                        result.tracking_data = null;
                    }
                } else {
                    // Get all customer-sales rep assignments
                    const [rows] = await connection.execute(`
                        SELECT c.customer_id, c.name as customer_name, c.company, c.city, c.state,
                               csr.sales_rep_id, sr.name as sales_rep_name, sr.territory,
                               csr.assigned_date
                        FROM customers c
                        LEFT JOIN customer_sales_rep_assignments csr ON c.customer_id = csr.customer_id AND csr.is_active = TRUE
                        LEFT JOIN sales_representatives sr ON csr.sales_rep_id = sr.sales_rep_id
                        ORDER BY c.name
                    `);
                    
                    result = { assignments: rows, count: rows.length };
                }
                break;
                
            case 'POST':
                // Assign sales rep to customer
                const { customer_id, sales_rep_id, notes } = body;
                
                if (!customer_id || !sales_rep_id) {
                    await connection.end();
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ 
                            message: 'Missing required fields: customer_id, sales_rep_id' 
                        })
                    };
                }
                
                // Verify customer exists
                const [customerCheck] = await connection.execute(
                    'SELECT customer_id FROM customers WHERE customer_id = ?',
                    [customer_id]
                );
                
                if (customerCheck.length === 0) {
                    await connection.end();
                    return {
                        statusCode: 404,
                        headers,
                        body: JSON.stringify({ message: 'Customer not found' })
                    };
                }
                
                // Verify sales rep exists
                const [salesRepCheck] = await connection.execute(
                    'SELECT sales_rep_id FROM sales_representatives WHERE sales_rep_id = ? AND active = TRUE',
                    [sales_rep_id]
                );
                
                if (salesRepCheck.length === 0) {
                    await connection.end();
                    return {
                        statusCode: 404,
                        headers,
                        body: JSON.stringify({ message: 'Sales representative not found or inactive' })
                    };
                }
                
                // Start transaction
                await connection.beginTransaction();
                
                try {
                    // Deactivate any existing assignment
                    await connection.execute(
                        'UPDATE customer_sales_rep_assignments SET is_active = FALSE WHERE customer_id = ? AND is_active = TRUE',
                        [customer_id]
                    );
                    
                    // Create new assignment
                    await connection.execute(`
                        INSERT INTO customer_sales_rep_assignments 
                        (customer_id, sales_rep_id, notes) 
                        VALUES (?, ?, ?)
                    `, [customer_id, sales_rep_id, notes || '']);
                    
                    await connection.commit();
                    
                    // Update DynamoDB tracking
                    try {
                        const dynamoParams = {
                            TableName: 'CustomerSalesRepTracking',
                            Item: {
                                CustomerID: customer_id,
                                SalesRepID: sales_rep_id,
                                AssignedDate: new Date().toISOString(),
                                LastUpdated: new Date().toISOString(),
                                Notes: notes || '',
                                Status: 'Active'
                            }
                        };
                        
                        await dynamodb.put(dynamoParams).promise();
                    } catch (dynamoError) {
                        console.warn('DynamoDB update failed (non-critical):', dynamoError);
                    }
                    
                    result = { message: 'Sales rep assigned successfully' };
                } catch (transactionError) {
                    await connection.rollback();
                    throw transactionError;
                }
                break;
                
            case 'PUT':
                // Update assignment
                if (!pathParameters.customerId) {
                    await connection.end();
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ message: 'Customer ID required' })
                    };
                }
                
                const { new_sales_rep_id, update_notes } = body;
                
                if (!new_sales_rep_id) {
                    await connection.end();
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ message: 'new_sales_rep_id is required' })
                    };
                }
                
                // Verify new sales rep exists
                const [newSalesRepCheck] = await connection.execute(
                    'SELECT sales_rep_id FROM sales_representatives WHERE sales_rep_id = ? AND active = TRUE',
                    [new_sales_rep_id]
                );
                
                if (newSalesRepCheck.length === 0) {
                    await connection.end();
                    return {
                        statusCode: 404,
                        headers,
                        body: JSON.stringify({ message: 'Sales representative not found or inactive' })
                    };
                }
                
                // Start transaction
                await connection.beginTransaction();
                
                try {
                    // Deactivate current assignment
                    await connection.execute(
                        'UPDATE customer_sales_rep_assignments SET is_active = FALSE WHERE customer_id = ? AND is_active = TRUE',
                        [pathParameters.customerId]
                    );
                    
                    // Create new assignment
                    await connection.execute(`
                        INSERT INTO customer_sales_rep_assignments 
                        (customer_id, sales_rep_id, notes) 
                        VALUES (?, ?, ?)
                    `, [pathParameters.customerId, new_sales_rep_id, update_notes || 'Updated assignment']);
                    
                    await connection.commit();
                    
                    // Update DynamoDB tracking
                    try {
                        const dynamoParams = {
                            TableName: 'CustomerSalesRepTracking',
                            Item: {
                                CustomerID: pathParameters.customerId,
                                SalesRepID: new_sales_rep_id,
                                AssignedDate: new Date().toISOString(),
                                LastUpdated: new Date().toISOString(),
                                Notes: update_notes || 'Updated assignment',
                                Status: 'Active'
                            }
                        };
                        
                        await dynamodb.put(dynamoParams).promise();
                    } catch (dynamoError) {
                        console.warn('DynamoDB update failed (non-critical):', dynamoError);
                    }
                    
                    result = { message: 'Sales rep assignment updated successfully' };
                } catch (transactionError) {
                    await connection.rollback();
                    throw transactionError;
                }
                break;
                
            case 'DELETE':
                // Remove assignment
                if (!pathParameters.customerId) {
                    await connection.end();
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ message: 'Customer ID required' })
                    };
                }
                
                const [updateResult] = await connection.execute(
                    'UPDATE customer_sales_rep_assignments SET is_active = FALSE WHERE customer_id = ? AND is_active = TRUE',
                    [pathParameters.customerId]
                );
                
                if (updateResult.affectedRows === 0) {
                    await connection.end();
                    return {
                        statusCode: 404,
                        headers,
                        body: JSON.stringify({ message: 'No active assignment found for this customer' })
                    };
                }
                
                // Update DynamoDB tracking
                try {
                    const dynamoParams = {
                        TableName: 'CustomerSalesRepTracking',
                        Key: {
                            CustomerID: pathParameters.customerId,
                            SalesRepID: 'UNASSIGNED'
                        },
                        UpdateExpression: 'SET #status = :status, LastUpdated = :lastUpdated',
                        ExpressionAttributeNames: {
                            '#status': 'Status'
                        },
                        ExpressionAttributeValues: {
                            ':status': 'Unassigned',
                            ':lastUpdated': new Date().toISOString()
                        }
                    };
                    
                    await dynamodb.update(dynamoParams).promise();
                } catch (dynamoError) {
                    console.warn('DynamoDB update failed (non-critical):', dynamoError);
                }
                
                result = { message: 'Sales rep assignment removed successfully' };
                break;
                
            default:
                await connection.end();
                return {
                    statusCode: 405,
                    headers,
                    body: JSON.stringify({ message: 'Method not allowed' })
                };
        }
        
        await connection.end();
        
        return {
            statusCode: method === 'POST' ? 201 : 200,
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
