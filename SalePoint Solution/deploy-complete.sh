#!/bin/bash

# Complete SalePoint Deployment Script with Frontend
# This script deploys both backend infrastructure and frontend to S3

set -e

PROJECT_NAME="salepoint"
STACK_NAME="salepoint-lab"
TEMPLATE_FILE="infrastructure/learner-lab-template.yaml"
FRONTEND_DIR="frontend"

echo "=== Complete SalePoint Deployment ==="
echo "Project: $PROJECT_NAME"
echo "Stack: $STACK_NAME"
echo ""

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI not configured or no access. Please check your credentials."
    exit 1
fi

echo "✅ AWS CLI configured successfully"

# Deploy backend infrastructure
echo "🚀 Deploying backend infrastructure..."
./deploy-learner-lab-simple.sh

# Get API URL from CloudFormation
echo "🔍 Getting API URL from CloudFormation..."
API_URL=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' --output text)

if [ -z "$API_URL" ]; then
    echo "❌ Could not get API URL from stack"
    exit 1
fi

echo "✅ API URL: $API_URL"

# Create S3 bucket for frontend
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

# Create environment file
cat <<EOF > .env
REACT_APP_API_GATEWAY_URL=$API_URL
REACT_APP_AWS_REGION=us-east-1
GENERATE_SOURCEMAP=false
EOF

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
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

echo ""
echo "🎉 Deployment Complete!"
echo ""
echo "=== Deployment Summary ==="
echo "✅ Backend Infrastructure: Deployed"
echo "✅ API Gateway: $API_URL"
echo "✅ Frontend S3 Bucket: $BUCKET_NAME"
echo "✅ Frontend Website: $WEBSITE_URL"
echo ""
echo "🌐 Access your SalePoint Dashboard:"
echo "   $WEBSITE_URL"
echo ""
echo "🧪 Test APIs:"
echo "   Products: $API_URL/products"
echo "   Customers: $API_URL/customers"
echo ""
echo "💡 Next Steps:"
echo "   • Visit the dashboard URL above"
echo "   • Extend Lambda functions for full CRUD operations"
echo "   • Add authentication with AWS Cognito"
echo "   • Implement real business logic"
