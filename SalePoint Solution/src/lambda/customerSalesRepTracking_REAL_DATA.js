// Lambda function for customer-salesrep relationship tracking - REAL DATA ONLY
// This would be deployed to AWS Lambda and connected to API Gateway
// NO MOCK DATA - Uses only real database connections

const mysql = require('mysql2/promise');
const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    };
    
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: JSON.stringify({ message: 'CORS preflight successful' }) };
    }
    
    // Validate required environment variables
    const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                message: 'Database configuration missing',
                missingVariables: missingVars 
            })
        };
    }
    
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: 3306,
            connectTimeout: 60000
        });
        
        const method = event.httpMethod;
        const pathParameters = event.pathParameters || {};
        const queryStringParameters = event.queryStringParameters || {};
        const body = event.body ? JSON.parse(event.body) : {};
        const path = event.resource || event.path || '';
        
        let result;
        
        switch (method) {
            case 'GET':
                if (path.includes('/customers/{customerId}') || pathParameters.customerId) {
                    // Get specific customer
                    const [rows] = await connection.execute(
                        `SELECT c.*, sr.name as sales_rep_name, sr.email as sales_rep_email 
                         FROM customers c 
                         LEFT JOIN sales_reps sr ON c.assigned_sales_rep_id = sr.sales_rep_id 
                         WHERE c.customer_id = ?`,
                        [pathParameters.customerId]
                    );
                    result = rows[0] || null;
                    if (!result) {
                        await connection.end();
                        return { 
                            statusCode: 404, 
                            headers, 
                            body: JSON.stringify({ message: 'Customer not found' }) 
                        };
                    }
                    
                    // Get customer's sales history
                    const [salesRows] = await connection.execute(
                        `SELECT s.*, COUNT(si.sale_item_id) as item_count
                         FROM sales s 
                         LEFT JOIN sale_items si ON s.sale_id = si.sale_id
                         WHERE s.customer_id = ? 
                         GROUP BY s.sale_id
                         ORDER BY s.created_at DESC 
                         LIMIT 10`,
                        [pathParameters.customerId]
                    );
                    result.recentSales = salesRows;
                    
                } else if (path.includes('/customers') && !pathParameters.customerId) {
                    // Get all customers
                    let query = `SELECT c.*, sr.name as sales_rep_name, sr.email as sales_rep_email 
                                FROM customers c 
                                LEFT JOIN sales_reps sr ON c.assigned_sales_rep_id = sr.sales_rep_id`;
                    let params = [];
                    let whereConditions = [];
                    
                    if (queryStringParameters.salesRep) {
                        whereConditions.push('c.assigned_sales_rep_id = ?');
                        params.push(queryStringParameters.salesRep);
                    }
                    
                    if (queryStringParameters.search) {
                        whereConditions.push('(c.name LIKE ? OR c.email LIKE ? OR c.city LIKE ?)');
                        params.push(`%${queryStringParameters.search}%`, `%${queryStringParameters.search}%`, `%${queryStringParameters.search}%`);
                    }
                    
                    if (whereConditions.length > 0) {
                        query += ' WHERE ' + whereConditions.join(' AND ');
                    }
                    
                    query += ' ORDER BY c.created_at DESC';
                    
                    if (queryStringParameters.limit) {
                        query += ' LIMIT ?';
                        params.push(parseInt(queryStringParameters.limit));
                    }
                    
                    const [rows] = await connection.execute(query, params);
                    result = { customers: rows, count: rows.length };
                    
                } else if (path.includes('/salesreps/{salesRepId}/customers') || pathParameters.salesRepId) {
                    // Get customers for specific sales rep
                    const [rows] = await connection.execute(
                        `SELECT c.*, sr.name as sales_rep_name, sr.email as sales_rep_email 
                         FROM customers c 
                         LEFT JOIN sales_reps sr ON c.assigned_sales_rep_id = sr.sales_rep_id 
                         WHERE c.assigned_sales_rep_id = ?
                         ORDER BY c.created_at DESC`,
                        [pathParameters.salesRepId]
                    );
                    result = { customers: rows, count: rows.length, salesRepId: pathParameters.salesRepId };
                    
                } else if (path.includes('/salesreps') && !pathParameters.salesRepId) {
                    // Get all sales reps
                    const [rows] = await connection.execute(
                        `SELECT sr.*, COUNT(c.customer_id) as customer_count
                         FROM sales_reps sr
                         LEFT JOIN customers c ON sr.sales_rep_id = c.assigned_sales_rep_id
                         GROUP BY sr.sales_rep_id
                         ORDER BY sr.name`
                    );
                    result = { salesReps: rows, count: rows.length };
                }
                break;
                
            case 'POST':
                if (path.includes('/customers')) {
                    // Create new customer
                    const { customer_id, name, email, phone, assigned_sales_rep_id, address, city, state, contact_person } = body;
                    
                    if (!customer_id || !name) {
                        await connection.end();
                        return { 
                            statusCode: 400, 
                            headers, 
                            body: JSON.stringify({ message: 'Missing required fields: customer_id, name' }) 
                        };
                    }
                    
                    // Check if customer already exists
                    const [existingCustomer] = await connection.execute(
                        'SELECT customer_id FROM customers WHERE customer_id = ?',
                        [customer_id]
                    );
                    
                    if (existingCustomer.length > 0) {
                        await connection.end();
                        return {
                            statusCode: 409,
                            headers,
                            body: JSON.stringify({ message: 'Customer with this ID already exists' })
                        };
                    }
                    
                    // Validate sales rep exists if provided
                    if (assigned_sales_rep_id) {
                        const [salesRepCheck] = await connection.execute(
                            'SELECT sales_rep_id FROM sales_reps WHERE sales_rep_id = ?',
                            [assigned_sales_rep_id]
                        );
                        
                        if (salesRepCheck.length === 0) {
                            await connection.end();
                            return {
                                statusCode: 400,
                                headers,
                                body: JSON.stringify({ message: 'Invalid sales rep ID' })
                            };
                        }
                    }
                    
                    await connection.execute(
                        `INSERT INTO customers (customer_id, name, contact_person, email, phone, address, city, state, assigned_sales_rep_id) 
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [customer_id, name, contact_person || '', email || '', phone || '', address || '', city || '', state || '', assigned_sales_rep_id || null]
                    );
                    
                    // Track in DynamoDB if possible
                    if (assigned_sales_rep_id) {
                        try {
                            await dynamoDB.put({
                                TableName: 'CustomerSalesRepTracking',
                                Item: {
                                    CustomerID: customer_id,
                                    SalesRepID: assigned_sales_rep_id,
                                    AssignedDate: new Date().toISOString(),
                                    Status: 'Active',
                                    CustomerName: name
                                }
                            }).promise();
                        } catch (dynamoError) {
                            console.log('DynamoDB tracking failed (non-critical):', dynamoError);
                        }
                    }
                    
                    result = { message: 'Customer created successfully', customer_id };
                    
                } else if (path.includes('/assignments')) {
                    // Assign customer to sales rep
                    const { customer_id, sales_rep_id } = body;
                    
                    if (!customer_id || !sales_rep_id) {
                        await connection.end();
                        return { 
                            statusCode: 400, 
                            headers, 
                            body: JSON.stringify({ message: 'Missing required fields: customer_id, sales_rep_id' }) 
                        };
                    }
                    
                    // Validate customer and sales rep exist
                    const [customerCheck] = await connection.execute(
                        'SELECT customer_id, name FROM customers WHERE customer_id = ?',
                        [customer_id]
                    );
                    
                    if (customerCheck.length === 0) {
                        await connection.end();
                        return {
                            statusCode: 400,
                            headers,
                            body: JSON.stringify({ message: 'Customer not found' })
                        };
                    }
                    
                    const [salesRepCheck] = await connection.execute(
                        'SELECT sales_rep_id FROM sales_reps WHERE sales_rep_id = ?',
                        [sales_rep_id]
                    );
                    
                    if (salesRepCheck.length === 0) {
                        await connection.end();
                        return {
                            statusCode: 400,
                            headers,
                            body: JSON.stringify({ message: 'Sales rep not found' })
                        };
                    }
                    
                    // Update assignment in MySQL
                    await connection.execute(
                        'UPDATE customers SET assigned_sales_rep_id = ?, updated_at = CURRENT_TIMESTAMP WHERE customer_id = ?',
                        [sales_rep_id, customer_id]
                    );
                    
                    // Track in DynamoDB
                    try {
                        await dynamoDB.put({
                            TableName: 'CustomerSalesRepTracking',
                            Item: {
                                CustomerID: customer_id,
                                SalesRepID: sales_rep_id,
                                AssignedDate: new Date().toISOString(),
                                Status: 'Active',
                                CustomerName: customerCheck[0].name
                            }
                        }).promise();
                    } catch (dynamoError) {
                        console.log('DynamoDB tracking failed (non-critical):', dynamoError);
                    }
                    
                    result = { message: 'Assignment created successfully' };
                }
                break;
                
            case 'PUT':
                // Update customer
                if (!pathParameters.customerId) {
                    await connection.end();
                    return { 
                        statusCode: 400, 
                        headers, 
                        body: JSON.stringify({ message: 'Customer ID required' }) 
                    };
                }
                
                // Check if customer exists
                const [existingCustomer] = await connection.execute(
                    'SELECT customer_id FROM customers WHERE customer_id = ?',
                    [pathParameters.customerId]
                );
                
                if (existingCustomer.length === 0) {
                    await connection.end();
                    return {
                        statusCode: 404,
                        headers,
                        body: JSON.stringify({ message: 'Customer not found' })
                    };
                }
                
                const updateFields = [];
                const updateValues = [];
                
                Object.entries(body).forEach(([key, value]) => {
                    if (['name', 'contact_person', 'email', 'phone', 'address', 'city', 'state', 'assigned_sales_rep_id'].includes(key)) {
                        updateFields.push(`${key} = ?`);
                        updateValues.push(value);
                    }
                });
                
                if (updateFields.length === 0) {
                    await connection.end();
                    return { 
                        statusCode: 400, 
                        headers, 
                        body: JSON.stringify({ message: 'No valid fields to update' }) 
                    };
                }
                
                updateValues.push(pathParameters.customerId);
                
                await connection.execute(
                    `UPDATE customers SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE customer_id = ?`,
                    updateValues
                );
                
                result = { message: 'Customer updated successfully' };
                break;
                
            case 'DELETE':
                // Delete customer
                if (!pathParameters.customerId) {
                    await connection.end();
                    return { 
                        statusCode: 400, 
                        headers, 
                        body: JSON.stringify({ message: 'Customer ID required' }) 
                    };
                }
                
                // Check if customer exists
                const [existingDeleteCustomer] = await connection.execute(
                    'SELECT customer_id FROM customers WHERE customer_id = ?',
                    [pathParameters.customerId]
                );
                
                if (existingDeleteCustomer.length === 0) {
                    await connection.end();
                    return {
                        statusCode: 404,
                        headers,
                        body: JSON.stringify({ message: 'Customer not found' })
                    };
                }
                
                // Check if customer has sales
                const [salesCheck] = await connection.execute(
                    'SELECT COUNT(*) as count FROM sales WHERE customer_id = ?',
                    [pathParameters.customerId]
                );
                
                if (salesCheck[0].count > 0) {
                    await connection.end();
                    return {
                        statusCode: 409,
                        headers,
                        body: JSON.stringify({ 
                            message: 'Cannot delete customer with existing sales records. Consider marking as inactive instead.' 
                        })
                    };
                }
                
                await connection.execute('DELETE FROM customers WHERE customer_id = ?', [pathParameters.customerId]);
                
                // Remove from DynamoDB tracking
                try {
                    await dynamoDB.delete({
                        TableName: 'CustomerSalesRepTracking',
                        Key: { CustomerID: pathParameters.customerId }
                    }).promise();
                } catch (dynamoError) {
                    console.log('DynamoDB delete failed (non-critical):', dynamoError);
                }
                
                result = { message: 'Customer deleted successfully' };
                break;
                
            default:
                await connection.end();
                return { statusCode: 405, headers, body: JSON.stringify({ message: 'Method not allowed' }) };
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
                error: error.message,
                details: 'Check Lambda logs for more information'
            })
        };
    }
};
