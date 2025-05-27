#!/bin/bash

# Test script to verify sales staff DynamoDB insertion is working

set -e

# Source the deployment script to get the extraction functions
source deploy-foolproof.sh

echo "=== Testing Sales Staff DynamoDB Insertion ==="

# Get the SQL content and extract sales staff data
sql_content=$(cat database/simple-data.sql)
staff_data=$(extract_sales_staff_from_sql "$sql_content")

echo "Extracted sales staff data:"
echo "$staff_data" | jq .

echo ""
echo "=== Testing DynamoDB insertion ==="

# Test adding one staff member
echo "Adding sales staff to DynamoDB table: salepoint-sales-staff..."

# Use the same logic as in the deployment script
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
    
    echo "DynamoDB item format:"
    echo "$item"
    
    # Try to insert into DynamoDB
    aws dynamodb put-item \
        --table-name "salepoint-sales-staff" \
        --item "$item" \
        --region us-east-1 && echo "✅ Successfully added: $(echo "$staff" | jq -r '.name')" || echo "❌ Failed to add: $(echo "$staff" | jq -r '.name')"
    
    echo "---"
done < <(echo "$staff_data" | jq -c '.[]')

echo ""
echo "=== Verifying data in DynamoDB ==="
aws dynamodb scan --table-name salepoint-sales-staff --region us-east-1 --query 'Items[].{StaffId:staffId.S,Name:name.S,Department:department.S}' --output table
