#!/bin/bash

# Test complete products function
extract_products_from_sql() {
    local sql_file="${1:-database/simple-data.sql}"
    if [ ! -f "$sql_file" ]; then
        echo "[]"
        return
    fi
    
    local products_json="["
    local first_product=true
    local product_counter=1
    
    # Parse products from SQL - extract the VALUES section
    local values_section=$(sed -n '/INSERT INTO products/,/);/p' "$sql_file" | grep -E "^\('.*")
    
    if [ -n "$values_section" ]; then
        while IFS= read -r line; do
            # Clean up line: remove parentheses and trailing commas/semicolons
            local clean_line=$(echo "$line" | sed 's/^(//' | sed 's/)[,;]*$//')
            
            # Use a simpler approach - extract fields using sed
            # Extract name (first quoted field)
            local name=$(echo "$clean_line" | sed "s/^'\([^']*\)',.*/\1/")
            # Extract description (second quoted field)  
            local description=$(echo "$clean_line" | sed "s/^'[^']*', *'\([^']*\)',.*/\1/")
            # Extract price (first numeric field after second quote)
            local price=$(echo "$clean_line" | sed "s/^'[^']*', *'[^']*', *\([0-9.]*\),.*/\1/")
            # Extract category (third quoted field)
            local category=$(echo "$clean_line" | sed "s/^'[^']*', *'[^']*', *[0-9.]*, *'\([^']*\)',.*/\1/")
            # Extract stock (second numeric field)
            local stock=$(echo "$clean_line" | sed "s/^'[^']*', *'[^']*', *[0-9.]*, *'[^']*', *\([0-9]*\),.*/\1/")
            # Extract specifications (remaining part)
            local specifications=$(echo "$clean_line" | sed "s/^'[^']*', *'[^']*', *[0-9.]*, *'[^']*', *[0-9]*, *'\(.*\)'.*$/\1/")
            
            # Debug output
            echo "DEBUG: name=[$name] price=[$price] category=[$category] stock=[$stock]" >&2
            
            # Skip if extraction failed (check if name is not empty and price is numeric)
            if [ -n "$name" ] && [[ "$price" =~ ^[0-9]+\.?[0-9]*$ ]] && [ -n "$category" ]; then
                # Escape any quotes in the values for JSON
                name=$(echo "$name" | sed 's/"/\\"/g')
                description=$(echo "$description" | sed 's/"/\\"/g')
                category=$(echo "$category" | sed 's/"/\\"/g')
                specifications=$(echo "$specifications" | sed 's/"/\\"/g')
                
                # Generate product ID
                local product_id=$(echo "$name" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/_/g' | sed 's/_\+/_/g' | sed 's/^_\|_$//g')
                product_id="prod_${product_id}_$(printf "%03d" $product_counter)"
                
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
            \"stock\": $stock,
            \"specifications\": \"$specifications\",
            \"createdAt\": \"$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")\",
            \"updatedAt\": \"$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")\"
        }"
                
                product_counter=$((product_counter + 1))
            else
                echo "DEBUG: Skipping line - failed validation" >&2
            fi
        done <<< "$values_section"
    fi
    
    products_json="$products_json
    ]"
    
    echo "$products_json"
}

echo "=== Testing products function ==="
result=$(extract_products_from_sql "database/simple-data.sql" 2>/dev/null)
echo "$result"
echo ""
echo "=== Testing with jq ==="
echo "$result" | jq length 2>&1
