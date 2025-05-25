#!/bin/bash

# SalePoint Demo Mode Deployment Script
# This script builds and deploys the frontend in demo mode (no authentication)

set -e

PROJECT_NAME="salepoint"
FRONTEND_DIR="frontend"

echo "=== SalePoint Demo Mode Deployment ==="
echo ""

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI not configured or no access. Please check your credentials."
    exit 1
fi

echo "✅ AWS CLI configured successfully"

# Get API URL from CloudFormation
STACK_NAME="salepoint-lab"
echo "🔍 Getting API URL from CloudFormation..."
API_URL=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' --output text 2>/dev/null)

if [ -z "$API_URL" ]; then
    echo "❌ Could not get API URL from stack"
    exit 1
fi

echo "✅ API URL: $API_URL"

# Setup S3 bucket
ACCOUNT_ID=$(aws sts get-caller-identity --query 'Account' --output text)
BUCKET_NAME="$PROJECT_NAME-frontend-$ACCOUNT_ID-us-east-1"

echo "🪣 Using S3 bucket: $BUCKET_NAME"

# Navigate to frontend directory
cd "$FRONTEND_DIR"

# Backup original files and switch to demo mode
echo "🔄 Switching to demo mode..."
cp src/index.js src/index-auth.js.backup 2>/dev/null || true
cp src/App.js src/App-auth.js.backup 2>/dev/null || true

# Use demo versions
cp src/index-demo.js src/index.js
cp src/App-demo.js src/App.js

# Create environment file
cat <<EOF > .env
REACT_APP_API_GATEWAY_URL=$API_URL
REACT_APP_AWS_REGION=us-east-1
GENERATE_SOURCEMAP=false
EOF

echo "🏗️  Building demo version..."
npm run build

# Upload to S3
echo "⬆️  Uploading to S3..."
aws s3 sync build/ "s3://$BUCKET_NAME" --delete

# Restore original files
echo "🔄 Restoring original files..."
cp src/index-auth.js.backup src/index.js 2>/dev/null || true
cp src/App-auth.js.backup src/App.js 2>/dev/null || true

cd ..

# Get website URL
WEBSITE_URL="http://$BUCKET_NAME.s3-website-us-east-1.amazonaws.com"

echo ""
echo "🎉 Demo Deployment Complete!"
echo ""
echo "=== Demo Access Information ==="
echo "🌐 Demo Dashboard: $WEBSITE_URL"
echo "📊 Backend APIs: $API_URL"
echo ""
echo "✨ Demo Features:"
echo "   • No authentication required"
echo "   • Full dashboard access"
echo "   • Working API connections"
echo "   • Admin role simulation"
echo ""
echo "🧪 Test the APIs:"
echo "   Products: $API_URL/products"
echo "   Customers: $API_URL/customers"
echo ""
echo "💡 Note: This is a demo version without authentication."
echo "   For production use, deploy with full Cognito authentication."
