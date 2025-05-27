#!/bin/bash

# SalePoint Solution - Learner Lab Testing Script
# This script tests all API endpoints and diagnoses issues

set -e

PROJECT_NAME="salepoint"
STACK_NAME="salepoint-lab"
REGION="us-east-1"

echo "=== SalePoint Learner Lab Testing ==="
echo "Project: $PROJECT_NAME"
echo "Stack: $STACK_NAME"
echo "Region: $REGION"
echo ""

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI not configured or no access. Please check your credentials."
    exit 1
fi

echo "✅ AWS CLI configured successfully"

# Get API Gateway URL from CloudFormation stack
echo "🔍 Getting API Gateway URL from CloudFormation..."
API_URL=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' --output text 2>/dev/null || echo "")

if [ -z "$API_URL" ]; then
    echo "❌ Could not get API Gateway URL from CloudFormation stack"
    echo "Checking if stack exists..."
    
    STACK_STATUS=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo "DOES_NOT_EXIST")
    echo "Stack status: $STACK_STATUS"
    
    if [ "$STACK_STATUS" = "DOES_NOT_EXIST" ]; then
        echo "❌ Stack does not exist. Please run deployment first:"
        echo "   ./deploy-learner-lab-simple.sh"
        exit 1
    fi
    
    exit 1
fi

echo "✅ API Gateway URL: $API_URL"

# Test basic connectivity
echo ""
echo "🌐 Testing basic connectivity..."
if curl -s --connect-timeout 10 --max-time 30 "$API_URL" > /dev/null; then
    echo "✅ API Gateway is reachable"
else
    echo "❌ Cannot reach API Gateway"
    echo "This might be a temporary issue. Trying again..."
    sleep 5
    if curl -s --connect-timeout 10 --max-time 30 "$API_URL" > /dev/null; then
        echo "✅ API Gateway is reachable (retry successful)"
    else
        echo "❌ API Gateway still not reachable"
    fi
fi

# Function to test API endpoint
test_endpoint() {
    local endpoint=$1
    local name=$2
    local expected_method=${3:-GET}
    
    echo ""
    echo "🧪 Testing $name endpoint: $endpoint"
    
    # Test with timeout and proper error handling
    response=$(curl -s --connect-timeout 10 --max-time 30 -w "HTTPSTATUS:%{http_code}" "$endpoint" 2>/dev/null || echo "HTTPSTATUS:000")
    
    if [[ $response == *"HTTPSTATUS:000"* ]]; then
        echo "❌ $name API: Connection failed (timeout or network error)"
        return 1
    fi
    
    http_code=$(echo $response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    content=$(echo $response | sed -e 's/HTTPSTATUS:.*//g')
    
    echo "   HTTP Status: $http_code"
    
    if [[ $http_code -ge 200 && $http_code -lt 300 ]]; then
        echo "✅ $name API: Working correctly"
        if [[ $content == *"{"* ]]; then
            echo "   Response: $(echo "$content" | head -c 100)..."
        fi
        return 0
    elif [[ $http_code -eq 404 ]]; then
        echo "❌ $name API: Endpoint not found (404)"
        echo "   This might indicate the API Gateway resource is not properly configured"
        return 1
    elif [[ $http_code -eq 403 ]]; then
        echo "❌ $name API: Access forbidden (403)"
        echo "   This might indicate IAM permission issues"
        return 1
    elif [[ $http_code -eq 500 ]]; then
        echo "❌ $name API: Internal server error (500)"
        echo "   This might indicate Lambda function issues"
        if [[ $content == *"{"* ]]; then
            echo "   Error details: $content"
        fi
        return 1
    elif [[ $http_code -eq 502 ]]; then
        echo "❌ $name API: Bad Gateway (502)"
        echo "   This might indicate Lambda function deployment issues"
        return 1
    elif [[ $http_code -eq 503 ]]; then
        echo "❌ $name API: Service unavailable (503)"
        echo "   This might indicate temporary AWS service issues"
        return 1
    else
        echo "❌ $name API: Unexpected status code $http_code"
        if [[ $content ]]; then
            echo "   Response: $content"
        fi
        return 1
    fi
}

# Test CORS preflight
test_cors() {
    local endpoint=$1
    local name=$2
    
    echo ""
    echo "🔍 Testing CORS for $name endpoint..."
    
    response=$(curl -s --connect-timeout 10 --max-time 30 -X OPTIONS -H "Origin: http://localhost:3000" -H "Access-Control-Request-Method: GET" -w "HTTPSTATUS:%{http_code}" "$endpoint" 2>/dev/null || echo "HTTPSTATUS:000")
    
    http_code=$(echo $response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    
    if [[ $http_code -eq 200 ]]; then
        echo "✅ CORS: Configured correctly for $name"
    else
        echo "❌ CORS: Issues with $name (HTTP $http_code)"
    fi
}

# Test all endpoints
echo ""
echo "🧪 Testing API Endpoints..."

# Test individual endpoints
test_endpoint "$API_URL/products" "Products"
test_endpoint "$API_URL/customers" "Customers"
test_endpoint "$API_URL/orders" "Orders"

# Test CORS
test_cors "$API_URL/products" "Products"
test_cors "$API_URL/customers" "Customers"
test_cors "$API_URL/orders" "Orders"

# Test POST endpoints with sample data
echo ""
echo "🧪 Testing POST endpoints..."

# Test Products POST
echo ""
echo "🧪 Testing Products POST with sample data..."
products_post_response=$(curl -s --connect-timeout 10 --max-time 30 -X POST "$API_URL/products" \
    -H "Content-Type: application/json" \
    -d '{"name":"Test Product","price":29.99,"category":"Test","stock":100}' \
    -w "HTTPSTATUS:%{http_code}" 2>/dev/null || echo "HTTPSTATUS:000")

products_post_code=$(echo $products_post_response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
echo "   Products POST HTTP Status: $products_post_code"

if [[ $products_post_code -ge 200 && $products_post_code -lt 300 ]]; then
    echo "✅ Products POST: Working correctly"
else
    echo "❌ Products POST: Issues detected"
fi

# Test Customers POST
echo ""
echo "🧪 Testing Customers POST with sample data..."
customers_post_response=$(curl -s --connect-timeout 10 --max-time 30 -X POST "$API_URL/customers" \
    -H "Content-Type: application/json" \
    -d '{"name":"Test Customer","email":"test@example.com","phone":"555-0123"}' \
    -w "HTTPSTATUS:%{http_code}" 2>/dev/null || echo "HTTPSTATUS:000")

customers_post_code=$(echo $customers_post_response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
echo "   Customers POST HTTP Status: $customers_post_code"

if [[ $customers_post_code -ge 200 && $customers_post_code -lt 300 ]]; then
    echo "✅ Customers POST: Working correctly"
else
    echo "❌ Customers POST: Issues detected"
fi

# Diagnose Lambda functions
echo ""
echo "🔍 Diagnosing Lambda Functions..."

LAMBDA_FUNCTIONS=("salepoint-products" "salepoint-customers" "salepoint-orders")

for func in "${LAMBDA_FUNCTIONS[@]}"; do
    echo ""
    echo "🔍 Checking Lambda function: $func"
    
    # Check if function exists
    func_info=$(aws lambda get-function --function-name $func --region $REGION 2>/dev/null || echo "")
    
    if [ -z "$func_info" ]; then
        echo "❌ Function $func does not exist"
        continue
    fi
    
    # Get function status
    func_state=$(echo "$func_info" | jq -r '.Configuration.State // "Unknown"')
    echo "   State: $func_state"
    
    if [ "$func_state" != "Active" ]; then
        echo "❌ Function $func is not in Active state"
        continue
    fi
    
    # Test function invocation
    echo "   Testing function invocation..."
    test_payload='{"httpMethod":"GET","path":"/test","headers":{"Content-Type":"application/json"}}'
    
    invoke_result=$(aws lambda invoke --function-name $func --payload "$test_payload" --region $REGION /tmp/lambda-response.json 2>&1 || echo "INVOKE_FAILED")
    
    if [[ $invoke_result == *"INVOKE_FAILED"* ]]; then
        echo "❌ Failed to invoke $func"
    else
        status_code=$(echo "$invoke_result" | jq -r '.StatusCode // 0')
        if [ "$status_code" = "200" ]; then
            echo "✅ Function $func invoked successfully"
        else
            echo "❌ Function $func invocation failed with status $status_code"
        fi
        
        # Check for errors in response
        if [ -f /tmp/lambda-response.json ]; then
            error_type=$(cat /tmp/lambda-response.json | jq -r '.errorType // null')
            if [ "$error_type" != "null" ]; then
                echo "   Error: $(cat /tmp/lambda-response.json | jq -r '.errorMessage // "Unknown error"')"
            fi
            rm -f /tmp/lambda-response.json
        fi
    fi
done

# Check API Gateway configuration
echo ""
echo "🔍 Checking API Gateway Configuration..."

# Extract API ID from URL
API_ID=$(echo $API_URL | sed 's/https:\/\///' | cut -d'.' -f1)
echo "API Gateway ID: $API_ID"

# Check API Gateway resources
echo "Checking API Gateway resources..."
resources=$(aws apigateway get-resources --rest-api-id $API_ID --region $REGION 2>/dev/null || echo "")

if [ -z "$resources" ]; then
    echo "❌ Could not retrieve API Gateway resources"
else
    resource_count=$(echo "$resources" | jq '.items | length')
    echo "✅ Found $resource_count API Gateway resources"
    
    # List resources
    echo "$resources" | jq -r '.items[] | "   \(.pathPart // "root") - \(.path)"'
fi

# Check DynamoDB tables
echo ""
echo "🔍 Checking DynamoDB Tables..."

TABLES=("salepoint-products" "salepoint-customers" "salepoint-orders")

for table in "${TABLES[@]}"; do
    echo "Checking table: $table"
    
    table_status=$(aws dynamodb describe-table --table-name $table --region $REGION --query 'Table.TableStatus' --output text 2>/dev/null || echo "DOES_NOT_EXIST")
    
    if [ "$table_status" = "ACTIVE" ]; then
        echo "✅ Table $table is active"
        
        # Check item count
        item_count=$(aws dynamodb scan --table-name $table --select COUNT --region $REGION --query 'Count' --output text 2>/dev/null || echo "0")
        echo "   Items in table: $item_count"
    elif [ "$table_status" = "DOES_NOT_EXIST" ]; then
        echo "❌ Table $table does not exist"
    else
        echo "❌ Table $table status: $table_status"
    fi
done

# Summary and recommendations
echo ""
echo "📋 Test Summary and Recommendations:"

if curl -s --connect-timeout 5 --max-time 15 "$API_URL/products" | jq . > /dev/null 2>&1; then
    echo "✅ Products API is working"
else
    echo "❌ Products API has issues - Check Lambda function and API Gateway configuration"
fi

if curl -s --connect-timeout 5 --max-time 15 "$API_URL/customers" | jq . > /dev/null 2>&1; then
    echo "✅ Customers API is working"
else
    echo "❌ Customers API has issues - Check Lambda function and API Gateway configuration"
fi

if curl -s --connect-timeout 5 --max-time 15 "$API_URL/orders" | jq . > /dev/null 2>&1; then
    echo "✅ Orders API is working"
else
    echo "❌ Orders API has issues - Check Lambda function and API Gateway configuration"
fi

echo ""
echo "🔧 If you see issues, try these solutions:"
echo "1. Redeploy the stack: ./deploy-learner-lab-simple.sh"
echo "2. Check AWS CloudFormation console for stack events"
echo "3. Check AWS Lambda console for function errors"
echo "4. Check AWS API Gateway console for integration issues"
echo "5. Verify IAM permissions (LabRole should have necessary permissions)"
echo ""
echo "📱 Test URLs:"
echo "   Products: $API_URL/products"
echo "   Customers: $API_URL/customers"
echo "   Orders: $API_URL/orders"
echo ""
echo "🎉 Testing completed!"

# Save test results
cat > test-results.txt << EOF
SalePoint Test Results
=====================
Date: $(date)
API Gateway URL: $API_URL

Test Summary:
- Products API: $(curl -s --connect-timeout 5 --max-time 10 "$API_URL/products" >/dev/null 2>&1 && echo "✅ Working" || echo "❌ Issues")
- Customers API: $(curl -s --connect-timeout 5 --max-time 10 "$API_URL/customers" >/dev/null 2>&1 && echo "✅ Working" || echo "❌ Issues")
- Orders API: $(curl -s --connect-timeout 5 --max-time 10 "$API_URL/orders" >/dev/null 2>&1 && echo "✅ Working" || echo "❌ Issues")

API URLs:
- GET $API_URL/products
- GET $API_URL/customers
- GET $API_URL/orders

For detailed logs, check CloudWatch Logs for Lambda functions.
EOF

echo "💾 Test results saved to test-results.txt"
