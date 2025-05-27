#!/bin/bash

# SalePoint Solution - Lambda Deployment Script
# This script deploys all four Lambda functions to AWS

echo "Starting SalePoint Lambda deployment..."

# Configuration
REGION="us-east-1"  # Change this to your preferred region
ROLE_ARN="arn:aws:iam::YOUR_ACCOUNT_ID:role/lambda-execution-role"  # Update with your IAM role ARN

# Function names
FUNCTIONS=("salepoint-customers" "salepoint-inventory" "salepoint-products" "salepoint-sales")
PACKAGES=("customers-fixed.zip" "inventory-fixed.zip" "products-fixed.zip" "sales-fixed.zip")

# Deploy each function
for i in "${!FUNCTIONS[@]}"; do
    FUNCTION_NAME="${FUNCTIONS[$i]}"
    PACKAGE="${PACKAGES[$i]}"
    
    echo "Deploying $FUNCTION_NAME..."
    
    # Check if function exists
    if aws lambda get-function --function-name "$FUNCTION_NAME" --region "$REGION" >/dev/null 2>&1; then
        echo "Function $FUNCTION_NAME exists, updating code..."
        aws lambda update-function-code \
            --function-name "$FUNCTION_NAME" \
            --zip-file "fileb://$PACKAGE" \
            --region "$REGION"
    else
        echo "Creating new function $FUNCTION_NAME..."
        aws lambda create-function \
            --function-name "$FUNCTION_NAME" \
            --runtime "nodejs18.x" \
            --role "$ROLE_ARN" \
            --handler "index.handler" \
            --zip-file "fileb://$PACKAGE" \
            --timeout 30 \
            --memory-size 256 \
            --region "$REGION" \
            --environment Variables='{
                "DYNAMODB_REGION":"'$REGION'",
                "CUSTOMERS_TABLE":"SalePoint-Customers",
                "PRODUCTS_TABLE":"SalePoint-Products",
                "INVENTORY_TABLE":"SalePoint-Inventory",
                "SALES_TABLE":"SalePoint-Sales"
            }'
    fi
    
    if [ $? -eq 0 ]; then
        echo "✅ $FUNCTION_NAME deployed successfully"
    else
        echo "❌ Failed to deploy $FUNCTION_NAME"
    fi
    echo "---"
done

echo "Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Configure DynamoDB tables if not already created"
echo "2. Set up API Gateway endpoints (optional)"
echo "3. Test the Lambda functions"
