#!/bin/bash

# SalePoint Solution - Lambda Testing Script
# This script tests all deployed Lambda functions

echo "Testing SalePoint Lambda functions..."

REGION="us-east-1"  # Change this to your region
FUNCTIONS=("salepoint-customers" "salepoint-inventory" "salepoint-products" "salepoint-sales")

# Test payloads
CUSTOMER_PAYLOAD='{"httpMethod":"POST","body":"{\"name\":\"Test Customer\",\"email\":\"test@example.com\",\"phone\":\"123-456-7890\"}"}'
PRODUCT_PAYLOAD='{"httpMethod":"POST","body":"{\"name\":\"Test Product\",\"price\":99.99,\"category\":\"Electronics\",\"description\":\"A test product\"}"}'
INVENTORY_PAYLOAD='{"httpMethod":"POST","body":"{\"productId\":\"test-prod-123\",\"quantity\":50,\"location\":\"Warehouse A\"}"}'
SALES_PAYLOAD='{"httpMethod":"POST","body":"{\"customerId\":\"test-cust-123\",\"productId\":\"test-prod-123\",\"quantity\":2,\"totalAmount\":199.98\"}"}'

declare -A PAYLOADS=(
    ["salepoint-customers"]="$CUSTOMER_PAYLOAD"
    ["salepoint-products"]="$PRODUCT_PAYLOAD"
    ["salepoint-inventory"]="$INVENTORY_PAYLOAD"
    ["salepoint-sales"]="$SALES_PAYLOAD"
)

# Test each function
for FUNCTION_NAME in "${FUNCTIONS[@]}"; do
    echo "Testing $FUNCTION_NAME..."
    
    PAYLOAD="${PAYLOADS[$FUNCTION_NAME]}"
    
    RESULT=$(aws lambda invoke \
        --function-name "$FUNCTION_NAME" \
        --payload "$PAYLOAD" \
        --region "$REGION" \
        --cli-binary-format raw-in-base64-out \
        response.json 2>&1)
    
    if [ $? -eq 0 ]; then
        echo "✅ $FUNCTION_NAME invoked successfully"
        echo "Response:"
        cat response.json | jq .
        echo ""
    else
        echo "❌ Failed to invoke $FUNCTION_NAME"
        echo "Error: $RESULT"
    fi
    echo "---"
done

# Test GET operations
echo "Testing GET operations..."
for FUNCTION_NAME in "${FUNCTIONS[@]}"; do
    echo "Testing GET for $FUNCTION_NAME..."
    
    GET_PAYLOAD='{"httpMethod":"GET"}'
    
    RESULT=$(aws lambda invoke \
        --function-name "$FUNCTION_NAME" \
        --payload "$GET_PAYLOAD" \
        --region "$REGION" \
        --cli-binary-format raw-in-base64-out \
        response.json 2>&1)
    
    if [ $? -eq 0 ]; then
        echo "✅ GET $FUNCTION_NAME successful"
        cat response.json | jq .
        echo ""
    else
        echo "❌ GET $FUNCTION_NAME failed"
        echo "Error: $RESULT"
    fi
    echo "---"
done

# Cleanup
rm -f response.json

echo "Testing complete!"
