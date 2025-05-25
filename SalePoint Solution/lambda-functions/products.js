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
  console.log('Products Lambda Event:', JSON.stringify(event, null, 2));
  
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };

  try {
    const httpMethod = event.httpMethod;
    const path = event.path;
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
          // Get specific product
          const [rows] = await db.execute(
            'SELECT * FROM products WHERE id = ?',
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
          // Get all products with optional filtering
          let query = 'SELECT * FROM products WHERE 1=1';
          const params = [];
          
          if (queryStringParameters.category) {
            query += ' AND category = ?';
            params.push(queryStringParameters.category);
          }
          
          if (queryStringParameters.search) {
            query += ' AND (name LIKE ? OR description LIKE ?)';
            params.push(`%${queryStringParameters.search}%`, `%${queryStringParameters.search}%`);
          }
          
          query += ' ORDER BY name';
          
          const [rows] = await db.execute(query, params);
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              products: rows,
              total: rows.length
            })
          };
        }

      case 'POST':
        // Create new product
        const { name, description, price, category, stock_quantity, specifications } = body;
        
        if (!name || !price || !category) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ message: 'Missing required fields: name, price, category' })
          };
        }

        const [result] = await db.execute(
          'INSERT INTO products (name, description, price, category, stock_quantity, specifications, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
          [name, description || '', price, category, stock_quantity || 0, JSON.stringify(specifications || {})]
        );

        return {
          statusCode: 201,
          headers,
          body: JSON.stringify({
            id: result.insertId,
            message: 'Product created successfully'
          })
        };

      case 'PUT':
        // Update product
        if (!pathParameters || !pathParameters.id) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ message: 'Product ID is required' })
          };
        }

        const updateFields = [];
        const updateParams = [];
        
        if (body.name) {
          updateFields.push('name = ?');
          updateParams.push(body.name);
        }
        if (body.description !== undefined) {
          updateFields.push('description = ?');
          updateParams.push(body.description);
        }
        if (body.price) {
          updateFields.push('price = ?');
          updateParams.push(body.price);
        }
        if (body.category) {
          updateFields.push('category = ?');
          updateParams.push(body.category);
        }
        if (body.stock_quantity !== undefined) {
          updateFields.push('stock_quantity = ?');
          updateParams.push(body.stock_quantity);
        }
        if (body.specifications) {
          updateFields.push('specifications = ?');
          updateParams.push(JSON.stringify(body.specifications));
        }

        if (updateFields.length === 0) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ message: 'No fields to update' })
          };
        }

        updateFields.push('updated_at = NOW()');
        updateParams.push(pathParameters.id);

        const [updateResult] = await db.execute(
          `UPDATE products SET ${updateFields.join(', ')} WHERE id = ?`,
          updateParams
        );

        if (updateResult.affectedRows === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ message: 'Product not found' })
          };
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ message: 'Product updated successfully' })
        };

      case 'DELETE':
        // Delete product
        if (!pathParameters || !pathParameters.id) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ message: 'Product ID is required' })
          };
        }

        const [deleteResult] = await db.execute(
          'DELETE FROM products WHERE id = ?',
          [pathParameters.id]
        );

        if (deleteResult.affectedRows === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ message: 'Product not found' })
          };
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ message: 'Product deleted successfully' })
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
