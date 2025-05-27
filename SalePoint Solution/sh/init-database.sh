#!/bin/bash

# SalePoint Database Initialization Script
# This script initializes the RDS database with the correct schema

set -e

echo "=== SalePoint Database Initialization ==="

# RDS connection details
RDS_ENDPOINT="salepoint-db.cdtkcf7qlbd7.us-east-1.rds.amazonaws.com"
DB_USER="admin"
DB_NAME="salepoint_db"

echo "RDS Endpoint: $RDS_ENDPOINT"
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo ""

# Check if MySQL client is available
if ! command -v mysql &> /dev/null; then
    echo "❌ MySQL client not found. Please install MySQL client:"
    echo "   macOS: brew install mysql-client"
    echo "   Ubuntu: sudo apt-get install mysql-client"
    echo "   CentOS: sudo yum install mysql"
    exit 1
fi

echo "✅ MySQL client found"

# Prompt for password
echo "Please enter the RDS database password for user '$DB_USER':"
read -s DB_PASSWORD

# Test connection
echo "🔗 Testing database connection..."
if ! mysql -h $RDS_ENDPOINT -u $DB_USER -p$DB_PASSWORD --connect-timeout=10 -e "SELECT 1;" 2>/dev/null; then
    echo "❌ Cannot connect to database. Please check:"
    echo "   - RDS instance is running"
    echo "   - Security group allows connections from your IP"
    echo "   - Username and password are correct"
    exit 1
fi

echo "✅ Database connection successful"

# Create database if it doesn't exist
echo "📊 Creating database if it doesn't exist..."
mysql -h $RDS_ENDPOINT -u $DB_USER -p$DB_PASSWORD -e "CREATE DATABASE IF NOT EXISTS $DB_NAME;"

# Initialize schema
echo "🏗️  Initializing database schema..."
if [ -f "database/schema.sql" ]; then
    mysql -h $RDS_ENDPOINT -u $DB_USER -p$DB_PASSWORD $DB_NAME < database/schema.sql
    echo "✅ Schema initialized successfully"
else
    echo "❌ Schema file not found: database/schema.sql"
    exit 1
fi

# Load sample data (optional)
echo ""
read -p "📝 Do you want to load sample data? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [ -f "database/sample-data.sql" ]; then
        echo "📊 Loading sample data..."
        mysql -h $RDS_ENDPOINT -u $DB_USER -p$DB_PASSWORD $DB_NAME < database/sample-data.sql
        echo "✅ Sample data loaded successfully"
    else
        echo "❌ Sample data file not found: database/sample-data.sql"
    fi
fi

echo ""
echo "🎉 Database initialization completed!"
echo ""
echo "📋 Database Summary:"
mysql -h $RDS_ENDPOINT -u $DB_USER -p$DB_PASSWORD $DB_NAME -e "
SHOW TABLES;
SELECT 'Products' as Table_Name, COUNT(*) as Row_Count FROM products
UNION ALL
SELECT 'Categories', COUNT(*) FROM categories
UNION ALL
SELECT 'Sales Staff', COUNT(*) FROM sales_staff
UNION ALL
SELECT 'Promotions', COUNT(*) FROM promotions
UNION ALL
SELECT 'Documents', COUNT(*) FROM documents;
"
