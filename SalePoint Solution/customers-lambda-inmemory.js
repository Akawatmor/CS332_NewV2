const { v4: uuidv4 } = require('uuid');

// In-memory storage for customers
const customers = new Map();

exports.handler = async (event) => {
    console.log('Customers Lambda Event:', JSON.stringify(event, null, 2));
    
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    };
    
    try {
        // Handle CORS preflight
        if (event.httpMethod === 'OPTIONS') {
            return { statusCode: 200, headers, body: '' };
        }
        
        const { httpMethod, pathParameters } = event;
        const customerId = pathParameters && pathParameters.id ? pathParameters.id : null;
        
        switch (httpMethod) {
            case 'GET':
                if (customerId) {
                    return await getCustomer(customerId, headers);
                } else {
                    return await getCustomers(headers);
                }
                
            case 'POST':
                return await createCustomer(JSON.parse(event.body || '{}'), headers);
                
            case 'PUT':
                if (customerId) {
                    return await updateCustomer(customerId, JSON.parse(event.body || '{}'), headers);
                } else {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ 
                            error: 'Customer ID is required for updates',
                            timestamp: new Date().toISOString()
                        })
                    };
                }
                
            case 'DELETE':
                if (customerId) {
                    return await deleteCustomer(customerId, headers);
                } else {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ 
                            error: 'Customer ID is required for deletion',
                            timestamp: new Date().toISOString()
                        })
                    };
                }
                
            default:
                return {
                    statusCode: 405,
                    headers,
                    body: JSON.stringify({ 
                        error: 'Method not allowed',
                        timestamp: new Date().toISOString()
                    })
                };
        }
        
    } catch (error) {
        console.error('Lambda execution error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Internal server error',
                message: error.message 
            })
        };
    }
};

// Get all customers
async function getCustomers(headers) {
    console.log('Processing GET request for all customers');
    
    try {
        const customerList = Array.from(customers.values());
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                customers: customerList,
                count: customerList.length,
                message: 'Customers retrieved successfully',
                timestamp: new Date().toISOString()
            })
        };
    } catch (error) {
        console.error('Error getting customers:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Error retrieving customers',
                message: error.message
            })
        };
    }
}

// Get a single customer by ID
async function getCustomer(customerId, headers) {
    console.log('Processing GET request for customer:', customerId);
    
    try {
        const customer = customers.get(customerId);
        
        if (!customer) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({
                    error: 'Customer not found',
                    customerId: customerId,
                    timestamp: new Date().toISOString()
                })
            };
        }
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                customer: customer,
                message: 'Customer retrieved successfully',
                timestamp: new Date().toISOString()
            })
        };
    } catch (error) {
        console.error('Error getting customer:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Error retrieving customer',
                message: error.message
            })
        };
    }
}

// Create a new customer
async function createCustomer(body, headers) {
    console.log('Processing POST request for customers');
    
    try {
        // Validate required fields
        if (!body.name || !body.email || !body.phone) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'Missing required fields',
                    required: ['name', 'email', 'phone'],
                    received: Object.keys(body),
                    timestamp: new Date().toISOString()
                })
            };
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(body.email)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'Invalid email format',
                    timestamp: new Date().toISOString()
                })
            };
        }
        
        // Validate phone format (basic validation)
        const phoneRegex = /^\d{3}-\d{3}-\d{4}$/;
        if (!phoneRegex.test(body.phone)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    error: 'Invalid phone format. Expected: XXX-XXX-XXXX',
                    timestamp: new Date().toISOString()
                })
            };
        }
        
        const customerId = uuidv4();
        const customer = {
            id: customerId,
            name: body.name,
            email: body.email,
            phone: body.phone,
            address: body.address || '',
            company: body.company || '',
            notes: body.notes || '',
            status: body.status || 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        customers.set(customerId, customer);
        
        console.log('Customer created successfully:', customerId);
        
        return {
            statusCode: 201,
            headers,
            body: JSON.stringify({
                message: 'Customer created successfully',
                customer: customer,
                timestamp: new Date().toISOString()
            })
        };
    } catch (error) {
        console.error('Error creating customer:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Error creating customer',
                message: error.message
            })
        };
    }
}

// Update an existing customer
async function updateCustomer(customerId, body, headers) {
    console.log('Processing PUT request for customer:', customerId);
    
    try {
        const existingCustomer = customers.get(customerId);
        
        if (!existingCustomer) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({
                    error: 'Customer not found',
                    customerId: customerId,
                    timestamp: new Date().toISOString()
                })
            };
        }
        
        // Validate email format if provided
        if (body.email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(body.email)) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({
                        error: 'Invalid email format',
                        timestamp: new Date().toISOString()
                    })
                };
            }
        }
        
        // Validate phone format if provided
        if (body.phone) {
            const phoneRegex = /^\d{3}-\d{3}-\d{4}$/;
            if (!phoneRegex.test(body.phone)) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({
                        error: 'Invalid phone format. Expected: XXX-XXX-XXXX',
                        timestamp: new Date().toISOString()
                    })
                };
            }
        }
        
        const updatedCustomer = {
            ...existingCustomer,
            name: body.name || existingCustomer.name,
            email: body.email || existingCustomer.email,
            phone: body.phone || existingCustomer.phone,
            address: body.address !== undefined ? body.address : existingCustomer.address,
            company: body.company !== undefined ? body.company : existingCustomer.company,
            notes: body.notes !== undefined ? body.notes : existingCustomer.notes,
            status: body.status || existingCustomer.status,
            updatedAt: new Date().toISOString()
        };
        
        customers.set(customerId, updatedCustomer);
        
        console.log('Customer updated successfully:', customerId);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                message: 'Customer updated successfully',
                customer: updatedCustomer,
                timestamp: new Date().toISOString()
            })
        };
    } catch (error) {
        console.error('Error updating customer:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Error updating customer',
                message: error.message
            })
        };
    }
}

// Delete a customer
async function deleteCustomer(customerId, headers) {
    console.log('Processing DELETE request for customer:', customerId);
    
    try {
        const existingCustomer = customers.get(customerId);
        
        if (!existingCustomer) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({
                    error: 'Customer not found',
                    customerId: customerId,
                    timestamp: new Date().toISOString()
                })
            };
        }
        
        customers.delete(customerId);
        
        console.log('Customer deleted successfully:', customerId);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                message: 'Customer deleted successfully',
                customerId: customerId,
                timestamp: new Date().toISOString()
            })
        };
    } catch (error) {
        console.error('Error deleting customer:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Error deleting customer',
                message: error.message
            })
        };
    }
}
