#!/bin/bash

# Test just the database initialization functionality

# Mock the necessary variables and functions for testing
PROJECT_NAME="salepoint-test"
REGION="us-east-1"

print_info() { echo "ℹ️  $1"; }
print_success() { echo "✅ $1"; }
print_warning() { echo "⚠️  $1"; }

# Mock AWS DynamoDB command for testing (don't actually call AWS)
aws() {
    if [[ "$1" == "dynamodb" && "$2" == "put-item" ]]; then
        # Parse the item to verify it's valid JSON
        local table_name=""
        local item_json=""
        
        # Extract table name and item from arguments
        for ((i=1; i<=$#; i++)); do
            if [[ "${!i}" == "--table-name" ]]; then
                ((i++))
                table_name="${!i}"
            elif [[ "${!i}" == "--item" ]]; then
                ((i++))
                item_json="${!i}"
            fi
        done
        
        echo "Mock AWS call - Table: $table_name"
        
        # Test if item JSON is valid
        if echo "$item_json" | jq empty 2>/dev/null; then
            echo "  ✅ Valid DynamoDB item JSON"
            return 0
        else
            echo "  ❌ Invalid DynamoDB item JSON"
            echo "  JSON: $item_json"
            return 1
        fi
    else
        echo "Mock AWS call: $@"
        return 0
    fi
}

# Extract the parsing functions from deploy script
source <(sed -n '/^extract_products_from_sql()/,/^}$/p' deploy-foolproof.sh)

echo "=== Testing Database Initialization (Mock) ==="

# Test products
print_info "Testing products parsing and iteration..."
products_data=$(extract_products_from_sql "database/simple-data.sql")

if [ $? -eq 0 ] && [ -n "$products_data" ]; then
    print_success "Successfully extracted products"
    
    # Test the iteration method
    print_info "Testing products iteration..."
    count=0
    echo "$products_data" | jq -c '.[]' | while IFS= read -r product; do
        count=$((count + 1))
        
        # Test DynamoDB item creation
        item_json=$(echo "$product" | jq '{
            productId: {S: .productId},
            name: {S: .name},
            description: {S: .description}, 
            price: {N: (.price | tostring)},
            category: {S: .category},
            stock: {N: (.stock | tostring)},
            specifications: {S: (.specifications | tostring)},
            createdAt: {S: .createdAt},
            updatedAt: {S: .updatedAt}
        }')
        
        if aws dynamodb put-item --table-name "$PROJECT_NAME-products" --item "$item_json" --region "$REGION"; then
            product_name=$(echo "$product" | jq -r '.name')
            echo "  ✅ Product: $product_name"
        else
            product_name=$(echo "$product" | jq -r '.name // "Unknown"')
            echo "  ❌ Failed: $product_name"
        fi
        
        # Only test first 3 for brevity
        if [ $count -ge 3 ]; then
            echo "  ... (testing first 3 products only)"
            break
        fi
    done
    
else
    print_warning "Failed to extract products"
fi

echo "=== Test Complete ==="
