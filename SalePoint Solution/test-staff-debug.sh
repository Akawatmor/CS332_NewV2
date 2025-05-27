#!/bin/bash

# Direct test of the extract_sales_staff_from_sql function from deploy script

# Copy the exact function from deploy-foolproof.sh
extract_sales_staff_from_sql() {
    local sql_file="${1:-database/simple-data.sql}"
    if [ ! -f "$sql_file" ]; then
        echo "[]"
        return
    fi
    
    local staff_json="["
    local first_staff=true
    
    # Parse sales staff from SQL - extract the VALUES section
    local values_section=$(sed -n '/INSERT INTO sales_staff/,/);/p' "$sql_file" | grep -E "^\('.*")
    
    if [ -n "$values_section" ]; then
        while IFS= read -r line; do
            # Clean up line: remove parentheses and trailing commas/semicolons
            local clean_line=$(echo "$line" | sed 's/^(//' | sed 's/)[,;]*$//')
            
            # Extract values using regex - handle quoted strings properly
            # Format: 'id', 'name', 'email', 'department'
            if [[ $clean_line =~ ^\'([^\']+)\',\ *\'([^\']+)\',\ *\'([^\']+)\',\ *\'([^\']*)\'.*$ ]]; then
                local staff_id="${BASH_REMATCH[1]}"
                local name="${BASH_REMATCH[2]}"
                local email="${BASH_REMATCH[3]}"
                local department="${BASH_REMATCH[4]}"
                
                # Escape any quotes in the values for JSON
                staff_id=$(echo "$staff_id" | sed 's/"/\\"/g')
                name=$(echo "$name" | sed 's/"/\\"/g')
                email=$(echo "$email" | sed 's/"/\\"/g')
                department=$(echo "$department" | sed 's/"/\\"/g')
                
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
            \"createdAt\": \"$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")\",
            \"updatedAt\": \"$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")\"
        }"
            fi
        done <<< "$values_section"
    fi
    
    staff_json="$staff_json
    ]"
    
    echo "$staff_json"
}

echo "=== Testing extract_sales_staff_from_sql function ==="

result=$(extract_sales_staff_from_sql)
echo "Raw result:"
echo "$result"

echo ""
echo "Formatted result:"
echo "$result" | jq .

echo ""
echo "=== Testing DynamoDB insertion ==="

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
        echo "DynamoDB item that failed:"
        echo "$item"
    fi
done < <(echo "$result" | jq -c '.[]')

echo ""
echo "=== Final verification ==="
aws dynamodb scan --table-name salepoint-sales-staff --region us-east-1 --query 'Items[].{StaffId:staffId.S,Name:name.S,Department:department.S}' --output table