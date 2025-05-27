#!/bin/bash

# Fix for sales/orders Lambda function
# This script deploys a fixed version of the sales/orders Lambda function

set -e

# Color functions for better output
print_success() { echo -e "\033[32m✅ $1\033[0m"; }
print_warning() { echo -e "\033[33m⚠️  $1\033[0m"; }
print_error() { echo -e "\033[31m❌ $1\033[0m"; }
print_info() { echo -e "\033[36mℹ️  $1\033[0m"; }
print_step() { echo -e "\n\033[35m=== $1 ===\033[0m"; }

# Configuration
REGION="us-east-1"
STACK_NAME="salepoint-lab"
LAMBDA_DIR="lambda-deployment-sales-fixed"
LAMBDA_FUNCTION_NAME="salepoint-orders"

print_step "Fixing Sales/Orders Lambda Function"
echo "🔧 This script will deploy a fixed version of the sales/orders Lambda function"

# First, check if the Lambda function exists
if ! aws lambda get-function --function-name $LAMBDA_FUNCTION_NAME --region $REGION &> /dev/null; then
    print_error "Lambda function $LAMBDA_FUNCTION_NAME does not exist. Please run deploy-foolproof.sh first."
    exit 1
fi

# Create a temporary directory for deployment
TMP_DIR=$(mktemp -d)
print_info "Created temporary directory: $TMP_DIR"

# Copy Lambda function files
cp -r $LAMBDA_DIR/* $TMP_DIR/
print_info "Copied Lambda function files to temporary directory"

# Install dependencies
cd $TMP_DIR
print_info "Installing dependencies..."
npm install --production &> /dev/null

# Create zip file
print_info "Creating deployment package..."
zip -r deployment.zip . &> /dev/null

# Update Lambda function
print_info "Updating Lambda function $LAMBDA_FUNCTION_NAME..."
aws lambda update-function-code \
    --function-name $LAMBDA_FUNCTION_NAME \
    --zip-file fileb://deployment.zip \
    --region $REGION \
    --publish &> /dev/null

# Initialize sales data
print_info "Initializing sales/orders data..."
API_URL=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" --output text)

if [ -z "$API_URL" ]; then
    print_error "Could not get API URL from CloudFormation stack $STACK_NAME"
    exit 1
fi

# Initialize sales data by calling the API endpoint
curl -s -X GET "$API_URL/orders?init=true" -H "Content-Type: application/json" > /dev/null

# Clean up
cd -
rm -rf $TMP_DIR
print_info "Cleaned up temporary directory"

print_success "Sales/Orders Lambda function has been fixed and data initialized!"
print_info "You can now access the sales data at: $API_URL/orders"
print_info "And the frontend dashboard at the S3 website URL"
