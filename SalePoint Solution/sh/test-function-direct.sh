#!/bin/bash

# Test individual functions
cd "/Users/kong/Desktop/CS232-332_Cloud/final_project/CS332_NewV2_1/SalePoint Solution"

# Source the functions without running the main script
echo "=== TESTING INDIVIDUAL SQL PARSING FUNCTIONS ==="

# Extract just the function definitions
echo "Extracting function definitions..."
extract_products_from_sql() {
    local sql_file="${1:-database/simple-data.sql}"
    if [ ! -f "$sql_file" ]; then
        echo "[]"
        return
    fi
    
    local products_json="["
    local first_product=true
    
    # Parse products from SQL - extract the VALUES section
    local values_section=$(sed -n '/INSERT INTO products/,/);/p' "$sql_file" | grep -E "^\('.*")
    
    if [ -n "$values_section" ]; then
        while IFS= read -r line; do
            # Clean up line: remove parentheses and trailing commas/semicolons
            local clean_line=$(echo "$line" | sed 's/^(//' | sed 's/)[,;]*$//')
            
            # Extract values using regex - handle quoted strings and numbers properly
            # Pattern: 'name', 'description', price, 'category', stock_quantity, 'specifications'
            if [[ $clean_line =~ ^\'([^\']+)\',\ *\'([^\']+)\',\ *([0-9.]+),\ *\'([^\']+)\',\ *([0-9]+),\ *\'(.*)\'.*$ ]]; then
                local name="${BASH_REMATCH[1]}"
                local description="${BASH_REMATCH[2]}"
                local price="${BASH_REMATCH[3]}"
                local category="${BASH_REMATCH[4]}"
                local stock_quantity="${BASH_REMATCH[5]}"
                local specifications="${BASH_REMATCH[6]}"
                
                # Clean up specifications JSON - escape quotes for DynamoDB
                specifications=$(echo "$specifications" | sed 's/"/\\"/g')
                
                # Generate product ID from name
                local product_id=$(echo "$name" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/_/g' | sed 's/__*/_/g' | sed 's/^_//; s/_$//')
                product_id="prod_${product_id}_001"
                
                if [ "$first_product" = true ]; then
                    first_product=false
                else
                    products_json="$products_json,"
                fi
                
                products_json="$products_json
        {
            \"productId\": \"$product_id\",
            \"name\": \"$name\",
            \"description\": \"$description\",
            \"price\": $price,
            \"category\": \"$category\",
            \"stock\": $stock_quantity,
            \"specifications\": \"$specifications\",
            \"createdAt\": \"$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")\",
            \"updatedAt\": \"$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")\"
        }"
            fi
        done <<< "$values_section"
    fi
    
    products_json="$products_json
    ]"
    
    echo "$products_json"
}

echo "Testing products extraction..."
products_result=$(extract_products_from_sql "database/simple-data.sql")
products_count=$(echo "$products_result" | jq '. | length' 2>/dev/null)

echo "✅ Products extracted: $products_count items"

if [ "$products_count" -eq 10 ]; then
    echo "🎉 SUCCESS: All 10 products extracted correctly!"
else
    echo "⚠️  Expected 10 products, got $products_count"
fi

echo ""
echo "Sample product:"
echo "$products_result" | jq '.[0]' 2>/dev/null
