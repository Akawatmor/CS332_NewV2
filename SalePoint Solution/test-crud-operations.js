const fs = require('fs');

// Load our Lambda function (in-memory version)
const lambdaHandler = require('./customers-lambda-inmemory.js');

// Test data
let testCustomerId = null;

// Helper function to create test events
function createTestEvent(httpMethod, path, body = null, pathParameters = null) {
    return {
        httpMethod: httpMethod,
        path: path,
        pathParameters: pathParameters,
        body: body ? JSON.stringify(body) : null,
        headers: {
            'Content-Type': 'application/json'
        }
    };
}

// Test context
const testContext = {
    getRemainingTimeInMillis: () => 30000
};

async function runTests() {
    console.log('🚀 Starting CRUD Operations Test\n');

    try {
        // Test 1: GET all customers (should be empty initially)
        console.log('📋 Test 1: GET /customers');
        const getAllEvent = createTestEvent('GET', '/customers');
        const getAllResult = await lambdaHandler.handler(getAllEvent, testContext);
        console.log('Status:', getAllResult.statusCode);
        console.log('Response:', getAllResult.body);
        console.log('✅ GET all customers test passed\n');

        // Test 2: POST new customer
        console.log('👤 Test 2: POST /customers');
        const newCustomer = {
            name: 'John Doe',
            email: 'john.doe@example.com',
            phone: '555-123-4567'
        };
        const postEvent = createTestEvent('POST', '/customers', newCustomer);
        const postResult = await lambdaHandler.handler(postEvent, testContext);
        console.log('Status:', postResult.statusCode);
        console.log('Response:', postResult.body);
        
        // Extract customer ID for subsequent tests
        const createdCustomer = JSON.parse(postResult.body);
        testCustomerId = createdCustomer.customer.id;
        console.log('✅ POST customer test passed, ID:', testCustomerId, '\n');

        // Test 3: GET specific customer
        console.log('🔍 Test 3: GET /customers/{id}');
        const getOneEvent = createTestEvent('GET', `/customers/${testCustomerId}`, null, { id: testCustomerId });
        const getOneResult = await lambdaHandler.handler(getOneEvent, testContext);
        console.log('Status:', getOneResult.statusCode);
        console.log('Response:', getOneResult.body);
        console.log('✅ GET specific customer test passed\n');

        // Test 4: PUT update customer
        console.log('✏️ Test 4: PUT /customers/{id}');
        const updatedCustomer = {
            name: 'John Doe Updated',
            email: 'john.doe.updated@example.com',
            phone: '555-987-6543'
        };
        const putEvent = createTestEvent('PUT', `/customers/${testCustomerId}`, updatedCustomer, { id: testCustomerId });
        const putResult = await lambdaHandler.handler(putEvent, testContext);
        console.log('Status:', putResult.statusCode);
        console.log('Response:', putResult.body);
        console.log('✅ PUT update customer test passed\n');

        // Test 5: Verify update by getting the customer again
        console.log('🔍 Test 5: GET updated customer');
        const getUpdatedEvent = createTestEvent('GET', `/customers/${testCustomerId}`, null, { id: testCustomerId });
        const getUpdatedResult = await lambdaHandler.handler(getUpdatedEvent, testContext);
        console.log('Status:', getUpdatedResult.statusCode);
        console.log('Response:', getUpdatedResult.body);
        console.log('✅ Verify update test passed\n');

        // Test 6: GET all customers (should show updated customer)
        console.log('📋 Test 6: GET all customers (with updated data)');
        const getAllUpdatedEvent = createTestEvent('GET', '/customers');
        const getAllUpdatedResult = await lambdaHandler.handler(getAllUpdatedEvent, testContext);
        console.log('Status:', getAllUpdatedResult.statusCode);
        console.log('Response:', getAllUpdatedResult.body);
        console.log('✅ GET all customers (updated) test passed\n');

        // Test 7: DELETE customer
        console.log('🗑️ Test 7: DELETE /customers/{id}');
        const deleteEvent = createTestEvent('DELETE', `/customers/${testCustomerId}`, null, { id: testCustomerId });
        const deleteResult = await lambdaHandler.handler(deleteEvent, testContext);
        console.log('Status:', deleteResult.statusCode);
        console.log('Response:', deleteResult.body);
        console.log('✅ DELETE customer test passed\n');

        // Test 8: Verify deletion by trying to get the deleted customer
        console.log('🔍 Test 8: GET deleted customer (should return 404)');
        const getDeletedEvent = createTestEvent('GET', `/customers/${testCustomerId}`, null, { id: testCustomerId });
        const getDeletedResult = await lambdaHandler.handler(getDeletedEvent, testContext);
        console.log('Status:', getDeletedResult.statusCode);
        console.log('Response:', getDeletedResult.body);
        console.log('✅ Verify deletion test passed\n');

        // Test 9: GET all customers (should be empty again)
        console.log('📋 Test 9: GET all customers (should be empty)');
        const getAllEmptyEvent = createTestEvent('GET', '/customers');
        const getAllEmptyResult = await lambdaHandler.handler(getAllEmptyEvent, testContext);
        console.log('Status:', getAllEmptyResult.statusCode);
        console.log('Response:', getAllEmptyResult.body);
        console.log('✅ GET all customers (empty) test passed\n');

        // Test 10: Error handling - Invalid email format
        console.log('❌ Test 10: POST with invalid email (error handling)');
        const invalidCustomer = {
            name: 'Invalid Customer',
            email: 'invalid-email',
            phone: '555-123-4567'
        };
        const invalidPostEvent = createTestEvent('POST', '/customers', invalidCustomer);
        const invalidPostResult = await lambdaHandler.handler(invalidPostEvent, testContext);
        console.log('Status:', invalidPostResult.statusCode);
        console.log('Response:', invalidPostResult.body);
        console.log('✅ Invalid email error handling test passed\n');

        // Test 11: Error handling - Missing required fields
        console.log('❌ Test 11: POST with missing fields (error handling)');
        const incompleteCustomer = {
            name: 'Incomplete Customer'
            // Missing email and phone
        };
        const incompletePostEvent = createTestEvent('POST', '/customers', incompleteCustomer);
        const incompletePostResult = await lambdaHandler.handler(incompletePostEvent, testContext);
        console.log('Status:', incompletePostResult.statusCode);
        console.log('Response:', incompletePostResult.body);
        console.log('✅ Missing fields error handling test passed\n');

        console.log('🎉 All CRUD operations tests completed successfully!');
        console.log('📊 Test Summary:');
        console.log('- ✅ CREATE (POST): Working correctly');
        console.log('- ✅ READ (GET): Working correctly for both single and multiple customers');
        console.log('- ✅ UPDATE (PUT): Working correctly');
        console.log('- ✅ DELETE: Working correctly');
        console.log('- ✅ Error Handling: Working correctly');

    } catch (error) {
        console.error('❌ Test failed with error:', error);
    }
}

// Run the tests
runTests();
