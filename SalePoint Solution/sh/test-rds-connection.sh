#!/bin/bash

# SalePoint RDS Connection Test Script
# This script tests the connection to the RDS database

set -e

echo "=== SalePoint RDS Connection Test ==="
echo ""

# RDS connection details
RDS_ENDPOINT="salepoint-db.cdtkcf7qlbd7.us-east-1.rds.amazonaws.com"
DB_NAME="salepoint_db"
DB_USER="admin"

echo "Testing connection to:"
echo "  Endpoint: $RDS_ENDPOINT"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo ""

# Check if MySQL client is available
if ! command -v mysql &> /dev/null; then
    echo "❌ MySQL client not found. Please install:"
    echo "   macOS: brew install mysql-client"
    exit 1
fi

echo "✅ MySQL client found"

# Test basic connectivity
echo "🔗 Testing network connectivity..."
if nc -z -w5 ${RDS_ENDPOINT%.*} 3306 2>/dev/null; then
    echo "✅ Network connection successful"
else
    echo "❌ Cannot reach RDS endpoint on port 3306"
    echo "   Check security groups and network configuration"
    exit 1
fi

# Test database connection
echo "🔐 Testing database authentication..."
if mysql -h $RDS_ENDPOINT -u $DB_USER -p --connect-timeout=10 -e "SELECT 1;" 2>/dev/null; then
    echo "✅ Database authentication successful"
else
    echo "❌ Database authentication failed"
    echo "   Check username and password"
    exit 1
fi

# Test specific database exists
echo "📊 Checking database '$DB_NAME'..."
DB_EXISTS=$(mysql -h $RDS_ENDPOINT -u $DB_USER -p -e "SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = '$DB_NAME';" 2>/dev/null | grep -c "$DB_NAME" || echo "0")

if [ "$DB_EXISTS" -eq "1" ]; then
    echo "✅ Database '$DB_NAME' exists"
    
    # Check tables
    echo "📋 Checking tables in database..."
    TABLES=$(mysql -h $RDS_ENDPOINT -u $DB_USER -p $DB_NAME -e "SHOW TABLES;" 2>/dev/null | tail -n +2 | wc -l)
    echo "   Found $TABLES tables"
    
    if [ "$TABLES" -gt "0" ]; then
        echo "📋 Tables in database:"
        mysql -h $RDS_ENDPOINT -u $DB_USER -p $DB_NAME -e "SHOW TABLES;" 2>/dev/null | tail -n +2 | sed 's/^/   - /'
    fi
else
    echo "❌ Database '$DB_NAME' does not exist"
    echo "   Run: ./init-database.sh to create it"
fi

# Test Lambda function environment variables
echo ""
echo "🔧 Checking Lambda function configurations..."
LAMBDA_FUNCTIONS=$(aws lambda list-functions --query 'Functions[?contains(FunctionName, `salepoint`)].FunctionName' --output text 2>/dev/null || echo "")

if [ ! -z "$LAMBDA_FUNCTIONS" ]; then
    for FUNCTION_NAME in $LAMBDA_FUNCTIONS; do
        DB_HOST=$(aws lambda get-function-configuration --function-name $FUNCTION_NAME --query 'Environment.Variables.DB_HOST' --output text 2>/dev/null || echo "")
        DB_NAME_ENV=$(aws lambda get-function-configuration --function-name $FUNCTION_NAME --query 'Environment.Variables.DB_NAME' --output text 2>/dev/null || echo "")
        
        if [ "$DB_HOST" == "$RDS_ENDPOINT" ] && [ "$DB_NAME_ENV" == "$DB_NAME" ]; then
            echo "  ✅ $FUNCTION_NAME - RDS configuration correct"
        else
            echo "  ❌ $FUNCTION_NAME - RDS configuration incorrect"
            echo "     Expected DB_HOST: $RDS_ENDPOINT"
            echo "     Actual DB_HOST: $DB_HOST"
            echo "     Expected DB_NAME: $DB_NAME"
            echo "     Actual DB_NAME: $DB_NAME_ENV"
        fi
    done
else
    echo "  ❌ No SalePoint Lambda functions found"
fi

echo ""
echo "🎉 RDS connection test completed!"
