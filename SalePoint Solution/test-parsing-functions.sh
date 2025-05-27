#!/bin/bash

# Test script to verify SQL parsing functions produce valid JSON

# Color functions for output
print_success() { echo -e "\033[32m✅ $1\033[0m"; }
print_error() { echo -e "\033[31m❌ $1\033[0m"; }
print_info() { echo -e "\033[36mℹ️  $1\033[0m"; }

echo "=== Testing SQL Parsing Functions ==="

# Source the functions from the main script
source deploy-foolproof.sh

# Test products function
print_info "Testing extract_products_from_sql..."
products_result=$(extract_products_from_sql "database/simple-data.sql")
if echo "$products_result" | jq . >/dev/null 2>&1; then
    product_count=$(echo "$products_result" | jq length)
    print_success "Products: Valid JSON with $product_count items"
else
    print_error "Products: Invalid JSON"
    echo "Output preview:"
    echo "$products_result" | head -5
fi

# Test customers function
print_info "Testing extract_customers_from_sql..."
customers_result=$(extract_customers_from_sql "database/simple-data.sql")
if echo "$customers_result" | jq . >/dev/null 2>&1; then
    customer_count=$(echo "$customers_result" | jq length)
    print_success "Customers: Valid JSON with $customer_count items"
else
    print_error "Customers: Invalid JSON"
    echo "Output preview:"
    echo "$customers_result" | head -5
fi

# Test sales staff function
print_info "Testing extract_sales_staff_from_sql..."
staff_result=$(extract_sales_staff_from_sql "database/simple-data.sql")
if echo "$staff_result" | jq . >/dev/null 2>&1; then
    staff_count=$(echo "$staff_result" | jq length)
    print_success "Sales Staff: Valid JSON with $staff_count items"
else
    print_error "Sales Staff: Invalid JSON"
    echo "Output preview:"
    echo "$staff_result" | head -5
fi

# Test orders function
print_info "Testing extract_orders_from_sql..."
orders_result=$(extract_orders_from_sql "database/simple-data.sql")
if echo "$orders_result" | jq . >/dev/null 2>&1; then
    order_count=$(echo "$orders_result" | jq length)
    print_success "Orders: Valid JSON with $order_count items"
else
    print_error "Orders: Invalid JSON"
    echo "Output preview:"
    echo "$orders_result" | head -5
fi

echo ""
print_info "All parsing functions tested!"
