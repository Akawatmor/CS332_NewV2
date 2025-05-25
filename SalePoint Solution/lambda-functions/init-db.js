const mysql = require('mysql2/promise');
const fs = require('fs').promises;

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: 'mysql', // Connect to MySQL system database first
  connectionLimit: 10,
  acquireTimeout: 60000,
  timeout: 60000
};

exports.handler = async (event) => {
  console.log('Database Initialization Lambda Event:', JSON.stringify(event, null, 2));
  
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };

  try {
    console.log('Connecting to MySQL server...');
    const connection = await mysql.createConnection(dbConfig);
    
    // Create database if it doesn't exist
    console.log('Creating database salepoint_db if it does not exist...');
    await connection.execute('CREATE DATABASE IF NOT EXISTS salepoint_db');
    console.log('Database salepoint_db created or already exists');
    
    // Close current connection and reconnect to the new database
    await connection.end();
    
    // Connect to the salepoint_db database
    const dbSpecificConfig = {
      ...dbConfig,
      database: 'salepoint_db'
    };
    
    console.log('Connecting to salepoint_db database...');
    const dbConnection = await mysql.createConnection(dbSpecificConfig);
    
    // Create tables
    console.log('Creating database tables...');
    
    // Products table
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
    console.log('Products table created');
    
    // Categories table
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
    console.log('Categories table created');
    
    // Sales staff table
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
    console.log('Sales staff table created');
    
    // Promotions table
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
    console.log('Promotions table created');
    
    // Sales table
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
    console.log('Sales table created');
    
    // Check if we should insert sample data
    const action = event.queryStringParameters?.action || 'init';
    
    if (action === 'init_with_data') {
      console.log('Inserting sample data...');
      
      // Insert sample categories
      await dbConnection.execute(`
        INSERT IGNORE INTO categories (name, description) VALUES 
        ('Electronics', 'Electronic devices and accessories'),
        ('Smartphones', 'Mobile phones and accessories'),
        ('Laptops', 'Portable computers'),
        ('Accessories', 'Various tech accessories')
      `);
      
      // Insert sample sales staff
      await dbConnection.execute(`
        INSERT IGNORE INTO sales_staff (name, email, phone, hire_date) VALUES 
        ('John Smith', 'john.smith@salepoint.com', '+1-555-0101', '2023-01-15'),
        ('Sarah Johnson', 'sarah.johnson@salepoint.com', '+1-555-0102', '2023-02-20'),
        ('Mike Davis', 'mike.davis@salepoint.com', '+1-555-0103', '2023-03-10')
      `);
      
      // Insert sample products
      await dbConnection.execute(`
        INSERT IGNORE INTO products (name, description, price, category, stock_quantity, specifications) VALUES 
        ('iPhone 15', 'Latest Apple smartphone with advanced features', 999.99, 'Smartphones', 50, '{"storage": "128GB", "color": "Blue", "screen": "6.1 inch"}'),
        ('Samsung Galaxy S24', 'Flagship Android smartphone', 899.99, 'Smartphones', 45, '{"storage": "256GB", "color": "Black", "screen": "6.2 inch"}'),
        ('MacBook Pro 14"', 'Professional laptop for creative work', 1999.99, 'Laptops', 25, '{"processor": "M3", "ram": "16GB", "storage": "512GB"}'),
        ('Dell XPS 13', 'Ultrabook for business and productivity', 1299.99, 'Laptops', 30, '{"processor": "Intel i7", "ram": "16GB", "storage": "512GB"}'),
        ('AirPods Pro', 'Wireless earbuds with noise cancellation', 249.99, 'Accessories', 100, '{"battery": "6 hours", "features": "ANC, Transparency mode"}')`);
      
      // Insert sample promotions
      await dbConnection.execute(`
        INSERT IGNORE INTO promotions (name, description, discount_type, discount_value, start_date, end_date) VALUES 
        ('Spring Sale', 'Spring discount on all products', 'percentage', 10.00, '2024-03-01', '2024-05-31'),
        ('Tech Week', 'Special discount on electronics', 'percentage', 15.00, '2024-04-01', '2024-04-30')
      `);
      
      console.log('Sample data inserted');
    }
    
    // Get table counts
    const [productsCount] = await dbConnection.execute('SELECT COUNT(*) as count FROM products');
    const [categoriesCount] = await dbConnection.execute('SELECT COUNT(*) as count FROM categories');
    const [staffCount] = await dbConnection.execute('SELECT COUNT(*) as count FROM sales_staff');
    const [promotionsCount] = await dbConnection.execute('SELECT COUNT(*) as count FROM promotions');
    const [salesCount] = await dbConnection.execute('SELECT COUNT(*) as count FROM sales');
    
    await dbConnection.end();
    
    const summary = {
      database: 'salepoint_db',
      tables: {
        products: productsCount[0].count,
        categories: categoriesCount[0].count,
        sales_staff: staffCount[0].count,
        promotions: promotionsCount[0].count,
        sales: salesCount[0].count
      },
      action: action,
      status: 'success'
    };
    
    console.log('Database initialization completed:', summary);
    
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
        message: error.message,
        details: error.stack
      })
    };
  }
};
