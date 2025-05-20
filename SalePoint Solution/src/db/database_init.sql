-- SalePoint Solution Database Initialization Script
-- This script creates the necessary tables for the SalePoint Solution in Amazon RDS MySQL

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS salepoint_db;
USE salepoint_db;

-- Drop tables if they exist to ensure clean setup
DROP TABLE IF EXISTS sales_products;
DROP TABLE IF EXISTS sales;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS sales_reps;
DROP TABLE IF EXISTS product_categories;
DROP TABLE IF EXISTS departments;

-- Create departments table
CREATE TABLE departments (
    department_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    manager_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create product categories table
CREATE TABLE product_categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create products table
CREATE TABLE products (
    product_id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    stock_quantity INT NOT NULL DEFAULT 0,
    category_id INT,
    image_url VARCHAR(255),
    document_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES product_categories(category_id)
);

-- Create sales reps table
CREATE TABLE sales_reps (
    sales_rep_id VARCHAR(20) PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20),
    department_id INT,
    hire_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(department_id)
);

-- Create customers table
CREATE TABLE customers (
    customer_id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    country VARCHAR(50) DEFAULT 'USA',
    assigned_sales_rep_id VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_sales_rep_id) REFERENCES sales_reps(sales_rep_id)
);

-- Create sales table (main information stored in DynamoDB, this is for relational connections)
CREATE TABLE sales (
    sale_id VARCHAR(20) PRIMARY KEY,
    customer_id VARCHAR(20) NOT NULL,
    sales_rep_id VARCHAR(20) NOT NULL,
    sale_date TIMESTAMP NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL,
    status ENUM('Pending', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
    FOREIGN KEY (sales_rep_id) REFERENCES sales_reps(sales_rep_id)
);

-- Create sales products junction table for storing products in each sale
CREATE TABLE sales_products (
    sale_id VARCHAR(20),
    product_id VARCHAR(20),
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (sale_id, product_id),
    FOREIGN KEY (sale_id) REFERENCES sales(sale_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- Create indexes for performance
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_customers_sales_rep ON customers(assigned_sales_rep_id);
CREATE INDEX idx_sales_customer ON sales(customer_id);
CREATE INDEX idx_sales_sales_rep ON sales(sales_rep_id);
CREATE INDEX idx_sales_status ON sales(status);
CREATE INDEX idx_sales_date ON sales(sale_date);

-- Insert sample departments
INSERT INTO departments (name, manager_name) VALUES
('Sales', 'Robert Anderson'),
('Marketing', 'Jessica Williams'),
('Customer Service', 'David Miller'),
('IT Support', 'Patricia Clark');

-- Insert sample product categories
INSERT INTO product_categories (name, description) VALUES
('Hardware', 'Physical computing equipment including servers, computers, and peripherals'),
('Software', 'Computer programs and applications'),
('Networking', 'Network equipment and solutions'),
('Security', 'Security solutions and services'),
('Cloud Services', 'Cloud-based solutions and subscriptions');

-- Insert sample products
INSERT INTO products (product_id, name, description, price, stock_quantity, category_id, image_url) VALUES
('PROD-2001', 'Enterprise Server', 'High-performance enterprise server with redundant systems', 4999.99, 12, 1, 'images/products/server.jpg'),
('PROD-2002', 'Business Laptop Pro', '15" business laptop with i7 processor and 16GB RAM', 1499.99, 32, 1, 'images/products/laptop.jpg'),
('PROD-2003', 'Network Security Suite', 'Complete network security solution for enterprise', 2499.99, 8, 4, 'images/products/security.jpg'),
('PROD-2004', '4K Monitor', '27" 4K UHD monitor with HDR support', 599.99, 45, 1, 'images/products/monitor.jpg'),
('PROD-2005', 'Cloud Storage Plan (1TB)', '1TB cloud storage plan annual subscription', 99.99, 100, 5, 'images/products/cloud.jpg'),
('PROD-2006', 'Wireless Keyboard and Mouse', 'Ergonomic wireless keyboard and mouse combo', 79.99, 67, 1, 'images/products/keyboard.jpg'),
('PROD-2007', 'Office Software Suite', 'Complete office productivity software suite', 299.99, 53, 2, 'images/products/software.jpg'),
('PROD-2008', 'Virtual Meeting License', 'Annual license for virtual meeting platform', 149.99, 200, 5, 'images/products/meeting.jpg'),
('PROD-2009', 'Data Backup Solution', 'Automated backup solution for business data', 399.99, 28, 2, 'images/products/backup.jpg'),
('PROD-2010', 'UPS Battery Backup', '1500VA UPS with voltage regulation', 249.99, 15, 1, 'images/products/ups.jpg'),
('PROD-2011', 'Smartphone Business Edition', 'Enterprise smartphone with enhanced security', 899.99, 42, 1, 'images/products/smartphone.jpg'),
('PROD-2012', 'Enterprise Router', 'High-performance enterprise router', 349.99, 18, 3, 'images/products/router.jpg');

-- Insert sample sales reps
INSERT INTO sales_reps (sales_rep_id, first_name, last_name, email, phone, department_id, hire_date) VALUES
('SR-101', 'John', 'Smith', 'john.smith@salepoint.com', '555-111-2222', 1, '2020-03-15'),
('SR-102', 'Sarah', 'Johnson', 'sarah.johnson@salepoint.com', '555-222-3333', 1, '2020-06-22'),
('SR-103', 'Michael', 'Brown', 'michael.brown@salepoint.com', '555-333-4444', 1, '2021-01-10'),
('SR-104', 'Emily', 'Davis', 'emily.davis@salepoint.com', '555-444-5555', 1, '2021-08-05');

-- Insert sample customers
INSERT INTO customers (customer_id, name, contact_person, email, phone, address, city, state, zip_code, assigned_sales_rep_id) VALUES
('CUST-1001', 'Acme Corporation', 'James Wilson', 'orders@acme.com', '555-123-4567', '123 Main St', 'Chicago', 'IL', '60601', 'SR-101'),
('CUST-1002', 'TechNova Solutions', 'Linda Martinez', 'info@technova.com', '555-987-6543', '456 Tech Blvd', 'Austin', 'TX', '78701', 'SR-102'),
('CUST-1003', 'Global Industries', 'Robert Thompson', 'purchasing@globalind.com', '555-456-7890', '789 Industrial Way', 'Seattle', 'WA', '98101', 'SR-104'),
('CUST-1004', 'Infinite Systems', 'Amanda Lee', 'sales@infinitesys.com', '555-789-0123', '101 Innovation Dr', 'Boston', 'MA', '02110', 'SR-103'),
('CUST-1005', 'Peak Performance Inc', 'Daniel Garcia', 'orders@peakperf.com', '555-234-5678', '202 Summit Ave', 'Denver', 'CO', '80202', 'SR-101');

-- Insert sample sales (these would typically be created through the application)
INSERT INTO sales (sale_id, customer_id, sales_rep_id, sale_date, total_amount, status) VALUES
('SALE-1001', 'CUST-1001', 'SR-101', '2025-02-01 10:30:00', 7499.98, 'Completed'),
('SALE-1002', 'CUST-1002', 'SR-102', '2025-02-05 14:15:00', 8999.90, 'Pending'),
('SALE-1003', 'CUST-1004', 'SR-103', '2025-02-10 09:45:00', 2499.80, 'Cancelled'),
('SALE-1004', 'CUST-1003', 'SR-104', '2025-02-12 16:20:00', 5439.84, 'Completed'),
('SALE-1005', 'CUST-1005', 'SR-101', '2025-02-15 11:30:00', 899.97, 'Pending');

-- Insert sample sales products
INSERT INTO sales_products (sale_id, product_id, quantity, unit_price) VALUES
('SALE-1001', 'PROD-2001', 1, 4999.99),
('SALE-1001', 'PROD-2003', 1, 2499.99),
('SALE-1002', 'PROD-2002', 5, 1499.99),
('SALE-1002', 'PROD-2007', 5, 299.99),
('SALE-1003', 'PROD-2005', 10, 99.99),
('SALE-1003', 'PROD-2008', 10, 149.99),
('SALE-1004', 'PROD-2004', 8, 599.99),
('SALE-1004', 'PROD-2006', 8, 79.99),
('SALE-1005', 'PROD-2009', 1, 399.99),
('SALE-1005', 'PROD-2010', 2, 249.99);

-- Create a view for sales summary reporting
CREATE OR REPLACE VIEW sales_summary AS
SELECT 
    s.sale_id,
    s.sale_date,
    c.name AS customer_name,
    CONCAT(sr.first_name, ' ', sr.last_name) AS sales_rep_name,
    s.total_amount,
    s.status,
    COUNT(sp.product_id) AS total_products
FROM 
    sales s
JOIN 
    customers c ON s.customer_id = c.customer_id
JOIN 
    sales_reps sr ON s.sales_rep_id = sr.sales_rep_id
JOIN 
    sales_products sp ON s.sale_id = sp.sale_id
GROUP BY 
    s.sale_id, s.sale_date, c.name, sr.first_name, sr.last_name, s.total_amount, s.status;

-- Create a view for product sales analytics
CREATE OR REPLACE VIEW product_sales_analytics AS
SELECT 
    p.product_id,
    p.name AS product_name,
    pc.name AS category_name,
    SUM(sp.quantity) AS total_units_sold,
    SUM(sp.quantity * sp.unit_price) AS total_revenue,
    COUNT(DISTINCT s.sale_id) AS number_of_sales
FROM 
    products p
JOIN 
    product_categories pc ON p.category_id = pc.category_id
LEFT JOIN 
    sales_products sp ON p.product_id = sp.product_id
LEFT JOIN 
    sales s ON sp.sale_id = s.sale_id AND s.status != 'Cancelled'
GROUP BY 
    p.product_id, p.name, pc.name;

-- Create a view for sales rep performance
CREATE OR REPLACE VIEW sales_rep_performance AS
SELECT 
    sr.sales_rep_id,
    CONCAT(sr.first_name, ' ', sr.last_name) AS sales_rep_name,
    COUNT(DISTINCT s.sale_id) AS total_sales,
    SUM(s.total_amount) AS total_revenue,
    COUNT(DISTINCT s.customer_id) AS unique_customers,
    AVG(s.total_amount) AS avg_sale_value
FROM 
    sales_reps sr
LEFT JOIN 
    sales s ON sr.sales_rep_id = s.sales_rep_id AND s.status != 'Cancelled'
GROUP BY 
    sr.sales_rep_id, sr.first_name, sr.last_name;
