#!/bin/bash

# SalePoint Solution - Complete Deployment Script
# This script deploys the complete SalePoint solution to AWS

set -e

PROJECT_NAME="salepoint"
STACK_NAME="salepoint-lab"
TEMPLATE_FILE="infrastructure/learner-lab-template-minimal.yaml"

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

# Check if template file exists
if [ ! -f "$TEMPLATE_FILE" ]; then
    echo "❌ Template file not found: $TEMPLATE_FILE"
    exit 1
fi

echo "🔍 Validating CloudFormation template..."

# Check if we're in AWS Academy Learner Lab by checking for the LabRole
account_info=$(aws sts get-caller-identity --output text --query Arn 2>/dev/null || echo "")
if [[ "$account_info" == *"assumed-role/voclabs"* ]] || [[ "$account_info" == *"LabRole"* ]]; then
    echo "⚠️  AWS Academy Learner Lab detected - skipping template validation"
    echo "ℹ️  Reason: cloudformation:ValidateTemplate is restricted in Learner Lab environments"
    echo "ℹ️  Template file exists and will be validated during deployment"
else
    # Try template validation for regular AWS accounts
    if ! aws cloudformation validate-template --template-body "file://$TEMPLATE_FILE" > /dev/null 2>&1; then
        validation_error=$(aws cloudformation validate-template --template-body "file://$TEMPLATE_FILE" 2>&1)
        
        # Check if it's an AccessDenied error (common in restricted environments)
        if [[ "$validation_error" == *"AccessDenied"* ]] || [[ "$validation_error" == *"not authorized"* ]]; then
            echo "⚠️  Template validation restricted - continuing with deployment"
            echo "ℹ️  This is normal in AWS Academy or restricted environments"
        else
            echo "❌ Template validation failed"
            echo "Checking template syntax..."
            echo "$validation_error"
            exit 1
        fi
    else
        echo "✅ Template validation successful"
    fi
fi

echo "🚀 Deploying backend infrastructure..."

# Run the learner lab deployment script
./deploy-learner-lab-simple.sh

if [ $? -eq 0 ]; then
    echo "✅ Backend deployment completed successfully"
else
    echo "❌ Backend deployment failed"
    exit 1
fi

# Get stack outputs
echo "📋 Getting deployment information..."
API_URL=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' --output text)

echo ""
echo "🎉 Complete deployment finished!"
echo ""
echo "📊 Deployment Summary:"
echo "  Stack Name: $STACK_NAME"
echo "  API Gateway URL: $API_URL"
echo ""
echo "🔧 Next Steps:"
echo "1. Test API endpoints:"
echo "   curl $API_URL/products"
echo "   curl $API_URL/customers"
echo "   curl $API_URL/orders"
echo ""
echo "2. Initialize sample data:"
echo "   ./init-sample-data.sh"
echo ""
echo "3. Run tests:"
echo "   ./test-learner-lab.sh"
echo ""
echo "4. Demo the solution:"
echo "   ./deploy-demo.sh"
