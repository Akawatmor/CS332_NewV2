#!/bin/bash

# SalePoint Solution - DynamoDB Tables Setup Script
# This script creates the required DynamoDB tables for the Lambda functions

echo "Creating DynamoDB tables for SalePoint solution..."

REGION="us-east-1"  # Change this to your preferred region

# Table configurations
declare -A TABLES=(
    ["SalePoint-Customers"]="customerId"
    ["SalePoint-Products"]="productId" 
    ["SalePoint-Inventory"]="inventoryId"
    ["SalePoint-Sales"]="saleId"
)

# Create each table
for TABLE_NAME in "${!TABLES[@]}"; do
    KEY_NAME="${TABLES[$TABLE_NAME]}"
    
    echo "Creating table: $TABLE_NAME with key: $KEY_NAME"
    
    aws dynamodb create-table \
        --table-name "$TABLE_NAME" \
        --attribute-definitions \
            AttributeName="$KEY_NAME",AttributeType=S \
        --key-schema \
            AttributeName="$KEY_NAME",KeyType=HASH \
        --provisioned-throughput \
            ReadCapacityUnits=5,WriteCapacityUnits=5 \
        --region "$REGION"
    
    if [ $? -eq 0 ]; then
        echo "✅ Table $TABLE_NAME created successfully"
    else
        echo "❌ Failed to create table $TABLE_NAME (may already exist)"
    fi
    echo "---"
done

echo "Waiting for tables to be active..."
for TABLE_NAME in "${!TABLES[@]}"; do
    echo "Waiting for $TABLE_NAME..."
    aws dynamodb wait table-exists --table-name "$TABLE_NAME" --region "$REGION"
    echo "✅ $TABLE_NAME is active"
done

echo ""
echo "DynamoDB setup complete!"
echo "All tables are ready for the Lambda functions."
