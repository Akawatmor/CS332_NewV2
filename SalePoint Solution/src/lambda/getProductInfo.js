// Lambda function for getting product information
// This would be deployed to AWS Lambda and connected to API Gateway

const AWS = require('aws-sdk');
const mysql = require('mysql');

exports.handler = async (event) => {
    console.log('Event received:', JSON.stringify(event));
    
    // Extract product ID from the event
    const productId = event.pathParameters?.productId || event.queryStringParameters?.productId;
    
    // If productId is provided, get a specific product, otherwise list all products
    if (productId) {
        return await getProductById(productId);
    } else {
        // Extract query parameters for filtering
        const searchTerm = event.queryStringParameters?.search || '';
        const category = event.queryStringParameters?.category || '';
        
        return await listProducts(searchTerm, category);
    }
};

// Function to get a specific product by ID
async function getProductById(productId) {
    if (!productId) {
        return formatResponse(400, { message: 'Product ID is required' });
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
            return formatResponse(404, { message: 'Product not found' });
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
        
        return formatResponse(200, response);
    } catch (error) {
        console.error('Error retrieving product:', error);
        return formatResponse(500, { message: 'Error retrieving product information' });
    }
}

// Function to list products with optional filtering
async function listProducts(searchTerm, category) {
    try {
        // Create RDS connection
        const connection = mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });
        
        // Build the query based on filters
        let query = 'SELECT * FROM products';
        const params = [];
        
        if (searchTerm || category) {
            query += ' WHERE';
            
            if (searchTerm) {
                query += ' (product_name LIKE ? OR description LIKE ? OR product_id LIKE ?)';
                params.push(`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`);
            }
            
            if (category) {
                if (searchTerm) query += ' AND';
                query += ' category = ?';
                params.push(category);
            }
        }
        
        // Add order by
        query += ' ORDER BY product_name';
        
        // Execute the query
        const products = await new Promise((resolve, reject) => {
            connection.query(query, params, (error, results) => {
                connection.end();
                if (error) reject(error);
                else resolve(results);
            });
        });
        
        // Get S3 URLs for each product
        const s3 = new AWS.S3();
        
        const productsWithUrls = products.map(product => {
            const imageUrl = s3.getSignedUrl('getObject', {
                Bucket: process.env.S3_BUCKET,
                Key: `product-images/${product.product_id}.jpg`,
                Expires: 3600
            });
            
            const specUrl = s3.getSignedUrl('getObject', {
                Bucket: process.env.S3_BUCKET,
                Key: `product-specs/${product.product_id}.pdf`,
                Expires: 3600
            });
            
            return {
                ...product,
                imageUrl,
                specUrl
            };
        });
        
        return formatResponse(200, productsWithUrls);
    } catch (error) {
        console.error('Error listing products:', error);
        return formatResponse(500, { message: 'Error retrieving products' });
    }
}

// Helper function to format the API response
function formatResponse(statusCode, body) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*' // Enable CORS for all origins
        },
        body: JSON.stringify(body)
    };
}
