#!/bin/bash

# Test script to verify DynamoDB operations work with subshell fixes
# This tests the process substitution approach vs pipe approach

echo "=== Testing DynamoDB Operations - Subshell Fix Verification ==="

# Source the script to get the functions
source deploy-foolproof.sh

# Test data
test_json='[
  {"name": "Test Product 1", "id": "test1"},
  {"name": "Test Product 2", "id": "test2"}
]'

echo "Testing pipe approach (creates subshell, may fail):"
echo "$test_json" | jq -c '.[]' | while IFS= read -r item; do
    name=$(echo "$item" | jq -r '.name')
    echo "Processing: $name"
    # This would be in a subshell, operations might not propagate
done

echo -e "\nTesting process substitution approach (no subshell):"
while IFS= read -r item; do
    name=$(echo "$item" | jq -r '.name')
    echo "Processing: $name"
    # This is in the main shell, operations propagate correctly
done < <(echo "$test_json" | jq -c '.[]')

echo -e "\n=== Testing extract functions produce valid JSON ==="

# Test extract functions
echo "Testing extract_products_from_sql..."
products_data=$(extract_products_from_sql "database/simple-data.sql")
if echo "$products_data" | jq empty 2>/dev/null; then
    echo "✓ Products JSON is valid"
    echo "  Found $(echo "$products_data" | jq length) products"
else
    echo "✗ Products JSON is invalid"
    echo "  First few chars: $(echo "$products_data" | head -c 100)"
fi

echo "Testing extract_customers_from_sql..."
customers_data=$(extract_customers_from_sql "database/simple-data.sql")
if echo "$customers_data" | jq empty 2>/dev/null; then
    echo "✓ Customers JSON is valid"
    echo "  Found $(echo "$customers_data" | jq length) customers"
else
    echo "✗ Customers JSON is invalid"
    echo "  First few chars: $(echo "$customers_data" | head -c 100)"
fi

echo "Testing extract_sales_staff_from_sql..."
staff_data=$(extract_sales_staff_from_sql "database/simple-data.sql")
if echo "$staff_data" | jq empty 2>/dev/null; then
    echo "✓ Staff JSON is valid"
    echo "  Found $(echo "$staff_data" | jq length) staff members"
else
    echo "✗ Staff JSON is invalid"
    echo "  First few chars: $(echo "$staff_data" | head -c 100)"
fi

echo "Testing extract_orders_from_sql..."
orders_data=$(extract_orders_from_sql "database/simple-data.sql")
if echo "$orders_data" | jq empty 2>/dev/null; then
    echo "✓ Orders JSON is valid"
    echo "  Found $(echo "$orders_data" | jq length) orders"
else
    echo "✗ Orders JSON is invalid"
    echo "  First few chars: $(echo "$orders_data" | head -c 100)"
fi

echo -e "\n=== Test completed ==="
