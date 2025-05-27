#!/bin/bash

# Simple test of just the sales staff extraction and DynamoDB functions

echo "=== Testing Sales Staff Extraction and DynamoDB Insertion ==="

# Import just the functions we need
PROJECT_NAME="salepoint"
REGION="us-east-1"

# Extract sales staff function
extract_sales_staff_from_sql() {
    local sql_content="$1"
    
    # Extract INSERT statements for sales_staff table
    local staff_inserts
    staff_inserts=$(echo "$sql_content" | grep -i "INSERT INTO.*sales_staff" | sed 's/INSERT INTO.*VALUES//' | tr -d ';')
    
    # Convert to JSON array format
    echo "["
    local first_item=true
    while IFS= read -r line; do
        if [[ -n "$line" ]]; then
            # Parse the VALUES content between parentheses
            local values
            values=$(echo "$line" | sed -E "s/.*\((.*)\).*/\1/" | sed "s/', *'/§/g" | sed "s/'//g")
            
            # Split by the delimiter and assign to variables
            IFS='§' read -ra FIELDS <<< "$values"
            
            if [[ ${#FIELDS[@]} -ge 7 ]]; then
                # Remove leading/trailing whitespace
                local staff_id="${FIELDS[0]// /}"
                local name="${FIELDS[1]}"
                local email="${FIELDS[2]}"
                local department="${FIELDS[3]}"
                local status="${FIELDS[4]}"
                local created_at="${FIELDS[5]}"
                local updated_at="${FIELDS[6]}"
                
                if [[ "$first_item" == "true" ]]; then
                    first_item=false
                else
                    echo ","
                fi
                
                cat << EOF
    {
        "staffId": "$staff_id",
        "name": "$name",
        "email": "$email", 
        "department": "$department",
        "status": "$status",
        "createdAt": "$created_at",
        "updatedAt": "$updated_at"
    }
EOF
            fi
        fi
    done <<< "$staff_inserts"
    echo "]"
}

# Get the SQL content
sql_content=$(cat database/simple-data.sql)

# Test extraction
echo "1. Testing sales staff extraction..."
staff_data=$(extract_sales_staff_from_sql "$sql_content")

echo "Extracted staff data:"
echo "$staff_data" | jq .

# Test DynamoDB insertion
echo ""
echo "2. Testing DynamoDB insertion..."

while IFS= read -r staff; do
    echo "Processing staff: $(echo "$staff" | jq -r '.name')"
    
    # Format the item for DynamoDB
    item=$(echo "$staff" | jq '{
        staffId: {S: .staffId},
        name: {S: .name},
        email: {S: .email},
        department: {S: .department},
        status: {S: (.status // "active")},
        createdAt: {S: .createdAt},
        updatedAt: {S: .updatedAt}
    }')
    
    # Try to insert into DynamoDB
    if aws dynamodb put-item \
        --table-name "salepoint-sales-staff" \
        --item "$item" \
        --region us-east-1 > /dev/null 2>&1; then
        echo "✅ Successfully added: $(echo "$staff" | jq -r '.name')"
    else
        echo "❌ Failed to add: $(echo "$staff" | jq -r '.name')"
    fi
done < <(echo "$staff_data" | jq -c '.[]')

echo ""
echo "3. Verifying data in DynamoDB..."
aws dynamodb scan --table-name salepoint-sales-staff --region us-east-1 --query 'Items[].{StaffId:staffId.S,Name:name.S,Department:department.S}' --output table
