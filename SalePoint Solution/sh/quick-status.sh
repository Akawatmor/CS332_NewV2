#!/bin/bash

# Quick test script to verify SalePoint deployment status

echo "🔍 Checking SalePoint Deployment Status..."
echo ""

# Check CloudFormation stack
echo "📋 CloudFormation Stack:"
STACK_STATUS=$(aws cloudformation describe-stacks --stack-name salepoint-lab --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo "DOES_NOT_EXIST")
echo "   Status: $STACK_STATUS"

if [ "$STACK_STATUS" != "DOES_NOT_EXIST" ]; then
    # Get API URL
    API_URL=$(aws cloudformation describe-stacks --stack-name salepoint-lab --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' --output text 2>/dev/null || echo "")
    
    if [ -n "$API_URL" ]; then
        echo ""
        echo "🌐 API Base URL: $API_URL"
        echo ""
        echo "🧪 Testing API Endpoints:"
        
        # Test each endpoint
        for endpoint in products customers orders; do
            echo -n "   $endpoint: "
            STATUS=$(curl -s -w "%{http_code}" --connect-timeout 5 --max-time 15 "$API_URL/$endpoint" 2>/dev/null | tail -c 3)
            
            if [[ "$STATUS" =~ ^2[0-9][0-9]$ ]]; then
                echo "✅ Working (HTTP $STATUS)"
            else
                echo "❌ Failed (HTTP $STATUS)"
            fi
        done
    else
        echo "❌ Could not get API URL"
    fi
    
    echo ""
    echo "📊 Resource Summary:"
    
    # Check Lambda functions
    LAMBDA_COUNT=$(aws lambda list-functions --query 'Functions[?contains(FunctionName, `salepoint`)]' --output json | jq length 2>/dev/null || echo "0")
    echo "   Lambda Functions: $LAMBDA_COUNT"
    
    # Check DynamoDB tables
    DYNAMODB_COUNT=$(aws dynamodb list-tables --query 'TableNames[?contains(@, `salepoint`)]' --output json | jq length 2>/dev/null || echo "0")
    echo "   DynamoDB Tables: $DYNAMODB_COUNT"
    
else
    echo "❌ No SalePoint stack found"
    echo ""
    echo "To deploy SalePoint, run:"
    echo "   ./deploy-foolproof.sh"
fi

echo ""
echo "🏁 Status check complete!"
