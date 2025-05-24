# SalePoint Solution - COMPLETE Implementation Guide (Fixed)

This document provides the corrected and complete step-by-step instructions for implementing the SalePoint Solution with REAL DATA integration.

## Prerequisites

- Access to AWS Academy Learner Lab
- Web browser
- Basic understanding of AWS services
- LabRole policy permissions

## Implementation Steps

## 1. Database Setup

### 1.1 Create Amazon RDS Database (Primary data store)

1. Navigate to the Amazon RDS console
2. Click "Create database"
3. Select "Standard create"
4. Choose "MySQL" as the engine type
5. Select "Free tier" for template
6. Configure settings:
   - DB instance identifier: `salepoint-rds`
   - Master username: `admin`
   - Master password: Create and save a secure password (e.g., `SalePoint123!`)
7. Select "Burstable classes (includes t classes)" and "db.t3.micro"
8. For storage, keep default 20 GB gp2
9. Under "Connectivity":
   - Choose "Yes" for "Public access"
   - Create a new security group named "salepoint-rds-sg"
   - Add inbound rule: MySQL/Aurora (3306) from Anywhere (0.0.0.0/0)
10. Under "Additional configuration":
    - Initial database name: `salepointdb`
    - Enable automated backups with 7-day retention
11. Click "Create database"
12. **IMPORTANT**: Note the endpoint URL once created

### 1.2 Create Amazon DynamoDB Tables (Secondary/tracking data)

#### Table 1: SalesTracking
1. Navigate to DynamoDB console
2. Click "Create table"
3. Configure:
   - Table name: `SalesTracking`
   - Partition key: `SaleID` (String)
   - Sort key: `Timestamp` (String)
4. Use on-demand billing
5. Click "Create table"

#### Table 2: CustomerSalesRepTracking
1. Click "Create table"
2. Configure:
   - Table name: `CustomerSalesRepTracking`
   - Partition key: `CustomerID` (String)
   - Sort key: `SalesRepID` (String)
4. Use on-demand billing
5. Click "Create table"

## 2. Storage Setup

### 2.1 Create S3 Bucket (for product images and web hosting)

1. Navigate to S3 console
2. Click "Create bucket"
3. Configure:
   - Bucket name: `salepoint-files-[your-initials]-[random-number]` (must be globally unique)
   - Region: us-east-1 (or your preferred region)
4. **Uncheck** "Block all public access"
5. Acknowledge the warning
6. Enable "Static website hosting" in Properties tab
7. Set index document: `index.html`
8. Click "Create bucket"

### 2.2 Configure S3 Bucket Policy

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
        }
    ]
}
```

### 2.3 Create Folder Structure
- `product-images/`
- `product-specs/`

## 3. Lambda Functions Setup (REAL DATA INTEGRATION)

### 3.1 Create MySQL Layer for Lambda

1. Create a zip file with MySQL dependency:
```bash
mkdir nodejs
cd nodejs
npm init -y
npm install mysql2
cd ..
zip -r mysql-layer.zip nodejs/
```

2. In Lambda console → Layers → Create layer
3. Name: `mysql-layer`
4. Upload the zip file
5. Compatible runtimes: Node.js 18.x

### 3.2 Create GetProductInfo Lambda Function

1. Lambda console → Create function
2. Function name: `GetProductInfo`
3. Runtime: Node.js 18.x
4. Use existing role: LabRole

**Code:**
```javascript
const mysql = require('mysql2/promise');

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    };
    
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: 'CORS preflight successful' })
        };
    }
    
    try {
        // Database connection
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: 3306
        });
        
        const method = event.httpMethod;
        const pathParameters = event.pathParameters || {};
        const queryStringParameters = event.queryStringParameters || {};
        const body = event.body ? JSON.parse(event.body) : {};
        
        let result;
        
        switch (method) {
            case 'GET':
                if (pathParameters.productId) {
                    // Get specific product
                    const [rows] = await connection.execute(
                        'SELECT * FROM products WHERE product_id = ?',
                        [pathParameters.productId]
                    );
                    result = rows[0] || null;
                    if (!result) {
                        await connection.end();
                        return {
                            statusCode: 404,
                            headers,
                            body: JSON.stringify({ message: 'Product not found' })
                        };
                    }
                } else {
                    // Get all products with optional filtering
                    let query = 'SELECT * FROM products';
                    let params = [];
                    
                    if (queryStringParameters.search) {
                        query += ' WHERE name LIKE ? OR description LIKE ?';
                        params.push(`%${queryStringParameters.search}%`, `%${queryStringParameters.search}%`);
                    }
                    
                    if (queryStringParameters.category && queryStringParameters.search) {
                        query += ' AND category_id = (SELECT category_id FROM product_categories WHERE name = ?)';
                        params.push(queryStringParameters.category);
                    } else if (queryStringParameters.category) {
                        query += ' WHERE category_id = (SELECT category_id FROM product_categories WHERE name = ?)';
                        params.push(queryStringParameters.category);
                    }
                    
                    const [rows] = await connection.execute(query, params);
                    result = { products: rows, count: rows.length };
                }
                break;
                
            case 'POST':
                // Create new product
                const { product_id, name, description, price, stock_quantity, category_id } = body;
                
                if (!product_id || !name || !price || stock_quantity === undefined) {
                    await connection.end();
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ message: 'Missing required fields: product_id, name, price, stock_quantity' })
                    };
                }
                
                await connection.execute(
                    'INSERT INTO products (product_id, name, description, price, stock_quantity, category_id) VALUES (?, ?, ?, ?, ?, ?)',
                    [product_id, name, description || '', price, stock_quantity, category_id || 1]
                );
                
                result = { message: 'Product created successfully', product_id };
                break;
                
            case 'PUT':
                // Update product
                if (!pathParameters.productId) {
                    await connection.end();
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ message: 'Product ID required' })
                    };
                }
                
                const updateFields = [];
                const updateValues = [];
                
                Object.entries(body).forEach(([key, value]) => {
                    if (['name', 'description', 'price', 'stock_quantity', 'category_id'].includes(key)) {
                        updateFields.push(`${key} = ?`);
                        updateValues.push(value);
                    }
                });
                
                if (updateFields.length === 0) {
                    await connection.end();
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ message: 'No valid fields to update' })
                    };
                }
                
                updateValues.push(pathParameters.productId);
                
                await connection.execute(
                    `UPDATE products SET ${updateFields.join(', ')} WHERE product_id = ?`,
                    updateValues
                );
                
                result = { message: 'Product updated successfully' };
                break;
                
            case 'DELETE':
                // Delete product
                if (!pathParameters.productId) {
                    await connection.end();
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ message: 'Product ID required' })
                    };
                }
                
                await connection.execute(
                    'DELETE FROM products WHERE product_id = ?',
                    [pathParameters.productId]
                );
                
                result = { message: 'Product deleted successfully' };
                break;
                
            default:
                await connection.end();
                return {
                    statusCode: 405,
                    headers,
                    body: JSON.stringify({ message: 'Method not allowed' })
                };
        }
        
        await connection.end();
        
        return {
            statusCode: method === 'POST' ? 201 : 200,
            headers,
            body: JSON.stringify(result)
        };
        
    } catch (error) {
        console.error('Database error:', error);
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
```

**Environment Variables:**
- `DB_HOST`: Your RDS endpoint
- `DB_USER`: admin
- `DB_PASSWORD`: Your RDS password
- `DB_NAME`: salepointdb

**Add Layer:** Attach the mysql-layer created above

### 3.3 Create CustomerSalesRepTracking Lambda Function

**Code:**
```javascript
const mysql = require('mysql2/promise');
const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    };
    
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: JSON.stringify({ message: 'CORS preflight successful' }) };
    }
    
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: 3306
        });
        
        const method = event.httpMethod;
        const pathParameters = event.pathParameters || {};
        const queryStringParameters = event.queryStringParameters || {};
        const body = event.body ? JSON.parse(event.body) : {};
        const path = event.resource;
        
        let result;
        
        switch (method) {
            case 'GET':
                if (path.includes('/customers/{customerId}')) {
                    // Get specific customer
                    const [rows] = await connection.execute(
                        `SELECT c.*, sr.name as sales_rep_name 
                         FROM customers c 
                         LEFT JOIN sales_reps sr ON c.assigned_sales_rep_id = sr.sales_rep_id 
                         WHERE c.customer_id = ?`,
                        [pathParameters.customerId]
                    );
                    result = rows[0] || null;
                    if (!result) {
                        await connection.end();
                        return { statusCode: 404, headers, body: JSON.stringify({ message: 'Customer not found' }) };
                    }
                } else if (path.includes('/customers')) {
                    // Get all customers
                    let query = `SELECT c.*, sr.name as sales_rep_name 
                                FROM customers c 
                                LEFT JOIN sales_reps sr ON c.assigned_sales_rep_id = sr.sales_rep_id`;
                    let params = [];
                    
                    if (queryStringParameters.salesRep) {
                        query += ' WHERE c.assigned_sales_rep_id = ?';
                        params.push(queryStringParameters.salesRep);
                    }
                    
                    const [rows] = await connection.execute(query, params);
                    result = { customers: rows, count: rows.length };
                } else if (path.includes('/salesreps/{salesRepId}/customers')) {
                    // Get customers for specific sales rep
                    const [rows] = await connection.execute(
                        `SELECT c.*, sr.name as sales_rep_name 
                         FROM customers c 
                         LEFT JOIN sales_reps sr ON c.assigned_sales_rep_id = sr.sales_rep_id 
                         WHERE c.assigned_sales_rep_id = ?`,
                        [pathParameters.salesRepId]
                    );
                    result = { customers: rows, count: rows.length };
                } else if (path.includes('/salesreps')) {
                    // Get all sales reps
                    const [rows] = await connection.execute('SELECT * FROM sales_reps');
                    result = { salesReps: rows, count: rows.length };
                }
                break;
                
            case 'POST':
                if (path.includes('/customers')) {
                    // Create new customer
                    const { customer_id, name, email, phone, assigned_sales_rep_id } = body;
                    
                    if (!customer_id || !name) {
                        await connection.end();
                        return { statusCode: 400, headers, body: JSON.stringify({ message: 'Missing required fields: customer_id, name' }) };
                    }
                    
                    await connection.execute(
                        'INSERT INTO customers (customer_id, name, email, phone, assigned_sales_rep_id) VALUES (?, ?, ?, ?, ?)',
                        [customer_id, name, email || '', phone || '', assigned_sales_rep_id || null]
                    );
                    
                    // Also track in DynamoDB
                    if (assigned_sales_rep_id) {
                        await dynamoDB.put({
                            TableName: 'CustomerSalesRepTracking',
                            Item: {
                                CustomerID: customer_id,
                                SalesRepID: assigned_sales_rep_id,
                                AssignedDate: new Date().toISOString(),
                                Status: 'Active'
                            }
                        }).promise();
                    }
                    
                    result = { message: 'Customer created successfully', customer_id };
                } else if (path.includes('/assignments')) {
                    // Assign customer to sales rep
                    const { customer_id, sales_rep_id } = body;
                    
                    if (!customer_id || !sales_rep_id) {
                        await connection.end();
                        return { statusCode: 400, headers, body: JSON.stringify({ message: 'Missing required fields: customer_id, sales_rep_id' }) };
                    }
                    
                    // Update in MySQL
                    await connection.execute(
                        'UPDATE customers SET assigned_sales_rep_id = ? WHERE customer_id = ?',
                        [sales_rep_id, customer_id]
                    );
                    
                    // Track in DynamoDB
                    await dynamoDB.put({
                        TableName: 'CustomerSalesRepTracking',
                        Item: {
                            CustomerID: customer_id,
                            SalesRepID: sales_rep_id,
                            AssignedDate: new Date().toISOString(),
                            Status: 'Active'
                        }
                    }).promise();
                    
                    result = { message: 'Assignment created successfully' };
                }
                break;
                
            case 'PUT':
                // Update customer
                if (!pathParameters.customerId) {
                    await connection.end();
                    return { statusCode: 400, headers, body: JSON.stringify({ message: 'Customer ID required' }) };
                }
                
                const updateFields = [];
                const updateValues = [];
                
                Object.entries(body).forEach(([key, value]) => {
                    if (['name', 'email', 'phone', 'assigned_sales_rep_id', 'address', 'city', 'state'].includes(key)) {
                        updateFields.push(`${key} = ?`);
                        updateValues.push(value);
                    }
                });
                
                if (updateFields.length === 0) {
                    await connection.end();
                    return { statusCode: 400, headers, body: JSON.stringify({ message: 'No valid fields to update' }) };
                }
                
                updateValues.push(pathParameters.customerId);
                
                await connection.execute(
                    `UPDATE customers SET ${updateFields.join(', ')} WHERE customer_id = ?`,
                    updateValues
                );
                
                result = { message: 'Customer updated successfully' };
                break;
                
            case 'DELETE':
                // Delete customer
                if (!pathParameters.customerId) {
                    await connection.end();
                    return { statusCode: 400, headers, body: JSON.stringify({ message: 'Customer ID required' }) };
                }
                
                await connection.execute('DELETE FROM customers WHERE customer_id = ?', [pathParameters.customerId]);
                
                // Also remove from DynamoDB tracking
                try {
                    await dynamoDB.delete({
                        TableName: 'CustomerSalesRepTracking',
                        Key: { CustomerID: pathParameters.customerId }
                    }).promise();
                } catch (dynamoError) {
                    console.log('DynamoDB delete error (non-critical):', dynamoError);
                }
                
                result = { message: 'Customer deleted successfully' };
                break;
                
            default:
                await connection.end();
                return { statusCode: 405, headers, body: JSON.stringify({ message: 'Method not allowed' }) };
        }
        
        await connection.end();
        
        return {
            statusCode: method === 'POST' ? 201 : 200,
            headers,
            body: JSON.stringify(result)
        };
        
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: 'Internal server error', error: error.message })
        };
    }
};
```

**Environment Variables:** Same as GetProductInfo
**Add Layer:** mysql-layer

### 3.4 Create SalesTracking Lambda Function

**Code:**
```javascript
const mysql = require('mysql2/promise');
const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    };
    
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: JSON.stringify({ message: 'CORS preflight successful' }) };
    }
    
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: 3306
        });
        
        const method = event.httpMethod;
        const pathParameters = event.pathParameters || {};
        const queryStringParameters = event.queryStringParameters || {};
        const body = event.body ? JSON.parse(event.body) : {};
        
        let result;
        
        switch (method) {
            case 'GET':
                if (pathParameters.saleId) {
                    // Get specific sale with items
                    const [saleRows] = await connection.execute(
                        `SELECT s.*, c.name as customer_name, sr.name as sales_rep_name 
                         FROM sales s 
                         LEFT JOIN customers c ON s.customer_id = c.customer_id 
                         LEFT JOIN sales_reps sr ON s.sales_rep_id = sr.sales_rep_id 
                         WHERE s.sale_id = ?`,
                        [pathParameters.saleId]
                    );
                    
                    if (saleRows.length === 0) {
                        await connection.end();
                        return { statusCode: 404, headers, body: JSON.stringify({ message: 'Sale not found' }) };
                    }
                    
                    const sale = saleRows[0];
                    
                    // Get sale items
                    const [itemRows] = await connection.execute(
                        `SELECT si.*, p.name as product_name 
                         FROM sale_items si 
                         LEFT JOIN products p ON si.product_id = p.product_id 
                         WHERE si.sale_id = ?`,
                        [pathParameters.saleId]
                    );
                    
                    sale.items = itemRows;
                    result = sale;
                } else {
                    // Get all sales
                    let query = `SELECT s.*, c.name as customer_name, sr.name as sales_rep_name 
                                FROM sales s 
                                LEFT JOIN customers c ON s.customer_id = c.customer_id 
                                LEFT JOIN sales_reps sr ON s.sales_rep_id = sr.sales_rep_id`;
                    let params = [];
                    
                    if (queryStringParameters.status) {
                        query += ' WHERE s.status = ?';
                        params.push(queryStringParameters.status);
                    }
                    
                    if (queryStringParameters.salesRep) {
                        query += queryStringParameters.status ? ' AND' : ' WHERE';
                        query += ' s.sales_rep_id = ?';
                        params.push(queryStringParameters.salesRep);
                    }
                    
                    query += ' ORDER BY s.created_at DESC';
                    
                    const [rows] = await connection.execute(query, params);
                    result = { sales: rows, count: rows.length };
                }
                break;
                
            case 'POST':
                // Create new sale
                const { customer_id, sales_rep_id, items, notes } = body;
                
                if (!customer_id || !sales_rep_id || !items || !Array.isArray(items) || items.length === 0) {
                    await connection.end();
                    return { statusCode: 400, headers, body: JSON.stringify({ 
                        message: 'Missing required fields: customer_id, sales_rep_id, items (array)' 
                    }) };
                }
                
                // Start transaction
                await connection.beginTransaction();
                
                try {
                    // Generate sale ID
                    const sale_id = `SALE-${Date.now()}`;
                    
                    // Calculate total
                    let total_amount = 0;
                    for (const item of items) {
                        total_amount += (item.price || 0) * (item.quantity || 0);
                    }
                    
                    // Insert sale
                    await connection.execute(
                        'INSERT INTO sales (sale_id, customer_id, sales_rep_id, total_amount, status, notes) VALUES (?, ?, ?, ?, ?, ?)',
                        [sale_id, customer_id, sales_rep_id, total_amount, 'Pending', notes || '']
                    );
                    
                    // Insert sale items and update inventory
                    for (const item of items) {
                        // Insert sale item
                        await connection.execute(
                            'INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)',
                            [sale_id, item.product_id, item.quantity, item.price, item.price * item.quantity]
                        );
                        
                        // Update product inventory
                        await connection.execute(
                            'UPDATE products SET stock_quantity = stock_quantity - ? WHERE product_id = ?',
                            [item.quantity, item.product_id]
                        );
                    }
                    
                    // Track in DynamoDB
                    await dynamoDB.put({
                        TableName: 'SalesTracking',
                        Item: {
                            SaleID: sale_id,
                            Timestamp: new Date().toISOString(),
                            CustomerID: customer_id,
                            SalesRepID: sales_rep_id,
                            TotalAmount: total_amount,
                            Status: 'Pending',
                            ItemCount: items.length
                        }
                    }).promise();
                    
                    await connection.commit();
                    
                    result = { message: 'Sale created successfully', sale_id, total_amount };
                } catch (error) {
                    await connection.rollback();
                    throw error;
                }
                break;
                
            case 'PUT':
                // Update sale
                if (!pathParameters.saleId) {
                    await connection.end();
                    return { statusCode: 400, headers, body: JSON.stringify({ message: 'Sale ID required' }) };
                }
                
                const updateFields = [];
                const updateValues = [];
                
                Object.entries(body).forEach(([key, value]) => {
                    if (['status', 'notes', 'total_amount'].includes(key)) {
                        updateFields.push(`${key} = ?`);
                        updateValues.push(value);
                    }
                });
                
                if (updateFields.length === 0) {
                    await connection.end();
                    return { statusCode: 400, headers, body: JSON.stringify({ message: 'No valid fields to update' }) };
                }
                
                updateValues.push(pathParameters.saleId);
                
                await connection.execute(
                    `UPDATE sales SET ${updateFields.join(', ')} WHERE sale_id = ?`,
                    updateValues
                );
                
                // Update DynamoDB tracking
                const updateExpression = [];
                const expressionValues = {};
                
                if (body.status) {
                    updateExpression.push('Status = :status');
                    expressionValues[':status'] = body.status;
                }
                
                if (updateExpression.length > 0) {
                    await dynamoDB.update({
                        TableName: 'SalesTracking',
                        Key: { SaleID: pathParameters.saleId },
                        UpdateExpression: `SET ${updateExpression.join(', ')}`,
                        ExpressionAttributeValues: expressionValues
                    }).promise();
                }
                
                result = { message: 'Sale updated successfully' };
                break;
                
            case 'DELETE':
                // Delete sale (and restore inventory)
                if (!pathParameters.saleId) {
                    await connection.end();
                    return { statusCode: 400, headers, body: JSON.stringify({ message: 'Sale ID required' }) };
                }
                
                await connection.beginTransaction();
                
                try {
                    // Get sale items to restore inventory
                    const [itemRows] = await connection.execute(
                        'SELECT product_id, quantity FROM sale_items WHERE sale_id = ?',
                        [pathParameters.saleId]
                    );
                    
                    // Restore inventory
                    for (const item of itemRows) {
                        await connection.execute(
                            'UPDATE products SET stock_quantity = stock_quantity + ? WHERE product_id = ?',
                            [item.quantity, item.product_id]
                        );
                    }
                    
                    // Delete sale items
                    await connection.execute('DELETE FROM sale_items WHERE sale_id = ?', [pathParameters.saleId]);
                    
                    // Delete sale
                    await connection.execute('DELETE FROM sales WHERE sale_id = ?', [pathParameters.saleId]);
                    
                    // Remove from DynamoDB
                    await dynamoDB.delete({
                        TableName: 'SalesTracking',
                        Key: { SaleID: pathParameters.saleId }
                    }).promise();
                    
                    await connection.commit();
                    
                    result = { message: 'Sale deleted successfully and inventory restored' };
                } catch (error) {
                    await connection.rollback();
                    throw error;
                }
                break;
                
            default:
                await connection.end();
                return { statusCode: 405, headers, body: JSON.stringify({ message: 'Method not allowed' }) };
        }
        
        await connection.end();
        
        return {
            statusCode: method === 'POST' ? 201 : 200,
            headers,
            body: JSON.stringify(result)
        };
        
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: 'Internal server error', error: error.message })
        };
    }
};
```

**Environment Variables:** Same as others
**Add Layer:** mysql-layer

## 4. COMPLETE API Gateway Setup

### 4.1 Create API Gateway
1. Navigate to API Gateway console
2. Create API → REST API → Build
3. API name: `SalePointAPI`
4. Endpoint Type: Regional
5. Create API

### 4.2 Create COMPLETE Resource Structure

#### Products Resources:
1. **Create Resource:** `/products`
   - **GET** → GetProductInfo (list all products)
   - **POST** → GetProductInfo (create product)

2. **Create Resource:** `/products/{productId}`
   - **GET** → GetProductInfo (get specific product)
   - **PUT** → GetProductInfo (update product)
   - **DELETE** → GetProductInfo (delete product)

#### Customers Resources:
3. **Create Resource:** `/customers`
   - **GET** → CustomerSalesRepTracking (list all customers)
   - **POST** → CustomerSalesRepTracking (create customer)

4. **Create Resource:** `/customers/{customerId}`
   - **GET** → CustomerSalesRepTracking (get specific customer)
   - **PUT** → CustomerSalesRepTracking (update customer)
   - **DELETE** → CustomerSalesRepTracking (delete customer)

#### Sales Reps Resources:
5. **Create Resource:** `/salesreps`
   - **GET** → CustomerSalesRepTracking (list all sales reps)

6. **Create Resource:** `/salesreps/{salesRepId}`

7. **Create Resource:** `/salesreps/{salesRepId}/customers`
   - **GET** → CustomerSalesRepTracking (get customers for sales rep)

#### Assignments Resource:
8. **Create Resource:** `/assignments`
   - **POST** → CustomerSalesRepTracking (assign customer to sales rep)

#### Sales Resources:
9. **Create Resource:** `/sales`
   - **GET** → SalesTracking (list all sales)
   - **POST** → SalesTracking (create sale)

10. **Create Resource:** `/sales/{saleId}`
    - **GET** → SalesTracking (get specific sale)
    - **PUT** → SalesTracking (update sale)
    - **DELETE** → SalesTracking (delete sale)

### 4.3 Enable CORS for ALL Resources
For each resource:
1. Select resource → Actions → Enable CORS
2. Access-Control-Allow-Origin: `*`
3. Access-Control-Allow-Headers: `Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token`
4. Access-Control-Allow-Methods: `GET,POST,PUT,DELETE,OPTIONS`

### 4.4 Deploy API
1. Actions → Deploy API
2. Stage: `prod`
3. Deploy
4. **NOTE THE INVOKE URL** - you'll need this for the web app

## 5. Database Initialization with REAL DATA

Connect to your RDS instance and run this SQL:

```sql
-- Create database and tables
CREATE DATABASE IF NOT EXISTS salepointdb;
USE salepointdb;

-- Product categories
CREATE TABLE product_categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products
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

-- Sales reps
CREATE TABLE sales_reps (
    sales_rep_id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    department VARCHAR(50),
    hire_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customers
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

-- Sales
CREATE TABLE sales (
    sale_id VARCHAR(30) PRIMARY KEY,
    customer_id VARCHAR(20) NOT NULL,
    sales_rep_id VARCHAR(20) NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL,
    status ENUM('Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled') DEFAULT 'Pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
    FOREIGN KEY (sales_rep_id) REFERENCES sales_reps(sales_rep_id)
);

-- Sale items
CREATE TABLE sale_items (
    sale_item_id INT AUTO_INCREMENT PRIMARY KEY,
    sale_id VARCHAR(30) NOT NULL,
    product_id VARCHAR(20) NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(12, 2) NOT NULL,
    FOREIGN KEY (sale_id) REFERENCES sales(sale_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- Insert sample data
INSERT INTO product_categories (name, description) VALUES
('Electronics', 'Electronic devices and accessories'),
('Office Supplies', 'Office furniture and supplies'),
('Software', 'Software licenses and applications');

INSERT INTO sales_reps (sales_rep_id, name, email, phone, department, hire_date) VALUES
('SR001', 'John Smith', 'john.smith@company.com', '555-0101', 'Sales', '2023-01-15'),
('SR002', 'Sarah Johnson', 'sarah.johnson@company.com', '555-0102', 'Sales', '2023-02-20'),
('SR003', 'Mike Wilson', 'mike.wilson@company.com', '555-0103', 'Sales', '2023-03-10');

INSERT INTO products (product_id, name, description, price, stock_quantity, category_id) VALUES
('PROD001', 'Professional Laptop', 'High-performance business laptop with 16GB RAM, 512GB SSD', 1299.99, 25, 1),
('PROD002', 'Wireless Mouse', 'Ergonomic wireless mouse with precision tracking', 49.99, 150, 1),
('PROD003', 'Mechanical Keyboard', 'Professional mechanical keyboard with RGB lighting', 149.99, 75, 1),
('PROD004', 'Office Chair', 'Ergonomic office chair with lumbar support', 299.99, 50, 2),
('PROD005', 'Standing Desk', 'Adjustable height standing desk', 599.99, 20, 2),
('PROD006', 'Microsoft Office 365', '1-year subscription to Office 365 Business', 99.99, 1000, 3);

INSERT INTO customers (customer_id, name, contact_person, email, phone, address, city, state, assigned_sales_rep_id) VALUES
('CUST001', 'Acme Corporation', 'John Doe', 'john.doe@acme.com', '555-1001', '123 Business St', 'New York', 'NY', 'SR001'),
('CUST002', 'TechFlow Industries', 'Jane Smith', 'jane.smith@techflow.com', '555-1002', '456 Tech Ave', 'San Francisco', 'CA', 'SR001'),
('CUST003', 'Global Solutions Inc', 'Bob Johnson', 'bob.johnson@globalsolutions.com', '555-1003', '789 Corporate Blvd', 'Chicago', 'IL', 'SR002'),
('CUST004', 'Innovation Labs', 'Alice Wilson', 'alice.wilson@innovationlabs.com', '555-1004', '321 Innovation Dr', 'Austin', 'TX', 'SR003');

-- Sample sales
INSERT INTO sales (sale_id, customer_id, sales_rep_id, total_amount, status, notes) VALUES
('SALE-1703158800000', 'CUST001', 'SR001', 1749.97, 'Delivered', 'Bulk order with discount'),
('SALE-1703245200000', 'CUST002', 'SR001', 299.98, 'Shipped', 'Express shipping requested'),
('SALE-1703331600000', 'CUST003', 'SR002', 599.99, 'Confirmed', 'Installation required');

-- Sample sale items
INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total_price) VALUES
('SALE-1703158800000', 'PROD001', 1, 1299.99, 1299.99),
('SALE-1703158800000', 'PROD002', 3, 49.99, 149.97),
('SALE-1703158800000', 'PROD003', 2, 149.99, 299.99),
('SALE-1703245200000', 'PROD004', 1, 299.99, 299.99),
('SALE-1703331600000', 'PROD005', 1, 599.99, 599.99);
```

## 6. Web Application Update (Remove Mock Data Dependencies)

Update `main.js` with your actual API Gateway URL:

```javascript
// API Configuration - REPLACE WITH YOUR ACTUAL API GATEWAY URL
const API_CONFIG = {
    baseUrl: 'https://YOUR-API-ID.execute-api.YOUR-REGION.amazonaws.com/prod',
    apiKey: '' // Add if you enable API keys
};

// Remove all mock data fallbacks and force real API usage
function apiRequest(endpoint, method = 'GET', data = null) {
    const url = `${API_CONFIG.baseUrl}${endpoint}`;
    
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json'
        }
    };
    
    if (API_CONFIG.apiKey) {
        options.headers['x-api-key'] = API_CONFIG.apiKey;
    }
    
    if (data && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(data);
    }
    
    return fetch(url, options)
        .then(response => {
            if (!response.ok) {
                throw new Error(`API error: ${response.status} - ${response.statusText}`);
            }
            return response.json();
        })
        .catch(error => {
            console.error('API Request Error:', error);
            // Show user-friendly error instead of falling back to mock data
            showErrorMessage(`Connection error: ${error.message}. Please check your internet connection and try again.`);
            throw error;
        });
}
```

## 7. Upload Web Application to S3

1. Update all JavaScript files with your API Gateway URL
2. Upload ALL files to your S3 bucket:
   - `index.html`
   - `products.html`
   - `customers.html`
   - `sales.html`
   - `dashboard.html`
   - `css/styles.css`
   - `js/main.js` (updated with your API URL)
   - `js/products.js`
   - `js/customers.js`
   - `js/sales.js`
   - `js/dashboard.js`

## 8. COMPREHENSIVE TESTING WITH REAL DATA

### 8.1 API Testing with curl/Postman

**Test 1: Get All Products**
```bash
curl -X GET "https://YOUR-API-ID.execute-api.YOUR-REGION.amazonaws.com/prod/products"
```
Expected: List of products from database

**Test 2: Create New Product**
```bash
curl -X POST "https://YOUR-API-ID.execute-api.YOUR-REGION.amazonaws.com/prod/products" \
-H "Content-Type: application/json" \
-d '{
  "product_id": "PROD007",
  "name": "Test Product",
  "description": "Test description",
  "price": 99.99,
  "stock_quantity": 10,
  "category_id": 1
}'
```
Expected: 201 Created with success message

**Test 3: Get Specific Product**
```bash
curl -X GET "https://YOUR-API-ID.execute-api.YOUR-REGION.amazonaws.com/prod/products/PROD007"
```
Expected: Details of the product just created

**Test 4: Update Product**
```bash
curl -X PUT "https://YOUR-API-ID.execute-api.YOUR-REGION.amazonaws.com/prod/products/PROD007" \
-H "Content-Type: application/json" \
-d '{
  "price": 89.99,
  "stock_quantity": 15
}'
```
Expected: Success message

**Test 5: Delete Product**
```bash
curl -X DELETE "https://YOUR-API-ID.execute-api.YOUR-REGION.amazonaws.com/prod/products/PROD007"
```
Expected: Success message

**Test 6: Get All Customers**
```bash
curl -X GET "https://YOUR-API-ID.execute-api.YOUR-REGION.amazonaws.com/prod/customers"
```
Expected: List of customers with assigned sales rep info

**Test 7: Create Sale**
```bash
curl -X POST "https://YOUR-API-ID.execute-api.YOUR-REGION.amazonaws.com/prod/sales" \
-H "Content-Type: application/json" \
-d '{
  "customer_id": "CUST001",
  "sales_rep_id": "SR001",
  "items": [
    {
      "product_id": "PROD001",
      "quantity": 1,
      "price": 1299.99
    },
    {
      "product_id": "PROD002",
      "quantity": 2,
      "price": 49.99
    }
  ],
  "notes": "Test order"
}'
```
Expected: 201 Created with sale_id

### 8.2 Web Application Testing

1. **Open your S3 website URL**
2. **Test Products Page:**
   - Verify products load from database
   - Test search functionality
   - Test product details modal
   - Verify no mock data appears

3. **Test Customers Page:**
   - Verify customers load with sales rep assignments
   - Test customer search
   - Test creating new customer
   - Test updating customer information

4. **Test Sales Page:**
   - Verify sales history loads from database
   - Test creating new sale
   - Test updating sale status
   - Verify inventory updates after sale

5. **Test All CRUD Operations:**
   - Create, Read, Update, Delete for all entities
   - Verify data persistence across page refreshes
   - Verify error handling for invalid requests

### 8.3 Database Verification

Connect to your RDS instance and verify:

```sql
-- Check products were created/updated
SELECT * FROM products ORDER BY created_at DESC LIMIT 5;

-- Check sales were created
SELECT * FROM sales ORDER BY created_at DESC LIMIT 5;

-- Check inventory updates
SELECT product_id, name, stock_quantity FROM products WHERE product_id IN ('PROD001', 'PROD002');

-- Check sale items
SELECT si.*, p.name FROM sale_items si 
JOIN products p ON si.product_id = p.product_id 
ORDER BY si.sale_item_id DESC LIMIT 10;
```

### 8.4 DynamoDB Verification

Check your DynamoDB tables have tracking data:
1. Go to DynamoDB console
2. Check `SalesTracking` table for sale records
3. Check `CustomerSalesRepTracking` table for assignment records

## 9. Troubleshooting Real Data Issues

### Common Issues:

1. **Database Connection Timeout**
   - Check RDS security group allows Lambda access
   - Verify environment variables in Lambda

2. **API Gateway 500 Errors**
   - Check CloudWatch logs for Lambda function errors
   - Verify MySQL layer is attached

3. **CORS Issues**
   - Ensure CORS is enabled on all resources
   - Check headers in Lambda response

4. **Inventory Not Updating**
   - Check transaction logic in SalesTracking Lambda
   - Verify sale_items table has correct data

5. **Web App Shows Errors**
   - Check browser console for API errors
   - Verify API Gateway URL is correct in main.js

This implementation ensures ALL components work with real data from AWS services, with comprehensive CRUD operations and proper error handling.
