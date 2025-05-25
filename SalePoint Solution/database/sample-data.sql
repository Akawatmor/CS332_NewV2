-- Sample Data for Sale Point Application
-- Run this after creating the main schema

USE salepoint;

-- Insert sample categories
INSERT INTO categories (name, description) VALUES
('Electronics', 'Electronic devices and accessories'),
('Office Supplies', 'Office equipment and supplies'),
('Furniture', 'Office and home furniture'),
('Software', 'Software applications and licenses'),
('Hardware', 'Computer hardware components'),
('Networking', 'Network equipment and accessories');

-- Insert sample products
INSERT INTO products (name, description, price, category, stock_quantity, specifications) VALUES
('Dell Laptop XPS 15', 'High-performance laptop with Intel i7 processor', 1899.99, 'Electronics', 25, '{"processor": "Intel i7-12700H", "ram": "16GB", "storage": "512GB SSD", "screen": "15.6 inch 4K"}'),
('HP Office Printer', 'Multifunction printer for office use', 299.99, 'Electronics', 15, '{"type": "Inkjet", "functions": ["Print", "Scan", "Copy"], "connectivity": ["USB", "WiFi"]}'),
('Ergonomic Office Chair', 'Comfortable chair with lumbar support', 449.99, 'Furniture', 30, '{"material": "Mesh", "adjustable": true, "lumbar_support": true, "armrests": "Adjustable"}'),
('Wireless Mouse', 'Bluetooth wireless mouse', 29.99, 'Electronics', 100, '{"connectivity": "Bluetooth", "dpi": "1600", "buttons": 3, "battery": "AA"}'),
('Office Desk', 'Modern standing desk with adjustable height', 699.99, 'Furniture', 12, '{"height_range": "29-48 inches", "material": "Wood", "electric": true, "memory_settings": 4}'),
('Microsoft Office 365', 'Annual subscription for Office suite', 99.99, 'Software', 200, '{"license_type": "Annual", "applications": ["Word", "Excel", "PowerPoint", "Outlook"], "cloud_storage": "1TB"}'),
('Network Switch 24-port', '24-port Gigabit Ethernet switch', 189.99, 'Networking', 8, '{"ports": 24, "speed": "Gigabit", "managed": false, "power": "External adapter"}'),
('USB-C Hub', 'Multi-port USB-C hub with HDMI', 79.99, 'Electronics', 45, '{"ports": ["USB-A x3", "HDMI", "USB-C", "SD Card"], "power_delivery": "100W"}'),
('Notebook A4', 'Professional notebook for meetings', 12.99, 'Office Supplies', 150, '{"size": "A4", "pages": 200, "binding": "Spiral", "paper": "Lined"}'),
('Webcam HD', 'Full HD webcam for video calls', 89.99, 'Electronics', 35, '{"resolution": "1080p", "framerate": "30fps", "microphone": "Built-in", "autofocus": true}'),
('Router WiFi 6', 'High-speed WiFi 6 router', 249.99, 'Networking', 18, '{"standard": "WiFi 6", "speed": "AX3000", "coverage": "2500 sq ft", "antennas": 4}'),
('Monitor 27 inch', '27-inch 4K monitor for professional work', 399.99, 'Electronics', 22, '{"size": "27 inch", "resolution": "4K", "panel": "IPS", "ports": ["HDMI", "DisplayPort", "USB-C"]}'),
('Office Supplies Kit', 'Complete office supplies starter kit', 39.99, 'Office Supplies', 75, '{"contents": ["Pens", "Pencils", "Stapler", "Paper clips", "Sticky notes", "Ruler"]}'),
('External Hard Drive', '2TB external hard drive', 89.99, 'Hardware', 40, '{"capacity": "2TB", "interface": "USB 3.0", "portable": true, "encryption": "Hardware"}'),
('Conference Phone', 'Professional conference phone system', 299.99, 'Electronics', 10, '{"type": "VoIP", "microphone_range": "12 feet", "echo_cancellation": true, "bluetooth": true}');

-- Insert sample sales staff
INSERT INTO sales_staff (id, name, email, department) VALUES
('admin-001', 'John Administrator', 'admin@salepoint.com', 'Administration'),
('mgr-001', 'Sarah Manager', 'manager@salepoint.com', 'Sales Management'),
('sales-001', 'Mike Sales', 'sales@salepoint.com', 'Sales'),
('sales-002', 'Emily Johnson', 'emily.johnson@salepoint.com', 'Sales'),
('sales-003', 'David Wilson', 'david.wilson@salepoint.com', 'Sales'),
('mgr-002', 'Lisa Brown', 'lisa.brown@salepoint.com', 'Sales Management');

-- Insert sample promotions
INSERT INTO promotions (name, description, discount_type, discount_value, start_date, end_date, applicable_categories, active) VALUES
('Electronics Sale', 'End of year electronics discount', 'percentage', 15.00, '2024-12-01', '2024-12-31', 'Electronics', TRUE),
('Office Furniture Clearance', 'Furniture clearance sale', 'percentage', 20.00, '2024-11-15', '2024-12-15', 'Furniture', TRUE),
('Software Bundle Deal', 'Buy 2 get 1 free on software licenses', 'percentage', 10.00, '2024-11-01', '2024-11-30', 'Software', TRUE),
('New Customer Discount', 'First-time buyer discount', 'fixed_amount', 50.00, '2024-01-01', '2024-12-31', NULL, TRUE);

-- Insert sample documents (these would typically be uploaded through the application)
INSERT INTO documents (documentId, title, description, filename, fileSize, mimeType, category, accessLevel, s3Key, uploadedBy) VALUES
('doc-001', 'Product Catalog 2024', 'Complete product catalog for 2024', 'product-catalog-2024.pdf', 2048576, 'application/pdf', 'Sales Materials', 'all', 'documents/product-catalog-2024.pdf', 'admin-001'),
('doc-002', 'Sales Training Manual', 'Comprehensive sales training guide', 'sales-training-manual.pdf', 5242880, 'application/pdf', 'Training Materials', 'sales', 'documents/sales-training-manual.pdf', 'mgr-001'),
('doc-003', 'Price List Q4 2024', 'Current pricing for all products', 'price-list-q4-2024.xlsx', 102400, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Sales Materials', 'all', 'documents/price-list-q4-2024.xlsx', 'admin-001'),
('doc-004', 'Commission Structure', 'Sales commission structure and policies', 'commission-structure.docx', 256000, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'Policies', 'manager', 'documents/commission-structure.docx', 'mgr-001'),
('doc-005', 'Customer Service Guidelines', 'Guidelines for customer interactions', 'customer-service-guidelines.pdf', 1048576, 'application/pdf', 'Training Materials', 'all', 'documents/customer-service-guidelines.pdf', 'mgr-002');

-- Insert sample stock movements
INSERT INTO stock_movements (product_id, movement_type, quantity, previous_stock, new_stock, reason, reference_id, created_by) VALUES
-- Initial stock
(1, 'in', 25, 0, 25, 'Initial inventory', 'INV-001', 'admin-001'),
(2, 'in', 15, 0, 15, 'Initial inventory', 'INV-001', 'admin-001'),
(3, 'in', 30, 0, 30, 'Initial inventory', 'INV-001', 'admin-001'),
(4, 'in', 100, 0, 100, 'Initial inventory', 'INV-001', 'admin-001'),
(5, 'in', 12, 0, 12, 'Initial inventory', 'INV-001', 'admin-001'),

-- Some sales movements
(1, 'out', 3, 25, 22, 'Sale to customer', 'ORDER-001', 'sales-001'),
(4, 'out', 10, 100, 90, 'Bulk sale', 'ORDER-002', 'sales-002'),
(2, 'out', 2, 15, 13, 'Sale to customer', 'ORDER-003', 'sales-001'),

-- Restocking
(4, 'in', 20, 90, 110, 'Restocking', 'PO-001', 'admin-001'),
(1, 'in', 5, 22, 27, 'Restocking', 'PO-002', 'admin-001'),

-- Adjustments
(3, 'adjustment', -2, 30, 28, 'Damaged items', 'ADJ-001', 'mgr-001');

-- Update stock quantities to match movements
UPDATE products p 
SET stock_quantity = (
    SELECT COALESCE(
        (SELECT new_stock 
         FROM stock_movements sm 
         WHERE sm.product_id = p.id 
         ORDER BY sm.created_at DESC 
         LIMIT 1), 
        p.stock_quantity
    )
);

-- Add some index optimization
ANALYZE TABLE products;
ANALYZE TABLE stock_movements;
ANALYZE TABLE categories;
ANALYZE TABLE promotions;
ANALYZE TABLE documents;

-- Show summary
SELECT 'Database setup complete!' as Status;
SELECT COUNT(*) as Total_Products FROM products;
SELECT COUNT(*) as Total_Categories FROM categories;
SELECT COUNT(*) as Total_Staff FROM sales_staff;
SELECT COUNT(*) as Total_Promotions FROM promotions;
SELECT COUNT(*) as Total_Documents FROM documents;
SELECT COUNT(*) as Total_Stock_Movements FROM stock_movements;
