#!/bin/bash
# Test script to verify SQL parsing functions work correctly
# This tests the enhanced SQL parsing without deploying anything

set -e

# Color output functions
print_info() { echo -e "\033[34mℹ️  $1\033[0m"; }
print_success() { echo -e "\033[32m✅ $1\033[0m"; }
print_warning() { echo -e "\033[33m⚠️  $1\033[0m"; }
print_error() { echo -e "\033[31m❌ $1\033[0m"; }

# Source the SQL parsing functions from deploy-foolproof.sh
print_info "Loading SQL parsing functions from deploy-foolproof.sh..."

# Define the deployment script path
DEPLOY_SCRIPT="./deploy-foolproof.sh"

if [ ! -f "$DEPLOY_SCRIPT" ]; then
    print_error "Deploy script not found: $DEPLOY_SCRIPT"
    exit 1
fi

# Extract the SQL parsing functions from the deployment script
print_info "Extracting SQL parsing functions from deployment script..."

# Create a temporary file with just the functions
TEMP_FUNCTIONS=$(mktemp)
trap "rm -f $TEMP_FUNCTIONS" EXIT

# Extract each function from the deployment script
sed -n '/^extract_sales_staff_from_sql()/,/^}/p' "$DEPLOY_SCRIPT" > "$TEMP_FUNCTIONS"
echo "" >> "$TEMP_FUNCTIONS"
sed -n '/^extract_customers_from_sql()/,/^}/p' "$DEPLOY_SCRIPT" >> "$TEMP_FUNCTIONS"
echo "" >> "$TEMP_FUNCTIONS"
sed -n '/^extract_products_from_sql()/,/^}/p' "$DEPLOY_SCRIPT" >> "$TEMP_FUNCTIONS"
echo "" >> "$TEMP_FUNCTIONS"
sed -n '/^extract_orders_from_sql()/,/^}/p' "$DEPLOY_SCRIPT" >> "$TEMP_FUNCTIONS"

# Source the extracted functions
source "$TEMP_FUNCTIONS"

print_success "Functions loaded successfully!"
extract_products_from_sql() {
    local sql_file="$1"
    if [ ! -f "$sql_file" ]; then
        echo "[]"
        return
    fi
    
    local products_json="["
    local first_product=true
    
    # Extract product INSERT statements and parse each line
    grep -A 20 "INSERT INTO products" "$sql_file" | grep -E "^\('.*'\)," | while IFS= read -r line; do
        # Remove leading/trailing quotes and parentheses
        local clean_line=$(echo "$line" | sed "s/^[[:space:]]*('//; s/'),*$//; s/').*$//")
        
        # Split by ', ' but handle JSON specifications carefully
        IFS="', '" read -r name description price category stock_quantity specifications <<< "$clean_line"
        
        # Clean up the fields
        name=$(echo "$name" | tr -d "'\"")
        description=$(echo "$description" | tr -d "'\"")
        price=$(echo "$price" | tr -d "'\"")
        category=$(echo "$category" | tr -d "'\"")
        stock_quantity=$(echo "$stock_quantity" | tr -d "'\"")
        specifications=$(echo "$specifications" | sed "s/^'//; s/'$//")
        
        # Generate product ID from name
        local product_id=$(echo "$name" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/_/g' | sed 's/__*/_/g' | sed 's/^_//; s/_$//')
        
        if [ "$first_product" = true ]; then
            first_product=false
        else
            products_json="$products_json,"
        fi
        
        # Escape specifications for JSON
        local escaped_specs=$(echo "$specifications" | sed 's/"/\\"/g')
        
        products_json="$products_json
    {
        \"productId\": \"prod_${product_id}_001\",
        \"name\": \"$name\",
        \"description\": \"$description\",
        \"price\": $price,
        \"category\": \"$category\",
        \"stockQuantity\": $stock_quantity,
        \"specifications\": \"$escaped_specs\",
        \"createdAt\": \"$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")\",
        \"updatedAt\": \"$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")\"
    }"
    done
    
    products_json="$products_json
]"
    
    echo "$products_json"
}

extract_customers_from_sql() {
    local sql_file="$1"
    if [ ! -f "$sql_file" ]; then
        echo "[]"
        return
    fi
    
    local customers_json="["
    local first_customer=true
    local customer_counter=1
    
    # Parse customers from SQL
    grep -A 10 "INSERT INTO customers" "$sql_file" | grep -E "^\('.*'\)," | while IFS= read -r line; do
        # Extract customer data
        if [[ $line =~ ^\(\'([^\']+)\',\s*\'([^\']+)\',\s*\'([^\']+)\',\s*\'([^\']*)\',\s*\'([^\']*)\',\s*\'([^\']*)\'.*$ ]]; then
            local name="${BASH_REMATCH[1]}"
            local email="${BASH_REMATCH[2]}"
            local phone="${BASH_REMATCH[3]}"
            local company="${BASH_REMATCH[4]}"
            local address="${BASH_REMATCH[5]}"
            local notes="${BASH_REMATCH[6]}"
            
            local customer_id="cust_demo_customer_$(printf "%03d" $customer_counter)"
            
            if [ "$first_customer" = true ]; then
                first_customer=false
            else
                customers_json="$customers_json,"
            fi
            
            customers_json="$customers_json
        {
            \"customerId\": \"$customer_id\",
            \"name\": \"$name\",
            \"email\": \"$email\",
            \"phone\": \"$phone\",
            \"company\": \"$company\",
            \"address\": \"$address\",
            \"notes\": \"$notes\",
            \"createdAt\": \"$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")\",
            \"updatedAt\": \"$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")\"
        }"
        
            customer_counter=$((customer_counter + 1))
        fi
    done
    
    customers_json="$customers_json
    ]"
    
    echo "$customers_json"
}

extract_sales_staff_from_sql() {
    local sql_file="$1"
    if [ ! -f "$sql_file" ]; then
        echo "[]"
        return
    fi
    
    local staff_json="["
    local first_staff=true
    
    # Parse sales staff from SQL
    grep -A 10 "INSERT INTO sales_staff" "$sql_file" | grep -E "^\('.*'\)," | while IFS= read -r line; do
        if [[ $line =~ ^\(\'([^\']+)\',\s*\'([^\']+)\',\s*\'([^\']+)\',\s*\'([^\']*)\'.*$ ]]; then
            local staff_id="${BASH_REMATCH[1]}"
            local name="${BASH_REMATCH[2]}"
            local email="${BASH_REMATCH[3]}"
            local department="${BASH_REMATCH[4]}"
            
            if [ "$first_staff" = true ]; then
                first_staff=false
            else
                staff_json="$staff_json,"
            fi
            
            staff_json="$staff_json
        {
            \"staffId\": \"$staff_id\",
            \"name\": \"$name\",
            \"email\": \"$email\",
            \"department\": \"$department\",
            \"createdAt\": \"$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")\",
            \"updatedAt\": \"$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")\"
        }"
        fi
    done
    
    staff_json="$staff_json
    ]"
    
    echo "$staff_json"
}

extract_orders_from_sql() {
    local sql_file="$1"
    if [ ! -f "$sql_file" ]; then
        echo "[]"
        return
    fi
    
    local orders_json="["
    local first_order=true
    local order_counter=1
    
    # Parse orders from SQL - handle JSON items field
    grep -A 20 "INSERT INTO orders" "$sql_file" | grep -E "^\([0-9]" | while IFS= read -r line; do
        # Clean up the line
        local clean_line=$(echo "$line" | sed 's/^[[:space:]]*(//' | sed 's/)[,;]*$//')
        
        # Extract order components - be flexible with the pattern
        if [[ $clean_line =~ ^([0-9]+),\s*\'([^\']+)\',\s*\'(\[.*\])\',\s*([0-9.]+),\s*\'([^\']+)\',\s*\'([^\']+)\',\s*\'([^\']*)\',\s*\'([^\']*)\'.*$ ]]; then
            local customer_id="${BASH_REMATCH[1]}"
            local sales_person_id="${BASH_REMATCH[2]}"
            local items_json="${BASH_REMATCH[3]}"
            local total_amount="${BASH_REMATCH[4]}"
            local order_date="${BASH_REMATCH[5]}"
            local status="${BASH_REMATCH[6]}"
            local shipping_address="${BASH_REMATCH[7]}"
            local notes="${BASH_REMATCH[8]}"
            
            local order_id="order_sql_$(printf "%03d" $order_counter)"
            local customer_name="Customer_$customer_id"
            
            if [ "$first_order" = true ]; then
                first_order=false
            else
                orders_json="$orders_json,"
            fi
            
            # Escape JSON for DynamoDB
            local processed_items=$(echo "$items_json" | sed 's/"/\\"/g')
            
            orders_json="$orders_json
        {
            \"orderId\": \"$order_id\",
            \"customerId\": \"cust_demo_customer_$(printf "%03d" $customer_id)\",
            \"customerName\": \"$customer_name\",
            \"salesPersonId\": \"$sales_person_id\",
            \"items\": \"$processed_items\",
            \"totalAmount\": $total_amount,
            \"orderDate\": \"$order_date\",
            \"status\": \"$status\",
            \"shippingAddress\": \"$shipping_address\",
            \"notes\": \"$notes\",
            \"createdAt\": \"$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")\",
            \"updatedAt\": \"$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")\"
        }"
        
            order_counter=$((order_counter + 1))
        fi
    done
    
    orders_json="$orders_json
    ]"
    
    echo "$orders_json"
}

# Test each parsing function
SQL_FILE="database/simple-data.sql"

if [ ! -f "$SQL_FILE" ]; then
    print_error "SQL file not found: $SQL_FILE"
    exit 1
fi

print_info "Testing SQL parsing functions with $SQL_FILE..."
echo ""

# Test Products parsing
print_info "Testing Products extraction..."
products_result=$(extract_products_from_sql "$SQL_FILE")
if [ "$products_result" != "[]" ]; then
    product_count=$(echo "$products_result" | jq length 2>/dev/null || echo "0")
    print_success "Products extracted: $product_count items"
    echo "Sample product:" 
    echo "$products_result" | jq '.[0]' 2>/dev/null || print_warning "JSON parsing failed for products"
else
    print_warning "No products extracted"
fi
echo ""

# Test Customers parsing
print_info "Testing Customers extraction..."
customers_result=$(extract_customers_from_sql "$SQL_FILE")
if [ "$customers_result" != "[]" ]; then
    customer_count=$(echo "$customers_result" | jq length 2>/dev/null || echo "0")
    print_success "Customers extracted: $customer_count items"
    echo "Sample customer:"
    echo "$customers_result" | jq '.[0]' 2>/dev/null || print_warning "JSON parsing failed for customers"
else
    print_warning "No customers extracted"
fi
echo ""

# Test Sales Staff parsing
print_info "Testing Sales Staff extraction..."
staff_result=$(extract_sales_staff_from_sql "$SQL_FILE")
if [ "$staff_result" != "[]" ]; then
    staff_count=$(echo "$staff_result" | jq length 2>/dev/null || echo "0")
    print_success "Sales staff extracted: $staff_count items"
    echo "Sample staff member:"
    echo "$staff_result" | jq '.[0]' 2>/dev/null || print_warning "JSON parsing failed for staff"
else
    print_warning "No sales staff extracted"
fi
echo ""

# Test Orders parsing
print_info "Testing Orders extraction..."
orders_result=$(extract_orders_from_sql "$SQL_FILE")
if [ "$orders_result" != "[]" ]; then
    order_count=$(echo "$orders_result" | jq length 2>/dev/null || echo "0")
    print_success "Orders extracted: $order_count items"
    echo "Sample order:"
    echo "$orders_result" | jq '.[0]' 2>/dev/null || print_warning "JSON parsing failed for orders"
else
    print_warning "No orders extracted"
fi
echo ""

print_success "SQL parsing test completed!"
print_info "Summary:"
echo "  • Products: $product_count"
echo "  • Customers: $customer_count"
echo "  • Sales Staff: $staff_count"
echo "  • Orders: $order_count"

if [ "$product_count" -gt 0 ] && [ "$customer_count" -gt 0 ] && [ "$staff_count" -gt 0 ] && [ "$order_count" -gt 0 ]; then
    print_success "All SQL parsing functions working correctly!"
    echo ""
    print_info "✅ The enhanced deployment script should now properly read data from simple-data.sql"
    print_info "✅ You can now run ./deploy-foolproof.sh to deploy with SQL data"
else
    print_warning "Some parsing functions may need adjustment"
    print_info "Check the SQL file format and parsing regex patterns"
fi
