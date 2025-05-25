#!/bin/bash

# SalePoint Solution - API Testing Script (Bash Version)
# Tests all API endpoints deployed in AWS Learner Lab

# Parameters
API_BASE_URL="${1:-}"
if [[ -z "$API_BASE_URL" ]]; then
    echo "Usage: $0 <API_BASE_URL>"
    echo "Example: $0 https://abcd1234.execute-api.us-east-1.amazonaws.com/prod"
    exit 1
fi

# Color functions
print_success() { echo -e "\033[32m$1\033[0m"; }
print_error() { echo -e "\033[31m$1\033[0m"; }
print_info() { echo -e "\033[36m$1\033[0m"; }
print_step() { echo -e "\n\033[35m=== $1 ===\033[0m"; }

print_step "SalePoint API Testing"

print_info "Testing API Base URL: $API_BASE_URL"

# Test health endpoint
print_info "Testing health endpoint..."
if curl -s -f "$API_BASE_URL/health" >/dev/null; then
    print_success "✓ Health endpoint is working"
else
    print_error "✗ Health endpoint failed"
fi

# Test products endpoint
print_info "Testing products endpoint..."
if curl -s -f "$API_BASE_URL/products" >/dev/null; then
    print_success "✓ Products endpoint is working"
else
    print_error "✗ Products endpoint failed"
fi

# Test customers endpoint
print_info "Testing customers endpoint..."
if curl -s -f "$API_BASE_URL/customers" >/dev/null; then
    print_success "✓ Customers endpoint is working"
else
    print_error "✗ Customers endpoint failed"
fi

# Test sales endpoint
print_info "Testing sales endpoint..."
if curl -s -f "$API_BASE_URL/sales" >/dev/null; then
    print_success "✓ Sales endpoint is working"
else
    print_error "✗ Sales endpoint failed"
fi

# Test inventory endpoint
print_info "Testing inventory endpoint..."
if curl -s -f "$API_BASE_URL/inventory" >/dev/null; then
    print_success "✓ Inventory endpoint is working"
else
    print_error "✗ Inventory endpoint failed"
fi

# Test analytics endpoint
print_info "Testing analytics endpoint..."
if curl -s -f "$API_BASE_URL/analytics" >/dev/null; then
    print_success "✓ Analytics endpoint is working"
else
    print_error "✗ Analytics endpoint failed"
fi

print_step "API Testing Complete"
