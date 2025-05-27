-- Simple Data for SalePoint Database
-- This file contains basic sample data that can be easily modified by administrators
-- 
-- 🎯 PURPOSE: This file serves as a reference for the sample data that gets loaded
--             automatically when you run ./deploy-foolproof.sh
--
-- 🔄 HOW IT WORKS: The deploy-foolproof.sh script reads the structure and values
--                  from this file and converts them to DynamoDB format for loading
--
-- ✏️  TO MODIFY: Edit the values below, then re-run ./deploy-foolproof.sh 
--               to apply your changes to the deployed system
--
-- 📊 ADMIN FRIENDLY: This SQL format is easy to read and modify, even though
--                    the actual database is DynamoDB (NoSQL)

USE salepoint_db;

-- ===========================================
-- CATEGORIES - Basic product categories
-- ===========================================
INSERT INTO categories (name, description) VALUES
('Electronics', 'Electronic devices and gadgets'),
('Office Supplies', 'Office equipment and materials'),
('Furniture', 'Office and workspace furniture'),
('Software', 'Software applications and licenses');

-- ===========================================
-- PRODUCTS - Sample products (Easy to modify)
-- ===========================================
INSERT INTO products (name, description, price, category, stock_quantity, specifications) VALUES
-- Electronics
('Laptop Computer', 'Modern laptop for business use', 1299.99, 'Electronics', 20, '{"processor": "Intel i5", "ram": "8GB", "storage": "256GB SSD"}'),
('Wireless Mouse', 'Bluetooth wireless mouse', 25.99, 'Electronics', 50, '{"connectivity": "Bluetooth", "dpi": "1200"}'),
('USB Webcam', 'HD webcam for video calls', 69.99, 'Electronics', 30, '{"resolution": "1080p", "microphone": "Built-in"}'),

-- Office Supplies  
('Notebook Set', 'Professional notebooks pack of 3', 15.99, 'Office Supplies', 100, '{"quantity": 3, "size": "A4", "pages": 150}'),
('Pen Set', 'Premium ballpoint pens pack of 10', 12.99, 'Office Supplies', 75, '{"quantity": 10, "color": "Blue/Black", "type": "Ballpoint"}'),
('Stapler', 'Heavy-duty office stapler', 18.99, 'Office Supplies', 40, '{"capacity": "25 sheets", "staple_size": "Standard"}'),

-- Furniture
('Office Chair', 'Ergonomic office chair with back support', 299.99, 'Furniture', 15, '{"material": "Mesh", "adjustable": "Yes", "warranty": "2 years"}'),
('Standing Desk', 'Adjustable height standing desk', 599.99, 'Furniture', 8, '{"height_range": "28-46 inches", "surface": "120x60 cm"}'),

-- Software
('Office Suite', 'Complete office productivity suite', 79.99, 'Software', 100, '{"license": "1 year", "applications": "Word, Excel, PowerPoint", "cloud": "Included"}'),
('Antivirus Software', 'Premium antivirus protection', 49.99, 'Software', 50, '{"license": "1 year", "devices": "3", "features": "Real-time protection"}}');

-- ===========================================
-- SALES STAFF - Default admin and staff
-- ===========================================
INSERT INTO sales_staff (id, name, email, department) VALUES
('admin', 'System Administrator', 'admin@salepoint.local', 'Administration'),
('manager1', 'Sales Manager', 'manager@salepoint.local', 'Sales Management'),
('sales1', 'Sales Representative', 'sales@salepoint.local', 'Sales'),
('sales2', 'Junior Sales Rep', 'junior@salepoint.local', 'Sales');

-- ===========================================
-- PROMOTIONS - Basic promotional offers
-- ===========================================
INSERT INTO promotions (name, description, discount_type, discount_value, start_date, end_date, applicable_categories, active) VALUES
('Welcome Discount', 'New customer welcome offer', 'percentage', 10.00, '2024-01-01', '2024-12-31', NULL, TRUE),
('Office Bundle', 'Office supplies discount', 'percentage', 15.00, '2024-11-01', '2024-12-31', 'Office Supplies', TRUE),
('Tech Sale', 'Electronics promotional pricing', 'percentage', 12.00, '2024-11-15', '2024-12-31', 'Electronics', TRUE);

-- ===========================================
-- SAMPLE CUSTOMERS (Optional - for testing)
-- ===========================================
INSERT INTO customers (name, email, phone, company, address, notes) VALUES
('Demo Customer', 'demo@customer.com', '+1-555-0123', 'Demo Company Ltd', '123 Demo Street, Demo City, DC 12345', 'Sample customer for testing'),
('Test Business', 'contact@testbiz.com', '+1-555-0456', 'Test Business Inc', '456 Test Avenue, Test Town, TT 67890', 'Another test customer account');

-- ===========================================
-- SAMPLE ORDERS (Enhanced with Sales Analytics)
-- ===========================================
-- Note: These create comprehensive order history with sales rep assignments
INSERT INTO orders (customer_id, sales_person_id, items, total_amount, order_date, status, shipping_address, notes) VALUES
(1, 'sales1', '[{"product_id": 1, "quantity": 2, "price": 1299.99}]', 2599.98, '2024-10-25', 'completed', '123 Demo Street, Demo City, DC 12345', 'Bulk laptop order'),
(2, 'sales2', '[{"product_id": 4, "quantity": 5, "price": 15.99}, {"product_id": 2, "quantity": 2, "price": 25.99}]', 131.93, '2024-11-01', 'completed', '456 Test Avenue, Test Town, TT 67890', 'Office supplies order'),
(1, 'sales1', '[{"product_id": 3, "quantity": 3, "price": 299.99}]', 899.97, '2024-11-10', 'completed', '123 Demo Street, Demo City, DC 12345', 'Office furniture expansion'),
(2, 'sales2', '[{"product_id": 1, "quantity": 1, "price": 1299.99}, {"product_id": 4, "quantity": 3, "price": 15.99}]', 1347.96, '2024-11-15', 'pending', '456 Test Avenue, Test Town, TT 67890', 'Follow-up order - processing'),
(1, 'manager1', '[{"product_id": 2, "quantity": 10, "price": 25.99}, {"product_id": 4, "quantity": 10, "price": 15.99}]', 419.80, '2024-11-20', 'shipped', '123 Demo Street, Demo City, DC 12345', 'Bulk office supplies order'),
(2, 'sales1', '[{"product_id": 3, "quantity": 5, "price": 299.99}]', 1499.95, '2024-11-22', 'completed', '456 Test Avenue, Test Town, TT 67890', 'Office expansion - conference room');

-- ===========================================
-- INVENTORY TRACKING (Comprehensive Stock Management)
-- ===========================================
-- Note: This creates detailed inventory with stock movements and analytics
INSERT INTO inventory (product_id, current_stock, minimum_stock, maximum_stock, location, bin_location, reorder_point, average_monthly_sales, stock_movements) VALUES
(1, 15, 5, 50, 'Warehouse A', 'A-12-3', 10, 8, '[
  {"movement_id": "mv_001", "type": "IN", "quantity": 25, "reason": "Initial stock", "date": "2024-10-25", "reference": "PO-2024-001"},
  {"movement_id": "mv_002", "type": "OUT", "quantity": 3, "reason": "Sales", "date": "2024-11-10", "reference": "Multiple Orders"},
  {"movement_id": "mv_003", "type": "OUT", "quantity": 7, "reason": "Damage adjustment", "date": "2024-11-20", "reference": "ADJ-2024-001"}
]'),
(2, 38, 20, 100, 'Warehouse A', 'A-15-1', 25, 15, '[
  {"movement_id": "mv_004", "type": "IN", "quantity": 50, "reason": "Initial stock", "date": "2024-10-25", "reference": "PO-2024-002"},
  {"movement_id": "mv_005", "type": "OUT", "quantity": 12, "reason": "Sales", "date": "2024-11-20", "reference": "Bulk Order"}
]'),
(3, 7, 5, 30, 'Warehouse B', 'B-10-2', 8, 6, '[
  {"movement_id": "mv_006", "type": "IN", "quantity": 15, "reason": "Initial stock", "date": "2024-10-25", "reference": "PO-2024-003"},
  {"movement_id": "mv_007", "type": "OUT", "quantity": 8, "reason": "Sales", "date": "2024-11-22", "reference": "Conference Room Order"}
]'),
(4, 82, 25, 200, 'Warehouse A', 'A-08-4', 40, 25, '[
  {"movement_id": "mv_008", "type": "IN", "quantity": 100, "reason": "Initial stock", "date": "2024-10-25", "reference": "PO-2024-004"},
  {"movement_id": "mv_009", "type": "OUT", "quantity": 18, "reason": "Sales", "date": "2024-11-20", "reference": "Office Supplies Orders"}
]');

-- ===========================================
-- ADMIN NOTES - Enhanced Sample Data
-- ===========================================
-- To modify this data:
-- 1. Edit the values above directly in this file
-- 2. Add new INSERT statements for additional data
-- 3. Re-run the deployment script to apply changes
-- 4. Or connect to database manually and run specific commands
--
-- Categories: Add new product categories as needed
-- Products: Modify prices, descriptions, stock quantities
-- Staff: Add new sales staff members  
-- Promotions: Create seasonal or special offers
-- Customers: Add real customer data (remove samples)
-- Orders: Comprehensive sales history with sales rep assignments
-- Inventory: Full stock tracking with movement history and analytics
--
-- 📊 DASHBOARD ANALYTICS READY:
-- • Sales Performance: Revenue trends, sales rep performance
-- • Inventory Management: Stock levels, reorder alerts, movement tracking  
-- • Customer Analytics: Order history, spending patterns
-- • Product Analytics: Sales performance, stock turnover
--
-- 🔄 INVENTORY FEATURES:
-- • Stock movement tracking (IN/OUT with reasons)
-- • Low stock alerts and reorder points
-- • Location and bin tracking
-- • Average monthly sales calculations
--
-- 💰 SALES ANALYTICS:
-- • Sales rep assignment and performance tracking
-- • Order status progression (pending → shipped → completed)
-- • Revenue trends over time
-- • Customer purchase patterns
--
-- Remember to backup the database before making changes!
