# SalePoint Solution - Implementation Guide

This document provides detailed step-by-step instructions for implementing the SalePoint Solution in AWS Academy Learner Lab environment using the GUI interface.

## Prerequisites

- Access to AWS Academy Learner Lab
- Web browser
- Basic understanding of AWS services
- LabRole policy permissions

## Implementation Steps

## 1. Database Setup

### 1.1 Create Amazon RDS Database (for product, inventory, and pricing data)

1. Navigate to the Amazon RDS console
2. Click "Create database"
3. Select "Standard create"
4. Choose "MySQL" as the engine type
5. Select "Free tier" for template
6. Configure settings:
   - DB instance identifier: `salepoint-rds`
   - Master username: `admin`
   - Master password: Create and save a secure password
7. Select "Burstable classes (includes t classes)" and "db.t2.micro"
8. For storage, keep the default settings
9. Under "Connectivity":
   - Choose "Yes" for "Public access"
   - Select "Default VPC" and default subnet group
   - Create a new security group named "salepoint-rds-sg"
10. Under "Additional configuration":
    - Initial database name: `salepointdb`
    - Keep default parameter group
    - Enable automated backups with 7-day retention
11. Click "Create database"

### 1.2 Create Amazon DynamoDB Table (for sales rep and customer tracking)

1. Navigate to the Amazon DynamoDB console
2. Click "Create table"
3. Configure settings:
   - Table name: `SalesReps_Customers`
   - Primary key: `CustomerID` (String)
   - Sort key: `SalesRepID` (String)
4. Keep default settings for secondary indexes
5. Use default capacity settings (on-demand)
6. Click "Create"

### 1.3 Create Second DynamoDB Table (for sales tracking)

1. In the DynamoDB console, click "Create table" again
2. Configure settings:
   - Table name: `SalesTracking`
   - Primary key: `SaleID` (String)
   - Sort key: `Timestamp` (String)
3. Keep default settings for secondary indexes
4. Use default capacity settings (on-demand)
5. Click "Create"

## 2. Storage Setup

### 2.1 Create S3 Bucket (for product images and documents)

1. Navigate to the Amazon S3 console
2. Click "Create bucket"
3. Configure settings:
   - Bucket name: `salepoint-files-[unique-id]` (add unique identifier)
   - Region: Same as your other services
4. Under "Block Public Access settings", uncheck "Block all public access"
5. Acknowledge the warning about making the bucket public
6. Keep other settings as default
7. Click "Create bucket"

### 2.2 Configure S3 Bucket for Public Access

1. Select the newly created bucket
2. Go to the "Permissions" tab
3. Click "Bucket Policy"
4. Add the following policy (replace `[bucket-name]` with your actual bucket name):

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::[bucket-name]/*"
        }
    ]
}
```

5. Click "Save"

### 2.3 Create Folder Structure in S3

1. Within your bucket, click "Create folder"
2. Create the following folders:
   - `product-images`
   - `product-specs`
3. Click "Create folder" for each

## 3. Lambda Functions Setup

### 3.1 Create Product Lookup Lambda Function

1. Navigate to the AWS Lambda console
2. Click "Create function"
3. Select "Author from scratch"
4. Configure settings:
   - Function name: `GetProductInfo`
   - Runtime: Node.js 14.x
   - Architecture: x86_64
   - Permissions: Use default execution role (LabRole)
5. Click "Create function"
6. In the function code section, replace with the following code:

```javascript
const AWS = require('aws-sdk');
const mysql = require('mysql');

exports.handler = async (event) => {
    // Extract product ID from the event
    const productId = event.pathParameters?.productId || event.queryStringParameters?.productId;
    
    if (!productId) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Product ID is required' })
        };
    }
    
    try {
        // Create RDS connection
        const connection = mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });
        
        // Query product information
        const productInfo = await new Promise((resolve, reject) => {
            connection.query(
                'SELECT * FROM products WHERE product_id = ?', 
                [productId],
                (error, results) => {
                    connection.end();
                    if (error) reject(error);
                    else resolve(results[0]);
                }
            );
        });
        
        if (!productInfo) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: 'Product not found' })
            };
        }
        
        // Get product image URL from S3
        const s3 = new AWS.S3();
        const imageUrl = s3.getSignedUrl('getObject', {
            Bucket: process.env.S3_BUCKET,
            Key: `product-images/${productId}.jpg`,
            Expires: 3600
        });
        
        // Get product spec PDF URL from S3
        const specUrl = s3.getSignedUrl('getObject', {
            Bucket: process.env.S3_BUCKET,
            Key: `product-specs/${productId}.pdf`,
            Expires: 3600
        });
        
        // Combine all product information
        const response = {
            ...productInfo,
            imageUrl,
            specUrl
        };
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(response)
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Error retrieving product information' })
        };
    }
};
```

7. In the "Configuration" tab, go to "Environment variables" and add:
   - Key: `DB_HOST`, Value: Your RDS endpoint
   - Key: `DB_USER`, Value: `admin`
   - Key: `DB_PASSWORD`, Value: Your RDS password
   - Key: `DB_NAME`, Value: `salepointdb`
   - Key: `S3_BUCKET`, Value: Your S3 bucket name
8. Click "Save"

### 3.2 Create Layer for MySQL Library

1. In the Lambda console, go to "Layers" in the left navigation
2. Click "Create layer"
3. Configure settings:
   - Name: `mysql-layer`
   - Upload a .zip file containing the MySQL library (you'll need to create this)
4. Click "Create"
5. Attach this layer to the GetProductInfo Lambda function

### 3.3 Create Customer Tracking Lambda Function

1. Create another Lambda function with:
   - Function name: `CustomerSalesRepTracking`
   - Runtime: Node.js 14.x
   - Permissions: Use default execution role (LabRole)
2. Replace function code with:

```javascript
const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    const operation = event.httpMethod;
    const path = event.path;
    
    try {
        // GET sales rep's customers
        if (operation === 'GET' && path.includes('/salesrep/')) {
            const salesRepId = event.pathParameters.salesRepId;
            
            const params = {
                TableName: 'SalesReps_Customers',
                IndexName: 'SalesRepID-index',  // You'll need to create this GSI
                KeyConditionExpression: 'SalesRepID = :salesRepId',
                ExpressionAttributeValues: {
                    ':salesRepId': salesRepId
                }
            };
            
            const result = await dynamodb.query(params).promise();
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify(result.Items)
            };
        }
        
        // GET customer's assigned sales rep
        else if (operation === 'GET' && path.includes('/customer/')) {
            const customerId = event.pathParameters.customerId;
            
            const params = {
                TableName: 'SalesReps_Customers',
                Key: {
                    'CustomerID': customerId
                }
            };
            
            const result = await dynamodb.get(params).promise();
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify(result.Item)
            };
        }
        
        // POST assign customer to sales rep
        else if (operation === 'POST') {
            const requestBody = JSON.parse(event.body);
            
            const params = {
                TableName: 'SalesReps_Customers',
                Item: {
                    'CustomerID': requestBody.customerId,
                    'SalesRepID': requestBody.salesRepId,
                    'AssignmentDate': new Date().toISOString(),
                    'CustomerName': requestBody.customerName,
                    'SalesRepName': requestBody.salesRepName,
                    'Status': 'Active'
                }
            };
            
            await dynamodb.put(params).promise();
            return {
                statusCode: 201,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ message: 'Customer assigned to sales rep successfully' })
            };
        }
        
        // PUT update customer status
        else if (operation === 'PUT') {
            const customerId = event.pathParameters.customerId;
            const requestBody = JSON.parse(event.body);
            
            const params = {
                TableName: 'SalesReps_Customers',
                Key: {
                    'CustomerID': customerId,
                    'SalesRepID': requestBody.salesRepId
                },
                UpdateExpression: 'set #status = :status, LastUpdated = :lastUpdated',
                ExpressionAttributeNames: {
                    '#status': 'Status'
                },
                ExpressionAttributeValues: {
                    ':status': requestBody.status,
                    ':lastUpdated': new Date().toISOString()
                },
                ReturnValues: 'UPDATED_NEW'
            };
            
            const result = await dynamodb.update(params).promise();
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify(result.Attributes)
            };
        }
        
        else {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Invalid operation' })
            };
        }
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Error processing request', error: error.message })
        };
    }
};
```

3. Save the function

### 3.4 Create Sales Tracking Lambda Function

1. Create another Lambda function with:
   - Function name: `SalesTracking`
   - Runtime: Node.js 14.x
   - Permissions: Use default execution role (LabRole)
2. Replace function code with:

```javascript
const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const mysql = new AWS.RDS();

exports.handler = async (event) => {
    const operation = event.httpMethod;
    
    try {
        // GET sales tracking data
        if (operation === 'GET') {
            // If getting by sales ID
            if (event.pathParameters && event.pathParameters.saleId) {
                const saleId = event.pathParameters.saleId;
                
                const params = {
                    TableName: 'SalesTracking',
                    Key: {
                        'SaleID': saleId
                    }
                };
                
                const result = await dynamodb.get(params).promise();
                return {
                    statusCode: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify(result.Item)
                };
            }
            
            // If getting by sales rep ID
            else if (event.queryStringParameters && event.queryStringParameters.salesRepId) {
                const salesRepId = event.queryStringParameters.salesRepId;
                
                const params = {
                    TableName: 'SalesTracking',
                    IndexName: 'SalesRepID-index',  // You'll need to create this GSI
                    KeyConditionExpression: 'SalesRepID = :salesRepId',
                    ExpressionAttributeValues: {
                        ':salesRepId': salesRepId
                    }
                };
                
                const result = await dynamodb.query(params).promise();
                return {
                    statusCode: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify(result.Items)
                };
            }
            
            // If getting by customer ID
            else if (event.queryStringParameters && event.queryStringParameters.customerId) {
                const customerId = event.queryStringParameters.customerId;
                
                const params = {
                    TableName: 'SalesTracking',
                    IndexName: 'CustomerID-index',  // You'll need to create this GSI
                    KeyConditionExpression: 'CustomerID = :customerId',
                    ExpressionAttributeValues: {
                        ':customerId': customerId
                    }
                };
                
                const result = await dynamodb.query(params).promise();
                return {
                    statusCode: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify(result.Items)
                };
            }
        }
        
        // POST create new sale record
        else if (operation === 'POST') {
            const requestBody = JSON.parse(event.body);
            const saleId = 'SALE-' + Date.now();
            
            const params = {
                TableName: 'SalesTracking',
                Item: {
                    'SaleID': saleId,
                    'Timestamp': new Date().toISOString(),
                    'CustomerID': requestBody.customerId,
                    'SalesRepID': requestBody.salesRepId,
                    'Products': requestBody.products,
                    'TotalAmount': requestBody.totalAmount,
                    'Status': 'Pending',
                    'Notes': requestBody.notes || ''
                }
            };
            
            await dynamodb.put(params).promise();
            
            // Update inventory in RDS
            for (const product of requestBody.products) {
                // This would typically be a call to another Lambda function
                // or direct RDS update, simplified here
                console.log(`Updating inventory for product ${product.productId}, quantity: ${product.quantity}`);
            }
            
            return {
                statusCode: 201,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ 
                    message: 'Sale record created successfully',
                    saleId: saleId 
                })
            };
        }
        
        // PUT update sale status
        else if (operation === 'PUT') {
            const saleId = event.pathParameters.saleId;
            const requestBody = JSON.parse(event.body);
            
            const params = {
                TableName: 'SalesTracking',
                Key: {
                    'SaleID': saleId,
                    'Timestamp': requestBody.timestamp
                },
                UpdateExpression: 'set #status = :status, LastUpdated = :lastUpdated, Notes = :notes',
                ExpressionAttributeNames: {
                    '#status': 'Status'
                },
                ExpressionAttributeValues: {
                    ':status': requestBody.status,
                    ':lastUpdated': new Date().toISOString(),
                    ':notes': requestBody.notes || ''
                },
                ReturnValues: 'UPDATED_NEW'
            };
            
            const result = await dynamodb.update(params).promise();
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify(result.Attributes)
            };
        }
        
        else {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Invalid operation' })
            };
        }
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Error processing request', error: error.message })
        };
    }
};
```

3. Save the function

## 4. API Gateway Setup

### 4.1 Create API Gateway

1. Navigate to the API Gateway console
2. Click "Create API"
3. Select "REST API" and click "Build"
4. Configure settings:
   - API name: `SalePointAPI`
   - Description: "API for SalePoint Solution"
   - Endpoint Type: Regional
5. Click "Create API"

### 4.2 Create Resources and Methods for Products

1. In the left pane, select your API
2. Click "Create Resource"
3. Resource Name: `products`
4. Click "Create Resource"
5. Select the `/products` resource
6. Click "Create Method"
7. Select "GET" from the dropdown and click the checkmark
8. Configure settings:
   - Integration type: Lambda Function
   - Lambda Region: Your region
   - Lambda Function: `GetProductInfo`
   - Use Default Timeout: Checked
9. Click "Save"
10. Click "OK" when prompted to give API Gateway permission

11. Create another resource under `/products` named `{productId}`
12. Add a "GET" method to this resource:
   - Integration type: Lambda Function
   - Lambda Region: Your region
   - Lambda Function: `GetProductInfo`
   - Use Default Timeout: Checked
13. Click "Save"

### 4.3 Create Resources and Methods for Customer Tracking

1. Create a new resource at the root level named `customers`
2. Under `/customers`, create a resource named `{customerId}`
3. Add a "GET" method to this resource:
   - Integration type: Lambda Function
   - Lambda Function: `CustomerSalesRepTracking`
4. Click "Save"

5. Create another resource at the root level named `salesreps`
6. Under `/salesreps`, create a resource named `{salesRepId}`
7. Under `/{salesRepId}`, create a resource named `customers`
8. Add a "GET" method to this resource:
   - Integration type: Lambda Function
   - Lambda Function: `CustomerSalesRepTracking`
9. Click "Save"

10. At the root level, create a resource named `assignments`
11. Add a "POST" method to this resource:
    - Integration type: Lambda Function
    - Lambda Function: `CustomerSalesRepTracking`
12. Click "Save"

### 4.4 Create Resources and Methods for Sales Tracking

1. Create a new resource at the root level named `sales`
2. Add a "GET" and "POST" method to this resource:
   - Integration type: Lambda Function
   - Lambda Function: `SalesTracking`
3. Click "Save" for each method

4. Under `/sales`, create a resource named `{saleId}`
5. Add a "GET" and "PUT" method to this resource:
   - Integration type: Lambda Function
   - Lambda Function: `SalesTracking`
6. Click "Save" for each method

### 4.5 Deploy API

1. Click "Actions" and select "Deploy API"
2. Configure settings:
   - Deployment stage: [New Stage]
   - Stage name: `prod`
   - Stage description: "Production"
   - Deployment description: "Initial deployment"
3. Click "Deploy"
4. Note the "Invoke URL" at the top of the page - this is your API endpoint

## 5. Web Application Development

### 5.1 Create Basic Web Application Structure

Create the following files for your web application:

1. `index.html` - Main page
2. `products.html` - Product listing/search
3. `customers.html` - Customer management
4. `sales.html` - Sales tracking
5. `dashboard.html` - Management dashboard
6. `css/styles.css` - Styling
7. `js/main.js` - Common functionality
8. `js/products.js` - Product-specific functions
9. `js/customers.js` - Customer-specific functions
10. `js/sales.js` - Sales-specific functions

### 5.2 Implement Main Page (index.html)

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SalePoint Solution</title>
    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
    <link rel="stylesheet" href="css/styles.css">
</head>
<body>
    <nav class="navbar navbar-expand-lg navbar-dark bg-primary">
        <div class="container">
            <a class="navbar-brand" href="index.html">SalePoint</a>
            <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarNav">
                <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="navbarNav">
                <ul class="navbar-nav ml-auto">
                    <li class="nav-item active">
                        <a class="nav-link" href="index.html">Home</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="products.html">Products</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="customers.html">Customers</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="sales.html">Sales</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="dashboard.html">Dashboard</a>
                    </li>
                </ul>
            </div>
        </div>
    </nav>

    <div class="jumbotron">
        <div class="container">
            <h1 class="display-4">Welcome to SalePoint</h1>
            <p class="lead">Your all-in-one sales solution for managing products, customers, and sales data.</p>
        </div>
    </div>

    <div class="container">
        <div class="row">
            <div class="col-md-4 mb-4">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Products</h5>
                        <p class="card-text">Search and view detailed product information including specifications and images.</p>
                        <a href="products.html" class="btn btn-primary">View Products</a>
                    </div>
                </div>
            </div>
            <div class="col-md-4 mb-4">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Customers</h5>
                        <p class="card-text">Manage customer information and track assigned sales representatives.</p>
                        <a href="customers.html" class="btn btn-primary">Manage Customers</a>
                    </div>
                </div>
            </div>
            <div class="col-md-4 mb-4">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Sales</h5>
                        <p class="card-text">Track sales status, create new sales records, and update existing ones.</p>
                        <a href="sales.html" class="btn btn-primary">Track Sales</a>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <footer class="bg-light py-4 mt-5">
        <div class="container text-center">
            <p>© 2025 SalePoint Solution. All rights reserved.</p>
        </div>
    </footer>

    <script src="https://code.jquery.com/jquery-3.5.1.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/popper.js@1.16.1/dist/umd/popper.min.js"></script>
    <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>
    <script src="js/main.js"></script>
</body>
</html>
```

### 5.3 Implement Product Page (products.html)

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Products - SalePoint Solution</title>
    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
    <link rel="stylesheet" href="css/styles.css">
</head>
<body>
    <nav class="navbar navbar-expand-lg navbar-dark bg-primary">
        <div class="container">
            <a class="navbar-brand" href="index.html">SalePoint</a>
            <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarNav">
                <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="navbarNav">
                <ul class="navbar-nav ml-auto">
                    <li class="nav-item">
                        <a class="nav-link" href="index.html">Home</a>
                    </li>
                    <li class="nav-item active">
                        <a class="nav-link" href="products.html">Products</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="customers.html">Customers</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="sales.html">Sales</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="dashboard.html">Dashboard</a>
                    </li>
                </ul>
            </div>
        </div>
    </nav>

    <div class="container mt-4">
        <h1>Products</h1>
        
        <div class="row mb-4">
            <div class="col-md-6">
                <div class="input-group">
                    <input type="text" id="product-search" class="form-control" placeholder="Search products...">
                    <div class="input-group-append">
                        <button class="btn btn-primary" id="search-btn">Search</button>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="form-group">
                    <select id="category-filter" class="form-control">
                        <option value="">All Categories</option>
                        <option value="electronics">Electronics</option>
                        <option value="furniture">Furniture</option>
                        <option value="clothing">Clothing</option>
                        <option value="appliances">Appliances</option>
                    </select>
                </div>
            </div>
        </div>
        
        <div class="row" id="products-container">
            <!-- Products will be loaded here dynamically -->
            <div class="col-12 text-center">
                <div class="spinner-border text-primary" role="status">
                    <span class="sr-only">Loading...</span>
                </div>
            </div>
        </div>

        <div class="modal fade" id="productModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="productModalTitle">Product Details</h5>
                        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-6">
                                <img id="product-image" src="" alt="Product Image" class="img-fluid">
                            </div>
                            <div class="col-md-6">
                                <h4 id="product-name"></h4>
                                <p id="product-description"></p>
                                <p><strong>Price:</strong> $<span id="product-price"></span></p>
                                <p><strong>In Stock:</strong> <span id="product-stock"></span></p>
                                <p><strong>Category:</strong> <span id="product-category"></span></p>
                                <a id="product-spec-link" href="#" target="_blank" class="btn btn-info">View Specifications</a>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-primary" id="add-to-sale-btn">Add to Sale</button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <footer class="bg-light py-4 mt-5">
        <div class="container text-center">
            <p>© 2025 SalePoint Solution. All rights reserved.</p>
        </div>
    </footer>

    <script src="https://code.jquery.com/jquery-3.5.1.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/popper.js@1.16.1/dist/umd/popper.min.js"></script>
    <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>
    <script src="js/main.js"></script>
    <script src="js/products.js"></script>
</body>
</html>
```

### 5.4 Implement JavaScript for Products (js/products.js)

```javascript
// API Endpoint - Replace with your actual API endpoint
const API_URL = 'https://your-api-gateway-url.amazonaws.com/prod';

// Initialize on page load
$(document).ready(function() {
    // Load products
    loadProducts();
    
    // Set up event listeners
    $('#search-btn').click(searchProducts);
    $('#product-search').keypress(function(e) {
        if (e.which === 13) {
            searchProducts();
        }
    });
    
    $('#category-filter').change(searchProducts);
    
    // Event delegation for product cards
    $('#products-container').on('click', '.product-card', function() {
        const productId = $(this).data('product-id');
        loadProductDetails(productId);
    });
    
    // Add to sale button
    $('#add-to-sale-btn').click(function() {
        // Get product ID from the modal
        const productId = $('#productModal').data('product-id');
        // Add to local storage for the sales page
        addProductToSale(productId);
        // Show confirmation
        alert('Product added to sale!');
    });
});

// Load all products
function loadProducts() {
    $('#products-container').html('<div class="col-12 text-center"><div class="spinner-border text-primary" role="status"><span class="sr-only">Loading...</span></div></div>');
    
    $.ajax({
        url: `${API_URL}/products`,
        method: 'GET',
        success: function(data) {
            displayProducts(data);
        },
        error: function(error) {
            console.error('Error loading products:', error);
            $('#products-container').html('<div class="col-12"><div class="alert alert-danger">Error loading products. Please try again later.</div></div>');
        }
    });
}

// Search products based on input and filters
function searchProducts() {
    const searchTerm = $('#product-search').val().toLowerCase();
    const category = $('#category-filter').val();
    
    $('#products-container').html('<div class="col-12 text-center"><div class="spinner-border text-primary" role="status"><span class="sr-only">Loading...</span></div></div>');
    
    let url = `${API_URL}/products`;
    if (searchTerm || category) {
        url += '?';
        if (searchTerm) {
            url += `search=${encodeURIComponent(searchTerm)}`;
        }
        if (category) {
            url += searchTerm ? `&category=${encodeURIComponent(category)}` : `category=${encodeURIComponent(category)}`;
        }
    }
    
    $.ajax({
        url: url,
        method: 'GET',
        success: function(data) {
            displayProducts(data);
        },
        error: function(error) {
            console.error('Error searching products:', error);
            $('#products-container').html('<div class="col-12"><div class="alert alert-danger">Error searching products. Please try again later.</div></div>');
        }
    });
}

// Display products in cards
function displayProducts(products) {
    if (!products || products.length === 0) {
        $('#products-container').html('<div class="col-12"><div class="alert alert-info">No products found.</div></div>');
        return;
    }
    
    let html = '';
    products.forEach(product => {
        html += `
            <div class="col-md-4 mb-4">
                <div class="card product-card" data-product-id="${product.product_id}">
                    <img src="${product.imageUrl || 'img/no-image.jpg'}" class="card-img-top" alt="${product.product_name}">
                    <div class="card-body">
                        <h5 class="card-title">${product.product_name}</h5>
                        <p class="card-text">${product.description.substring(0, 100)}...</p>
                        <p class="card-text"><strong>Price:</strong> $${product.price}</p>
                        <p class="card-text"><strong>In Stock:</strong> ${product.stock_quantity}</p>
                        <button class="btn btn-primary view-details">View Details</button>
                    </div>
                </div>
            </div>
        `;
    });
    
    $('#products-container').html(html);
}

// Load product details for the modal
function loadProductDetails(productId) {
    $.ajax({
        url: `${API_URL}/products/${productId}`,
        method: 'GET',
        success: function(product) {
            // Populate modal with product details
            $('#productModal').data('product-id', product.product_id);
            $('#productModalTitle').text(product.product_name);
            $('#product-name').text(product.product_name);
            $('#product-description').text(product.description);
            $('#product-price').text(product.price);
            $('#product-stock').text(product.stock_quantity);
            $('#product-category').text(product.category);
            $('#product-image').attr('src', product.imageUrl || 'img/no-image.jpg');
            $('#product-spec-link').attr('href', product.specUrl);
            
            // Show the modal
            $('#productModal').modal('show');
        },
        error: function(error) {
            console.error('Error loading product details:', error);
            alert('Error loading product details. Please try again later.');
        }
    });
}

// Add product to sale (stored in localStorage)
function addProductToSale(productId) {
    // Get current sale items from localStorage
    let saleItems = JSON.parse(localStorage.getItem('saleItems')) || [];
    
    // Check if product already exists in the sale
    const existingItemIndex = saleItems.findIndex(item => item.productId === productId);
    
    if (existingItemIndex >= 0) {
        // Increment quantity if product already in sale
        saleItems[existingItemIndex].quantity += 1;
    } else {
        // Add new product to sale
        $.ajax({
            url: `${API_URL}/products/${productId}`,
            method: 'GET',
            async: false, // Synchronous call to ensure data is available
            success: function(product) {
                saleItems.push({
                    productId: product.product_id,
                    productName: product.product_name,
                    price: product.price,
                    quantity: 1
                });
            },
            error: function(error) {
                console.error('Error fetching product for sale:', error);
                alert('Error adding product to sale. Please try again.');
                return;
            }
        });
    }
    
    // Update localStorage
    localStorage.setItem('saleItems', JSON.stringify(saleItems));
}
```

### 5.5 Create a CSS Style Sheet (css/styles.css)

```css
/* Global Styles */
body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background-color: #f8f9fa;
}

.navbar {
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.jumbotron {
    background-color: #e9ecef;
    padding: 4rem 2rem;
    margin-bottom: 2rem;
    border-radius: 0;
}

/* Card Styles */
.card {
    transition: transform 0.3s, box-shadow 0.3s;
    height: 100%;
}

.card:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
}

.card-img-top {
    height: 200px;
    object-fit: contain;
    padding: 1rem;
    background-color: #f8f9fa;
}

.product-card {
    cursor: pointer;
}

/* Button Styles */
.btn-primary {
    background-color: #007bff;
    border-color: #007bff;
}

.btn-primary:hover {
    background-color: #0069d9;
    border-color: #0062cc;
}

/* Form Styles */
.form-control:focus {
    border-color: #80bdff;
    box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
}

/* Modal Styles */
.modal-content {
    border-radius: 0.5rem;
}

.modal-header {
    border-bottom: 1px solid #e9ecef;
    background-color: #f8f9fa;
}

.modal-footer {
    border-top: 1px solid #e9ecef;
    background-color: #f8f9fa;
}

/* Table Styles */
.table th {
    background-color: #f8f9fa;
}

.table-hover tbody tr:hover {
    background-color: rgba(0, 123, 255, 0.05);
}

/* Footer */
footer {
    color: #6c757d;
    border-top: 1px solid #e9ecef;
}
```

## 6. Database Setup Script

### 6.1 Create RDS Database Table Creation Script

Create a file named `db_setup.sql` with the following SQL:

```sql
-- Products Table
CREATE TABLE products (
    product_id VARCHAR(20) PRIMARY KEY,
    product_name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    stock_quantity INT NOT NULL,
    category VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Customers Table
CREATE TABLE customers (
    customer_id VARCHAR(20) PRIMARY KEY,
    customer_name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Sales Representatives Table
CREATE TABLE sales_representatives (
    sales_rep_id VARCHAR(20) PRIMARY KEY,
    sales_rep_name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    hire_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Sales Table
CREATE TABLE sales (
    sale_id VARCHAR(20) PRIMARY KEY,
    customer_id VARCHAR(20),
    sales_rep_id VARCHAR(20),
    sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'Pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
    FOREIGN KEY (sales_rep_id) REFERENCES sales_representatives(sales_rep_id)
);

-- Sale Items Table
CREATE TABLE sale_items (
    sale_item_id INT AUTO_INCREMENT PRIMARY KEY,
    sale_id VARCHAR(20),
    product_id VARCHAR(20),
    quantity INT NOT NULL,
    price_per_unit DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (sale_id) REFERENCES sales(sale_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- Sample Data: Products
INSERT INTO products (product_id, product_name, description, price, stock_quantity, category) VALUES
('PROD001', 'Laptop Computer', 'High-performance laptop with 16GB RAM and 512GB SSD', 1299.99, 50, 'electronics'),
('PROD002', 'Office Chair', 'Ergonomic office chair with lumbar support', 249.99, 100, 'furniture'),
('PROD003', 'Wireless Headphones', 'Noise-cancelling wireless headphones with 30-hour battery life', 199.99, 75, 'electronics'),
('PROD004', 'Smart TV 55"', '4K Ultra HD Smart TV with built-in streaming apps', 599.99, 30, 'electronics'),
('PROD005', 'Coffee Maker', 'Programmable coffee maker with 12-cup capacity', 89.99, 45, 'appliances');

-- Sample Data: Customers
INSERT INTO customers (customer_id, customer_name, email, phone, address) VALUES
('CUST001', 'John Smith', 'john.smith@example.com', '555-123-4567', '123 Main St, Anytown, USA'),
('CUST002', 'Jane Doe', 'jane.doe@example.com', '555-987-6543', '456 Oak Ave, Somewhere, USA'),
('CUST003', 'Bob Johnson', 'bob.johnson@example.com', '555-456-7890', '789 Pine Rd, Nowhere, USA'),
('CUST004', 'Sarah Williams', 'sarah.williams@example.com', '555-321-6547', '321 Maple Dr, Anyplace, USA'),
('CUST005', 'Michael Brown', 'michael.brown@example.com', '555-654-3210', '654 Cedar Ln, Somewhere, USA');

-- Sample Data: Sales Representatives
INSERT INTO sales_representatives (sales_rep_id, sales_rep_name, email, phone, hire_date) VALUES
('SR001', 'Emily Johnson', 'emily.johnson@salepoint.com', '555-111-2222', '2023-01-15'),
('SR002', 'David Lee', 'david.lee@salepoint.com', '555-222-3333', '2023-02-20'),
('SR003', 'Maria Garcia', 'maria.garcia@salepoint.com', '555-333-4444', '2023-03-10'),
('SR004', 'James Wilson', 'james.wilson@salepoint.com', '555-444-5555', '2023-04-05'),
('SR005', 'Linda Chen', 'linda.chen@salepoint.com', '555-555-6666', '2023-05-12');

-- Sample Data: Sales and Sale Items will be added through the application
```

## 7. Amazon QuickSight Setup

1. Navigate to the Amazon QuickSight console
2. If you don't have an account, follow the setup wizard to create one
3. Choose "Enterprise" edition
4. Configure permissions to allow access to your RDS database and S3 bucket
5. Create a new dataset:
   - Select "RDS" as the data source
   - Connect to your `salepoint-rds` database
   - Select the relevant tables (products, sales, customers, etc.)
6. Create a dashboard with the following visualizations:
   - Sales by representative (bar chart)
   - Sales over time (line chart)
   - Inventory levels by product (bar chart)
   - Top selling products (pie chart)
   - Sales status breakdown (donut chart)
7. Save and publish the dashboard

## 8. Hosting the Web Application

### 8.1 Create S3 Bucket for Web Hosting

1. Navigate to the Amazon S3 console
2. Click "Create bucket"
3. Configure settings:
   - Bucket name: `salepoint-webapp`
   - Region: Same as your other services
4. Under "Block Public Access settings", uncheck "Block all public access"
5. Acknowledge the warning about making the bucket public
6. Click "Create bucket"

### 8.2 Configure S3 Bucket for Static Website Hosting

1. Select the newly created bucket
2. Go to the "Properties" tab
3. Scroll down to "Static website hosting" and click "Edit"
4. Select "Enable"
5. For "Index document" enter `index.html`
6. For "Error document" enter `error.html`
7. Click "Save changes"

### 8.3 Bucket Policy for Web Hosting

1. Go to the "Permissions" tab
2. Click "Bucket Policy"
3. Add the following policy (replace `[bucket-name]` with your actual bucket name):

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::[bucket-name]/*"
        }
    ]
}
```

4. Click "Save"

### 8.4 Upload Web Application Files

1. Upload all HTML, CSS, and JavaScript files to the S3 bucket
2. Make sure the file structure matches what was created earlier

## 9. Testing

1. Open the website URL (found in the bucket's "Properties" tab under "Static website hosting")
2. Test all functionality:
   - Product search and viewing
   - Customer management
   - Sales tracking
   - Dashboard viewing
3. Verify API connections are working properly
4. Test data synchronization between components

## 10. Cleanup (Optional)

If you need to delete the resources when done:

1. Delete S3 buckets (empty them first)
2. Delete Lambda functions
3. Delete API Gateway
4. Delete DynamoDB tables
5. Delete RDS database
6. Terminate QuickSight subscription

## Conclusion

This implementation guide provides a comprehensive setup for the SalePoint Solution, addressing all the requirements mentioned. The solution uses AWS services as specified, running entirely within the AWS Academy Learner Lab environment with LabRole policy permissions. The web-based interface allows sales staff to access product information quickly and accurately, with data synchronized across all components.
