// Test script for MySQL integration with customer data
// This script validates that the Lambda function can connect to MySQL and retrieve customer data

const mysql = require('mysql');

// MySQL Database Configuration (using your working settings)
const RDS_CONFIG = {
    host: process.env.RDS_ENDPOINT || 'salepoint-rds.cdtkcf7qlbd7.us-east-1.rds.amazonaws.com',
    user: process.env.RDS_USERNAME || 'admin',
    password: process.env.RDS_PASSWORD || 'Admin1234',
    database: process.env.RDS_DATABASE || 'salepointdb',
    port: process.env.RDS_PORT || 3306,
    connectTimeout: 30000,
    acquireTimeout: 30000,
    timeout: 30000,
    reconnect: true
};

// Create MySQL connection pool for better performance
let connectionPool;

function createConnectionPool() {
    if (!connectionPool) {
        connectionPool = mysql.createPool({
            ...RDS_CONFIG,
            connectionLimit: 10,
            multipleStatements: true
        });
    }
    return connectionPool;
}

// Execute MySQL query with promise wrapper
function executeQuery(query, params = []) {
    return new Promise((resolve, reject) => {
        const pool = createConnectionPool();
        pool.query(query, params, (error, results) => {
            if (error) {
                console.error('MySQL query error:', error);
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
}

// Test MySQL connection
async function testMySQLConnection() {
    console.log('🔧 Testing MySQL Connection...');
    console.log('Database Config:', {
        host: RDS_CONFIG.host,
        database: RDS_CONFIG.database,
        port: RDS_CONFIG.port,
        user: RDS_CONFIG.user
    });
    
    try {
        const result = await executeQuery('SELECT 1 as test, NOW() as server_time, VERSION() as mysql_version');
        console.log('✅ MySQL connection successful!');
        console.log('Server time:', result[0].server_time);
        console.log('MySQL version:', result[0].mysql_version);
        return true;
    } catch (error) {
        console.error('❌ MySQL connection failed:', error.message);
        console.error('Error code:', error.code);
        return false;
    }
}

// Test database and tables existence
async function testDatabaseStructure() {
    console.log('\n📊 Testing Database Structure...');
    
    try {
        // Check if database exists and we can access it
        const dbQuery = 'SELECT DATABASE() as current_db';
        const dbResult = await executeQuery(dbQuery);
        console.log('✅ Connected to database:', dbResult[0].current_db);
        
        // Check if required tables exist
        const tablesQuery = `
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = DATABASE()
            AND table_name IN ('customers', 'sales_reps')
        `;
        
        const tables = await executeQuery(tablesQuery);
        const tableNames = tables.map(t => t.table_name || t.TABLE_NAME);
        
        console.log('Available tables:', tableNames);
        
        if (tableNames.includes('customers')) {
            console.log('✅ customers table found');
        } else {
            console.log('⚠️  customers table missing');
        }
        
        if (tableNames.includes('sales_reps')) {
            console.log('✅ sales_reps table found');
        } else {
            console.log('⚠️  sales_reps table missing');
        }
        
        return tableNames.length > 0;
    } catch (error) {
        console.error('❌ Database structure test failed:', error.message);
        return false;
    }
}

// Test customer data operations
async function testCustomerDataOperations() {
    console.log('\n👤 Testing Customer Data Operations...');
    
    try {
        // Check if customers table exists and has structure
        const describeQuery = 'DESCRIBE customers';
        const structure = await executeQuery(describeQuery);
        console.log('✅ customers table structure confirmed');
        console.log('Columns:', structure.map(col => col.Field).join(', '));
        
        // Test customer count
        const countQuery = 'SELECT COUNT(*) as customer_count FROM customers';
        const countResult = await executeQuery(countQuery);
        console.log(`✅ Found ${countResult[0].customer_count} customers in database`);
        
        // Test customer retrieval with sales rep join
        const customerQuery = `
            SELECT 
                c.customer_id,
                c.name as customer_name,
                c.assigned_sales_rep_id,
                sr.first_name,
                sr.last_name,
                CONCAT(COALESCE(sr.first_name, ''), ' ', COALESCE(sr.last_name, '')) as sales_rep_name
            FROM customers c
            LEFT JOIN sales_reps sr ON c.assigned_sales_rep_id = sr.sales_rep_id
            LIMIT 3
        `;
        
        const customers = await executeQuery(customerQuery);
        
        if (customers.length > 0) {
            console.log('✅ Customer data retrieval successful');
            customers.forEach((customer, index) => {
                console.log(`   Customer ${index + 1}: ${customer.customer_id} - ${customer.customer_name} (Rep: ${customer.sales_rep_name || 'Unassigned'})`);
            });
        } else {
            console.log('⚠️  No customer data found - database may be empty');
        }
        
        return true;
    } catch (error) {
        console.error('❌ Customer data operations failed:', error.message);
        return false;
    }
}

// Test sales rep operations
async function testSalesRepOperations() {
    console.log('\n👥 Testing Sales Rep Operations...');
    
    try {
        // Check sales_reps table
        const repCountQuery = 'SELECT COUNT(*) as rep_count FROM sales_reps';
        const repCountResult = await executeQuery(repCountQuery);
        console.log(`✅ Found ${repCountResult[0].rep_count} sales reps in database`);
        
        // Test sales rep customer assignments
        const assignmentQuery = `
            SELECT 
                sr.sales_rep_id,
                CONCAT(sr.first_name, ' ', sr.last_name) as rep_name,
                COUNT(c.customer_id) as customer_count
            FROM sales_reps sr
            LEFT JOIN customers c ON sr.sales_rep_id = c.assigned_sales_rep_id
            GROUP BY sr.sales_rep_id, sr.first_name, sr.last_name
            ORDER BY customer_count DESC
        `;
        
        const assignments = await executeQuery(assignmentQuery);
        
        if (assignments.length > 0) {
            console.log('✅ Sales rep assignments retrieved');
            assignments.forEach(rep => {
                console.log(`   ${rep.rep_name} (${rep.sales_rep_id}): ${rep.customer_count} customers`);
            });
        } else {
            console.log('⚠️  No sales rep data found');
        }
        
        return true;
    } catch (error) {
        console.error('❌ Sales rep operations failed:', error.message);
        return false;
    }
}

// Initialize sample data if database is empty
async function initializeSampleData() {
    console.log('\n🔄 Checking if sample data initialization is needed...');
    
    try {
        // Check customer count
        const customerCount = await executeQuery('SELECT COUNT(*) as count FROM customers');
        const salesRepCount = await executeQuery('SELECT COUNT(*) as count FROM sales_reps');
        
        if (customerCount[0].count === 0 || salesRepCount[0].count === 0) {
            console.log('📝 Database appears empty, initializing sample data...');
            
            // Insert sample sales reps first
            const insertSalesRepsQuery = `
                INSERT INTO sales_reps (sales_rep_id, first_name, last_name, email, created_at, updated_at) VALUES
                ('SR001', 'John', 'Smith', 'john.smith@company.com', NOW(), NOW()),
                ('SR002', 'Sarah', 'Johnson', 'sarah.johnson@company.com', NOW(), NOW())
                ON DUPLICATE KEY UPDATE first_name=VALUES(first_name)
            `;
            
            await executeQuery(insertSalesRepsQuery);
            console.log('✅ Sample sales reps inserted');
            
            // Insert sample customers
            const insertCustomersQuery = `
                INSERT INTO customers (customer_id, name, email, phone, assigned_sales_rep_id, created_at, updated_at) VALUES
                ('CUST001', 'Acme Corporation', 'contact@acme.com', '555-0101', 'SR001', NOW(), NOW()),
                ('CUST002', 'TechFlow Industries', 'info@techflow.com', '555-0102', 'SR001', NOW(), NOW()),
                ('CUST003', 'Global Solutions Inc', 'support@globalsolutions.com', '555-0103', 'SR002', NOW(), NOW()),
                ('CUST1001', 'Test Customer 1001', 'test@customer1001.com', '555-1001', 'SR001', NOW(), NOW())
                ON DUPLICATE KEY UPDATE name=VALUES(name)
            `;
            
            await executeQuery(insertCustomersQuery);
            console.log('✅ Sample customers inserted');
            
            return true;
        } else {
            console.log(`✅ Database already has data (${customerCount[0].count} customers, ${salesRepCount[0].count} sales reps)`);
            return true;
        }
    } catch (error) {
        console.error('❌ Sample data initialization failed:', error.message);
        return false;
    }
}

// Run all tests
async function runAllTests() {
    console.log('🚀 Starting MySQL Integration Tests for SalePoint Database\n');
    
    const results = {
        connection: false,
        structure: false,
        dataInit: false,
        customerOps: false,
        salesRepOps: false
    };
    
    try {
        // Test connection
        results.connection = await testMySQLConnection();
        
        if (results.connection) {
            // Test database structure
            results.structure = await testDatabaseStructure();
            
            if (results.structure) {
                // Initialize sample data if needed
                results.dataInit = await initializeSampleData();
                
                // Test customer operations
                results.customerOps = await testCustomerDataOperations();
                
                // Test sales rep operations
                results.salesRepOps = await testSalesRepOperations();
            }
        }
    } catch (error) {
        console.error('❌ Test execution error:', error);
    }
    
    // Summary
    console.log('\n📋 Test Results Summary:');
    console.log('=======================');
    console.log('MySQL Connection:', results.connection ? '✅ PASS' : '❌ FAIL');
    console.log('Database Structure:', results.structure ? '✅ PASS' : '❌ FAIL');
    console.log('Data Initialization:', results.dataInit ? '✅ PASS' : '❌ FAIL');
    console.log('Customer Operations:', results.customerOps ? '✅ PASS' : '❌ FAIL');
    console.log('Sales Rep Operations:', results.salesRepOps ? '✅ PASS' : '❌ FAIL');
    
    const allPassed = Object.values(results).every(result => result === true);
    
    if (allPassed) {
        console.log('\n🎉 All tests passed! MySQL integration is working correctly.');
        console.log('✅ Your database is ready for the Lambda function to use.');
        console.log('✅ Customer data operations are functional.');
        console.log('✅ Sales rep assignments are working.');
    } else {
        console.log('\n⚠️  Some tests failed. Check the details above.');
        
        if (!results.connection) {
            console.log('💡 Fix connection issues first');
        } else if (!results.structure) {
            console.log('💡 Run database_init.sql to create required tables');
        } else {
            console.log('💡 Check data operations and constraints');
        }
    }
    
    // Close connection pool
    if (connectionPool) {
        connectionPool.end(() => {
            console.log('\n🔌 Connection pool closed');
        });
    }
    
    return allPassed;
}

// Run tests if this script is executed directly
if (require.main === module) {
    runAllTests().then(success => {
        setTimeout(() => {
            process.exit(success ? 0 : 1);
        }, 1000);
    }).catch(error => {
        console.error('❌ Test execution failed:', error);
        setTimeout(() => {
            process.exit(1);
        }, 1000);
    });
}

module.exports = {
    testMySQLConnection,
    testDatabaseStructure,
    testCustomerDataOperations,
    testSalesRepOperations,
    initializeSampleData,
    runAllTests
};
