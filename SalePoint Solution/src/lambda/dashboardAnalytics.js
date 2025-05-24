const mysql = require('mysql2/promise');

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,OPTIONS'
    };
    
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: 'CORS preflight successful' })
        };
    }
    
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ message: 'Method not allowed' })
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
        
        const queryStringParameters = event.queryStringParameters || {};
        const pathParameters = event.pathParameters || {};
        
        // Date range filters
        const startDate = queryStringParameters.start_date || '2024-01-01';
        const endDate = queryStringParameters.end_date || '2025-12-31';
        
        let result = {};
        
        if (pathParameters.metric) {
            // Get specific metric
            switch (pathParameters.metric) {
                case 'sales-summary':
                    result = await getSalesSummary(connection, startDate, endDate);
                    break;
                case 'top-products':
                    result = await getTopProducts(connection, startDate, endDate);
                    break;
                case 'sales-rep-performance':
                    result = await getSalesRepPerformance(connection, startDate, endDate);
                    break;
                case 'customer-insights':
                    result = await getCustomerInsights(connection, startDate, endDate);
                    break;
                case 'inventory-status':
                    result = await getInventoryStatus(connection);
                    break;
                case 'sales-trends':
                    result = await getSalesTrends(connection, startDate, endDate);
                    break;
                default:
                    await connection.end();
                    return {
                        statusCode: 404,
                        headers,
                        body: JSON.stringify({ message: 'Metric not found' })
                    };
            }
        } else {
            // Get dashboard summary
            result = await getDashboardSummary(connection, startDate, endDate);
        }
        
        await connection.end();
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(result)
        };
        
    } catch (error) {
        console.error('Dashboard error:', error);
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

async function getDashboardSummary(connection, startDate, endDate) {
    const [salesSummary] = await connection.execute(`
        SELECT 
            COUNT(*) as total_sales,
            COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_sales,
            COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_sales,
            COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_sales,
            COALESCE(SUM(total_amount + tax_amount), 0) as total_revenue,
            COALESCE(AVG(total_amount + tax_amount), 0) as avg_order_value
        FROM sales 
        WHERE sale_date BETWEEN ? AND ?
    `, [startDate, endDate]);
    
    const [productSummary] = await connection.execute(`
        SELECT 
            COUNT(*) as total_products,
            COUNT(CASE WHEN stock_quantity > 0 THEN 1 END) as in_stock_products,
            COUNT(CASE WHEN stock_quantity = 0 THEN 1 END) as out_of_stock_products,
            COUNT(CASE WHEN stock_quantity < 10 THEN 1 END) as low_stock_products
        FROM products
    `);
    
    const [customerSummary] = await connection.execute(`
        SELECT 
            COUNT(DISTINCT c.customer_id) as total_customers,
            COUNT(DISTINCT CASE WHEN s.sale_date BETWEEN ? AND ? THEN c.customer_id END) as active_customers
        FROM customers c
        LEFT JOIN sales s ON c.customer_id = s.customer_id
    `, [startDate, endDate]);
    
    const [salesRepSummary] = await connection.execute(`
        SELECT 
            COUNT(*) as total_sales_reps,
            COUNT(CASE WHEN active = TRUE THEN 1 END) as active_sales_reps
        FROM sales_representatives
    `);
    
    // Recent sales
    const [recentSales] = await connection.execute(`
        SELECT s.sale_id, s.sale_date, s.status, s.total_amount, s.tax_amount,
               c.name as customer_name, sr.name as sales_rep_name
        FROM sales s
        JOIN customers c ON s.customer_id = c.customer_id
        JOIN sales_representatives sr ON s.sales_rep_id = sr.sales_rep_id
        WHERE s.sale_date BETWEEN ? AND ?
        ORDER BY s.sale_date DESC
        LIMIT 10
    `, [startDate, endDate]);
    
    return {
        summary: {
            sales: salesSummary[0],
            products: productSummary[0],
            customers: customerSummary[0],
            sales_reps: salesRepSummary[0]
        },
        recent_sales: recentSales,
        date_range: { start_date: startDate, end_date: endDate }
    };
}

async function getSalesSummary(connection, startDate, endDate) {
    const [summary] = await connection.execute(`
        SELECT 
            DATE(sale_date) as sale_date,
            COUNT(*) as sales_count,
            SUM(total_amount + tax_amount) as daily_revenue,
            AVG(total_amount + tax_amount) as avg_order_value,
            COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_count,
            COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
            COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_count
        FROM sales 
        WHERE sale_date BETWEEN ? AND ?
        GROUP BY DATE(sale_date)
        ORDER BY sale_date DESC
    `, [startDate, endDate]);
    
    return { sales_summary: summary };
}

async function getTopProducts(connection, startDate, endDate) {
    const [topProducts] = await connection.execute(`
        SELECT 
            p.product_id, p.name, p.price, p.stock_quantity,
            pc.name as category_name,
            COALESCE(SUM(si.quantity), 0) as total_sold,
            COALESCE(SUM(si.total_price), 0) as total_revenue,
            COUNT(DISTINCT s.sale_id) as order_count
        FROM products p
        LEFT JOIN product_categories pc ON p.category_id = pc.category_id
        LEFT JOIN sale_items si ON p.product_id = si.product_id
        LEFT JOIN sales s ON si.sale_id = s.sale_id AND s.sale_date BETWEEN ? AND ?
        GROUP BY p.product_id, p.name, p.price, p.stock_quantity, pc.name
        ORDER BY total_sold DESC, total_revenue DESC
        LIMIT 20
    `, [startDate, endDate]);
    
    return { top_products: topProducts };
}

async function getSalesRepPerformance(connection, startDate, endDate) {
    const [performance] = await connection.execute(`
        SELECT 
            sr.sales_rep_id, sr.name, sr.territory,
            COUNT(s.sale_id) as sales_count,
            COALESCE(SUM(s.total_amount + s.tax_amount), 0) as total_revenue,
            COALESCE(AVG(s.total_amount + s.tax_amount), 0) as avg_sale_amount,
            COUNT(DISTINCT s.customer_id) as unique_customers,
            COUNT(DISTINCT csr.customer_id) as assigned_customers
        FROM sales_representatives sr
        LEFT JOIN sales s ON sr.sales_rep_id = s.sales_rep_id 
            AND s.sale_date BETWEEN ? AND ? 
            AND s.status != 'cancelled'
        LEFT JOIN customer_sales_rep_assignments csr ON sr.sales_rep_id = csr.sales_rep_id 
            AND csr.is_active = TRUE
        WHERE sr.active = TRUE
        GROUP BY sr.sales_rep_id, sr.name, sr.territory
        ORDER BY total_revenue DESC
    `, [startDate, endDate]);
    
    return { sales_rep_performance: performance };
}

async function getCustomerInsights(connection, startDate, endDate) {
    const [insights] = await connection.execute(`
        SELECT 
            c.customer_id, c.name, c.company, c.city, c.state,
            COUNT(s.sale_id) as total_orders,
            COALESCE(SUM(s.total_amount + s.tax_amount), 0) as total_spent,
            COALESCE(AVG(s.total_amount + s.tax_amount), 0) as avg_order_value,
            MAX(s.sale_date) as last_order_date,
            sr.name as assigned_sales_rep
        FROM customers c
        LEFT JOIN sales s ON c.customer_id = s.customer_id 
            AND s.sale_date BETWEEN ? AND ?
            AND s.status != 'cancelled'
        LEFT JOIN customer_sales_rep_assignments csr ON c.customer_id = csr.customer_id 
            AND csr.is_active = TRUE
        LEFT JOIN sales_representatives sr ON csr.sales_rep_id = sr.sales_rep_id
        GROUP BY c.customer_id, c.name, c.company, c.city, c.state, sr.name
        HAVING total_orders > 0
        ORDER BY total_spent DESC
        LIMIT 50
    `, [startDate, endDate]);
    
    return { customer_insights: insights };
}

async function getInventoryStatus(connection) {
    const [inventory] = await connection.execute(`
        SELECT 
            p.product_id, p.name, p.price, p.stock_quantity,
            pc.name as category_name,
            CASE 
                WHEN p.stock_quantity = 0 THEN 'Out of Stock'
                WHEN p.stock_quantity < 10 THEN 'Low Stock'
                WHEN p.stock_quantity < 50 THEN 'Moderate Stock'
                ELSE 'Good Stock'
            END as stock_status,
            COALESCE(SUM(si.quantity), 0) as total_sold_all_time
        FROM products p
        LEFT JOIN product_categories pc ON p.category_id = pc.category_id
        LEFT JOIN sale_items si ON p.product_id = si.product_id
        GROUP BY p.product_id, p.name, p.price, p.stock_quantity, pc.name
        ORDER BY 
            CASE 
                WHEN p.stock_quantity = 0 THEN 1
                WHEN p.stock_quantity < 10 THEN 2
                ELSE 3
            END,
            p.stock_quantity ASC
    `);
    
    return { inventory_status: inventory };
}

async function getSalesTrends(connection, startDate, endDate) {
    const [monthlyTrends] = await connection.execute(`
        SELECT 
            YEAR(sale_date) as year,
            MONTH(sale_date) as month,
            COUNT(*) as sales_count,
            SUM(total_amount + tax_amount) as monthly_revenue,
            AVG(total_amount + tax_amount) as avg_order_value
        FROM sales 
        WHERE sale_date BETWEEN ? AND ?
            AND status != 'cancelled'
        GROUP BY YEAR(sale_date), MONTH(sale_date)
        ORDER BY year, month
    `, [startDate, endDate]);
    
    const [statusTrends] = await connection.execute(`
        SELECT 
            status,
            COUNT(*) as count,
            SUM(total_amount + tax_amount) as revenue
        FROM sales 
        WHERE sale_date BETWEEN ? AND ?
        GROUP BY status
        ORDER BY count DESC
    `, [startDate, endDate]);
    
    return { 
        monthly_trends: monthlyTrends,
        status_trends: statusTrends
    };
}
