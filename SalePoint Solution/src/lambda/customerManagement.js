const mysql = require('mysql2/promise');

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
                    // Get specific customer with sales rep assignment
                    const [customerRows] = await connection.execute(`
                        SELECT c.*, 
                               csr.sales_rep_id as assigned_sales_rep_id,
                               sr.name as assigned_sales_rep_name,
                               sr.email as assigned_sales_rep_email
                        FROM customers c 
                        LEFT JOIN customer_sales_rep_assignments csr ON c.customer_id = csr.customer_id AND csr.is_active = TRUE
                        LEFT JOIN sales_representatives sr ON csr.sales_rep_id = sr.sales_rep_id
                        WHERE c.customer_id = ?
                    `, [pathParameters.customerId]);
                    
                    if (customerRows.length === 0) {
                        await connection.end();
                        return {
                            statusCode: 404,
                            headers,
                            body: JSON.stringify({ message: 'Customer not found' })
                        };
                    }
                    
                    const customer = customerRows[0];
                    
                    // Get customer's sales history
                    const [salesRows] = await connection.execute(`
                        SELECT s.sale_id, s.sale_date, s.status, s.total_amount, s.tax_amount,
                               sr.name as sales_rep_name
                        FROM sales s
                        JOIN sales_representatives sr ON s.sales_rep_id = sr.sales_rep_id
                        WHERE s.customer_id = ?
                        ORDER BY s.sale_date DESC
                        LIMIT 10
                    `, [pathParameters.customerId]);
                    
                    customer.sales_history = salesRows;
                    result = customer;
                } else {
                    // Get all customers with optional filtering
                    let query = `
                        SELECT c.*, 
                               csr.sales_rep_id as assigned_sales_rep_id,
                               sr.name as assigned_sales_rep_name
                        FROM customers c 
                        LEFT JOIN customer_sales_rep_assignments csr ON c.customer_id = csr.customer_id AND csr.is_active = TRUE
                        LEFT JOIN sales_representatives sr ON csr.sales_rep_id = sr.sales_rep_id
                    `;
                    let params = [];
                    let conditions = [];
                    
                    if (queryStringParameters.search) {
                        conditions.push('(c.name LIKE ? OR c.company LIKE ? OR c.email LIKE ?)');
                        const searchTerm = `%${queryStringParameters.search}%`;
                        params.push(searchTerm, searchTerm, searchTerm);
                    }
                    
                    if (queryStringParameters.city) {
                        conditions.push('c.city = ?');
                        params.push(queryStringParameters.city);
                    }
                    
                    if (queryStringParameters.state) {
                        conditions.push('c.state = ?');
                        params.push(queryStringParameters.state);
                    }
                    
                    if (queryStringParameters.salesRep) {
                        conditions.push('sr.sales_rep_id = ?');
                        params.push(queryStringParameters.salesRep);
                    }
                    
                    if (conditions.length > 0) {
                        query += ' WHERE ' + conditions.join(' AND ');
                    }
                    
                    query += ' ORDER BY c.name';
                    
                    // Add pagination
                    const limit = parseInt(queryStringParameters.limit) || 50;
                    const offset = parseInt(queryStringParameters.offset) || 0;
                    query += ' LIMIT ? OFFSET ?';
                    params.push(limit, offset);
                    
                    const [rows] = await connection.execute(query, params);
                    
                    // Get total count
                    let countQuery = 'SELECT COUNT(*) as total FROM customers c';
                    let countParams = [];
                    if (conditions.length > 0) {
                        countQuery += ' LEFT JOIN customer_sales_rep_assignments csr ON c.customer_id = csr.customer_id AND csr.is_active = TRUE';
                        countQuery += ' LEFT JOIN sales_representatives sr ON csr.sales_rep_id = sr.sales_rep_id';
                        countQuery += ' WHERE ' + conditions.join(' AND ');
                        countParams = params.slice(0, -2);
                    }
                    
                    const [countRows] = await connection.execute(countQuery, countParams);
                    const total = countRows[0].total;
                    
                    result = { 
                        customers: rows, 
                        count: rows.length,
                        total: total,
                        hasMore: offset + limit < total
                    };
                }
                break;
                
            case 'POST':
                // Create new customer
                const { customer_id, name, email, phone, address, city, state, zip_code, country, company, credit_limit } = body;
                
                if (!customer_id || !name) {
                    await connection.end();
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ 
                            message: 'Missing required fields: customer_id, name' 
                        })
                    };
                }
                
                // Check if customer already exists
                const [existingCustomers] = await connection.execute(
                    'SELECT customer_id FROM customers WHERE customer_id = ?',
                    [customer_id]
                );
                
                if (existingCustomers.length > 0) {
                    await connection.end();
                    return {
                        statusCode: 409,
                        headers,
                        body: JSON.stringify({ message: 'Customer with this ID already exists' })
                    };
                }
                
                await connection.execute(`
                    INSERT INTO customers 
                    (customer_id, name, email, phone, address, city, state, zip_code, country, company, credit_limit) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [customer_id, name, email || '', phone || '', address || '', city || '', 
                    state || '', zip_code || '', country || 'USA', company || '', credit_limit || 0]);
                
                result = { message: 'Customer created successfully', customer_id };
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
                
                const updateFields = [];
                const updateValues = [];
                
                const validFields = ['name', 'email', 'phone', 'address', 'city', 'state', 'zip_code', 'country', 'company', 'credit_limit'];
                Object.entries(body).forEach(([key, value]) => {
                    if (validFields.includes(key)) {
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
                
                const [updateResult] = await connection.execute(
                    `UPDATE customers SET ${updateFields.join(', ')} WHERE customer_id = ?`,
                    updateValues
                );
                
                if (updateResult.affectedRows === 0) {
                    await connection.end();
                    return {
                        statusCode: 404,
                        headers,
                        body: JSON.stringify({ message: 'Customer not found' })
                    };
                }
                
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
                            message: 'Cannot delete customer that has sales records' 
                        })
                    };
                }
                
                const [deleteResult] = await connection.execute(
                    'DELETE FROM customers WHERE customer_id = ?',
                    [pathParameters.customerId]
                );
                
                if (deleteResult.affectedRows === 0) {
                    await connection.end();
                    return {
                        statusCode: 404,
                        headers,
                        body: JSON.stringify({ message: 'Customer not found' })
                    };
                }
                
                result = { message: 'Customer deleted successfully' };
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
        console.error('Database error:', error);
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
