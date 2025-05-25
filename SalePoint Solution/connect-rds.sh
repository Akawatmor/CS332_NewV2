#!/bin/bash

# SalePoint Solution - Connect Existing RDS Database
# This script updates existing Lambda functions to connect to the RDS database

set -e

echo "=== SalePoint RDS Connection Setup ==="
echo ""

# RDS connection details
RDS_ENDPOINT="salepoint-db.cdtkcf7qlbd7.us-east-1.rds.amazonaws.com"
DB_NAME="salepoint_db"
DB_USER="admin"
DB_PASSWORD="SalePoint123!"

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI not configured or no access. Please check your credentials."
    exit 1
fi

echo "✅ AWS CLI configured successfully"

# Check if RDS instance exists and is available
echo "🔍 Checking RDS instance status..."
RDS_STATUS=$(aws rds describe-db-instances --db-instance-identifier salepoint-db --query 'DBInstances[0].DBInstanceStatus' --output text 2>/dev/null || echo "")

if [ "$RDS_STATUS" != "available" ]; then
    echo "❌ RDS instance 'salepoint-db' is not available. Current status: $RDS_STATUS"
    exit 1
fi

echo "✅ RDS instance is available"

# Get list of Lambda functions for salepoint
echo "🔍 Finding SalePoint Lambda functions..."
LAMBDA_FUNCTIONS=$(aws lambda list-functions --query 'Functions[?contains(FunctionName, `salepoint`)].FunctionName' --output text)

if [ -z "$LAMBDA_FUNCTIONS" ]; then
    echo "❌ No SalePoint Lambda functions found"
    exit 1
fi

echo "✅ Found Lambda functions: $LAMBDA_FUNCTIONS"

# Update each Lambda function's environment variables
for FUNCTION_NAME in $LAMBDA_FUNCTIONS; do
    echo "🔧 Updating function: $FUNCTION_NAME"
    
    # Get current environment variables
    CURRENT_ENV=$(aws lambda get-function-configuration --function-name $FUNCTION_NAME --query 'Environment.Variables' --output json 2>/dev/null || echo "{}")
    
    # Update environment variables using jq to merge with existing ones
    UPDATED_ENV=$(echo $CURRENT_ENV | jq --arg db_host "$RDS_ENDPOINT" --arg db_name "$DB_NAME" --arg db_user "$DB_USER" --arg db_password "$DB_PASSWORD" '. + {
        "DB_HOST": $db_host,
        "DB_NAME": $db_name,
        "DB_USER": $db_user,
        "DB_PASSWORD": $db_password
    }')
    
    # Update the Lambda function
    aws lambda update-function-configuration \
        --function-name $FUNCTION_NAME \
        --environment "Variables=$UPDATED_ENV" \
        > /dev/null
    
    echo "  ✅ Updated $FUNCTION_NAME"
done

echo ""
echo "🎉 All Lambda functions updated successfully!"
echo ""
echo "📊 Database Connection Details:"
echo "  RDS Endpoint: $RDS_ENDPOINT"
echo "  Database Name: $DB_NAME"
echo "  Username: $DB_USER"
echo ""
echo "🔧 Next Steps:"
echo "1. Initialize the database schema:"
echo "   ./init-database.sh"
echo ""
echo "2. Test the connection:"
echo "   ./test-rds-connection.sh"
echo ""
echo "3. Test API endpoints:"
STACK_NAME="salepoint-lab"
API_URL=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' --output text 2>/dev/null || echo "")
if [ ! -z "$API_URL" ]; then
    echo "   curl $API_URL/products"
    echo "   curl $API_URL/customers"
fi
