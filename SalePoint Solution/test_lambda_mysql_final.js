const mysql = require('mysql2/promise');

// Import the Lambda function
const customerLambda = require('./src/lambda/customerSalesRepTracking');

// MySQL connection configuration
const dbConfig = {
    host: 'salepoint-rds.cdtkcf7qlbd7.us-east-1.rds.amazonaws.com',
    user: 'admin',
    password: 'Admin1234',
    database: 'salepointdb',
    port: 3306,
    ssl: { rejectUnauthorized: false }
};

async function testDatabaseConnection() {
    console.log('🔍 Testing MySQL database connection...');
    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log('✅ MySQL connection successful');
        
        // Test basic query
        const [rows] = await connection.execute('SELECT COUNT(*) as count FROM customers');
        console.log(`📊 Found ${rows[0].count} customers in database`);
        
        await connection.end();
        return true;
    } catch (error) {
        console.error('❌ MySQL connection failed:', error.message);
        return false;
    }
}

async function testGetCustomerDetails() {
    console.log('\n📋 Testing getCustomerDetails function...');
    
    const event = {
        httpMethod: 'GET',
        pathParameters: { customerId: 'CUST1001' }
    };
    
    try {
        const result = await customerLambda.handler(event);
        const response = JSON.parse(result.body);
        
        console.log(`Status Code: ${result.statusCode}`);
        console.log('Response:', JSON.stringify(response, null, 2));
        
        if (result.statusCode === 200 && response.customer) {
            console.log('✅ getCustomerDetails test PASSED');
            return true;
        } else {
            console.log('❌ getCustomerDetails test FAILED');
            return false;
        }
    } catch (error) {
        console.error('❌ getCustomerDetails test ERROR:', error);
        return false;
    }
}

async function testGetSalesRepCustomers() {
    console.log('\n👥 Testing getSalesRepCustomers function...');
    
    const event = {
        httpMethod: 'GET',
        pathParameters: { salesRepId: 'REP001' }
    };
    
    try {
        const result = await customerLambda.handler(event);
        const response = JSON.parse(result.body);
        
        console.log(`Status Code: ${result.statusCode}`);
        console.log('Response:', JSON.stringify(response, null, 2));
        
        if (result.statusCode === 200 && Array.isArray(response.customers)) {
            console.log('✅ getSalesRepCustomers test PASSED');
            return true;
        } else {
            console.log('❌ getSalesRepCustomers test FAILED');
            return false;
        }
    } catch (error) {
        console.error('❌ getSalesRepCustomers test ERROR:', error);
        return false;
    }
}

async function testAssignCustomerToSalesRep() {
    console.log('\n🔄 Testing assignCustomerToSalesRep function...');
    
    const event = {
        httpMethod: 'PUT',
        pathParameters: { customerId: 'CUST1001' },
        body: JSON.stringify({ salesRepId: 'REP002' })
    };
    
    try {
        const result = await customerLambda.handler(event);
        const response = JSON.parse(result.body);
        
        console.log(`Status Code: ${result.statusCode}`);
        console.log('Response:', JSON.stringify(response, null, 2));
        
        if (result.statusCode === 200 && response.message) {
            console.log('✅ assignCustomerToSalesRep test PASSED');
            
            // Verify the assignment by getting customer details
            const verifyEvent = {
                httpMethod: 'GET',
                pathParameters: { customerId: 'CUST1001' }
            };
            
            const verifyResult = await customerLambda.handler(verifyEvent);
            const verifyResponse = JSON.parse(verifyResult.body);
            
            if (verifyResponse.customer && verifyResponse.customer.assigned_sales_rep_id === 'REP002') {
                console.log('✅ Assignment verification PASSED');
                return true;
            } else {
                console.log('❌ Assignment verification FAILED');
                console.log('Expected sales rep: REP002, Got:', verifyResponse.customer?.assigned_sales_rep_id);
                return false;
            }
        } else {
            console.log('❌ assignCustomerToSalesRep test FAILED');
            return false;
        }
    } catch (error) {
        console.error('❌ assignCustomerToSalesRep test ERROR:', error);
        return false;
    }
}

async function testUpdateCustomerStatus() {
    console.log('\n📝 Testing updateCustomerStatus function...');
    
    const event = {
        httpMethod: 'POST',
        pathParameters: { customerId: 'CUST1001' },
        body: JSON.stringify({ 
            salesRepId: 'REP001',
            status: 'active'
        })
    };
    
    try {
        const result = await customerLambda.handler(event);
        const response = JSON.parse(result.body);
        
        console.log(`Status Code: ${result.statusCode}`);
        console.log('Response:', JSON.stringify(response, null, 2));
        
        if (result.statusCode === 200 && response.message) {
            console.log('✅ updateCustomerStatus test PASSED');
            return true;
        } else {
            console.log('❌ updateCustomerStatus test FAILED');
            return false;
        }
    } catch (error) {
        console.error('❌ updateCustomerStatus test ERROR:', error);
        return false;
    }
}

async function testErrorHandling() {
    console.log('\n🚨 Testing error handling...');
    
    // Test with non-existent customer
    const event = {
        httpMethod: 'GET',
        pathParameters: { customerId: 'NONEXISTENT' }
    };
    
    try {
        const result = await customerLambda.handler(event);
        const response = JSON.parse(result.body);
        
        console.log(`Status Code: ${result.statusCode}`);
        console.log('Response:', JSON.stringify(response, null, 2));
        
        if (result.statusCode === 404) {
            console.log('✅ Error handling test PASSED');
            return true;
        } else {
            console.log('❌ Error handling test FAILED - Expected 404 status');
            return false;
        }
    } catch (error) {
        console.error('❌ Error handling test ERROR:', error);
        return false;
    }
}

async function runComprehensiveTest() {
    console.log('🚀 Starting comprehensive Lambda MySQL integration test...\n');
    
    const results = {
        databaseConnection: false,
        getCustomerDetails: false,
        getSalesRepCustomers: false,
        assignCustomerToSalesRep: false,
        updateCustomerStatus: false,
        errorHandling: false
    };
    
    // Run all tests
    results.databaseConnection = await testDatabaseConnection();
    
    if (results.databaseConnection) {
        results.getCustomerDetails = await testGetCustomerDetails();
        results.getSalesRepCustomers = await testGetSalesRepCustomers();
        results.assignCustomerToSalesRep = await testAssignCustomerToSalesRep();
        results.updateCustomerStatus = await testUpdateCustomerStatus();
        results.errorHandling = await testErrorHandling();
    } else {
        console.log('⚠️  Skipping Lambda tests due to database connection failure');
    }
    
    // Summary
    console.log('\n📊 TEST SUMMARY:');
    console.log('================');
    
    const testNames = [
        'Database Connection',
        'Get Customer Details',
        'Get Sales Rep Customers',
        'Assign Customer to Sales Rep',
        'Update Customer Status',
        'Error Handling'
    ];
    
    let passedTests = 0;
    const totalTests = Object.keys(results).length;
    
    Object.entries(results).forEach(([key, passed], index) => {
        const status = passed ? '✅ PASSED' : '❌ FAILED';
        console.log(`${testNames[index]}: ${status}`);
        if (passed) passedTests++;
    });
    
    console.log(`\nTotal: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
        console.log('\n🎉 ALL TESTS PASSED! Lambda MySQL integration is working perfectly!');
        console.log('\n✅ FINAL STATUS: Lambda function is ready for production deployment');
    } else {
        console.log('\n⚠️  Some tests failed. Please review the issues above.');
    }
    
    return passedTests === totalTests;
}

// Run the test if this file is executed directly
if (require.main === module) {
    runComprehensiveTest()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('❌ Test execution failed:', error);
            process.exit(1);
        });
}

module.exports = { runComprehensiveTest };
