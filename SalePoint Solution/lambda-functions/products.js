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

// Database initialization function
async function initializeDatabase() {
  console.log('Starting database initialization...');
  
  // Connect to MySQL server first (not to specific database)
  const systemDbConfig = {
    ...dbConfig,
    database: 'mysql'
  };
  
  const systemConnection = await mysql.createConnection(systemDbConfig);
  
  // Create database if it doesn't exist
  await systemConnection.execute('CREATE DATABASE IF NOT EXISTS salepoint_db');
  console.log('Database salepoint_db created or already exists');
  
  await systemConnection.end();
  
  // Now connect to the specific database
  const dbConnection = await mysql.createConnection(dbConfig);
  
  // Create tables
  await dbConnection.execute(`
    CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      price DECIMAL(10, 2) NOT NULL,
      category VARCHAR(100) NOT NULL,
      stock_quantity INT DEFAULT 0,
      specifications JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_category (category),
      INDEX idx_stock_quantity (stock_quantity),
      INDEX idx_price (price)
    )
  `);
  
  await dbConnection.execute(`
    CREATE TABLE IF NOT EXISTS categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      description TEXT,
      parent_id INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
    )
  `);
  
  await dbConnection.execute(`
    CREATE TABLE IF NOT EXISTS sales_staff (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      phone VARCHAR(20),
      hire_date DATE,
      commission_rate DECIMAL(3, 2) DEFAULT 0.05,
      active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  
  await dbConnection.execute(`
    CREATE TABLE IF NOT EXISTS promotions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      discount_type ENUM('percentage', 'fixed_amount') NOT NULL,
      discount_value DECIMAL(10, 2) NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  
  await dbConnection.execute(`
    CREATE TABLE IF NOT EXISTS sales (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_id INT NOT NULL,
      quantity INT NOT NULL,
      unit_price DECIMAL(10, 2) NOT NULL,
      total_price DECIMAL(10, 2) NOT NULL,
      staff_id INT NOT NULL,
      promotion_id INT,
      sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      customer_name VARCHAR(255),
      customer_email VARCHAR(255),
      notes TEXT,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (staff_id) REFERENCES sales_staff(id) ON DELETE CASCADE,
      FOREIGN KEY (promotion_id) REFERENCES promotions(id) ON DELETE SET NULL,
      INDEX idx_sale_date (sale_date),
      INDEX idx_product_id (product_id),
      INDEX idx_staff_id (staff_id)
    )
  `);
  
  // Insert sample data
  await dbConnection.execute(`
    INSERT IGNORE INTO categories (name, description) VALUES 
    ('Electronics', 'Electronic devices and accessories'),
    ('Smartphones', 'Mobile phones and accessories'),
    ('Laptops', 'Portable computers'),
    ('Accessories', 'Various tech accessories')
  `);
  
  await dbConnection.execute(`
    INSERT IGNORE INTO sales_staff (name, email, phone, hire_date) VALUES 
    ('John Smith', 'john.smith@salepoint.com', '+1-555-0101', '2023-01-15'),
    ('Sarah Johnson', 'sarah.johnson@salepoint.com', '+1-555-0102', '2023-02-20'),
    ('Mike Davis', 'mike.davis@salepoint.com', '+1-555-0103', '2023-03-10')
  `);
  
  await dbConnection.execute(`
    INSERT IGNORE INTO products (name, description, price, category, stock_quantity, specifications) VALUES 
    ('iPhone 15', 'Latest Apple smartphone with advanced features', 999.99, 'Smartphones', 50, '{"storage": "128GB", "color": "Blue", "screen": "6.1 inch"}'),
    ('Samsung Galaxy S24', 'Flagship Android smartphone', 899.99, 'Smartphones', 45, '{"storage": "256GB", "color": "Black", "screen": "6.2 inch"}'),
    ('MacBook Pro 14"', 'Professional laptop for creative work', 1999.99, 'Laptops', 25, '{"processor": "M3", "ram": "16GB", "storage": "512GB"}'),
    ('Dell XPS 13', 'Ultrabook for business and productivity', 1299.99, 'Laptops', 30, '{"processor": "Intel i7", "ram": "16GB", "storage": "512GB"}'),
    ('AirPods Pro', 'Wireless earbuds with noise cancellation', 249.99, 'Accessories', 100, '{"battery": "6 hours", "features": "ANC, Transparency mode"}')
  `);
  
  await dbConnection.execute(`
    INSERT IGNORE INTO promotions (name, description, discount_type, discount_value, start_date, end_date) VALUES 
    ('Spring Sale', 'Spring discount on all products', 'percentage', 10.00, '2024-03-01', '2024-05-31'),
    ('Tech Week', 'Special discount on electronics', 'percentage', 15.00, '2024-04-01', '2024-04-30')
  `);
  
  // Get counts
  const [productsCount] = await dbConnection.execute('SELECT COUNT(*) as count FROM products');
  const [categoriesCount] = await dbConnection.execute('SELECT COUNT(*) as count FROM categories');
  const [staffCount] = await dbConnection.execute('SELECT COUNT(*) as count FROM sales_staff');
  const [promotionsCount] = await dbConnection.execute('SELECT COUNT(*) as count FROM promotions');
  
  await dbConnection.end();
  
  console.log('Database initialization completed successfully');
  
  return {
    products: productsCount[0].count,
    categories: categoriesCount[0].count,
    sales_staff: staffCount[0].count,
    promotions: promotionsCount[0].count
  };
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
        // Handle database initialization route
        if (path && path.includes('/init-db')) {
          console.log('Database initialization requested');
          try {
            const summary = await initializeDatabase();
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({
                message: 'Database initialized successfully',
                summary: summary
              })
            };
          } catch (error) {
            console.error('Database initialization error:', error);
            return {
              statusCode: 500,
              headers,
              body: JSON.stringify({
                error: 'Database initialization failed',
                message: error.message
              })
            };
          }
        }
        
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

      case 'POST':
        if (path === '/initialize') {
          // Initialize database
          const result = await initializeDatabase();
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              message: 'Database initialized successfully',
              data: result
            })
          };
        }
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ message: 'Method not allowed' })
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
