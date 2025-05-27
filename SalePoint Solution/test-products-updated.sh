#!/bin/bash

# Source the deployment script
source deploy-foolproof.sh

# Test the products function
echo "Testing products function:"
result=$(extract_products_from_sql "database/simple-data.sql")
echo "$result" | jq length
echo ""
echo "Testing if JSON is valid:"
if echo "$result" | jq . >/dev/null 2>&1; then
    echo "✅ Valid JSON produced by products function"
else
    echo "❌ Invalid JSON produced by products function"
    echo "First 500 chars:"
    echo "$result" | head -c 500
fi
