#!/bin/bash

# Test all parsing functions to verify they produce valid JSON

echo "=== Testing All Parsing Functions ==="

# Function to test a parsing function
test_parsing_function() {
    local function_name="$1"
    local data_type="$2"
    
    echo "Testing $function_name..."
    
    # Extract the function from the deploy script
    local temp_script=$(mktemp)
    sed -n "/^$function_name()/,/^}$/p" deploy-foolproof.sh > "$temp_script"
    
    # Source the function and test it
    (
        source "$temp_script"
        result=$($function_name "database/simple-data.sql")
        
        echo "JSON length: $(echo "$result" | jq length 2>/dev/null || echo "INVALID JSON")"
        
        # Test if it's valid JSON
        if echo "$result" | jq empty 2>/dev/null; then
            echo "✅ $data_type: Valid JSON"
        else
            echo "❌ $data_type: Invalid JSON"
            echo "Sample output:"
            echo "$result" | head -5
        fi
        echo
    )
    
    rm -f "$temp_script"
}

# Test all functions
test_parsing_function "extract_products_from_sql" "Products"
test_parsing_function "extract_customers_from_sql" "Customers" 
test_parsing_function "extract_sales_staff_from_sql" "Sales Staff"
test_parsing_function "extract_orders_from_sql" "Orders"

echo "=== Testing Complete ==="
