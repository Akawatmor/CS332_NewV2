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
                if (pathParameters.salesRepId) {
                    // Get specific sales rep with performance metrics
                    const [repRows] = await connection.execute(`
                        SELECT sr.*, 
                               COUNT(DISTINCT csr.customer_id) as customer_count,
                               COUNT(DISTINCT s.sale_id) as total_sales,
                               COALESCE(SUM(s.total_amount + s.tax_amount), 0) as total_revenue,
                               COALESCE(AVG(s.total_amount + s.tax_amount), 0) as avg_sale_amount
                        FROM sales_representatives sr
                        LEFT JOIN customer_sales_rep_assignments csr ON sr.sales_rep_id = csr.sales_rep_id AND csr.is_active = TRUE
                        LEFT JOIN sales s ON sr.sales_rep_id = s.sales_rep_id AND s.status != 'cancelled'
                        WHERE sr.sales_rep_id = ?
                        GROUP BY sr.sales_rep_id
                    `, [pathParameters.salesRepId]);
                    
                    if (repRows.length === 0) {
                        await connection.end();
                        return {
                            statusCode: 404,
                            headers,
                            body: JSON.stringify({ message: 'Sales representative not found' })
                        };
                    }
                    
                    const salesRep = repRows[0];
                    
                    // Get assigned customers
                    const [customerRows] = await connection.execute(`
                        SELECT c.customer_id, c.name, c.company, c.city, c.state
                        FROM customers c
                        JOIN customer_sales_rep_assignments csr ON c.customer_id = csr.customer_id
                        WHERE csr.sales_rep_id = ? AND csr.is_active = TRUE
                        ORDER BY c.name
                    `, [pathParameters.salesRepId]);
                    
                    salesRep.assigned_customers = customerRows;
                    
                    // Get recent sales
                    const [salesRows] = await connection.execute(`
                        SELECT s.sale_id, s.sale_date, s.status, s.total_amount, s.tax_amount,
                               c.name as customer_name, c.company
                        FROM sales s
                        JOIN customers c ON s.customer_id = c.customer_id
                        WHERE s.sales_rep_id = ?
                        ORDER BY s.sale_date DESC
                        LIMIT 10
                    `, [pathParameters.salesRepId]);
                    
                    salesRep.recent_sales = salesRows;
                    
                    result = salesRep;
                } else {
                    // Get all sales reps with optional filtering
                    let query = `
                        SELECT sr.*, 
                               COUNT(DISTINCT csr.customer_id) as customer_count,
                               COUNT(DISTINCT s.sale_id) as total_sales,
                               COALESCE(SUM(s.total_amount + s.tax_amount), 0) as total_revenue
                        FROM sales_representatives sr
                        LEFT JOIN customer_sales_rep_assignments csr ON sr.sales_rep_id = csr.sales_rep_id AND csr.is_active = TRUE
                        LEFT JOIN sales s ON sr.sales_rep_id = s.sales_rep_id AND s.status != 'cancelled'
                    `;
                    let params = [];
                    let conditions = [];
                    
                    if (queryStringParameters.territory) {
                        conditions.push('sr.territory = ?');
                        params.push(queryStringParameters.territory);
                    }
                    
                    if (queryStringParameters.active !== undefined) {
                        conditions.push('sr.active = ?');
                        params.push(queryStringParameters.active === 'true');
                    }
                    
                    if (queryStringParameters.search) {
                        conditions.push('(sr.name LIKE ? OR sr.email LIKE ?)');
                        const searchTerm = `%${queryStringParameters.search}%`;
                        params.push(searchTerm, searchTerm);
                    }
                    
                    if (conditions.length > 0) {
                        query += ' WHERE ' + conditions.join(' AND ');
                    }
                    
                    query += ' GROUP BY sr.sales_rep_id ORDER BY sr.name';
                    
                    const [rows] = await connection.execute(query, params);
                    
                    result = { sales_reps: rows, count: rows.length };
                }
                break;
                
            case 'POST':
                // Create new sales rep
                const { sales_rep_id, name, email, phone, territory, commission_rate, manager_id } = body;
                
                if (!sales_rep_id || !name || !email) {
                    await connection.end();
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ 
                            message: 'Missing required fields: sales_rep_id, name, email' 
                        })
                    };
                }
                
                // Check if sales rep already exists
                const [existingReps] = await connection.execute(
                    'SELECT sales_rep_id FROM sales_representatives WHERE sales_rep_id = ? OR email = ?',
                    [sales_rep_id, email]
                );
                
                if (existingReps.length > 0) {
                    await connection.end();
                    return {
                        statusCode: 409,
                        headers,
                        body: JSON.stringify({ message: 'Sales representative with this ID or email already exists' })
                    };
                }
                
                await connection.execute(`
                    INSERT INTO sales_representatives 
                    (sales_rep_id, name, email, phone, territory, commission_rate, manager_id) 
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [sales_rep_id, name, email, phone || '', territory || '', commission_rate || 0.05, manager_id || null]);
                
                result = { message: 'Sales representative created successfully', sales_rep_id };
                break;
                
            case 'PUT':
                // Update sales rep
                if (!pathParameters.salesRepId) {
                    await connection.end();
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ message: 'Sales Representative ID required' })
                    };
                }
                
                const updateFields = [];
                const updateValues = [];
                
                const validFields = ['name', 'email', 'phone', 'territory', 'commission_rate', 'manager_id', 'active'];
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
                
                updateValues.push(pathParameters.salesRepId);
                
                const [updateResult] = await connection.execute(
                    `UPDATE sales_representatives SET ${updateFields.join(', ')} WHERE sales_rep_id = ?`,
                    updateValues
                );
                
                if (updateResult.affectedRows === 0) {
                    await connection.end();
                    return {
                        statusCode: 404,
                        headers,
                        body: JSON.stringify({ message: 'Sales representative not found' })
                    };
                }
                
                result = { message: 'Sales representative updated successfully' };
                break;
                
            case 'DELETE':
                // Deactivate sales rep (don't actually delete due to foreign key constraints)
                if (!pathParameters.salesRepId) {
                    await connection.end();
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ message: 'Sales Representative ID required' })
                    };
                }
                
                // Check if sales rep has active assignments or sales
                const [assignmentCheck] = await connection.execute(
                    'SELECT COUNT(*) as count FROM customer_sales_rep_assignments WHERE sales_rep_id = ? AND is_active = TRUE',
                    [pathParameters.salesRepId]
                );
                
                const [salesCheck] = await connection.execute(
                    'SELECT COUNT(*) as count FROM sales WHERE sales_rep_id = ?',
                    [pathParameters.salesRepId]
                );
                
                if (assignmentCheck[0].count > 0) {
                    await connection.end();
                    return {
                        statusCode: 409,
                        headers,
                        body: JSON.stringify({ 
                            message: 'Cannot delete sales representative that has active customer assignments. Deactivate assignments first.' 
                        })
                    };
                }
                
                if (salesCheck[0].count > 0) {
                    // Just deactivate instead of delete
                    const [updateResult] = await connection.execute(
                        'UPDATE sales_representatives SET active = FALSE WHERE sales_rep_id = ?',
                        [pathParameters.salesRepId]
                    );
                    
                    if (updateResult.affectedRows === 0) {
                        await connection.end();
                        return {
                            statusCode: 404,
                            headers,
                            body: JSON.stringify({ message: 'Sales representative not found' })
                        };
                    }
                    
                    result = { message: 'Sales representative deactivated successfully (has sales history)' };
                } else {
                    // Can safely delete
                    const [deleteResult] = await connection.execute(
                        'DELETE FROM sales_representatives WHERE sales_rep_id = ?',
                        [pathParameters.salesRepId]
                    );
                    
                    if (deleteResult.affectedRows === 0) {
                        await connection.end();
                        return {
                            statusCode: 404,
                            headers,
                            body: JSON.stringify({ message: 'Sales representative not found' })
                        };
                    }
                    
                    result = { message: 'Sales representative deleted successfully' };
                }
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
