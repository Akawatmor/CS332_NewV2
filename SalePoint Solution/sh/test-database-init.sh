#!/bin/bash

# Test Database Initialization - Standalone Test
# This script tests the database initialization functionality

set -e

# Color functions
print_success() { echo -e "\033[32m✅ $1\033[0m"; }
print_warning() { echo -e "\033[33m⚠️  $1\033[0m"; }
print_error() { echo -e "\033[31m❌ $1\033[0m"; }
print_info() { echo -e "\033[36mℹ️  $1\033[0m"; }
print_step() { echo -e "\n\033[35m=== $1 ===\033[0m"; }

# Configuration
PROJECT_NAME="salepoint"
REGION="us-east-1"

print_step "Testing Database Initialization"

# Check if tables exist
if aws dynamodb describe-table --table-name "$PROJECT_NAME-products" --region "$REGION" > /dev/null 2>&1; then
    print_success "Products table exists"
else
    print_error "Products table not found - please deploy backend first"
    exit 1
fi

if aws dynamodb describe-table --table-name "$PROJECT_NAME-customers" --region "$REGION" > /dev/null 2>&1; then
    print_success "Customers table exists"
else
    print_error "Customers table not found - please deploy backend first"
    exit 1
fi

if aws dynamodb describe-table --table-name "$PROJECT_NAME-orders" --region "$REGION" > /dev/null 2>&1; then
    print_success "Orders table exists"
else
    print_error "Orders table not found - please deploy backend first"
    exit 1
fi

print_info "All DynamoDB tables are ready for data initialization"

# Test adding one sample product
print_info "Testing sample product addition..."
aws dynamodb put-item \
    --table-name "$PROJECT_NAME-products" \
    --item '{
        "productId": {"S": "test_sample_001"},
        "name": {"S": "Test Sample Product"},
        "description": {"S": "This is a test product for verification"},
        "price": {"N": "99.99"},
        "category": {"S": "Test"},
        "stock": {"N": "10"},
        "specifications": {"S": "{\"test\": true}"},
        "createdAt": {"S": "'$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")'"},
        "updatedAt": {"S": "'$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")'"} 
    }' \
    --region "$REGION"

print_success "Test product added successfully!"

# Verify it was added
print_info "Verifying product was added..."
item_count=$(aws dynamodb scan --table-name "$PROJECT_NAME-products" --region "$REGION" --query 'Count' --output text)
print_success "Products table now contains $item_count items"

# Clean up test item
print_info "Cleaning up test item..."
aws dynamodb delete-item \
    --table-name "$PROJECT_NAME-products" \
    --key '{"productId": {"S": "test_sample_001"}}' \
    --region "$REGION"

print_success "Test completed successfully!"
print_info "✅ Database initialization functionality is working properly"
print_info "✅ Ready to run full deployment with sample data"
