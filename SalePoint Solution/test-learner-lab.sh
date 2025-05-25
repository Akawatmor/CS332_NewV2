#!/bin/bash

# Enhanced API Test Script for Learner Lab with AWS Config Update

STACK_NAME="salepoint-lab"
AWS_CONFIG_FILE="frontend/src/config/aws-config.js"

echo "=== Testing SalePoint API ==="

# Get API URL from CloudFormation stack
echo "🔍 Getting API URL from CloudFormation stack..."
API_URL=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' --output text 2>/dev/null)

if [ -z "$API_URL" ]; then
    echo "❌ Could not get API URL from stack $STACK_NAME"
    echo "Make sure the stack is deployed and complete."
    echo "Run: aws cloudformation describe-stacks --stack-name $STACK_NAME"
    exit 1
fi

echo "🔗 API URL: $API_URL"

# Update AWS config file with actual API URL
echo "📝 Updating AWS config with actual API URL..."
if [ -f "$AWS_CONFIG_FILE" ]; then
    # Create backup
    cp "$AWS_CONFIG_FILE" "$AWS_CONFIG_FILE.backup"
    
    # Update the endpoint URL in aws-config.js using perl instead of sed for better compatibility
    perl -i -pe "s|endpoint: process.env.REACT_APP_API_GATEWAY_URL \|\| '[^']*'|endpoint: process.env.REACT_APP_API_GATEWAY_URL \|\| '$API_URL'|g" "$AWS_CONFIG_FILE"
    
    echo "✅ Updated $AWS_CONFIG_FILE with API URL: $API_URL"
else
    echo "⚠️  AWS config file not found at $AWS_CONFIG_FILE"
fi

echo ""

# Test Products endpoint
echo "🧪 Testing Products endpoint..."
echo "GET $API_URL/products"
PRODUCTS_RESPONSE=$(curl -s "$API_URL/products")
echo "Response: $PRODUCTS_RESPONSE"
echo ""

# Test Customers endpoint  
echo "🧪 Testing Customers endpoint..."
echo "GET $API_URL/customers"
CUSTOMERS_RESPONSE=$(curl -s "$API_URL/customers")
echo "Response: $CUSTOMERS_RESPONSE"
echo ""

# Check if responses contain expected messages
if [[ "$PRODUCTS_RESPONSE" == *"Products API working"* ]]; then
    echo "✅ Products API is working correctly"
else
    echo "❌ Products API may have issues"
fi

if [[ "$CUSTOMERS_RESPONSE" == *"Customers API working"* ]]; then
    echo "✅ Customers API is working correctly"
else
    echo "❌ Customers API may have issues"
fi

echo ""
echo "=== Test Complete ==="
