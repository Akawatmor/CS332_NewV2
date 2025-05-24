#!/bin/bash

# SalePoint Solution - AWS API Gateway Configuration Script
# This script creates and configures API Gateway for the SalePoint Lambda functions

set -e

echo "Starting API Gateway configuration for SalePoint Solution..."

# Configuration variables
API_NAME="SalePoint-API"
REGION="${AWS_DEFAULT_REGION:-us-east-1}"
STAGE_NAME="prod"

# Get account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "Using AWS Account ID: $ACCOUNT_ID"
echo "Using Region: $REGION"

# Create REST API
echo "Creating REST API..."
API_ID=$(aws apigateway create-rest-api \
    --name "$API_NAME" \
    --description "SalePoint Solution REST API" \
    --endpoint-configuration types=REGIONAL \
    --query 'id' --output text)

echo "Created API with ID: $API_ID"

# Get root resource ID
ROOT_RESOURCE_ID=$(aws apigateway get-resources \
    --rest-api-id "$API_ID" \
    --query 'items[0].id' --output text)

echo "Root resource ID: $ROOT_RESOURCE_ID"

# Create resources
echo "Creating API resources..."

# Products resource
PRODUCTS_RESOURCE_ID=$(aws apigateway create-resource \
    --rest-api-id "$API_ID" \
    --parent-id "$ROOT_RESOURCE_ID" \
    --path-part "products" \
    --query 'id' --output text)

# Products with ID resource
PRODUCTS_ID_RESOURCE_ID=$(aws apigateway create-resource \
    --rest-api-id "$API_ID" \
    --parent-id "$PRODUCTS_RESOURCE_ID" \
    --path-part "{id}" \
    --query 'id' --output text)

# Customers resource
CUSTOMERS_RESOURCE_ID=$(aws apigateway create-resource \
    --rest-api-id "$API_ID" \
    --parent-id "$ROOT_RESOURCE_ID" \
    --path-part "customers" \
    --query 'id' --output text)

# Customers with ID resource
CUSTOMERS_ID_RESOURCE_ID=$(aws apigateway create-resource \
    --rest-api-id "$API_ID" \
    --parent-id "$CUSTOMERS_RESOURCE_ID" \
    --path-part "{id}" \
    --query 'id' --output text)

# Customer-Sales Rep assignments resource
CUSTOMER_SALESREP_RESOURCE_ID=$(aws apigateway create-resource \
    --rest-api-id "$API_ID" \
    --parent-id "$ROOT_RESOURCE_ID" \
    --path-part "customer-salesrep" \
    --query 'id' --output text)

# Sales resource
SALES_RESOURCE_ID=$(aws apigateway create-resource \
    --rest-api-id "$API_ID" \
    --parent-id "$ROOT_RESOURCE_ID" \
    --path-part "sales" \
    --query 'id' --output text)

# Sales with ID resource
SALES_ID_RESOURCE_ID=$(aws apigateway create-resource \
    --rest-api-id "$API_ID" \
    --parent-id "$SALES_RESOURCE_ID" \
    --path-part "{id}" \
    --query 'id' --output text)

# Sales Representatives resource
SALESREPS_RESOURCE_ID=$(aws apigateway create-resource \
    --rest-api-id "$API_ID" \
    --parent-id "$ROOT_RESOURCE_ID" \
    --path-part "salesreps" \
    --query 'id' --output text)

# Sales Representatives with ID resource
SALESREPS_ID_RESOURCE_ID=$(aws apigateway create-resource \
    --rest-api-id "$API_ID" \
    --parent-id "$SALESREPS_RESOURCE_ID" \
    --path-part "{id}" \
    --query 'id' --output text)

# Dashboard resource
DASHBOARD_RESOURCE_ID=$(aws apigateway create-resource \
    --rest-api-id "$API_ID" \
    --parent-id "$ROOT_RESOURCE_ID" \
    --path-part "dashboard" \
    --query 'id' --output text)

echo "Created all API resources"

# Function to create method and integration
create_method_integration() {
    local resource_id=$1
    local http_method=$2
    local lambda_function=$3
    local path_override=$4
    
    echo "Creating $http_method method for $lambda_function..."
    
    # Create method
    aws apigateway put-method \
        --rest-api-id "$API_ID" \
        --resource-id "$resource_id" \
        --http-method "$http_method" \
        --authorization-type "NONE" \
        --request-parameters method.request.header.Content-Type=false
    
    # Get Lambda function ARN
    LAMBDA_ARN="arn:aws:lambda:$REGION:$ACCOUNT_ID:function:$lambda_function"
    
    # Create integration
    aws apigateway put-integration \
        --rest-api-id "$API_ID" \
        --resource-id "$resource_id" \
        --http-method "$http_method" \
        --type AWS_PROXY \
        --integration-http-method POST \
        --uri "arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/$LAMBDA_ARN/invocations"
    
    # Create method response
    aws apigateway put-method-response \
        --rest-api-id "$API_ID" \
        --resource-id "$resource_id" \
        --http-method "$http_method" \
        --status-code 200 \
        --response-models application/json=Empty
    
    # Create integration response
    aws apigateway put-integration-response \
        --rest-api-id "$API_ID" \
        --resource-id "$resource_id" \
        --http-method "$http_method" \
        --status-code 200 \
        --response-templates application/json=""
    
    # Grant API Gateway permission to invoke Lambda
    aws lambda add-permission \
        --function-name "$lambda_function" \
        --statement-id "apigateway-invoke-$lambda_function-$http_method" \
        --action lambda:InvokeFunction \
        --principal apigateway.amazonaws.com \
        --source-arn "arn:aws:execute-api:$REGION:$ACCOUNT_ID:$API_ID/*/*" \
        2>/dev/null || echo "Permission already exists for $lambda_function"
}

# Create methods and integrations

# Products endpoints
create_method_integration "$PRODUCTS_RESOURCE_ID" "GET" "getProductInfo"
create_method_integration "$PRODUCTS_RESOURCE_ID" "POST" "getProductInfo"
create_method_integration "$PRODUCTS_ID_RESOURCE_ID" "GET" "getProductInfo"
create_method_integration "$PRODUCTS_ID_RESOURCE_ID" "PUT" "getProductInfo"
create_method_integration "$PRODUCTS_ID_RESOURCE_ID" "DELETE" "getProductInfo"

# Customers endpoints
create_method_integration "$CUSTOMERS_RESOURCE_ID" "GET" "customerManagement"
create_method_integration "$CUSTOMERS_RESOURCE_ID" "POST" "customerManagement"
create_method_integration "$CUSTOMERS_ID_RESOURCE_ID" "GET" "customerManagement"
create_method_integration "$CUSTOMERS_ID_RESOURCE_ID" "PUT" "customerManagement"
create_method_integration "$CUSTOMERS_ID_RESOURCE_ID" "DELETE" "customerManagement"

# Customer-Sales Rep assignments
create_method_integration "$CUSTOMER_SALESREP_RESOURCE_ID" "GET" "customerSalesRepTracking"
create_method_integration "$CUSTOMER_SALESREP_RESOURCE_ID" "POST" "customerSalesRepTracking"
create_method_integration "$CUSTOMER_SALESREP_RESOURCE_ID" "DELETE" "customerSalesRepTracking"

# Sales endpoints
create_method_integration "$SALES_RESOURCE_ID" "GET" "salesTracking"
create_method_integration "$SALES_RESOURCE_ID" "POST" "salesTracking"
create_method_integration "$SALES_ID_RESOURCE_ID" "GET" "salesTracking"
create_method_integration "$SALES_ID_RESOURCE_ID" "PUT" "salesTracking"
create_method_integration "$SALES_ID_RESOURCE_ID" "DELETE" "salesTracking"

# Sales Representatives endpoints
create_method_integration "$SALESREPS_RESOURCE_ID" "GET" "salesRepresentatives"
create_method_integration "$SALESREPS_RESOURCE_ID" "POST" "salesRepresentatives"
create_method_integration "$SALESREPS_ID_RESOURCE_ID" "GET" "salesRepresentatives"
create_method_integration "$SALESREPS_ID_RESOURCE_ID" "PUT" "salesRepresentatives"
create_method_integration "$SALESREPS_ID_RESOURCE_ID" "DELETE" "salesRepresentatives"

# Dashboard endpoints
create_method_integration "$DASHBOARD_RESOURCE_ID" "GET" "dashboardAnalytics"

# Enable CORS for all resources
echo "Enabling CORS..."

enable_cors() {
    local resource_id=$1
    
    # OPTIONS method for CORS
    aws apigateway put-method \
        --rest-api-id "$API_ID" \
        --resource-id "$resource_id" \
        --http-method OPTIONS \
        --authorization-type NONE
    
    # CORS integration
    aws apigateway put-integration \
        --rest-api-id "$API_ID" \
        --resource-id "$resource_id" \
        --http-method OPTIONS \
        --type MOCK \
        --request-templates application/json='{"statusCode": 200}'
    
    # CORS method response
    aws apigateway put-method-response \
        --rest-api-id "$API_ID" \
        --resource-id "$resource_id" \
        --http-method OPTIONS \
        --status-code 200 \
        --response-parameters method.response.header.Access-Control-Allow-Headers=true,method.response.header.Access-Control-Allow-Methods=true,method.response.header.Access-Control-Allow-Origin=true
    
    # CORS integration response
    aws apigateway put-integration-response \
        --rest-api-id "$API_ID" \
        --resource-id "$resource_id" \
        --http-method OPTIONS \
        --status-code 200 \
        --response-parameters method.response.header.Access-Control-Allow-Headers="'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",method.response.header.Access-Control-Allow-Methods="'GET,POST,PUT,DELETE,OPTIONS'",method.response.header.Access-Control-Allow-Origin="'*'"
}

# Enable CORS for all resources
enable_cors "$PRODUCTS_RESOURCE_ID"
enable_cors "$PRODUCTS_ID_RESOURCE_ID"
enable_cors "$CUSTOMERS_RESOURCE_ID"
enable_cors "$CUSTOMERS_ID_RESOURCE_ID"
enable_cors "$CUSTOMER_SALESREP_RESOURCE_ID"
enable_cors "$SALES_RESOURCE_ID"
enable_cors "$SALES_ID_RESOURCE_ID"
enable_cors "$SALESREPS_RESOURCE_ID"
enable_cors "$SALESREPS_ID_RESOURCE_ID"
enable_cors "$DASHBOARD_RESOURCE_ID"

# Deploy API
echo "Deploying API..."
aws apigateway create-deployment \
    --rest-api-id "$API_ID" \
    --stage-name "$STAGE_NAME" \
    --description "SalePoint Solution API deployment"

# Get API endpoint
API_ENDPOINT="https://$API_ID.execute-api.$REGION.amazonaws.com/$STAGE_NAME"

echo ""
echo "========================================"
echo "API Gateway configuration completed!"
echo "========================================"
echo "API ID: $API_ID"
echo "API Endpoint: $API_ENDPOINT"
echo "Stage: $STAGE_NAME"
echo ""
echo "API Endpoints:"
echo "Products: $API_ENDPOINT/products"
echo "Customers: $API_ENDPOINT/customers"
echo "Customer-Sales Rep: $API_ENDPOINT/customer-salesrep"
echo "Sales: $API_ENDPOINT/sales"
echo "Sales Representatives: $API_ENDPOINT/salesreps"
echo "Dashboard: $API_ENDPOINT/dashboard"
echo ""
echo "Update your frontend config.js with this API endpoint:"
echo "CONFIG.api.baseURL = '$API_ENDPOINT';"
echo "========================================"

# Save configuration to file
cat > api-gateway-config.json << EOF
{
  "apiId": "$API_ID",
  "apiEndpoint": "$API_ENDPOINT",
  "stageName": "$STAGE_NAME",
  "region": "$REGION",
  "accountId": "$ACCOUNT_ID",
  "endpoints": {
    "products": "$API_ENDPOINT/products",
    "customers": "$API_ENDPOINT/customers",
    "customerSalesRep": "$API_ENDPOINT/customer-salesrep",
    "sales": "$API_ENDPOINT/sales",
    "salesRepresentatives": "$API_ENDPOINT/salesreps",
    "dashboard": "$API_ENDPOINT/dashboard"
  }
}
EOF

echo "Configuration saved to api-gateway-config.json"
