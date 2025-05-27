#!/bin/bash

# Test the JSON iteration methods to ensure they work correctly

echo "=== Testing JSON Iteration Methods ==="

# Create sample JSON
sample_json='[
  {"id": "1", "name": "Item One", "value": 100},
  {"id": "2", "name": "Item Two", "value": 200},
  {"id": "3", "name": "Item Three", "value": 300}
]'

echo "Sample JSON:"
echo "$sample_json" | jq .

echo -e "\n=== Testing OLD method (broken) ==="
echo "for item in \$(echo \"\$json\" | jq -c '.[]'); do"
echo "This method breaks JSON objects due to word splitting..."

count=0
for item in $(echo "$sample_json" | jq -c '.[]'); do
    count=$((count + 1))
    echo "Item $count: [$item]"
    if [ $count -ge 5 ]; then
        echo "... (truncated - showing word splitting issue)"
        break
    fi
done

echo -e "\n=== Testing NEW method (fixed) ==="
echo "echo \"\$json\" | jq -c '.[]' | while IFS= read -r item; do"

count=0
echo "$sample_json" | jq -c '.[]' | while IFS= read -r item; do
    count=$((count + 1))
    echo "Item $count: $item"
    
    # Test jq parsing
    name=$(echo "$item" | jq -r '.name' 2>/dev/null)
    if [ $? -eq 0 ]; then
        echo "  ✅ Successfully parsed name: $name"
    else
        echo "  ❌ Failed to parse JSON"
    fi
done

echo -e "\n=== Iteration Test Complete ==="
