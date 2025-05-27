#!/bin/bash

# SalePoint Solution Final System Testing Script
# Tests all deployed endpoints and validates system functionality

echo "=========================================="
echo "SalePoint Solution - Final System Test"
echo "=========================================="
echo "Date: $(date)"
echo

# API Gateway URL
API_BASE_URL="https://sru6jq60c3.execute-api.us-east-1.amazonaws.com/prod"

echo "API Base URL: $API_BASE_URL"
echo

# Function to test endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    
    echo "Testing: $description"
    echo "  $method $endpoint"
    
    if [ -n "$data" ]; then
        response=$(curl -s -X $method "$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data" 2>/dev/null)
    else
        response=$(curl -s -X $method "$endpoint" 2>/dev/null)
    fi
    
    echo "  Response: $response"
    echo
}

# Test Customers Endpoints
echo "=== CUSTOMERS ENDPOINTS ==="
echo

test_endpoint "GET" "$API_BASE_URL/customers" "" "Get all customers"

test_endpoint "POST" "$API_BASE_URL/customers" '{
    "name": "Test Customer",
    "email": "test.customer@email.com", 
    "phone": "555-0111",
    "address": "123 Test St, Test City, TS 12345"
}' "Create new customer"

echo "=== PRODUCTS ENDPOINTS ==="
echo

test_endpoint "GET" "$API_BASE_URL/products" "" "Get all products"

test_endpoint "POST" "$API_BASE_URL/products" '{
    "name": "Test Product",
    "description": "A test product", 
    "price": 99.99,
    "category": "Test Category",
    "stockQuantity": 10
}' "Create new product"

echo "=== ORDERS ENDPOINTS ==="
echo

test_endpoint "GET" "$API_BASE_URL/orders" "" "Get all orders"

test_endpoint "POST" "$API_BASE_URL/orders" '{
    "customerId": "cust_001",
    "items": [
        {
            "productId": "prod_001",
            "quantity": 2,
            "price": 29.99
        }
    ]
}' "Create new order"

echo "=== SYSTEM STATUS ==="
echo

# Check DynamoDB Tables
echo "Checking DynamoDB Tables:"
echo "  Customers Table:"
aws dynamodb scan --table-name salepoint-customers --select COUNT --query 'Count' --output text 2>/dev/null | sed 's/^/    Items: /'

echo "  Products Table:"
aws dynamodb scan --table-name salepoint-products --select COUNT --query 'Count' --output text 2>/dev/null | sed 's/^/    Items: /'

echo "  Orders Table:"
aws dynamodb scan --table-name salepoint-orders --select COUNT --query 'Count' --output text 2>/dev/null | sed 's/^/    Items: /'

echo
echo "Checking Lambda Functions:"
aws lambda list-functions --query 'Functions[?contains(FunctionName, `salepoint`)].[FunctionName,Runtime,LastModified]' --output table 2>/dev/null

echo
echo "=========================================="
echo "System Test Complete"
echo "=========================================="
