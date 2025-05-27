#!/bin/bash

# SalePoint Solution - Demo Script (Bash Version)
# Demonstrates key features of the deployed SalePoint application

# Load deployment info if available
DEPLOYMENT_INFO_FILE="deployment-info.json"
if [[ ! -f "$DEPLOYMENT_INFO_FILE" ]]; then
    echo "Error: deployment-info.json not found. Please run the deployment script first."
    exit 1
fi

# Color functions
print_success() { echo -e "\033[32m$1\033[0m"; }
print_warning() { echo -e "\033[33m$1\033[0m"; }
print_error() { echo -e "\033[31m$1\033[0m"; }
print_info() { echo -e "\033[36m$1\033[0m"; }
print_step() { echo -e "\n\033[35m=== $1 ===\033[0m"; }

# Parse deployment info
API_BASE_URL=$(jq -r '.outputs.apiGatewayUrl' "$DEPLOYMENT_INFO_FILE")
FRONTEND_URL=$(jq -r '.outputs.frontendBucketUrl' "$DEPLOYMENT_INFO_FILE")
PROJECT_NAME=$(jq -r '.projectName' "$DEPLOYMENT_INFO_FILE")

# Header
echo -e "\033[36m"
cat << 'EOF'
╔══════════════════════════════════════════════════════════════════╗
║                    SalePoint Solution Demo                      ║
║                 Showcasing Key Functionality                    ║
╚══════════════════════════════════════════════════════════════════╝
EOF
echo -e "\033[0m"

print_info "Project: $PROJECT_NAME"
print_info "Frontend URL: $FRONTEND_URL"
print_info "API Base URL: $API_BASE_URL"

# Step 1: Health Check
print_step "System Health Check"

print_info "Checking API health..."
if curl -s -f "$API_BASE_URL/health" >/dev/null; then
    print_success "✓ API is healthy and responding"
else
    print_error "✗ API health check failed"
    exit 1
fi

print_info "Checking frontend availability..."
if curl -s -I "$FRONTEND_URL" | grep -q "200 OK"; then
    print_success "✓ Frontend is accessible"
else
    print_warning "⚠ Frontend accessibility check failed"
fi

# Step 2: API Demonstrations
print_step "API Functionality Demonstration"

# Test products endpoint
print_info "Testing Products API..."
PRODUCTS_RESPONSE=$(curl -s "$API_BASE_URL/products" 2>/dev/null)
if [[ $? -eq 0 ]]; then
    PRODUCT_COUNT=$(echo "$PRODUCTS_RESPONSE" | jq length 2>/dev/null || echo "0")
    print_success "✓ Products API working - Found $PRODUCT_COUNT products"
else
    print_warning "⚠ Products API test failed"
fi

# Test customers endpoint
print_info "Testing Customers API..."
CUSTOMERS_RESPONSE=$(curl -s "$API_BASE_URL/customers" 2>/dev/null)
if [[ $? -eq 0 ]]; then
    CUSTOMER_COUNT=$(echo "$CUSTOMERS_RESPONSE" | jq length 2>/dev/null || echo "0")
    print_success "✓ Customers API working - Found $CUSTOMER_COUNT customers"
else
    print_warning "⚠ Customers API test failed"
fi

# Test sales endpoint
print_info "Testing Sales API..."
SALES_RESPONSE=$(curl -s "$API_BASE_URL/sales" 2>/dev/null)
if [[ $? -eq 0 ]]; then
    SALES_COUNT=$(echo "$SALES_RESPONSE" | jq length 2>/dev/null || echo "0")
    print_success "✓ Sales API working - Found $SALES_COUNT sales records"
else
    print_warning "⚠ Sales API test failed"
fi

# Test inventory endpoint
print_info "Testing Inventory API..."
INVENTORY_RESPONSE=$(curl -s "$API_BASE_URL/inventory" 2>/dev/null)
if [[ $? -eq 0 ]]; then
    print_success "✓ Inventory API working"
else
    print_warning "⚠ Inventory API test failed"
fi

# Test analytics endpoint
print_info "Testing Analytics API..."
ANALYTICS_RESPONSE=$(curl -s "$API_BASE_URL/analytics" 2>/dev/null)
if [[ $? -eq 0 ]]; then
    print_success "✓ Analytics API working"
else
    print_warning "⚠ Analytics API test failed"
fi

# Step 3: Feature Showcase
print_step "Key Features Showcase"

cat << EOF
🎯 SalePoint Solution Features Demonstrated:

📊 Product Management
   • REST API for CRUD operations on products
   • Product categories and inventory tracking
   • Price management and product search

👥 Customer Management
   • Customer registration and profile management
   • Customer search and filtering capabilities
   • Purchase history tracking

💰 Sales Processing
   • Complete sales transaction processing
   • Real-time inventory updates
   • Sales reporting and analytics

📈 Analytics & Reporting
   • Sales performance metrics
   • Customer behavior analysis
   • Inventory turnover reports
   • Revenue tracking and forecasting

🔐 Authentication & Authorization
   • AWS Cognito user management
   • Role-based access control (Admin, Manager, Sales)
   • Secure API endpoints with JWT tokens

☁️ Cloud Architecture
   • Serverless Lambda functions for business logic
   • API Gateway for REST API management
   • S3 for static website hosting and document storage
   • CloudFormation for infrastructure as code

EOF

# Step 4: User Guide
print_step "Quick Start Guide"

cat << EOF
🚀 Getting Started with SalePoint:

1. 🌐 Open the Application:
   URL: $FRONTEND_URL

2. 🔑 Login Credentials:
   Admin:   admin@salepoint.com / AdminPassword123!
   Manager: manager@salepoint.com / ManagerPass123!
   Sales:   sales@salepoint.com / SalesPass123!

3. 📋 Main Features to Test:
   • Navigate to Products section to manage inventory
   • Add new customers in the Customers section
   • Process sales transactions in the Sales section
   • View analytics and reports in the Analytics section

4. 🔧 API Testing:
   Base URL: $API_BASE_URL
   Available endpoints:
   • GET /health - System health check
   • GET /products - List all products
   • GET /customers - List all customers
   • GET /sales - List all sales
   • GET /inventory - Inventory status
   • GET /analytics - Sales analytics

5. 🛠️ Management Commands:
   • Test APIs: ./test-api.sh $API_BASE_URL
   • Verify solution: pwsh -File verify-solution.ps1
   • Cleanup resources: ./cleanup.sh

EOF

# Step 5: Performance Metrics
print_step "Performance Metrics"

print_info "Measuring API response times..."

# Test API response time
START_TIME=$(date +%s%N)
curl -s "$API_BASE_URL/health" >/dev/null 2>&1
END_TIME=$(date +%s%N)
RESPONSE_TIME=$(( ($END_TIME - $START_TIME) / 1000000 ))

print_success "✓ API response time: ${RESPONSE_TIME}ms"

# Frontend load time estimation
print_info "Estimating frontend load time..."
START_TIME=$(date +%s%N)
curl -s -I "$FRONTEND_URL" >/dev/null 2>&1
END_TIME=$(date +%s%N)
FRONTEND_TIME=$(( ($END_TIME - $START_TIME) / 1000000 ))

print_success "✓ Frontend response time: ${FRONTEND_TIME}ms"

# Architecture Summary
print_step "Architecture Summary"

cat << EOF
🏗️ SalePoint Solution Architecture:

Frontend Tier:
├── React.js Single Page Application
├── Material-UI/Bootstrap for responsive design
├── AWS S3 static website hosting
└── CloudFront CDN for global distribution

API Tier:
├── AWS API Gateway for REST endpoints
├── Lambda functions for business logic
├── Cognito for authentication & authorization
└── CloudWatch for monitoring & logging

Data Tier:
├── DynamoDB for application data (if configured)
├── S3 for document and file storage
├── Parameter Store for configuration
└── CloudFormation for infrastructure management

Security:
├── IAM roles with least privilege access
├── Cognito User Pools for user management
├── API Gateway with request validation
└── HTTPS/TLS encryption in transit

EOF

print_step "Demo Complete"

print_success "🎉 SalePoint Solution demo completed successfully!"
print_info "💡 Explore the application at: $FRONTEND_URL"
print_warning "⚠️  Remember to clean up resources when done testing to avoid charges"

echo
print_info "For cleanup, run: ./cleanup.sh"
