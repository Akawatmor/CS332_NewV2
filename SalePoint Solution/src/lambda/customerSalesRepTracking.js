// Lambda function for customer-salesrep relationship tracking
// This would be deployed to AWS Lambda and connected to API Gateway

const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    console.log('Event received:', JSON.stringify(event));
    
    // Determine operation based on HTTP method and path
    const operation = event.httpMethod;
    const path = event.path || '';
    
    try {
        // GET sales rep's customers
        if (operation === 'GET' && path.includes('/salesreps/') && path.includes('/customers')) {
            const salesRepId = event.pathParameters.salesRepId;
            return await getSalesRepCustomers(salesRepId);
        }
        
        // GET customer's assigned sales rep
        else if (operation === 'GET' && path.includes('/customers/')) {
            const customerId = event.pathParameters.customerId;
            return await getCustomerDetails(customerId);
        }
        
        // POST assign customer to sales rep
        else if (operation === 'POST' && path.includes('/assignments')) {
            const requestBody = JSON.parse(event.body);
            return await assignCustomerToSalesRep(requestBody);
        }
        
        // PUT update customer status
        else if (operation === 'PUT' && path.includes('/customers/')) {
            const customerId = event.pathParameters.customerId;
            const requestBody = JSON.parse(event.body);
            return await updateCustomerStatus(customerId, requestBody);
        }
        
        else {
            return formatResponse(400, { message: 'Invalid operation' });
        }
    } catch (error) {
        console.error('Error:', error);
        return formatResponse(500, { message: 'Error processing request', error: error.message });
    }
};

// Function to get all customers assigned to a sales rep
async function getSalesRepCustomers(salesRepId) {
    if (!salesRepId) {
        return formatResponse(400, { message: 'Sales Rep ID is required' });
    }
    
    const params = {
        TableName: 'SalesReps_Customers',
        IndexName: 'SalesRepID-index',  // GSI for querying by salesRepId
        KeyConditionExpression: 'SalesRepID = :salesRepId',
        ExpressionAttributeValues: {
            ':salesRepId': salesRepId
        }
    };
    
    try {
        const result = await dynamoDB.query(params).promise();
        return formatResponse(200, result.Items);
    } catch (error) {
        console.error('Error getting sales rep customers:', error);
        throw error;
    }
}

// Function to get customer details including assigned sales rep
async function getCustomerDetails(customerId) {
    if (!customerId) {
        return formatResponse(400, { message: 'Customer ID is required' });
    }
    
    const params = {
        TableName: 'SalesReps_Customers',
        Key: {
            'CustomerID': customerId
        }
    };
    
    try {
        const result = await dynamoDB.get(params).promise();
        
        if (!result.Item) {
            return formatResponse(404, { message: 'Customer not found' });
        }
        
        return formatResponse(200, result.Item);
    } catch (error) {
        console.error('Error getting customer details:', error);
        throw error;
    }
}

// Function to assign a customer to a sales rep
async function assignCustomerToSalesRep(requestBody) {
    // Validate required fields
    if (!requestBody.customerId || !requestBody.salesRepId) {
        return formatResponse(400, { message: 'Customer ID and Sales Rep ID are required' });
    }
    
    const params = {
        TableName: 'SalesReps_Customers',
        Item: {
            'CustomerID': requestBody.customerId,
            'SalesRepID': requestBody.salesRepId,
            'AssignmentDate': new Date().toISOString(),
            'CustomerName': requestBody.customerName || 'Unknown Customer',
            'SalesRepName': requestBody.salesRepName || 'Unknown Sales Rep',
            'Status': requestBody.status || 'Active',
            'LastUpdated': new Date().toISOString(),
            'Notes': requestBody.notes || ''
        }
    };
    
    try {
        await dynamoDB.put(params).promise();
        return formatResponse(201, { 
            message: 'Customer assigned to sales rep successfully',
            assignment: params.Item
        });
    } catch (error) {
        console.error('Error assigning customer to sales rep:', error);
        throw error;
    }
}

// Function to update customer status
async function updateCustomerStatus(customerId, requestBody) {
    // Validate required fields
    if (!customerId || !requestBody.salesRepId || !requestBody.status) {
        return formatResponse(400, { message: 'Customer ID, Sales Rep ID, and Status are required' });
    }
    
    const params = {
        TableName: 'SalesReps_Customers',
        Key: {
            'CustomerID': customerId,
            'SalesRepID': requestBody.salesRepId
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
    
    try {
        const result = await dynamoDB.update(params).promise();
        return formatResponse(200, {
            message: 'Customer status updated successfully',
            updates: result.Attributes
        });
    } catch (error) {
        console.error('Error updating customer status:', error);
        throw error;
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
