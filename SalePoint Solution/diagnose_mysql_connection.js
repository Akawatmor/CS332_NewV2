// MySQL Connection Diagnostic Tool
// This script will help identify why the MySQL connection is failing

const mysql = require('mysql');
const net = require('net');
const dns = require('dns');

// Your RDS Configuration
const RDS_CONFIG = {
    host: process.env.RDS_ENDPOINT || '', // rds endpoint
    user: process.env.RDS_USERNAME || '', // username of database
    password: process.env.RDS_PASSWORD || '', // password for database
    database: process.env.RDS_DATABASE || '', // name of database
    port: process.env.RDS_PORT || 3306,
    connectTimeout: 10000,
    acquireTimeout: 10000,
    timeout: 10000,
    reconnect: true
};

console.log('🔍 MySQL Connection Diagnostic Tool');
console.log('====================================\n');

// Step 1: Check DNS resolution
async function checkDNSResolution() {
    console.log('1️⃣ Testing DNS Resolution...');
    
    return new Promise((resolve) => {
        dns.lookup(RDS_CONFIG.host, (err, address, family) => {
            if (err) {
                console.log('❌ DNS Resolution FAILED:', err.message);
                console.log('   → The hostname cannot be resolved to an IP address');
                console.log('   → Check if the RDS endpoint is correct');
                resolve(false);
            } else {
                console.log('✅ DNS Resolution SUCCESS');
                console.log(`   → ${RDS_CONFIG.host} resolves to ${address} (IPv${family})`);
                resolve(true);
            }
        });
    });
}

// Step 2: Check network connectivity
async function checkNetworkConnectivity() {
    console.log('\n2️⃣ Testing Network Connectivity...');
    
    return new Promise((resolve) => {
        const socket = new net.Socket();
        const timeout = 10000;
        
        socket.setTimeout(timeout);
        
        socket.on('connect', () => {
            console.log('✅ Network Connection SUCCESS');
            console.log(`   → Can reach ${RDS_CONFIG.host}:${RDS_CONFIG.port}`);
            socket.destroy();
            resolve(true);
        });
        
        socket.on('timeout', () => {
            console.log('❌ Network Connection TIMEOUT');
            console.log('   → Cannot reach the server within 10 seconds');
            console.log('   → Possible issues:');
            console.log('     • RDS instance is not running');
            console.log('     • Security group blocking connections');
            console.log('     • Network ACL restrictions');
            socket.destroy();
            resolve(false);
        });
        
        socket.on('error', (err) => {
            console.log('❌ Network Connection FAILED:', err.message);
            console.log('   → Possible issues:');
            console.log('     • RDS instance does not exist');
            console.log('     • Wrong endpoint or port');
            console.log('     • Security group blocking port 3306');
            resolve(false);
        });
        
        socket.connect(RDS_CONFIG.port, RDS_CONFIG.host);
    });
}

// Step 3: Test MySQL authentication
async function checkMySQLAuthentication() {
    console.log('\n3️⃣ Testing MySQL Authentication...');
    
    return new Promise((resolve) => {
        const connection = mysql.createConnection({
            host: RDS_CONFIG.host,
            user: RDS_CONFIG.user,
            password: RDS_CONFIG.password,
            port: RDS_CONFIG.port,
            connectTimeout: 10000
        });
        
        connection.connect((err) => {
            if (err) {
                console.log('❌ MySQL Authentication FAILED:', err.message);
                
                if (err.code === 'ER_ACCESS_DENIED_ERROR') {
                    console.log('   → Wrong username or password');
                    console.log('   → Check your RDS master credentials');
                } else if (err.code === 'ECONNREFUSED') {
                    console.log('   → Connection refused by server');
                    console.log('   → RDS instance might be stopped or not accessible');
                } else if (err.code === 'ETIMEDOUT') {
                    console.log('   → Connection timed out');
                    console.log('   → Security group might be blocking access');
                } else {
                    console.log('   → Unexpected error occurred');
                }
                
                resolve(false);
            } else {
                console.log('✅ MySQL Authentication SUCCESS');
                console.log('   → Successfully connected to MySQL server');
                connection.end();
                resolve(true);
            }
        });
    });
}

// Step 4: Test database access
async function checkDatabaseAccess() {
    console.log('\n4️⃣ Testing Database Access...');
    
    return new Promise((resolve) => {
        const connection = mysql.createConnection(RDS_CONFIG);
        
        connection.connect((err) => {
            if (err) {
                console.log('❌ Database Connection FAILED:', err.message);
                
                if (err.code === 'ER_BAD_DB_ERROR') {
                    console.log('   → Database does not exist');
                    console.log(`   → Create database '${RDS_CONFIG.database}' first`);
                } else {
                    console.log('   → Check database name and permissions');
                }
                
                resolve(false);
            } else {
                console.log('✅ Database Connection SUCCESS');
                console.log(`   → Connected to database '${RDS_CONFIG.database}'`);
                
                // Test a simple query
                connection.query('SELECT 1 as test', (queryErr, results) => {
                    if (queryErr) {
                        console.log('❌ Query execution FAILED:', queryErr.message);
                        resolve(false);
                    } else {
                        console.log('✅ Query execution SUCCESS');
                        console.log('   → Database is functional');
                        resolve(true);
                    }
                    connection.end();
                });
            }
        });
    });
}

// Step 5: Check required tables
async function checkRequiredTables() {
    console.log('\n5️⃣ Checking Required Tables...');
    
    return new Promise((resolve) => {
        const connection = mysql.createConnection(RDS_CONFIG);
        
        connection.connect((err) => {
            if (err) {
                console.log('❌ Cannot connect to check tables');
                resolve(false);
                return;
            }
            
            const checkTablesQuery = `
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = '${RDS_CONFIG.database}' 
                AND table_name IN ('customers', 'sales_reps')
            `;
            
            connection.query(checkTablesQuery, (queryErr, results) => {
                if (queryErr) {
                    console.log('❌ Table check FAILED:', queryErr.message);
                    resolve(false);
                } else {
                    const tables = results.map(row => row.table_name);
                    
                    if (tables.includes('customers') && tables.includes('sales_reps')) {
                        console.log('✅ Required tables FOUND');
                        console.log('   → customers table: EXISTS');
                        console.log('   → sales_reps table: EXISTS');
                        resolve(true);
                    } else {
                        console.log('❌ Required tables MISSING');
                        console.log('   → customers table:', tables.includes('customers') ? 'EXISTS' : 'MISSING');
                        console.log('   → sales_reps table:', tables.includes('sales_reps') ? 'EXISTS' : 'MISSING');
                        console.log('   → Run database_init.sql to create tables');
                        resolve(false);
                    }
                }
                connection.end();
            });
        });
    });
}

// Main diagnostic function
async function runDiagnostics() {
    console.log('Configuration being tested:');
    console.log('Host:', RDS_CONFIG.host);
    console.log('Port:', RDS_CONFIG.port);
    console.log('User:', RDS_CONFIG.user);
    console.log('Database:', RDS_CONFIG.database);
    console.log('Password:', '***' + RDS_CONFIG.password.slice(-2));
    console.log('\n');
    
    const results = {
        dns: await checkDNSResolution(),
        network: false,
        auth: false,
        database: false,
        tables: false
    };
    
    if (results.dns) {
        results.network = await checkNetworkConnectivity();
        
        if (results.network) {
            results.auth = await checkMySQLAuthentication();
            
            if (results.auth) {
                results.database = await checkDatabaseAccess();
                
                if (results.database) {
                    results.tables = await checkRequiredTables();
                }
            }
        }
    }
    
    // Summary
    console.log('\n📋 Diagnostic Summary:');
    console.log('======================');
    console.log('DNS Resolution:', results.dns ? '✅ PASS' : '❌ FAIL');
    console.log('Network Connectivity:', results.network ? '✅ PASS' : '❌ FAIL');
    console.log('MySQL Authentication:', results.auth ? '✅ PASS' : '❌ FAIL');
    console.log('Database Access:', results.database ? '✅ PASS' : '❌ FAIL');
    console.log('Required Tables:', results.tables ? '✅ PASS' : '❌ FAIL');
    
    // Recommendations
    console.log('\n💡 Recommendations:');
    console.log('==================');
    
    if (!results.dns) {
        console.log('🔧 Fix DNS: Check RDS endpoint spelling and region');
    } else if (!results.network) {
        console.log('🔧 Fix Network: Check RDS security groups and allow port 3306');
        console.log('   → Go to AWS Console → RDS → Your instance → Security Groups');
        console.log('   → Add inbound rule: Type=MySQL/Aurora, Port=3306, Source=Your IP');
    } else if (!results.auth) {
        console.log('🔧 Fix Authentication: Verify RDS master username/password');
        console.log('   → Check if credentials match what was set during RDS creation');
    } else if (!results.database) {
        console.log('🔧 Fix Database: Create the database or check the name');
        console.log('   → Connect with: CREATE DATABASE salepointdb;');
    } else if (!results.tables) {
        console.log('🔧 Fix Tables: Run database initialization script');
        console.log('   → Execute: src/db/database_init.sql');
    } else {
        console.log('🎉 All checks passed! Your MySQL setup is working correctly.');
    }
    
    const allPassed = Object.values(results).every(result => result === true);
    return allPassed;
}

// Run diagnostics
if (require.main === module) {
    runDiagnostics().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('❌ Diagnostic failed:', error);
        process.exit(1);
    });
}

module.exports = { runDiagnostics };
