#!/bin/bash

# SalePoint Solution - RDS Integration Deployment Script
# This script deploys the SalePoint solution with RDS database connection

set -e

PROJECT_NAME="salepoint"
STACK_NAME="salepoint-lab"
TEMPLATE_FILE="infrastructure/main-template.yaml"

echo "=== SalePoint RDS Integration Deployment ==="
echo "Project: $PROJECT_NAME"
echo "Stack: $STACK_NAME"
echo "Template: $TEMPLATE_FILE"
echo ""

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI not configured or no access. Please check your credentials."
    exit 1
fi

echo "✅ AWS CLI configured successfully"

# Check if RDS instance exists
echo "🔍 Checking for existing RDS instance..."
RDS_ENDPOINT=$(aws rds describe-db-instances --db-instance-identifier salepoint-db --query 'DBInstances[0].Endpoint.Address' --output text 2>/dev/null || echo "")

if [ -z "$RDS_ENDPOINT" ]; then
    echo "❌ RDS instance 'salepoint-db' not found. Please create it first."
    exit 1
fi

echo "✅ Found RDS instance: $RDS_ENDPOINT"

# Update CloudFormation stack to use main template (with RDS)
echo "🚀 Updating CloudFormation stack to use RDS..."
aws cloudformation update-stack \
    --stack-name $STACK_NAME \
    --template-body file://$TEMPLATE_FILE \
    --parameters ParameterKey=ProjectName,ParameterValue=$PROJECT_NAME \
    --capabilities CAPABILITY_IAM \
    --region us-east-1

echo "⏳ Waiting for stack update to complete..."
aws cloudformation wait stack-update-complete --stack-name $STACK_NAME --region us-east-1

if [ $? -eq 0 ]; then
    echo "✅ CloudFormation stack updated successfully"
else
    echo "❌ Stack update failed"
    exit 1
fi

# Get stack outputs
echo "📋 Getting stack outputs..."
API_URL=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' --output text)

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📊 Stack Information:"
echo "  API Gateway URL: $API_URL"
echo "  RDS Endpoint: $RDS_ENDPOINT"
echo "  Database Name: salepoint_db"
echo ""
echo "🔧 Next Steps:"
echo "1. Initialize the database schema:"
echo "   mysql -h $RDS_ENDPOINT -u admin -p salepoint_db < database/schema.sql"
echo ""
echo "2. Load sample data (optional):"
echo "   mysql -h $RDS_ENDPOINT -u admin -p salepoint_db < database/sample-data.sql"
echo ""
echo "3. Test the API endpoints:"
echo "   curl $API_URL/products"
echo "   curl $API_URL/customers"
