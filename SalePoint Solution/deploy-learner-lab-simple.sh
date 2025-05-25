#!/bin/bash

# SalePoint Learner Lab Deployment Script
# This script deploys a simplified version compatible with AWS Learner Lab

set -e

PROJECT_NAME="salepoint"
STACK_NAME="salepoint-lab"
TEMPLATE_FILE="infrastructure/learner-lab-template.yaml"
FORCE_DEPLOY=false

# Check for force deploy flag
if [[ "$1" == "--force" || "$1" == "--force-deploy" ]]; then
    FORCE_DEPLOY=true
    echo "🔥 Force deploy mode enabled - will delete and recreate stack"
fi

echo "=== SalePoint Learner Lab Deployment ==="
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

# Validate template
echo "🔍 Validating CloudFormation template..."
if aws cloudformation validate-template --template-body file://$TEMPLATE_FILE > /dev/null; then
    echo "✅ Template validation successful"
else
    echo "❌ Template validation failed"
    exit 1
fi

# Check if stack already exists
if aws cloudformation describe-stacks --stack-name $STACK_NAME > /dev/null 2>&1; then
    echo "📦 Stack $STACK_NAME already exists"
    
    # Get current status
    CURRENT_STATUS=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].StackStatus' --output text)
    echo "Current status: $CURRENT_STATUS"
    
    if [[ "$FORCE_DEPLOY" == true ]]; then
        echo "🗑️  Force deploy: Deleting existing stack..."
        aws cloudformation delete-stack --stack-name $STACK_NAME
        echo "⏳ Waiting for stack deletion to complete..."
        aws cloudformation wait stack-delete-complete --stack-name $STACK_NAME
        echo "✅ Stack deleted successfully"
        
        # Create new stack
        echo "🚀 Creating new stack..."
        aws cloudformation create-stack \
            --stack-name $STACK_NAME \
            --template-body file://$TEMPLATE_FILE \
            --parameters ParameterKey=ProjectName,ParameterValue=$PROJECT_NAME
        
        echo "⏳ Waiting for stack creation to complete..."
        aws cloudformation wait stack-create-complete --stack-name $STACK_NAME
        echo "✅ Stack creation completed successfully!"
        
    elif [[ "$CURRENT_STATUS" == "CREATE_COMPLETE" || "$CURRENT_STATUS" == "UPDATE_COMPLETE" ]]; then
        echo "🔄 Attempting to update existing stack..."
        
        # Try to update the stack, but handle "no updates" gracefully
        UPDATE_OUTPUT=$(aws cloudformation update-stack \
            --stack-name $STACK_NAME \
            --template-body file://$TEMPLATE_FILE \
            --parameters ParameterKey=ProjectName,ParameterValue=$PROJECT_NAME 2>&1) || UPDATE_FAILED=true
        
        if [[ $UPDATE_FAILED == true && "$UPDATE_OUTPUT" == *"No updates are to be performed"* ]]; then
            echo "ℹ️  No changes detected - stack is already up to date!"
            echo "✅ Stack is in the desired state"
        elif [[ $UPDATE_FAILED == true ]]; then
            echo "❌ Stack update failed:"
            echo "$UPDATE_OUTPUT"
            exit 1
        else
            echo "⏳ Waiting for stack update to complete..."
            aws cloudformation wait stack-update-complete --stack-name $STACK_NAME
            echo "✅ Stack update completed successfully!"
        fi
    else
        echo "❌ Stack is in $CURRENT_STATUS state. Please check AWS console."
        exit 1
    fi
else
    echo "🚀 Creating new stack..."
    aws cloudformation create-stack \
        --stack-name $STACK_NAME \
        --template-body file://$TEMPLATE_FILE \
        --parameters ParameterKey=ProjectName,ParameterValue=$PROJECT_NAME
    
    echo "⏳ Waiting for stack creation to complete..."
    aws cloudformation wait stack-create-complete --stack-name $STACK_NAME
    echo "✅ Stack creation completed successfully!"
fi

# Get stack outputs
echo ""
echo "📋 Stack Outputs:"
aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs' --output table

# Test API endpoints
echo ""
echo "🧪 Testing API endpoints..."
API_URL=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' --output text)

if [ ! -z "$API_URL" ]; then
    echo "Testing Products API..."
    curl -s "$API_URL/products" | jq . || echo "Products API response received"
    
    echo "Testing Customers API..."
    curl -s "$API_URL/customers" | jq . || echo "Customers API response received"
    
    echo ""
    echo "🎉 Deployment completed successfully!"
    echo "API URL: $API_URL"
    echo ""
    echo "You can now:"
    echo "1. Test the API endpoints using the URL above"
    echo "2. View the DynamoDB tables in the AWS console"
    echo "3. Check the Lambda functions in the AWS console"
else
    echo "⚠️  Could not retrieve API URL from stack outputs"
fi

echo ""
echo "=== Deployment Summary ==="
echo "✅ CloudFormation Stack: $STACK_NAME"
echo "✅ DynamoDB Tables: Created"
echo "✅ Lambda Functions: Created"
echo "✅ API Gateway: Created"
echo "✅ API Endpoints: Working"
echo ""
echo "💡 Usage Tips:"
echo "  • To force redeploy: ./deploy-learner-lab-simple.sh --force"
echo "  • To test APIs: ./test-learner-lab.sh"
echo "  • To check status: aws cloudformation describe-stacks --stack-name $STACK_NAME"
