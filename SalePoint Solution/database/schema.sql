-- Sale Point Database Schema
-- MySQL database schema for the Sale Point application

-- Create database
CREATE DATABASE IF NOT EXISTS salepoint_db;
USE salepoint_db;

-- Products table
CREATE TABLE products (
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
);

-- Product categories reference table
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sales staff table (for reference)
CREATE TABLE sales_staff (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    department VARCHAR(100),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Promotions table
CREATE TABLE promotions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    discount_type ENUM('percentage', 'fixed_amount') NOT NULL,
    discount_value DECIMAL(10, 2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    applicable_categories JSON,
    minimum_order_value DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_dates (start_date, end_date),
    INDEX idx_active (active)
);

-- Document storage reference table
CREATE TABLE documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50),
    file_size INT,
    s3_key VARCHAR(500) NOT NULL,
    product_id INT,
    category VARCHAR(100),
    uploaded_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
    INDEX idx_product_id (product_id),
    INDEX idx_category (category)
);

-- Stock movement log (for audit trail)
CREATE TABLE stock_movements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    movement_type ENUM('in', 'out', 'adjustment') NOT NULL,
    quantity INT NOT NULL,
    previous_stock INT NOT NULL,
    new_stock INT NOT NULL,
    reason VARCHAR(255),
    reference_id VARCHAR(100), -- Could be order ID, adjustment ID, etc.
    created_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_product_id (product_id),
    INDEX idx_movement_type (movement_type),    INDEX idx_created_at (created_at)
);

-- Documents table
CREATE TABLE documents (
    documentId VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    filename VARCHAR(255) NOT NULL,
    fileSize BIGINT NOT NULL,
    mimeType VARCHAR(100) NOT NULL,
    category VARCHAR(100) NOT NULL,
    accessLevel ENUM('all', 'sales', 'manager', 'admin') DEFAULT 'all',
    s3Key VARCHAR(500) NOT NULL,
    uploadedBy VARCHAR(50) NOT NULL,
    uploadedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_access_level (accessLevel),
    INDEX idx_uploaded_by (uploadedBy),
    INDEX idx_uploaded_at (uploadedAt)
);

-- Views for common queries
CREATE VIEW low_stock_products AS
SELECT 
    p.id,
    p.name,
    p.category,
    p.stock_quantity,
    p.price,
    (p.stock_quantity * p.price) as stock_value
FROM products p
WHERE p.stock_quantity <= 10
ORDER BY p.stock_quantity ASC;

CREATE VIEW out_of_stock_products AS
SELECT 
    p.id,
    p.name,
    p.category,
    p.price
FROM products p
WHERE p.stock_quantity = 0
ORDER BY p.name;

CREATE VIEW category_summary AS
SELECT 
    p.category,
    COUNT(*) as total_products,
    SUM(p.stock_quantity) as total_stock,
    SUM(p.stock_quantity * p.price) as total_value,
    AVG(p.price) as average_price,
    COUNT(CASE WHEN p.stock_quantity = 0 THEN 1 END) as out_of_stock_count
FROM products p
GROUP BY p.category
ORDER BY total_value DESC;
