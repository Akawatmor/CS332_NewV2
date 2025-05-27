const mysql = require('mysql2/promise');

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

async function initializeDatabase() {
  console.log('Starting database initialization...');
  console.log('DB Config:', {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    database: process.env.DB_NAME
  });
  
  try {
    // Connect to MySQL server first (not to specific database)
    const systemDbConfig = {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: 'mysql'
    };
    
    console.log('Connecting to MySQL system database...');
    const systemConnection = await mysql.createConnection(systemDbConfig);
    
    // Create database if it doesn't exist
    await systemConnection.execute('CREATE DATABASE IF NOT EXISTS salepoint_db');
    console.log('Database salepoint_db created or already exists');
    
    await systemConnection.end();
    
    // Now connect to the specific database
    console.log('Connecting to salepoint_db...');
    const dbConnection = await mysql.createConnection(dbConfig);
    
    // Create products table
    console.log('Creating products table...');
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
    
    // Create categories table
    console.log('Creating categories table...');
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
    
    // Create sales_staff table
    console.log('Creating sales_staff table...');
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
    
    // Create promotions table
    console.log('Creating promotions table...');
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
    
    // Insert sample data
    console.log('Inserting sample data...');
    
    // Sample categories
    await dbConnection.execute(`
      INSERT IGNORE INTO categories (name, description) VALUES
      ('Electronics', 'Electronic devices and accessories'),
      ('Clothing', 'Apparel and fashion items'),
      ('Books', 'Books and educational materials'),
      ('Home & Garden', 'Home improvement and gardening supplies'),
      ('Sports', 'Sports equipment and accessories')
    `);
    
    // Sample products
    await dbConnection.execute(`
      INSERT IGNORE INTO products (name, description, price, category, stock_quantity, specifications) VALUES
      ('Laptop Pro', 'High-performance laptop for professionals', 1299.99, 'Electronics', 50, '{"brand": "TechCorp", "ram": "16GB", "storage": "512GB SSD"}'),
      ('Wireless Headphones', 'Bluetooth noise-canceling headphones', 199.99, 'Electronics', 100, '{"brand": "AudioMax", "battery": "30h", "wireless": true}'),
      ('Business Shirt', 'Professional cotton dress shirt', 49.99, 'Clothing', 200, '{"material": "100% Cotton", "sizes": ["S", "M", "L", "XL"]}'),
      ('Programming Guide', 'Complete guide to modern programming', 39.99, 'Books', 75, '{"pages": 500, "author": "Tech Expert", "language": "English"}'),
      ('Garden Tools Set', 'Complete set of gardening tools', 89.99, 'Home & Garden', 30, '{"pieces": 12, "material": "Stainless Steel"}}')
    `);
    
    // Sample sales staff
    await dbConnection.execute(`
      INSERT IGNORE INTO sales_staff (name, email, phone, hire_date, commission_rate) VALUES
      ('John Smith', 'john.smith@salepoint.com', '+1-555-0101', '2023-01-15', 0.08),
      ('Sarah Johnson', 'sarah.johnson@salepoint.com', '+1-555-0102', '2023-02-20', 0.07),
      ('Mike Davis', 'mike.davis@salepoint.com', '+1-555-0103', '2023-03-10', 0.06)
    `);
    
    // Sample promotions
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
    
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

exports.handler = async (event) => {
  console.log('Database initialization function started');
  console.log('Event:', JSON.stringify(event, null, 2));
  
  try {
    const result = await initializeDatabase();
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Database initialized successfully',
        summary: result
      })
    };
    
  } catch (error) {
    console.error('Handler error:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Database initialization failed',
        message: error.message,
        stack: error.stack
      })
    };
  }
};