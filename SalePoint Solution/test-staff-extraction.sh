#!/bin/bash

echo "=== Testing Sales Staff Extraction ==="

# Test data extraction
echo "1. Extracting sales staff data from SQL file..."
raw_lines=$(sed -n '/INSERT INTO sales_staff/,/);/p' "database/simple-data.sql" | grep -E "^\('.*")
echo "Raw lines found:"
echo "$raw_lines"

echo -e "\n2. Processing first line..."
first_line=$(echo "$raw_lines" | head -1)
echo "First line: $first_line"

clean_line=$(echo "$first_line" | sed 's/^(//' | sed 's/)[,;]*$//')
echo "Clean line: $clean_line"

echo -e "\n3. Testing regex match..."
if [[ $clean_line =~ ^\'([^\']+)\',\ *\'([^\']+)\',\ *\'([^\']+)\',\ *\'([^\']*)\'.*$ ]]; then
    echo "✅ Regex matched!"
    echo "ID: '${BASH_REMATCH[1]}'"
    echo "Name: '${BASH_REMATCH[2]}'"
    echo "Email: '${BASH_REMATCH[3]}'"
    echo "Department: '${BASH_REMATCH[4]}'"
    
    # Create a simple JSON object
    cat << EOF > temp_staff.json
{
    "staffId": "${BASH_REMATCH[1]}",
    "name": "${BASH_REMATCH[2]}",
    "email": "${BASH_REMATCH[3]}",
    "department": "${BASH_REMATCH[4]}",
    "createdAt": "$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")",
    "updatedAt": "$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")"
}
EOF
    
    echo -e "\n4. Created JSON:"
    cat temp_staff.json
    
    echo -e "\n5. Testing jq transformation:"
    cat temp_staff.json | jq '{
        staffId: {S: .staffId},
        name: {S: .name},
        email: {S: .email},
        department: {S: .department},
        status: {S: (.status // "active")},
        createdAt: {S: .createdAt},
        updatedAt: {S: .updatedAt}
    }'
    
    rm -f temp_staff.json
else
    echo "❌ Regex did not match"
    echo "Attempting different patterns..."
    
    # Try a simpler regex
    if [[ $clean_line =~ \'([^\']+)\'.*\'([^\']+)\'.*\'([^\']+)\'.*\'([^\']*)\'? ]]; then
        echo "✅ Simpler regex matched!"
        echo "ID: '${BASH_REMATCH[1]}'"
        echo "Name: '${BASH_REMATCH[2]}'"
        echo "Email: '${BASH_REMATCH[3]}'"
        echo "Department: '${BASH_REMATCH[4]}'"
    else
        echo "❌ Even simpler regex failed"
    fi
fi

echo -e "\n=== Test Complete ==="
