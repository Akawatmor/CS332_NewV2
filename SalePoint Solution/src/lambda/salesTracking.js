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
                if (pathParameters.saleId) {
                    // Get specific sale with items
                    const [saleRows] = await connection.execute(`
                        SELECT s.*, c.name as customer_name, c.company, c.city, c.state,
                               sr.name as sales_rep_name, sr.email as sales_rep_email
                        FROM sales s
                        JOIN customers c ON s.customer_id = c.customer_id
                        JOIN sales_representatives sr ON s.sales_rep_id = sr.sales_rep_id
                        WHERE s.sale_id = ?
                    `, [pathParameters.saleId]);
                    
                    if (saleRows.length === 0) {
                        await connection.end();
                        return {
                            statusCode: 404,
                            headers,
                            body: JSON.stringify({ message: 'Sale not found' })
                        };
                    }
                    
                    const sale = saleRows[0];
                    
                    // Get sale items
                    const [itemRows] = await connection.execute(`
                        SELECT si.*, p.name as product_name, p.description
                        FROM sale_items si
                        JOIN products p ON si.product_id = p.product_id
                        WHERE si.sale_id = ?
                        ORDER BY si.id
                    `, [pathParameters.saleId]);
                    
                    sale.items = itemRows;
                    
                    // Get tracking data from DynamoDB
                    try {
                        const dynamoParams = {
                            TableName: 'SalesTracking',
                            Key: {
                                SaleID: pathParameters.saleId,
                                Timestamp: sale.created_at.toISOString()
                            }
                        };
                        
                        const dynamoResult = await dynamodb.get(dynamoParams).promise();
                        if (dynamoResult.Item) {
                            sale.tracking_data = dynamoResult.Item;
                        }
                    } catch (dynamoError) {
                        console.warn('DynamoDB error (non-critical):', dynamoError);
                        sale.tracking_data = null;
                    }
                    
                    result = sale;
                } else {
                    // Get all sales with optional filtering
                    let query = `
                        SELECT s.sale_id, s.sale_date, s.status, s.total_amount, s.tax_amount,
                               c.name as customer_name, c.company,
                               sr.name as sales_rep_name,
                               (s.total_amount + s.tax_amount) as grand_total
                        FROM sales s
                        JOIN customers c ON s.customer_id = c.customer_id
                        JOIN sales_representatives sr ON s.sales_rep_id = sr.sales_rep_id
                    `;
                    let params = [];
                    let conditions = [];
                    
                    if (queryStringParameters.status) {
                        conditions.push('s.status = ?');
                        params.push(queryStringParameters.status);
                    }
                    
                    if (queryStringParameters.customer_id) {
                        conditions.push('s.customer_id = ?');
                        params.push(queryStringParameters.customer_id);
                    }
                    
                    if (queryStringParameters.sales_rep_id) {
                        conditions.push('s.sales_rep_id = ?');
                        params.push(queryStringParameters.sales_rep_id);
                    }
                    
                    if (queryStringParameters.start_date) {
                        conditions.push('s.sale_date >= ?');
                        params.push(queryStringParameters.start_date);
                    }
                    
                    if (queryStringParameters.end_date) {
                        conditions.push('s.sale_date <= ?');
                        params.push(queryStringParameters.end_date);
                    }
                    
                    if (queryStringParameters.search) {
                        conditions.push('(c.name LIKE ? OR c.company LIKE ? OR s.sale_id LIKE ?)');
                        const searchTerm = `%${queryStringParameters.search}%`;
                        params.push(searchTerm, searchTerm, searchTerm);
                    }
                    
                    if (conditions.length > 0) {
                        query += ' WHERE ' + conditions.join(' AND ');
                    }
                    
                    query += ' ORDER BY s.sale_date DESC';
                    
                    // Add pagination
                    const limit = parseInt(queryStringParameters.limit) || 50;
                    const offset = parseInt(queryStringParameters.offset) || 0;
                    query += ' LIMIT ? OFFSET ?';
                    params.push(limit, offset);
                    
                    const [rows] = await connection.execute(query, params);
                    
                    // Get total count
                    let countQuery = 'SELECT COUNT(*) as total FROM sales s JOIN customers c ON s.customer_id = c.customer_id';
                    let countParams = [];
                    if (conditions.length > 0) {
                        countQuery += ' WHERE ' + conditions.join(' AND ');
                        countParams = params.slice(0, -2);
                    }
                    
                    const [countRows] = await connection.execute(countQuery, countParams);
                    const total = countRows[0].total;
                    
                    result = { 
                        sales: rows, 
                        count: rows.length,
                        total: total,
                        hasMore: offset + limit < total
                    };
                }
                break;
                
            case 'POST':
                // Create new sale
                const { sale_id, customer_id, sales_rep_id, items, notes, discount_amount } = body;
                
                if (!sale_id || !customer_id || !sales_rep_id || !items || !Array.isArray(items) || items.length === 0) {
                    await connection.end();
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ 
                            message: 'Missing required fields: sale_id, customer_id, sales_rep_id, items (array)' 
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
                
                // Check if sale ID already exists
                const [existingSales] = await connection.execute(
                    'SELECT sale_id FROM sales WHERE sale_id = ?',
                    [sale_id]
                );
                
                if (existingSales.length > 0) {
                    await connection.end();
                    return {
                        statusCode: 409,
                        headers,
                        body: JSON.stringify({ message: 'Sale with this ID already exists' })
                    };
                }
                
                // Start transaction
                await connection.beginTransaction();
                
                try {
                    let total_amount = 0;
                    const processedItems = [];
                    
                    // Validate items and calculate total
                    for (const item of items) {
                        const { product_id, quantity } = item;
                        
                        if (!product_id || !quantity || quantity <= 0) {
                            throw new Error(`Invalid item: product_id and positive quantity required`);
                        }
                        
                        // Get product details and check stock
                        const [productRows] = await connection.execute(
                            'SELECT product_id, price, stock_quantity FROM products WHERE product_id = ?',
                            [product_id]
                        );
                        
                        if (productRows.length === 0) {
                            throw new Error(`Product not found: ${product_id}`);
                        }
                        
                        const product = productRows[0];
                        
                        if (product.stock_quantity < quantity) {
                            throw new Error(`Insufficient stock for product ${product_id}. Available: ${product.stock_quantity}, Requested: ${quantity}`);
                        }
                        
                        const unit_price = product.price;
                        const total_price = unit_price * quantity;
                        total_amount += total_price;
                        
                        processedItems.push({
                            product_id,
                            quantity,
                            unit_price,
                            total_price
                        });
                    }
                    
                    // Apply discount
                    const final_discount = discount_amount || 0;
                    total_amount -= final_discount;
                    
                    // Calculate tax (8% for example)
                    const tax_amount = total_amount * 0.08;
                    
                    // Create sale record
                    await connection.execute(`
                        INSERT INTO sales 
                        (sale_id, customer_id, sales_rep_id, total_amount, discount_amount, tax_amount, notes, status) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
                    `, [sale_id, customer_id, sales_rep_id, total_amount, final_discount, tax_amount, notes || '']);
                    
                    // Create sale items
                    for (const item of processedItems) {
                        await connection.execute(`
                            INSERT INTO sale_items 
                            (sale_id, product_id, quantity, unit_price, total_price) 
                            VALUES (?, ?, ?, ?, ?)
                        `, [sale_id, item.product_id, item.quantity, item.unit_price, item.total_price]);
                        
                        // Update inventory (triggers will handle this, but we can do it explicitly)
                        await connection.execute(
                            'UPDATE products SET stock_quantity = stock_quantity - ? WHERE product_id = ?',
                            [item.quantity, item.product_id]
                        );
                    }
                    
                    await connection.commit();
                    
                    // Add to DynamoDB tracking
                    try {
                        const dynamoParams = {
                            TableName: 'SalesTracking',
                            Item: {
                                SaleID: sale_id,
                                Timestamp: new Date().toISOString(),
                                CustomerID: customer_id,
                                SalesRepID: sales_rep_id,
                                Status: 'pending',
                                TotalAmount: total_amount + tax_amount,
                                ItemCount: processedItems.length,
                                CreatedDate: new Date().toISOString(),
                                LastUpdated: new Date().toISOString()
                            }
                        };
                        
                        await dynamodb.put(dynamoParams).promise();
                    } catch (dynamoError) {
                        console.warn('DynamoDB tracking failed (non-critical):', dynamoError);
                    }
                    
                    result = { 
                        message: 'Sale created successfully', 
                        sale_id,
                        total_amount: total_amount + tax_amount,
                        items_count: processedItems.length
                    };
                } catch (transactionError) {
                    await connection.rollback();
                    throw transactionError;
                }
                break;
                
            case 'PUT':
                // Update sale
                if (!pathParameters.saleId) {
                    await connection.end();
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ message: 'Sale ID required' })
                    };
                }
                
                const { status, update_notes } = body;
                
                if (!status) {
                    await connection.end();
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ message: 'Status is required' })
                    };
                }
                
                const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
                if (!validStatuses.includes(status)) {
                    await connection.end();
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ 
                            message: `Invalid status. Valid values: ${validStatuses.join(', ')}` 
                        })
                    };
                }
                
                // Get current sale status
                const [currentSaleRows] = await connection.execute(
                    'SELECT status FROM sales WHERE sale_id = ?',
                    [pathParameters.saleId]
                );
                
                if (currentSaleRows.length === 0) {
                    await connection.end();
                    return {
                        statusCode: 404,
                        headers,
                        body: JSON.stringify({ message: 'Sale not found' })
                    };
                }
                
                const oldStatus = currentSaleRows[0].status;
                
                // Start transaction for inventory updates
                await connection.beginTransaction();
                
                try {
                    // If cancelling a sale, restore inventory
                    if (oldStatus !== 'cancelled' && status === 'cancelled') {
                        const [saleItems] = await connection.execute(
                            'SELECT product_id, quantity FROM sale_items WHERE sale_id = ?',
                            [pathParameters.saleId]
                        );
                        
                        for (const item of saleItems) {
                            await connection.execute(
                                'UPDATE products SET stock_quantity = stock_quantity + ? WHERE product_id = ?',
                                [item.quantity, item.product_id]
                            );
                        }
                    }
                    
                    // Update sale status
                    const updateFields = ['status = ?'];
                    const updateValues = [status];
                    
                    if (update_notes) {
                        updateFields.push('notes = ?');
                        updateValues.push(update_notes);
                    }
                    
                    updateValues.push(pathParameters.saleId);
                    
                    await connection.execute(
                        `UPDATE sales SET ${updateFields.join(', ')} WHERE sale_id = ?`,
                        updateValues
                    );
                    
                    await connection.commit();
                    
                    // Update DynamoDB tracking
                    try {
                        const dynamoParams = {
                            TableName: 'SalesTracking',
                            Key: {
                                SaleID: pathParameters.saleId,
                                Timestamp: new Date().toISOString() // This may need to be the original timestamp
                            },
                            UpdateExpression: 'SET #status = :status, LastUpdated = :lastUpdated',
                            ExpressionAttributeNames: {
                                '#status': 'Status'
                            },
                            ExpressionAttributeValues: {
                                ':status': status,
                                ':lastUpdated': new Date().toISOString()
                            }
                        };
                        
                        await dynamodb.update(dynamoParams).promise();
                    } catch (dynamoError) {
                        console.warn('DynamoDB update failed (non-critical):', dynamoError);
                    }
                    
                    result = { 
                        message: 'Sale updated successfully',
                        old_status: oldStatus,
                        new_status: status
                    };
                } catch (transactionError) {
                    await connection.rollback();
                    throw transactionError;
                }
                break;
                
            case 'DELETE':
                // Delete sale (admin only - removes completely)
                if (!pathParameters.saleId) {
                    await connection.end();
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ message: 'Sale ID required' })
                    };
                }
                
                // Start transaction
                await connection.beginTransaction();
                
                try {
                    // Restore inventory first
                    const [saleItems] = await connection.execute(
                        'SELECT product_id, quantity FROM sale_items WHERE sale_id = ?',
                        [pathParameters.saleId]
                    );
                    
                    for (const item of saleItems) {
                        await connection.execute(
                            'UPDATE products SET stock_quantity = stock_quantity + ? WHERE product_id = ?',
                            [item.quantity, item.product_id]
                        );
                    }
                    
                    // Delete sale items first (due to foreign key constraint)
                    await connection.execute(
                        'DELETE FROM sale_items WHERE sale_id = ?',
                        [pathParameters.saleId]
                    );
                    
                    // Delete sale
                    const [deleteResult] = await connection.execute(
                        'DELETE FROM sales WHERE sale_id = ?',
                        [pathParameters.saleId]
                    );
                    
                    if (deleteResult.affectedRows === 0) {
                        await connection.rollback();
                        await connection.end();
                        return {
                            statusCode: 404,
                            headers,
                            body: JSON.stringify({ message: 'Sale not found' })
                        };
                    }
                    
                    await connection.commit();
                    
                    // Remove from DynamoDB tracking
                    try {
                        const dynamoParams = {
                            TableName: 'SalesTracking',
                            Key: {
                                SaleID: pathParameters.saleId,
                                Timestamp: new Date().toISOString() // This should be the original timestamp
                            }
                        };
                        
                        await dynamodb.delete(dynamoParams).promise();
                    } catch (dynamoError) {
                        console.warn('DynamoDB delete failed (non-critical):', dynamoError);
                    }
                    
                    result = { message: 'Sale deleted successfully' };
                } catch (transactionError) {
                    await connection.rollback();
                    throw transactionError;
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
