// Test script to verify the customer details fix
let handler;
try {
    const customerModule = require('./src/lambda/customerSalesRepTracking.js');
    handler = customerModule.handler;
} catch (requireError) {
    console.error('Error requiring the module:', requireError.message);
    process.exit(1);
}

async function testCustomerDetails() {
    console.log('Testing customer details endpoint...\n');

    // Test case 1: Valid customer ID that exists in mock data
    const event1 = {
        httpMethod: 'GET',
        path: '/customers/CUST1001',
        pathParameters: {
            customerId: 'CUST1001'
        }
    };

    try {
        console.log('Test 1: GET /customers/CUST1001');
        const result1 = await handler(event1);
        console.log('Status Code:', result1.statusCode);
        console.log('Response:', JSON.parse(result1.body));
        console.log('---\n');
    } catch (error) {
        console.error('Test 1 failed:', error);
    }

    // Test case 2: Valid customer ID that exists in mock data (original)
    const event2 = {
        httpMethod: 'GET',
        path: '/customers/CUST001',
        pathParameters: {
            customerId: 'CUST001'
        }
    };

    try {
        console.log('Test 2: GET /customers/CUST001');
        const result2 = await handler(event2);
        console.log('Status Code:', result2.statusCode);
        console.log('Response:', JSON.parse(result2.body));
        console.log('---\n');
    } catch (error) {
        console.error('Test 2 failed:', error);
    }

    // Test case 3: Non-existent customer ID
    const event3 = {
        httpMethod: 'GET',
        path: '/customers/CUST9999',
        pathParameters: {
            customerId: 'CUST9999'
        }
    };

    try {
        console.log('Test 3: GET /customers/CUST9999 (non-existent)');
        const result3 = await handler(event3);
        console.log('Status Code:', result3.statusCode);
        console.log('Response:', JSON.parse(result3.body));
        console.log('---\n');
    } catch (error) {
        console.error('Test 3 failed:', error);
    }
}

// Run the tests
testCustomerDetails().catch(console.error);
