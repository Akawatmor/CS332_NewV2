#!/bin/bash

# Test script to verify DynamoDB extraction functions are working properly
# This tests the fixed jq parsing and JSON generation functions

set -e

# Source the deployment script to get the extraction functions
source deploy-foolproof.sh

echo "=== Testing DynamoDB Data Extraction Functions ==="

# Test extract_products_from_sql function
echo "1. Testing extract_products_from_sql function..."
sql_content=$(cat database/simple-data.sql)
products_json=$(extract_products_from_sql "$sql_content")

echo "   Sample products JSON (first 200 chars):"
echo "   ${products_json:0:200}..."

# Validate JSON with jq
echo "$products_json" | jq . > /dev/null && echo "   ✅ Products JSON is valid" || echo "   ❌ Products JSON is invalid"

# Test extract_customers_from_sql function
echo "2. Testing extract_customers_from_sql function..."
customers_json=$(extract_customers_from_sql "$sql_content")

echo "   Sample customers JSON (first 200 chars):"
echo "   ${customers_json:0:200}..."

# Validate JSON with jq
echo "$customers_json" | jq . > /dev/null && echo "   ✅ Customers JSON is valid" || echo "   ❌ Customers JSON is invalid"

# Test extract_sales_staff_from_sql function
echo "3. Testing extract_sales_staff_from_sql function..."
sales_staff_json=$(extract_sales_staff_from_sql "$sql_content")

echo "   Sample sales staff JSON (first 200 chars):"
echo "   ${sales_staff_json:0:200}..."

# Validate JSON with jq
echo "$sales_staff_json" | jq . > /dev/null && echo "   ✅ Sales staff JSON is valid" || echo "   ❌ Sales staff JSON is invalid"

# Test extract_orders_from_sql function
echo "4. Testing extract_orders_from_sql function..."
orders_json=$(extract_orders_from_sql "$sql_content")

echo "   Sample orders JSON (first 200 chars):"
echo "   ${orders_json:0:200}..."

# Validate JSON with jq
echo "$orders_json" | jq . > /dev/null && echo "   ✅ Orders JSON is valid" || echo "   ❌ Orders JSON is invalid"

# Test DynamoDB item formatting
echo "5. Testing DynamoDB item formatting..."
echo "   Testing products to DynamoDB format..."
echo "$products_json" | jq -c '.[]' | head -1 | jq -r '{
    "productId": {"S": .productId},
    "name": {"S": .name},
    "price": {"N": (.price | tostring)},
    "category": {"S": .category},
    "stock": {"N": (.stock | tostring)}
}' > /dev/null && echo "   ✅ Products DynamoDB formatting works" || echo "   ❌ Products DynamoDB formatting failed"

echo "   Testing customers to DynamoDB format..."
echo "$customers_json" | jq -c '.[]' | head -1 | jq -r '{
    "customerId": {"S": .customerId},
    "name": {"S": .name},
    "email": {"S": .email},
    "phone": {"S": .phone},
    "status": {"S": (.status // "active")}
}' > /dev/null && echo "   ✅ Customers DynamoDB formatting works" || echo "   ❌ Customers DynamoDB formatting failed"

echo ""
echo "=== All extraction function tests completed ==="
