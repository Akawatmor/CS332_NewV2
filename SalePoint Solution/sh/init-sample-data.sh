#!/bin/bash

# SalePoint Solution - Initialize Sample Data
# This script adds sample data to the DynamoDB tables

set -e

PROJECT_NAME="salepoint"
STACK_NAME="salepoint-lab"

echo "=== SalePoint Sample Data Initialization ==="
echo ""

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI not configured or no access. Please check your credentials."
    exit 1
fi

echo "✅ AWS CLI configured successfully"

# Get API Gateway URL from CloudFormation stack
echo "🔍 Getting API Gateway URL..."
API_URL=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' --output text 2>/dev/null || echo "")

if [ -z "$API_URL" ]; then
    echo "❌ Could not get API Gateway URL. Make sure the stack is deployed."
    exit 1
fi

echo "✅ API Gateway URL: $API_URL"

# Function to add data via API
add_data() {
    local endpoint=$1
    local data=$2
    local name=$3
    
    echo "📝 Adding $name..."
    response=$(curl -s -X POST "$API_URL/$endpoint" \
        -H "Content-Type: application/json" \
        -d "$data" \
        -w "HTTPSTATUS:%{http_code}")
    
    http_code=$(echo $response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    content=$(echo $response | sed -e 's/HTTPSTATUS:.*//g')
    
    if [[ $http_code -ge 200 && $http_code -lt 300 ]]; then
        echo "✅ $name added successfully"
    else
        echo "❌ Failed to add $name (HTTP $http_code)"
        echo "   Response: $content"
    fi
}

# Add sample products
echo ""
echo "🛍️ Adding sample products..."

add_data "products" '{
    "name": "MacBook Pro 14",
    "price": 1999.99,
    "category": "Laptops",
    "stock": 25,
    "description": "14-inch MacBook Pro with M3 chip"
}' "MacBook Pro 14"

add_data "products" '{
    "name": "iPhone 15",
    "price": 999.99,
    "category": "Smartphones",
    "stock": 50,
    "description": "Latest iPhone with advanced camera"
}' "iPhone 15"

add_data "products" '{
    "name": "AirPods Pro",
    "price": 249.99,
    "category": "Audio",
    "stock": 100,
    "description": "Wireless earbuds with active noise cancellation"
}' "AirPods Pro"

add_data "products" '{
    "name": "iPad Air",
    "price": 599.99,
    "category": "Tablets",
    "stock": 30,
    "description": "10.9-inch iPad Air with M1 chip"
}' "iPad Air"

add_data "products" '{
    "name": "Dell XPS 13",
    "price": 1299.99,
    "category": "Laptops",
    "stock": 20,
    "description": "Ultra-portable laptop with Intel processor"
}' "Dell XPS 13"

# Add sample customers
echo ""
echo "👥 Adding sample customers..."

add_data "customers" '{
    "name": "John Smith",
    "email": "john.smith@example.com",
    "phone": "555-0101",
    "address": "123 Main St, New York, NY 10001"
}' "John Smith"

add_data "customers" '{
    "name": "Sarah Johnson",
    "email": "sarah.johnson@example.com",
    "phone": "555-0102",
    "address": "456 Oak Ave, Los Angeles, CA 90210"
}' "Sarah Johnson"

add_data "customers" '{
    "name": "Mike Davis",
    "email": "mike.davis@example.com",
    "phone": "555-0103",
    "address": "789 Pine St, Chicago, IL 60601"
}' "Mike Davis"

add_data "customers" '{
    "name": "Emily Wilson",
    "email": "emily.wilson@example.com",
    "phone": "555-0104",
    "address": "321 Elm St, Houston, TX 77001"
}' "Emily Wilson"

# Add sample orders
echo ""
echo "📦 Adding sample orders..."

add_data "orders" '{
    "customerId": "cust_sample",
    "products": [
        {"productId": "prod_001", "name": "MacBook Pro 14", "price": 1999.99, "quantity": 1}
    ],
    "total": 1999.99,
    "status": "completed"
}' "Sample Order 1"

add_data "orders" '{
    "customerId": "cust_sample2",
    "products": [
        {"productId": "prod_002", "name": "iPhone 15", "price": 999.99, "quantity": 2}
    ],
    "total": 1999.98,
    "status": "pending"
}' "Sample Order 2"

# Verify data was added
echo ""
echo "🔍 Verifying data was added..."

echo "📊 Products:"
curl -s "$API_URL/products" | jq '.count // 0' | xargs echo "   Count:"

echo "📊 Customers:"
curl -s "$API_URL/customers" | jq '.count // 0' | xargs echo "   Count:"

echo "📊 Orders:"
curl -s "$API_URL/orders" | jq '.count // 0' | xargs echo "   Count:"

echo ""
echo "🎉 Sample data initialization completed!"
echo ""
echo "🔧 Test the data with these commands:"
echo "   curl $API_URL/products | jq ."
echo "   curl $API_URL/customers | jq ."
echo "   curl $API_URL/orders | jq ."
