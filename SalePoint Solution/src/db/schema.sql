-- SalePoint Solution Database Schema
-- This schema is designed for MySQL RDS and supports all test cases

CREATE DATABASE IF NOT EXISTS salepointdb;
USE salepointdb;

-- Product Categories Table
CREATE TABLE product_categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Products Table (Main product data)
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    stock_quantity INT NOT NULL DEFAULT 0,
    category_id INT,
    image_url VARCHAR(500),
    specifications TEXT,
    supplier VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES product_categories(category_id),
    INDEX idx_product_id (product_id),
    INDEX idx_name (name),
    INDEX idx_category (category_id),
    INDEX idx_stock (stock_quantity)
);

-- Customers Table
CREATE TABLE customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    zip_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'USA',
    company VARCHAR(255),
    credit_limit DECIMAL(12,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_customer_id (customer_id),
    INDEX idx_name (name),
    INDEX idx_city (city),
    INDEX idx_state (state),
    INDEX idx_email (email)
);

-- Sales Representatives Table
CREATE TABLE sales_representatives (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sales_rep_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    territory VARCHAR(100),
    commission_rate DECIMAL(5,2) DEFAULT 0.05,
    manager_id VARCHAR(50),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_sales_rep_id (sales_rep_id),
    INDEX idx_territory (territory),
    INDEX idx_active (active)
);

-- Sales Table
CREATE TABLE sales (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sale_id VARCHAR(50) UNIQUE NOT NULL,
    customer_id VARCHAR(50) NOT NULL,
    sales_rep_id VARCHAR(50) NOT NULL,
    sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pending', 'confirmed', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(12,2) DEFAULT 0.00,
    tax_amount DECIMAL(12,2) DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON UPDATE CASCADE,
    FOREIGN KEY (sales_rep_id) REFERENCES sales_representatives(sales_rep_id) ON UPDATE CASCADE,
    INDEX idx_sale_id (sale_id),
    INDEX idx_customer_id (customer_id),
    INDEX idx_sales_rep_id (sales_rep_id),
    INDEX idx_sale_date (sale_date),
    INDEX idx_status (status)
);

-- Sale Items Table
CREATE TABLE sale_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sale_id VARCHAR(50) NOT NULL,
    product_id VARCHAR(50) NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sale_id) REFERENCES sales(sale_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON UPDATE CASCADE,
    INDEX idx_sale_id (sale_id),
    INDEX idx_product_id (product_id)
);

-- Customer Sales Rep Assignments Table
CREATE TABLE customer_sales_rep_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id VARCHAR(50) NOT NULL,
    sales_rep_id VARCHAR(50) NOT NULL,
    assigned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON UPDATE CASCADE,
    FOREIGN KEY (sales_rep_id) REFERENCES sales_representatives(sales_rep_id) ON UPDATE CASCADE,
    UNIQUE KEY unique_active_assignment (customer_id, is_active),
    INDEX idx_customer_id (customer_id),
    INDEX idx_sales_rep_id (sales_rep_id),
    INDEX idx_active (is_active)
);

-- Insert sample categories
INSERT INTO product_categories (name, description) VALUES
('Electronics', 'Electronic devices and components'),
('Software', 'Software products and licenses'),
('Hardware', 'Computer hardware and peripherals'),
('Office Supplies', 'General office and business supplies'),
('Furniture', 'Office and business furniture');

-- Insert sample products
INSERT INTO products (product_id, name, description, price, stock_quantity, category_id, image_url) VALUES
('PROD-001', 'Laptop Computer', 'High-performance business laptop', 1299.99, 50, 1, 'https://via.placeholder.com/300x200'),
('PROD-002', 'Wireless Mouse', 'Ergonomic wireless mouse', 29.99, 100, 1, 'https://via.placeholder.com/300x200'),
('PROD-003', 'Office Chair', 'Ergonomic office chair with lumbar support', 299.99, 25, 5, 'https://via.placeholder.com/300x200'),
('PROD-004', 'Monitor 24"', '24-inch LED monitor', 199.99, 30, 1, 'https://via.placeholder.com/300x200'),
('PROD-005', 'Keyboard', 'Mechanical keyboard', 89.99, 75, 1, 'https://via.placeholder.com/300x200'),
('PROD-006', 'Printer', 'Multifunction laser printer', 249.99, 15, 1, 'https://via.placeholder.com/300x200'),
('PROD-007', 'Office Desk', 'Standing desk with adjustable height', 599.99, 10, 5, 'https://via.placeholder.com/300x200'),
('PROD-008', 'Webcam', 'HD webcam for video conferencing', 79.99, 40, 1, 'https://via.placeholder.com/300x200');

-- Insert sample sales representatives
INSERT INTO sales_representatives (sales_rep_id, name, email, phone, territory) VALUES
('REP-001', 'John Smith', 'john.smith@salepoint.com', '555-0101', 'North'),
('REP-002', 'Sarah Johnson', 'sarah.johnson@salepoint.com', '555-0102', 'South'),
('REP-003', 'Mike Brown', 'mike.brown@salepoint.com', '555-0103', 'East'),
('REP-004', 'Lisa Davis', 'lisa.davis@salepoint.com', '555-0104', 'West'),
('REP-005', 'Tom Wilson', 'tom.wilson@salepoint.com', '555-0105', 'Central');

-- Insert sample customers
INSERT INTO customers (customer_id, name, email, phone, address, city, state, zip_code, company) VALUES
('CUST-001', 'Acme Corporation', 'contact@acme.com', '555-1001', '123 Business St', 'New York', 'NY', '10001', 'Acme Corporation'),
('CUST-002', 'TechStart Inc', 'info@techstart.com', '555-1002', '456 Innovation Ave', 'San Francisco', 'CA', '94102', 'TechStart Inc'),
('CUST-003', 'Global Solutions LLC', 'hello@globalsolutions.com', '555-1003', '789 Enterprise Blvd', 'Chicago', 'IL', '60601', 'Global Solutions LLC'),
('CUST-004', 'Digital Dynamics', 'support@digitaldynamics.com', '555-1004', '321 Tech Plaza', 'Austin', 'TX', '73301', 'Digital Dynamics'),
('CUST-005', 'Future Systems', 'contact@futuresystems.com', '555-1005', '654 Modern Way', 'Seattle', 'WA', '98101', 'Future Systems');

-- Insert sample customer-sales rep assignments
INSERT INTO customer_sales_rep_assignments (customer_id, sales_rep_id) VALUES
('CUST-001', 'REP-001'),
('CUST-002', 'REP-004'),
('CUST-003', 'REP-003'),
('CUST-004', 'REP-002'),
('CUST-005', 'REP-004');

-- Insert sample sales
INSERT INTO sales (sale_id, customer_id, sales_rep_id, status, total_amount, tax_amount) VALUES
('SALE-001', 'CUST-001', 'REP-001', 'delivered', 1629.97, 130.40),
('SALE-002', 'CUST-002', 'REP-004', 'shipped', 799.98, 64.00),
('SALE-003', 'CUST-003', 'REP-003', 'confirmed', 1199.98, 96.00),
('SALE-004', 'CUST-004', 'REP-002', 'pending', 329.98, 26.40),
('SALE-005', 'CUST-005', 'REP-004', 'delivered', 899.98, 72.00);

-- Insert sample sale items
INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total_price) VALUES
('SALE-001', 'PROD-001', 1, 1299.99, 1299.99),
('SALE-001', 'PROD-002', 1, 29.99, 29.99),
('SALE-001', 'PROD-005', 1, 89.99, 89.99),
('SALE-001', 'PROD-008', 1, 79.99, 79.99),
('SALE-002', 'PROD-004', 2, 199.99, 399.98),
('SALE-002', 'PROD-002', 2, 29.99, 59.98),
('SALE-002', 'PROD-005', 1, 89.99, 89.99),
('SALE-002', 'PROD-006', 1, 249.99, 249.99),
('SALE-003', 'PROD-003', 4, 299.99, 1199.96),
('SALE-004', 'PROD-002', 1, 29.99, 29.99),
('SALE-004', 'PROD-003', 1, 299.99, 299.99),
('SALE-005', 'PROD-007', 1, 599.99, 599.99),
('SALE-005', 'PROD-003', 1, 299.99, 299.99);

-- Create views for common queries
CREATE VIEW sales_summary AS
SELECT 
    s.sale_id,
    s.sale_date,
    c.name as customer_name,
    c.city,
    c.state,
    sr.name as sales_rep_name,
    s.status,
    s.total_amount,
    s.tax_amount,
    (s.total_amount + s.tax_amount) as grand_total
FROM sales s
JOIN customers c ON s.customer_id = c.customer_id
JOIN sales_representatives sr ON s.sales_rep_id = sr.sales_rep_id;

CREATE VIEW product_sales_summary AS
SELECT 
    p.product_id,
    p.name as product_name,
    p.price,
    p.stock_quantity,
    pc.name as category_name,
    COALESCE(SUM(si.quantity), 0) as total_sold,
    COALESCE(SUM(si.total_price), 0) as total_revenue
FROM products p
LEFT JOIN product_categories pc ON p.category_id = pc.category_id
LEFT JOIN sale_items si ON p.product_id = si.product_id
GROUP BY p.product_id, p.name, p.price, p.stock_quantity, pc.name;

-- Create triggers for inventory management
DELIMITER //

CREATE TRIGGER update_inventory_on_sale 
AFTER INSERT ON sale_items
FOR EACH ROW
BEGIN
    UPDATE products 
    SET stock_quantity = stock_quantity - NEW.quantity 
    WHERE product_id = NEW.product_id;
END //

CREATE TRIGGER restore_inventory_on_sale_cancel
AFTER UPDATE ON sales
FOR EACH ROW
BEGIN
    IF OLD.status != 'cancelled' AND NEW.status = 'cancelled' THEN
        UPDATE products p
        SET stock_quantity = stock_quantity + si.quantity
        FROM sale_items si
        WHERE p.product_id = si.product_id AND si.sale_id = NEW.sale_id;
    END IF;
END //

DELIMITER ;
