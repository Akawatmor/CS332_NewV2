const mysql = require('mysql2/promise');

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 10,
  acquireTimeout: 60000,
  timeout: 60000
};

let connection = null;

async function getConnection() {
  if (!connection) {
    connection = await mysql.createConnection(dbConfig);
  }
  return connection;
}

exports.handler = async (event) => {
  console.log('Inventory Lambda Event:', JSON.stringify(event, null, 2));
  
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };

  try {
    const httpMethod = event.httpMethod;
    const pathParameters = event.pathParameters;
    const queryStringParameters = event.queryStringParameters || {};
    const body = event.body ? JSON.parse(event.body) : {};

    const db = await getConnection();

    switch (httpMethod) {
      case 'OPTIONS':
        return {
          statusCode: 200,
          headers,
          body: ''
        };

      case 'GET':
        if (pathParameters && pathParameters.id) {
          // Get inventory for specific product
          const [rows] = await db.execute(
            'SELECT id, name, stock_quantity, category, price, created_at, updated_at FROM products WHERE id = ?',
            [pathParameters.id]
          );
          
          if (rows.length === 0) {
            return {
              statusCode: 404,
              headers,
              body: JSON.stringify({ message: 'Product not found' })
            };
          }
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(rows[0])
          };
        } else {
          // Get inventory overview with optional filtering
          let query = 'SELECT id, name, stock_quantity, category, price, created_at, updated_at FROM products WHERE 1=1';
          const params = [];
          
          if (queryStringParameters.category) {
            query += ' AND category = ?';
            params.push(queryStringParameters.category);
          }
          
          if (queryStringParameters.lowStock) {
            const threshold = parseInt(queryStringParameters.lowStock) || 10;
            query += ' AND stock_quantity <= ?';
            params.push(threshold);
          }
          
          if (queryStringParameters.outOfStock) {
            query += ' AND stock_quantity = 0';
          }
          
          query += ' ORDER BY name';
          
          const [rows] = await db.execute(query, params);
          
          // Calculate summary statistics
          const totalProducts = rows.length;
          const outOfStock = rows.filter(p => p.stock_quantity === 0).length;
          const lowStock = rows.filter(p => p.stock_quantity > 0 && p.stock_quantity <= 10).length;
          const totalValue = rows.reduce((sum, p) => sum + (p.stock_quantity * p.price), 0);
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              products: rows,
              summary: {
                totalProducts,
                outOfStock,
                lowStock,
                totalValue: totalValue.toFixed(2)
              }
            })
          };
        }

      case 'POST':
        // Bulk stock update or stock adjustment
        if (body.type === 'bulk_update' && Array.isArray(body.updates)) {
          // Bulk update multiple products
          await db.beginTransaction();
          
          try {
            const results = [];
            
            for (const update of body.updates) {
              if (!update.productId || update.quantity === undefined) {
                throw new Error('Each update must have productId and quantity');
              }
              
              const [result] = await db.execute(
                'UPDATE products SET stock_quantity = ?, updated_at = NOW() WHERE id = ?',
                [update.quantity, update.productId]
              );
              
              if (result.affectedRows === 0) {
                throw new Error(`Product not found: ${update.productId}`);
              }
              
              results.push({
                productId: update.productId,
                newQuantity: update.quantity,
                updated: true
              });
            }
            
            await db.commit();
            
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({
                message: 'Bulk update completed successfully',
                results
              })
            };
            
          } catch (error) {
            await db.rollback();
            throw error;
          }
        } else if (body.type === 'stock_adjustment') {
          // Stock adjustment (increase/decrease)
          const { productId, adjustment, reason } = body;
          
          if (!productId || adjustment === undefined) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ message: 'productId and adjustment are required' })
            };
          }
          
          // Get current stock
          const [rows] = await db.execute(
            'SELECT stock_quantity FROM products WHERE id = ?',
            [productId]
          );
          
          if (rows.length === 0) {
            return {
              statusCode: 404,
              headers,
              body: JSON.stringify({ message: 'Product not found' })
            };
          }
          
          const currentStock = rows[0].stock_quantity;
          const newStock = Math.max(0, currentStock + adjustment); // Prevent negative stock
          
          // Update stock
          const [updateResult] = await db.execute(
            'UPDATE products SET stock_quantity = ?, updated_at = NOW() WHERE id = ?',
            [newStock, productId]
          );
          
          // Log the adjustment (optional - could be stored in a separate table)
          const logEntry = {
            productId,
            previousStock: currentStock,
            adjustment,
            newStock,
            reason: reason || 'Manual adjustment',
            timestamp: new Date().toISOString()
          };
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              message: 'Stock adjusted successfully',
              ...logEntry
            })
          };
        } else {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              message: 'Invalid operation. Use type: "bulk_update" or "stock_adjustment"' 
            })
          };
        }

      case 'PUT':
        // Update stock quantity for specific product
        if (!pathParameters || !pathParameters.id) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ message: 'Product ID is required' })
          };
        }

        const { stock_quantity, reason } = body;
        
        if (stock_quantity === undefined || stock_quantity < 0) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              message: 'Valid stock_quantity (>= 0) is required' 
            })
          };
        }

        // Get current stock for comparison
        const [currentRows] = await db.execute(
          'SELECT stock_quantity FROM products WHERE id = ?',
          [pathParameters.id]
        );
        
        if (currentRows.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ message: 'Product not found' })
          };
        }

        const [updateResult] = await db.execute(
          'UPDATE products SET stock_quantity = ?, updated_at = NOW() WHERE id = ?',
          [stock_quantity, pathParameters.id]
        );

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            message: 'Stock updated successfully',
            productId: pathParameters.id,
            previousStock: currentRows[0].stock_quantity,
            newStock: stock_quantity,
            reason: reason || 'Manual update'
          })
        };

      case 'DELETE':
        // Reset stock to zero (emergency stock clear)
        if (!pathParameters || !pathParameters.id) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ message: 'Product ID is required' })
          };
        }

        const [resetResult] = await db.execute(
          'UPDATE products SET stock_quantity = 0, updated_at = NOW() WHERE id = ?',
          [pathParameters.id]
        );

        if (resetResult.affectedRows === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ message: 'Product not found' })
          };
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            message: 'Stock reset to zero',
            productId: pathParameters.id
          })
        };

      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ message: 'Method not allowed' })
        };
    }

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
