#!/bin/bash

# Fix Lambda 502 errors by using the correct deployment packages
# This script uses the pre-built lambda deployment packages that have the correct structure

set -e

PROJECT_NAME="salepoint"
REGION="us-east-1"

echo "🔧 Fixing Lambda 502 errors..."
echo "Using pre-built deployment packages with correct handler structure"
echo ""

# Get the script directory and parent directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PARENT_DIR="$(dirname "$SCRIPT_DIR")"

# Change to parent directory to access ZIP files
cd "$PARENT_DIR"
echo "Working from directory: $(pwd)"

# Check if the fixed deployment packages exist
if [ ! -f "lambda-deployment-orders-fixed.zip" ]; then
    echo "❌ lambda-deployment-orders-fixed.zip not found"
    echo "Creating it from the fixed directory..."
    
    if [ -d "lambda-deployment-orders-fixed" ]; then
        cd lambda-deployment-orders-fixed
        zip -q -r ../lambda-deployment-orders-fixed.zip .
        cd "$PARENT_DIR"
        echo "✅ Created lambda-deployment-orders-fixed.zip"
    else
        echo "❌ lambda-deployment-orders-fixed directory not found"
        exit 1
    fi
fi

# Update Orders function with the correctly structured package
echo "🔄 Updating Orders function with fixed package..."
ORDERS_UPDATE=$(aws lambda update-function-code \
    --function-name $PROJECT_NAME-orders \
    --zip-file fileb://lambda-deployment-orders-fixed.zip \
    --region $REGION 2>&1)

if [ $? -eq 0 ]; then
    echo "✅ Orders function updated successfully"
    aws lambda wait function-updated --function-name $PROJECT_NAME-orders --region $REGION 2>/dev/null || sleep 5
else
    echo "❌ Failed to update Orders function: $ORDERS_UPDATE"
fi

# For Products function, use the existing fixed package if available
if [ -f "lambda-deployment-products-fixed.zip" ]; then
    echo "🔄 Updating Products function..."
    PRODUCTS_UPDATE=$(aws lambda update-function-code \
        --function-name $PROJECT_NAME-products \
        --zip-file fileb://lambda-deployment-products-fixed.zip \
        --region $REGION 2>&1)
    
    if [ $? -eq 0 ]; then
        echo "✅ Products function updated successfully"
        aws lambda wait function-updated --function-name $PROJECT_NAME-products --region $REGION 2>/dev/null || sleep 5
    else
        echo "❌ Failed to update Products function: $PRODUCTS_UPDATE"
    fi
fi

# For Customers function, check if there's a fixed package
if [ -f "lambda-deployment-customers-fixed.zip" ]; then
    echo "🔄 Updating Customers function with fixed package..."
    
    CUSTOMERS_UPDATE=$(aws lambda update-function-code \
        --function-name $PROJECT_NAME-customers \
        --zip-file fileb://lambda-deployment-customers-fixed.zip \
        --region $REGION 2>&1)
    
    if [ $? -eq 0 ]; then
        echo "✅ Customers function updated successfully"
        aws lambda wait function-updated --function-name $PROJECT_NAME-customers --region $REGION 2>/dev/null || sleep 5
    else
        echo "❌ Failed to update Customers function: $CUSTOMERS_UPDATE"
    fi
fi

echo ""
echo "⏳ Waiting for all functions to be ready..."
sleep 15

echo ""
echo "🧪 Testing APIs after fix..."

# Get API URL from CloudFormation
API_URL=$(aws cloudformation describe-stacks --stack-name salepoint-lab --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' --output text 2>/dev/null || echo "")

if [ ! -z "$API_URL" ]; then
    echo "API Base URL: $API_URL"
    echo ""
    
    echo "Testing Products API..."
    PRODUCTS_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" --connect-timeout 10 --max-time 30 "$API_URL/products" 2>/dev/null || echo "HTTPSTATUS:000")
    PRODUCTS_STATUS=$(echo $PRODUCTS_RESPONSE | sed -e 's/.*HTTPSTATUS://')
    
    if [[ $PRODUCTS_STATUS -ge 200 && $PRODUCTS_STATUS -lt 300 ]]; then
        echo "   ✅ Products API: Working (HTTP $PRODUCTS_STATUS)"
    else
        echo "   ❌ Products API: Still has issues (HTTP $PRODUCTS_STATUS)"
    fi
    
    echo "Testing Customers API..."
    CUSTOMERS_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" --connect-timeout 10 --max-time 30 "$API_URL/customers" 2>/dev/null || echo "HTTPSTATUS:000")
    CUSTOMERS_STATUS=$(echo $CUSTOMERS_RESPONSE | sed -e 's/.*HTTPSTATUS://')
    
    if [[ $CUSTOMERS_STATUS -ge 200 && $CUSTOMERS_STATUS -lt 300 ]]; then
        echo "   ✅ Customers API: Working (HTTP $CUSTOMERS_STATUS)"
    else
        echo "   ❌ Customers API: Still has issues (HTTP $CUSTOMERS_STATUS)"
    fi
    
    echo "Testing Orders API..."
    ORDERS_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" --connect-timeout 10 --max-time 30 "$API_URL/orders" 2>/dev/null || echo "HTTPSTATUS:000")
    ORDERS_STATUS=$(echo $ORDERS_RESPONSE | sed -e 's/.*HTTPSTATUS://')
    
    if [[ $ORDERS_STATUS -ge 200 && $ORDERS_STATUS -lt 300 ]]; then
        echo "   ✅ Orders API: Working (HTTP $ORDERS_STATUS)"
    else
        echo "   ❌ Orders API: Still has issues (HTTP $ORDERS_STATUS)"
    fi
    
    echo ""
    if [[ $PRODUCTS_STATUS -ge 200 && $PRODUCTS_STATUS -lt 300 ]] && [[ $CUSTOMERS_STATUS -ge 200 && $CUSTOMERS_STATUS -lt 300 ]] && [[ $ORDERS_STATUS -ge 200 && $ORDERS_STATUS -lt 300 ]]; then
        echo "🎉 All APIs are now working!"
        echo ""
        echo "🔗 Your working API endpoints:"
        echo "   Products: $API_URL/products"
        echo "   Customers: $API_URL/customers" 
        echo "   Orders: $API_URL/orders"
    else
        echo "⚠️  Some APIs still have issues. Check CloudWatch logs for more details:"
        echo "   aws logs filter-log-events --log-group-name /aws/lambda/salepoint-orders --start-time \$(date -d '10 minutes ago' +%s)000"
    fi
else
    echo "❌ Could not get API URL from CloudFormation stack"
fi

echo ""
echo "🔧 Lambda 502 fix script completed!"
