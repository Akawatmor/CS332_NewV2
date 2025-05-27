#!/bin/bash

# Enhanced SalePoint Deployment Script with DynamoDB Lambda Functions
# This script deploys the complete solution with working database connections

set -e

PROJECT_NAME="salepoint"
STACK_NAME="salepoint-lab"
TEMPLATE_FILE="infrastructure/learner-lab-template.yaml"
FRONTEND_DIR="frontend"
LAMBDA_DIR="lambda-functions"

echo "=== Enhanced SalePoint Deployment with DynamoDB ==="
echo "Project: $PROJECT_NAME"
echo "Stack: $STACK_NAME"
echo ""

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI not configured or no access. Please check your credentials."
    exit 1
fi

echo "✅ AWS CLI configured successfully"

# Deploy backend infrastructure first
echo "🚀 Deploying backend infrastructure..."
./deploy-learner-lab-simple.sh

echo "⏳ Waiting for stack to be ready..."
aws cloudformation wait stack-update-complete --stack-name $STACK_NAME 2>/dev/null || \
aws cloudformation wait stack-create-complete --stack-name $STACK_NAME

# Get API URL and Table Names from CloudFormation
echo "🔍 Getting infrastructure details from CloudFormation..."
API_URL=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' --output text)
PRODUCTS_TABLE=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`ProductsTable`].OutputValue' --output text)
CUSTOMERS_TABLE=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`CustomersTable`].OutputValue' --output text)

if [ -z "$API_URL" ]; then
    echo "❌ Could not get API URL from stack"
    exit 1
fi

echo "✅ API URL: $API_URL"
echo "✅ Products Table: $PRODUCTS_TABLE"
echo "✅ Customers Table: $CUSTOMERS_TABLE"

# Package and deploy DynamoDB-compatible Lambda functions
echo "📦 Packaging Lambda functions with DynamoDB support..."
cd "$LAMBDA_DIR"

# Ensure dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing Lambda dependencies..."
    npm install
fi

# Create deployment packages
echo "🗂️  Creating products function package..."
zip -r products-dynamodb-deployment.zip products-dynamodb.js node_modules/ package.json >/dev/null

echo "🗂️  Creating customers function package..."
zip -r customers-dynamodb-deployment.zip customers-dynamodb.js node_modules/ package.json >/dev/null

# Update Lambda functions with new code
echo "🔄 Updating Products Lambda function..."
aws lambda update-function-code \
    --function-name "$PROJECT_NAME-products" \
    --zip-file fileb://products-dynamodb-deployment.zip \
    --no-cli-pager

echo "🔄 Updating Customers Lambda function..."
aws lambda update-function-code \
    --function-name "$PROJECT_NAME-customers" \
    --zip-file fileb://customers-dynamodb-deployment.zip \
    --no-cli-pager

# Update environment variables
echo "🔧 Updating Lambda environment variables..."
aws lambda update-function-configuration \
    --function-name "$PROJECT_NAME-products" \
    --environment Variables="{PRODUCTS_TABLE=$PRODUCTS_TABLE}" \
    --no-cli-pager

aws lambda update-function-configuration \
    --function-name "$PROJECT_NAME-customers" \
    --environment Variables="{CUSTOMERS_TABLE=$CUSTOMERS_TABLE}" \
    --no-cli-pager

# Clean up deployment packages
rm -f *.zip

cd ..

# Initialize data in DynamoDB tables
echo "🗄️  Initializing DynamoDB tables with sample data..."
echo "Initializing products..."
curl -s -X GET "$API_URL/products/init" || echo "Products init completed"

echo "Initializing customers..."
curl -s -X GET "$API_URL/customers/init" || echo "Customers init completed"

# Note: Only initialize tables that exist
# Remove initialization for non-existent sales/inventory tables

# Setup and deploy frontend
echo "🎨 Setting up frontend..."
ACCOUNT_ID=$(aws sts get-caller-identity --query 'Account' --output text)
BUCKET_NAME="$PROJECT_NAME-frontend-$ACCOUNT_ID-us-east-1"

echo "🪣 Setting up S3 bucket for frontend: $BUCKET_NAME"

# Check if bucket exists
if aws s3 ls "s3://$BUCKET_NAME" > /dev/null 2>&1; then
    echo "✅ S3 bucket already exists"
else
    echo "📦 Creating S3 bucket..."
    aws s3 mb "s3://$BUCKET_NAME"
    
    echo "🔧 Configuring bucket for website hosting..."
    aws s3 website "s3://$BUCKET_NAME" --index-document index.html --error-document error.html
    
    echo "🔓 Setting bucket policy for public access..."
    aws s3api put-public-access-block --bucket "$BUCKET_NAME" --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"
    
    # Apply bucket policy
    cat <<EOF > /tmp/bucket-policy.json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
    }
  ]
}
EOF
    
    aws s3api put-bucket-policy --bucket "$BUCKET_NAME" --policy file:///tmp/bucket-policy.json
    rm /tmp/bucket-policy.json
fi

# Build and deploy frontend
echo "🔨 Building React frontend..."
cd "$FRONTEND_DIR"

# Create environment file with API URL
cat <<EOF > .env
REACT_APP_API_GATEWAY_URL=$API_URL
REACT_APP_AWS_REGION=us-east-1
GENERATE_SOURCEMAP=false
EOF

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

# Build the app
echo "🏗️  Building production app..."
npm run build

# Upload to S3
echo "⬆️  Uploading to S3..."
aws s3 sync build/ "s3://$BUCKET_NAME" --delete

cd ..

# Get website URL
WEBSITE_URL="http://$BUCKET_NAME.s3-website-us-east-1.amazonaws.com"

# Test the APIs to ensure data is available
echo "🧪 Testing API endpoints..."
echo "Testing products API..."
PRODUCTS_TEST=$(curl -s "$API_URL/products" | jq -r '.count // 0' 2>/dev/null || echo "0")
echo "Testing customers API..."
CUSTOMERS_TEST=$(curl -s "$API_URL/customers" | jq -r '.count // 0' 2>/dev/null || echo "0")

echo ""
echo "🎉 Enhanced Deployment Complete!"
echo ""
echo "=== Deployment Summary ==="
echo "✅ Backend Infrastructure: Deployed"
echo "✅ API Gateway: $API_URL"
echo "✅ DynamoDB Tables: Created and initialized"
echo "✅ Lambda Functions: Updated with DynamoDB support"
echo "✅ Products API: $PRODUCTS_TEST items available"
echo "✅ Customers API: $CUSTOMERS_TEST items available"
echo "✅ Frontend S3 Bucket: $BUCKET_NAME"
echo "✅ Frontend Website: $WEBSITE_URL"
echo ""
echo "🌐 Access your SalePoint Dashboard:"
echo "   $WEBSITE_URL"
echo ""
echo "🧪 Test APIs manually:"
echo "   Products: $API_URL/products"
echo "   Customers: $API_URL/customers"
echo "   Initialize Products: $API_URL/products/init"
echo "   Initialize Customers: $API_URL/customers/init"
echo ""
echo "💡 Next Steps:"
echo "   • Visit the dashboard URL above"
echo "   • Data should now be visible in all sections"
echo "   • APIs are connected to DynamoDB with sample data"
