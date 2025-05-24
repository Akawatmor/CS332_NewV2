// Lambda function for getting product information
// This would be deployed to AWS Lambda and connected to API Gateway
// Enhanced for student AWS accounts with limited permissions

const AWS = require('aws-sdk');
const mysql = require('mysql');

// Student Account Configuration
const STUDENT_MODE = process.env.STUDENT_MODE === 'true' || !process.env.DB_HOST;

// Mock data for student accounts or when services are unavailable
const MOCK_PRODUCTS = [
    {
        product_id: 'PROD001',
        name: 'Professional Laptop',
        price: 1299.99,
        stock_quantity: 25,
        description: 'High-performance business laptop with advanced features',
        category: 'Electronics',
        imageUrl: 'https://via.placeholder.com/300x200?text=Laptop',
        specUrl: 'https://via.placeholder.com/400x600?text=Product+Specifications'
    },
    {
        product_id: 'PROD002',
        name: 'Wireless Mouse',
        price: 49.99,
        stock_quantity: 150,
        description: 'Ergonomic wireless mouse with precision tracking',
        category: 'Electronics',
        imageUrl: 'https://via.placeholder.com/300x200?text=Mouse',
        specUrl: 'https://via.placeholder.com/400x600?text=Product+Specifications'
    },
    {
        product_id: 'PROD003',
        name: 'Mechanical Keyboard',
        price: 149.99,
        stock_quantity: 75,
        description: 'Professional mechanical keyboard with RGB lighting',
        category: 'Electronics',
        imageUrl: 'https://via.placeholder.com/300x200?text=Keyboard',
        specUrl: 'https://via.placeholder.com/400x600?text=Product+Specifications'
    },
    {
        product_id: 'PROD004',
        name: 'USB-C Hub',
        price: 79.99,
        stock_quantity: 200,
        description: 'Multi-port USB-C hub with HDMI and USB 3.0',
        category: 'Electronics',
        imageUrl: 'https://via.placeholder.com/300x200?text=USB+Hub',
        specUrl: 'https://via.placeholder.com/400x600?text=Product+Specifications'
    }
];

// Student-friendly environment validation
function validateStudentEnvironment() {
    const warnings = [];
    const errors = [];
    
    // Check required environment variables
    const requiredVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
    const hasDatabase = requiredVars.every(varName => {
        if (!process.env[varName]) {
            warnings.push(`Missing ${varName} - will use mock data`);
            return false;
        }
        return true;
    });
    
    // Check optional variables
    const hasS3 = !!process.env.S3_BUCKET;
    if (!hasS3) {
        warnings.push('S3_BUCKET not set - will use placeholder images');
    }
    
    console.log('Student Environment Check:', { hasDatabase, hasS3, warnings, errors });
    
    return { hasDatabase, hasS3, warnings, errors };
}

// Handle AWS permission errors gracefully
function handleAWSPermissionError(error) {
    if (error.code === 'AccessDenied' || error.code === 'UnauthorizedOperation') {
        console.warn('AWS Permission issue:', error.message);
        return formatResponse(503, {
            message: 'Service temporarily unavailable',
            fallback: true,
            error: 'Limited permissions in student account',
            suggestion: 'Using mock data instead'
        });
    }
    throw error;
}

// Enhanced RDS connection with timeout and fallback
async function createRDSConnection() {
    return new Promise((resolve) => {
        try {
            const connection = mysql.createConnection({
                host: process.env.DB_HOST,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                database: process.env.DB_NAME,
                timeout: 8000,
                acquireTimeout: 8000,
                reconnect: true
            });
            
            connection.connect((err) => {
                if (err) {
                    console.error('RDS connection failed:', err.message);
                    resolve(null); // Return null instead of throwing
                } else {
                    console.log('RDS connection successful');
                    resolve(connection);
                }
            });
        } catch (error) {
            console.error('RDS connection setup failed:', error);
            resolve(null);
        }
    });
}

// Safe S3 URL generation with fallback
function getSafeS3Url(bucket, key, placeholder = 'Product+Image') {
    try {
        if (!bucket) {
            return `https://via.placeholder.com/300x200?text=${placeholder}`;
        }
        const s3 = new AWS.S3();
        return s3.getSignedUrl('getObject', {
            Bucket: bucket,
            Key: key,
            Expires: 3600
        });
    } catch (error) {
        console.warn('S3 access failed:', error.message);
        return `https://via.placeholder.com/300x200?text=${placeholder}`;
    }
}

exports.handler = async (event) => {
    console.log('Event received:', JSON.stringify(event));
    
    try {
        // Validate environment for student accounts
        const envCheck = validateStudentEnvironment();
        
        // Handle preflight CORS requests
        if (event.httpMethod === 'OPTIONS') {
            return formatResponse(200, { message: 'CORS preflight' });
        }
        
        // Safely extract path parameters and query parameters
        const pathParameters = event.pathParameters || {};
        const queryStringParameters = event.queryStringParameters || {};
        const path = event.path || event.resource || '';
        
        console.log('Path:', path);
        console.log('Path Parameters:', pathParameters);
        console.log('Query Parameters:', queryStringParameters);
        
        // Extract product ID from path parameters or query parameters
        const productId = pathParameters.productId || queryStringParameters.productId;
        
        // If productId is provided, get a specific product, otherwise list all products
        if (productId) {
            return await getProductById(productId, envCheck);
        } else {
            // Extract query parameters for filtering
            const searchTerm = queryStringParameters.search || '';
            const category = queryStringParameters.category || '';
            
            return await listProducts(searchTerm, category, envCheck);
        }
    } catch (error) {
        console.error('Handler error:', error);
        
        // Try to handle permission errors gracefully
        try {
            return handleAWSPermissionError(error);
        } catch (handlerError) {
            return formatResponse(500, { 
                message: 'Internal server error', 
                error: error.message,
                studentMode: STUDENT_MODE
            });
        }
    }
};

// Function to get a specific product by ID with student account support
async function getProductById(productId, envCheck) {
    if (!productId) {
        return formatResponse(400, { message: 'Product ID is required' });
    }

    try {
        // If no database access, use mock data
        if (!envCheck.hasDatabase || STUDENT_MODE) {
            console.log('Using mock data for product lookup');
            const mockProduct = MOCK_PRODUCTS.find(p => p.product_id === productId);
            
            if (!mockProduct) {
                return formatResponse(404, { 
                    message: 'Product not found',
                    mockData: true 
                });
            }
            
            return formatResponse(200, {
                ...mockProduct,
                mockData: true,
                message: 'Mock data - student account mode'
            });
        }

        // Try to connect to RDS
        const connection = await createRDSConnection();
        
        if (!connection) {
            // Fallback to mock data if connection fails
            console.log('RDS unavailable, using mock data');
            const mockProduct = MOCK_PRODUCTS.find(p => p.product_id === productId);
            
            return formatResponse(200, mockProduct || {
                product_id: productId,
                name: 'Sample Product',
                price: 99.99,
                stock_quantity: 10,
                description: 'Sample product description',
                category: 'General',
                imageUrl: getSafeS3Url(null, null, 'Product+Image'),
                specUrl: getSafeS3Url(null, null, 'Product+Specs'),
                fallbackData: true
            });
        }

        // Query product information from RDS
        const productInfo = await new Promise((resolve, reject) => {
            connection.query(
                'SELECT * FROM products WHERE product_id = ?', 
                [productId],
                (error, results) => {
                    connection.end();
                    if (error) {
                        console.error('Database query error:', error);
                        reject(error);
                    } else {
                        resolve(results[0]);
                    }
                }
            );
        });

        if (!productInfo) {
            return formatResponse(404, { message: 'Product not found' });
        }

        // Add S3 URLs with safe fallbacks
        const imageUrl = getSafeS3Url(process.env.S3_BUCKET, `product-images/${productId}.jpg`, 'Product+Image');
        const specUrl = getSafeS3Url(process.env.S3_BUCKET, `product-specs/${productId}.pdf`, 'Product+Specs');

        // Combine all product information
        const response = {
            ...productInfo,
            imageUrl,
            specUrl,
            source: 'database'
        };

        return formatResponse(200, response);
        
    } catch (error) {
        console.error('Error getting product by ID:', error);
        
        // Try permission error handler
        try {
            return handleAWSPermissionError(error);
        } catch (handlerError) {
            // Final fallback to mock data
            const mockProduct = MOCK_PRODUCTS.find(p => p.product_id === productId);
            return formatResponse(200, mockProduct || {
                product_id: productId,
                name: 'Fallback Product',
                price: 0,
                stock_quantity: 0,
                description: 'Error retrieving product information',
                category: 'Unknown',
                imageUrl: getSafeS3Url(null, null, 'Error'),
                specUrl: getSafeS3Url(null, null, 'Error'),
                error: error.message,
                fallbackData: true
            });
        }
    }
}

// Function to list products with optional filtering
// Function to list all products with filtering support and student account compatibility
async function listProducts(searchTerm, category, envCheck) {
    try {
        // If no database access, use mock data
        if (!envCheck.hasDatabase || STUDENT_MODE) {
            console.log('Using mock data for product listing');
            let filteredProducts = [...MOCK_PRODUCTS];
            
            // Apply search filter to mock data
            if (searchTerm) {
                const searchLower = searchTerm.toLowerCase();
                filteredProducts = filteredProducts.filter(product => 
                    product.name.toLowerCase().includes(searchLower) ||
                    product.description.toLowerCase().includes(searchLower) ||
                    product.product_id.toLowerCase().includes(searchLower)
                );
            }
            
            // Apply category filter to mock data
            if (category) {
                filteredProducts = filteredProducts.filter(product => 
                    product.category.toLowerCase() === category.toLowerCase()
                );
            }
            
            return formatResponse(200, {
                products: filteredProducts,
                count: filteredProducts.length,
                mockData: true,
                message: 'Mock data - student account mode'
            });
        }

        // Try to connect to RDS
        const connection = await createRDSConnection();
        
        if (!connection) {
            // Fallback to mock data if connection fails
            console.log('RDS unavailable, using mock data for listing');
            let filteredProducts = [...MOCK_PRODUCTS];
            
            // Apply filters to mock data
            if (searchTerm) {
                const searchLower = searchTerm.toLowerCase();
                filteredProducts = filteredProducts.filter(product => 
                    product.name.toLowerCase().includes(searchLower) ||
                    product.description.toLowerCase().includes(searchLower)
                );
            }
            
            if (category) {
                filteredProducts = filteredProducts.filter(product => 
                    product.category.toLowerCase() === category.toLowerCase()
                );
            }
            
            return formatResponse(200, {
                products: filteredProducts,
                count: filteredProducts.length,
                fallbackData: true,
                message: 'Database unavailable, using fallback data'
            });
        }
        
        // Build the query based on filters
        let query = 'SELECT * FROM products';
        const params = [];
        
        if (searchTerm || category) {
            query += ' WHERE';
            
            if (searchTerm) {
                query += ' (name LIKE ? OR description LIKE ? OR product_id LIKE ?)';
                params.push(`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`);
            }
            
            if (category) {
                if (searchTerm) query += ' AND';
                query += ' category = ?';
                params.push(category);
            }
        }
        
        // Add order by
        query += ' ORDER BY name';
        
        // Execute the query
        const products = await new Promise((resolve, reject) => {
            connection.query(query, params, (error, results) => {
                connection.end();
                if (error) {
                    console.error('Database query error:', error);
                    reject(error);
                } else {
                    resolve(results);
                }
            });
        });
        
        // Add S3 URLs with safe fallbacks
        const productsWithUrls = products.map(product => {
            const imageUrl = getSafeS3Url(process.env.S3_BUCKET, `product-images/${product.product_id}.jpg`, 'Product+Image');
            const specUrl = getSafeS3Url(process.env.S3_BUCKET, `product-specs/${product.product_id}.pdf`, 'Product+Specs');
            
            return {
                ...product,
                imageUrl,
                specUrl
            };
        });
        
        return formatResponse(200, {
            products: productsWithUrls,
            count: productsWithUrls.length,
            source: 'database'
        });
        
    } catch (error) {
        console.error('Error listing products:', error);
        
        // Try permission error handler
        try {
            return handleAWSPermissionError(error);
        } catch (handlerError) {
            // Final fallback to mock data
            return formatResponse(200, {
                products: MOCK_PRODUCTS,
                count: MOCK_PRODUCTS.length,
                fallbackData: true,
                error: error.message,
                message: 'Error occurred, using fallback data'
            });
        }
    }
}

// Function to add a new product to the database
async function addNewProduct(requestBody) {
    // Validate required fields
    if (!requestBody.productId || !requestBody.productName || !requestBody.category || !requestBody.price || !requestBody.stockQuantity) {
        return formatResponse(400, { message: 'Required fields missing. Required: productId, productName, category, price, stockQuantity' });
    }

    try {
        // Create RDS connection
        const connection = mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        // Insert the new product into the database
        await new Promise((resolve, reject) => {
            const query = 'INSERT INTO products (product_id, product_name, category, price, stock_quantity) VALUES (?, ?, ?, ?, ?)';
            connection.query(
                query,
                [requestBody.productId, requestBody.productName, requestBody.category, requestBody.price, requestBody.stockQuantity],
                (error, results) => {
                    connection.end();
                    if (error) reject(error);
                    else resolve(results);
                }
            );
        });

        return formatResponse(201, { message: 'Product added successfully', productId: requestBody.productId });
    } catch (error) {
        console.error('Error adding new product:', error);
        return formatResponse(500, { message: 'Error adding new product' });
    }
}

// Helper function to format the API response
function formatResponse(statusCode, body) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        },
        body: JSON.stringify(body)
    };
}
