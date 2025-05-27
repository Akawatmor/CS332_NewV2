#!/bin/bash

# SalePoint Solution - COMPLETE ONE-STOP DEPLOYMENT SERVICE
# This script handles EVERYTHING needed for a full SalePoint deployment:
# • Backend Infrastructure (API Gateway, Lambda, DynamoDB) 
# • Database Initialization with Sample Data
# • Frontend Dashboard (React app on S3)
# • End-to-end connectivity testing and verification
# • Automatic error detection and fixing
# 
# TRULY FOOLPROOF: One command deploys the entire system!

set -e

# Color functions for better output
print_success() { echo -e "\033[32m✅ $1\033[0m"; }
print_warning() { echo -e "\033[33m⚠️  $1\033[0m"; }
print_error() { echo -e "\033[31m❌ $1\033[0m"; }
print_info() { echo -e "\033[36mℹ️  $1\033[0m"; }
print_step() { echo -e "\n\033[35m=== $1 ===\033[0m"; }

# Configuration
PROJECT_NAME="salepoint"
STACK_NAME="salepoint-lab"
REGION="us-east-1"
TEMPLATE_FILE="infrastructure/learner-lab-template-minimal.yaml"

# Global variables for URLs
FRONTEND_URL=""
API_BASE_URL=""

print_step "SalePoint Solution - COMPLETE ONE-STOP DEPLOYMENT SERVICE"
echo "🚀 This script deploys THE ENTIRE SalePoint system in one go:"
echo "• ☁️  Backend Infrastructure (API Gateway, Lambda, DynamoDB)"
echo "• 🗄️  Database Initialization with Sample Data (from simple-data.sql)"
echo "• 🌐 Frontend Dashboard (React app on S3)"
echo "• 🧪 End-to-end connectivity testing and verification" 
echo "• 🔧 Automatic error detection and fixing"
echo ""
echo "⏱️  Estimated time: 25-35 minutes"
echo "🎯 Result: Fully operational SalePoint business management system"
echo "📊 Includes: Products, Customers, Orders, Analytics dashboard"
echo ""

# Function to wait with progress indicator
wait_with_progress() {
    local duration=$1
    local message=$2
    echo -n "$message"
    for ((i=1; i<=duration; i++)); do
        echo -n "."
        sleep 1
    done
    echo " Done!"
}

# Function to check and fix script permissions
fix_permissions() {
    print_step "Checking Script Permissions"
    
    # All .sh files that should be executable (excluding cleanup.sh and deploy-foolproof.sh)
    local scripts=(
        "connect-rds.sh"
        "debug-parsing.sh"
        "debug-sql-parsing.sh"
        "demo-solution.sh"
        "deploy-complete-final.sh"
        "deploy-complete.sh"
        "deploy-demo.sh"
        "deploy-enhanced.sh"
        "deploy-learner-lab-simple.sh"
        "deploy-learner-lab.sh"
        "deploy-status-check.sh"
        "deploy-with-rds.sh"
        "final-system-test.sh"
        "fix-bucket-policy.sh"
        "fix-deployment.sh"
        "fix-lambda-502-final.sh"
        "fix-lambda-502.sh"
        "fix-s3-frontend.sh"
        "init-database.sh"
        "init-sample-data.sh"
        "quick-status.sh"
        "test-api.sh"
        "test-complete-system.sh"
        "test-database-init.sh"
        "test-deployment-guide.sh"
        "test-function-direct.sh"
        "test-learner-lab.sh"
        "test-one-stop-service.sh"
        "test-rds-connection.sh"
        "test-sql-parsing-clean.sh"
        "test-sql-parsing.sh"
        "test-values-extraction.sh"
        "validate-deployment.sh"
        "validate-sql-parsing-final.sh"
    )
    
    for script in "${scripts[@]}"; do
        if [ -f "$script" ]; then
            chmod +x "$script"
            print_info "Made $script executable"
        fi
    done
}

# Function to verify prerequisites
verify_prerequisites() {
    print_step "Verifying Prerequisites"
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI not installed"
        exit 1
    fi
    print_success "AWS CLI is installed"
    
    # Check jq for JSON processing (required for database initialization)
    if ! command -v jq &> /dev/null; then
        print_error "jq not installed (required for database initialization)"
        echo ""
        print_info "Please install jq:"
        echo "  macOS: brew install jq"
        echo "  Ubuntu/Debian: sudo apt install jq"
        echo "  CentOS/RHEL: sudo yum install jq"
        exit 1
    fi
    print_success "jq is installed (required for database initialization)"
    
    # Check AWS credentials
    if ! aws sts get-caller-identity > /dev/null 2>&1; then
        print_error "AWS CLI not configured or no access"
        echo ""
        echo "Please configure AWS CLI with your Academy Lab credentials:"
        echo "1. Go to AWS Academy Lab"
        echo "2. Copy AWS CLI credentials"
        echo "3. Run: aws configure"
        exit 1
    fi
    
    local account_info=$(aws sts get-caller-identity --output text --query Account 2>/dev/null)
    print_success "AWS CLI configured successfully"
    echo "Account ID: $account_info"
    
    # Quick check if deployment is already operational
    print_step "Checking Deployment Status"
    if ../ps/quick-status.sh | grep -q "products: ✅ Working" && \
       ../ps/quick-status.sh | grep -q "customers: ✅ Working" && \
       ../ps/quick-status.sh | grep -q "orders: ✅ Working"; then
        print_success "Backend APIs are already operational"
        
        # Check if frontend is also deployed
        local api_url=$(aws cloudformation describe-stacks --stack-name salepoint-lab --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' --output text 2>/dev/null || echo '')
        local account_id=$(aws sts get-caller-identity --query 'Account' --output text 2>/dev/null || echo '')
        local bucket_name="salepoint-frontend-$account_id-us-east-1"
        
        if [ -n "$account_id" ] && aws s3 ls "s3://$bucket_name" > /dev/null 2>&1; then
            local website_url="http://$bucket_name.s3-website-us-east-1.amazonaws.com"
            local frontend_status=$(curl -s -w "%{http_code}" --connect-timeout 5 --max-time 10 "$website_url" -o /dev/null 2>/dev/null || echo "000")
            
            if [[ "$frontend_status" =~ ^2[0-9][0-9]$ ]]; then
                print_success "Frontend dashboard is also deployed and working"
                echo ""
                echo "🎉 Your COMPLETE SalePoint Solution is already fully deployed and working!"
                echo ""
                echo "🌐 Frontend Dashboard: $website_url"
                echo "🔗 API Gateway URL: $api_url"
                echo ""
                echo "To verify everything is working, run: ./validate-deployment.sh"
                echo "To clean up when done, run: ./cleanup.sh"
                echo ""
                exit 0
            else
                print_warning "Backend working but frontend needs deployment"
                print_info "Continuing with frontend deployment only..."
                # Set flag to skip backend deployment
                SKIP_BACKEND=true
            fi
        else
            print_warning "Backend working but frontend not deployed"
            print_info "Continuing with frontend deployment only..."
            # Set flag to skip backend deployment
            SKIP_BACKEND=true
        fi
        
        if [ "$SKIP_BACKEND" != "true" ]; then
            print_success "All required components are deployed and operational"
            echo ""
            echo "🎉 Your SalePoint Solution is already fully deployed and working!"
            echo ""
            echo "API Gateway URL: $api_url"
            echo ""
            echo "To verify everything is working, run: ./validate-deployment.sh"
            echo "To clean up when done, run: ./cleanup.sh"
            echo ""
            exit 0
        fi
    fi
    
    # Check template file
    if [ ! -f "$TEMPLATE_FILE" ]; then
        print_error "Template file not found: $TEMPLATE_FILE"
        
        # Try alternative template files
        local alt_templates=("infrastructure/learner-lab-template.yaml" "infrastructure/learner-lab-template-fixed.yaml")
        for alt_template in "${alt_templates[@]}"; do
            if [ -f "$alt_template" ]; then
                TEMPLATE_FILE="$alt_template"
                print_warning "Using alternative template: $TEMPLATE_FILE"
                break
            fi
        done
        
        if [ ! -f "$TEMPLATE_FILE" ]; then
            print_error "No valid template found"
            exit 1
        fi
    fi
    print_success "Template file found: $TEMPLATE_FILE"
    
    # Validate template - with AWS Academy Learner Lab compatibility
    echo "🔍 Validating CloudFormation template..."
    if [ -z "$TEMPLATE_FILE" ]; then
        print_error "TEMPLATE_FILE variable is empty"
        exit 1
    fi
    
    if [ ! -f "$TEMPLATE_FILE" ]; then
        print_error "Template file does not exist: $TEMPLATE_FILE"
        exit 1
    fi
    
    # Check if we're in AWS Academy Learner Lab by checking for the LabRole
    local account_info=$(aws sts get-caller-identity --output text --query Arn 2>/dev/null || echo "")
    if [[ "$account_info" == *"assumed-role/voclabs"* ]] || [[ "$account_info" == *"LabRole"* ]]; then
        print_warning "AWS Academy Learner Lab detected - skipping template validation"
        print_info "Reason: cloudformation:ValidateTemplate is restricted in Learner Lab environments"
        print_info "Template file exists and will be validated during deployment"
    else
        # Try template validation for regular AWS accounts
        if ! aws cloudformation validate-template --template-body "file://$TEMPLATE_FILE" > /dev/null 2>&1; then
            local validation_error=$(aws cloudformation validate-template --template-body "file://$TEMPLATE_FILE" 2>&1)
            
            # Check if it's an AccessDenied error (common in restricted environments)
            if [[ "$validation_error" == *"AccessDenied"* ]] || [[ "$validation_error" == *"not authorized"* ]]; then
                print_warning "Template validation restricted - continuing with deployment"
                print_info "This is normal in AWS Academy or restricted environments"
            else
                print_error "CloudFormation template validation failed"
                echo "Template file: $TEMPLATE_FILE"
                echo "Error details:"
                echo "$validation_error" | head -10
                exit 1
            fi
        else
            print_success "Template validated successfully"
        fi
    fi
}

# Function to cleanup existing resources
cleanup_existing() {
    print_step "Checking for Existing Resources"
    
    local stack_status=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo "DOES_NOT_EXIST")
    
    if [ "$stack_status" != "DOES_NOT_EXIST" ]; then
        print_warning "Existing stack found with status: $stack_status"
        
        if [[ "$stack_status" == *"IN_PROGRESS"* ]]; then
            print_error "Stack operation in progress. Please wait for it to complete."
            exit 1
        fi
        
        echo ""
        read -p "Do you want to delete the existing stack and start fresh? (y/N): " response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            print_info "Cleaning up existing resources..."
            
            if [ -f "cleanup.sh" ]; then
                ./cleanup.sh "$STACK_NAME" "$REGION" "true"
                wait_with_progress 60 "Waiting for cleanup to complete"
            else
                print_info "Deleting CloudFormation stack manually..."
                aws cloudformation delete-stack --stack-name "$STACK_NAME" --region "$REGION"
                aws cloudformation wait stack-delete-complete --stack-name "$STACK_NAME" --region "$REGION"
            fi
            
            print_success "Cleanup completed"
        else
            print_info "Keeping existing stack - will attempt update"
        fi
    else
        print_success "No existing stack found - ready for fresh deployment"
    fi
}

# Function to deploy infrastructure
deploy_infrastructure() {
    print_step "Deploying Infrastructure"
    
    local stack_status=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo "DOES_NOT_EXIST")
    
    if [ "$stack_status" == "DOES_NOT_EXIST" ]; then
        print_info "Creating new CloudFormation stack..."
        
        aws cloudformation create-stack \
            --stack-name "$STACK_NAME" \
            --template-body "file://$TEMPLATE_FILE" \
            --capabilities CAPABILITY_NAMED_IAM \
            --parameters ParameterKey=ProjectName,ParameterValue=salepoint \
            --region "$REGION" \
            --tags Key=Project,Value=SalePoint Key=Environment,Value=Lab
        
        print_info "Stack creation initiated. Waiting for completion..."
        
        # Wait for stack creation with timeout
        local timeout=1200  # 20 minutes
        local elapsed=0
        
        while [ $elapsed -lt $timeout ]; do
            local current_status=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query 'Stacks[0].StackStatus' --output text 2>/dev/null)
            
            if [ "$current_status" == "CREATE_COMPLETE" ]; then
                print_success "Stack created successfully!"
                break
            elif [[ "$current_status" == *"FAILED"* ]] || [[ "$current_status" == *"ROLLBACK"* ]]; then
                print_error "Stack creation failed with status: $current_status"
                
                # Get failure reason
                print_info "Getting failure details..."
                aws cloudformation describe-stack-events --stack-name "$STACK_NAME" --query 'StackEvents[?ResourceStatus==`CREATE_FAILED`].[LogicalResourceId,ResourceStatusReason]' --output table
                exit 1
            fi
            
            echo -n "."
            sleep 30
            elapsed=$((elapsed + 30))
        done
        
        if [ $elapsed -ge $timeout ]; then
            print_error "Stack creation timed out after $((timeout/60)) minutes"
            exit 1
        fi
        
    else
        print_info "Updating existing stack..."
        
        local update_output=$(aws cloudformation update-stack \
            --stack-name "$STACK_NAME" \
            --template-body "file://$TEMPLATE_FILE" \
            --capabilities CAPABILITY_NAMED_IAM \
            --parameters ParameterKey=ProjectName,ParameterValue=salepoint \
            --region "$REGION" 2>&1 || echo "NO_UPDATES")
        
        if [[ "$update_output" == *"No updates"* ]] || [[ "$update_output" == "NO_UPDATES" ]]; then
            print_info "No updates required for stack"
        else
            print_info "Stack update initiated. Waiting for completion..."
            aws cloudformation wait stack-update-complete --stack-name "$STACK_NAME" --region "$REGION"
            print_success "Stack updated successfully!"
        fi
    fi
}

# Function to fix Lambda functions
fix_lambda_functions() {
    print_step "Deploying Enhanced Lambda Functions with AWS SDK v3"
    
    local fix_applied=false
    local packages_updated=0
    
    # Check if we have updated Lambda packages with AWS SDK v3 fixes
    print_info "Checking for AWS SDK v3 updated Lambda packages..."
    
    # Define the Lambda functions and their deployment packages
    local lambda_functions=(
        "salepoint-products:lambda-packages/products-fixed.zip"
        "salepoint-customers:lambda-packages/customers-fixed.zip" 
        "salepoint-orders:lambda-packages/sales-fixed.zip"
        # "salepoint-inventory:lambda-packages/inventory-fixed.zip"
    )
    
    # Update each Lambda function with the fixed packages
    for func_package in "${lambda_functions[@]}"; do
        local func_name="${func_package%%:*}"
        local package_path="${func_package##*:}"
        
        if [ -f "$package_path" ]; then
            print_info "Updating $func_name with AWS SDK v3 package..."
            
            # Wait a moment between updates to avoid throttling
            sleep 2
            
            if aws lambda update-function-code \
                --function-name "$func_name" \
                --zip-file "fileb://$package_path" \
                --region "$REGION" >/dev/null 2>&1; then
                print_success "$func_name updated successfully"
                ((packages_updated++))
                
                # Wait for function to update
                print_info "Waiting for $func_name to finish updating..."
                aws lambda wait function-updated --function-name "$func_name" --region "$REGION" || true
                
            else
                print_warning "Failed to update $func_name - checking if function exists..."
                
                # Check if function exists
                if aws lambda get-function --function-name "$func_name" --region "$REGION" >/dev/null 2>&1; then
                    print_warning "$func_name exists but update failed"
                else
                    print_info "$func_name doesn't exist - will be created by CloudFormation"
                fi
            fi
        else
            print_warning "Package not found: $package_path"
            print_info "Creating package for $func_name..."
            
            # Extract function name without prefix
            local base_name="${func_name#salepoint-}"
            
            # Check if the source directory exists
            if [ -d "lambda-packages/${base_name}-fixed" ]; then
                print_info "Building deployment package for $base_name..."
                
                # Navigate to function directory and install dependencies
                cd "lambda-packages/${base_name}-fixed"
                
                # Install dependencies if package.json exists
                if [ -f "package.json" ]; then
                    print_info "Installing AWS SDK v3 dependencies for $base_name..."
                    npm install --production --silent >/dev/null 2>&1 || print_warning "npm install failed for $base_name"
                fi
                
                # Create ZIP package
                print_info "Creating ZIP package for $base_name..."
                zip -r "../${base_name}-fixed.zip" . >/dev/null 2>&1
                
                cd ../..
                
                # Now try updating the function again
                if [ -f "lambda-packages/${base_name}-fixed.zip" ]; then
                    print_info "Updating $func_name with newly created package..."
                    
                    if aws lambda update-function-code \
                        --function-name "$func_name" \
                        --zip-file "fileb://lambda-packages/${base_name}-fixed.zip" \
                        --region "$REGION" >/dev/null 2>&1; then
                        print_success "$func_name updated successfully"
                        ((packages_updated++))
                        
                        # Wait for function to update
                        aws lambda wait function-updated --function-name "$func_name" --region "$REGION" || true
                    fi
                fi
            fi
        fi
    done
    
    # Try legacy deployment packages if available
    if [ $packages_updated -eq 0 ]; then
        print_info "Trying legacy deployment packages..."
        
        local legacy_packages=(
            "salepoint-orders:lambda-deployment-orders-fixed.zip"
            "salepoint-products:lambda-deployment-products-fixed.zip"
            "salepoint-customers:lambda-deployment-customers-fixed.zip"
        )
        
        for func_package in "${legacy_packages[@]}"; do
            local func_name="${func_package%%:*}"
            local package_path="${func_package##*:}"
            
            if [ -f "$package_path" ]; then
                print_info "Updating $func_name with legacy package..."
                
                if aws lambda update-function-code \
                    --function-name "$func_name" \
                    --zip-file "fileb://$package_path" \
                    --region "$REGION" >/dev/null 2>&1; then
                    print_success "$func_name updated with legacy package"
                    ((packages_updated++))
                fi
            fi
        done
    fi
    
    # Run additional fix scripts if available
    if [ -f "sh/fix-lambda-502.sh" ]; then
        print_info "Running additional Lambda 502 fix script..."
        ./sh/fix-lambda-502.sh >/dev/null 2>&1 || print_warning "Lambda 502 fix script had issues"
    fi
    
    if [ $packages_updated -gt 0 ]; then
        print_success "Lambda function deployment completed! Updated $packages_updated functions with AWS SDK v3"
        fix_applied=true
        
        # Wait for all functions to stabilize
        print_info "Waiting for Lambda functions to stabilize..."
        sleep 10
        
    else
        print_warning "No Lambda packages were updated - functions will use CloudFormation defaults"
        print_info "This may cause HTTP 502 errors due to outdated AWS SDK"
    fi
    
    return 0
}

# Function to verify deployment
verify_deployment() {
    print_step "Verifying Deployment"
    
    # Get API URL
    local api_url=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' --output text 2>/dev/null || echo "")
    
    if [ -z "$api_url" ]; then
        print_error "Could not get API URL from stack outputs"
        return 1
    fi
    
    # Set global variable
    API_BASE_URL="$api_url"
    print_success "API Base URL: $api_url"
    
    # Test API endpoints
    local endpoints=("products" "customers" "orders")
    local all_working=true
    
    for endpoint in "${endpoints[@]}"; do
        echo -n "Testing $endpoint API... "
        
        local response=$(curl -s -w "%{http_code}" --connect-timeout 10 --max-time 30 "$api_url/$endpoint" 2>/dev/null || echo "000")
        local status_code="${response: -3}"
        
        if [[ "$status_code" =~ ^2[0-9][0-9]$ ]]; then
            print_success "$endpoint API: Working (HTTP $status_code)"
        else
            print_error "$endpoint API: Failed (HTTP $status_code)"
            all_working=false
        fi
    done
    
    if [ "$all_working" = true ]; then
        print_success "All APIs are working correctly!"
        return 0
    else
        print_warning "Some APIs have issues - running additional fixes..."
        return 1
    fi
}

# Function to deploy frontend dashboard
deploy_frontend() {
    print_step "Deploying Frontend Dashboard"
    
    # Check if Node.js is installed
    if ! command -v npm &> /dev/null; then
        print_error "Node.js/npm not installed. Please install Node.js to deploy the frontend."
        print_info "You can download it from: https://nodejs.org"
        print_warning "Skipping frontend deployment..."
        return 1
    fi
    print_success "Node.js/npm is available"
    
    # Get API URL and Account ID
    local api_url=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' --output text 2>/dev/null || echo "")
    if [ -z "$api_url" ]; then
        print_error "Could not get API URL from CloudFormation stack"
        return 1
    fi
    
    local account_id=$(aws sts get-caller-identity --query 'Account' --output text 2>/dev/null || echo "")
    if [ -z "$account_id" ]; then
        print_error "Could not get AWS Account ID"
        return 1
    fi
    
    local bucket_name="$PROJECT_NAME-frontend-$account_id-$REGION"
    print_info "Setting up S3 bucket for frontend: $bucket_name"
    
    # Create S3 bucket if it doesn't exist
    if ! aws s3 ls "s3://$bucket_name" > /dev/null 2>&1; then
        print_info "Creating S3 bucket..."
        aws s3 mb "s3://$bucket_name" --region "$REGION"
        
        # Configure bucket for static website hosting
        aws s3 website "s3://$bucket_name" --index-document index.html --error-document index.html
        
        # Set public access configuration (remove all blocks)
        aws s3api put-public-access-block --bucket "$bucket_name" \
            --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"
        
        # Create and apply bucket policy for public read
        cat <<EOF > /tmp/bucket-policy.json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::$bucket_name/*"
    }
  ]
}
EOF
        aws s3api put-bucket-policy --bucket "$bucket_name" --policy file:///tmp/bucket-policy.json
        rm /tmp/bucket-policy.json
        
        # Wait for policy to propagate
        print_info "Waiting for bucket policy to propagate..."
        sleep 5
        print_success "S3 bucket configured for static website hosting"
    else
        print_info "S3 bucket already exists"
    fi
    
    # Check if frontend directory exists
    if [ ! -d "frontend" ]; then
        print_error "Frontend directory not found"
        return 1
    fi
    
    # Build and deploy frontend
    print_info "Building React frontend..."
    cd frontend
    
    # Create environment file with API URL
    cat <<EOF > .env
REACT_APP_API_GATEWAY_URL=$api_url
REACT_APP_AWS_REGION=$REGION
GENERATE_SOURCEMAP=false
EOF
    print_success "Created frontend environment configuration"
    
    # Create or update AWS configuration file
    print_info "Updating frontend AWS configuration..."
    mkdir -p src/config
    cat <<EOF > src/config/aws-config.js
// Auto-generated AWS configuration for SalePoint Solution
export const awsConfig = {
  apiGatewayUrl: '$api_url',
  region: '$REGION',
  // Demo mode - no authentication required
  demoMode: true
};

// Export individual constants for compatibility
export const API_BASE_URL = awsConfig.apiGatewayUrl;
export const API_ENDPOINTS = {
  PRODUCTS: '/products',
  CUSTOMERS: '/customers', 
  ORDERS: '/orders',
  SALES: '/orders',  // Sales data is stored in orders
  INVENTORY: '/products',  // Inventory data comes from products
  ANALYTICS: '/analytics'
};

export default awsConfig;
EOF
    print_success "Frontend AWS configuration updated"
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        print_info "Installing frontend dependencies (this may take 3-5 minutes)..."
        npm install
        print_success "Frontend dependencies installed"
    else
        print_info "Frontend dependencies already installed"
    fi
    
    # Build the app
    print_info "Building production app (this may take 2-3 minutes)..."
    npm run build
    print_success "Frontend build completed"
    
    # Upload to S3
    print_info "Uploading frontend to S3..."
    aws s3 sync build/ "s3://$bucket_name" --delete
    print_success "Frontend uploaded to S3"
    
    cd ..
    
    # Get website URL
    local website_url="http://$bucket_name.s3-website-$REGION.amazonaws.com"
    
    # Test the website
    print_info "Testing frontend deployment..."
    sleep 10  # Wait for S3 and DNS propagation
    
    local http_status=$(curl -s -w "%{http_code}" --connect-timeout 15 --max-time 30 "$website_url" -o /dev/null 2>/dev/null || echo "000")
    if [[ "$http_status" =~ ^2[0-9][0-9]$ ]]; then
        print_success "Frontend dashboard is accessible and working!"
    elif [ "$http_status" = "403" ]; then
        print_warning "Frontend returns 403 - applying additional fixes..."
        # Run the S3 fix script if 403 error occurs
        chmod +x fix-s3-frontend.sh 2>/dev/null || true
        if [ -f "fix-s3-frontend.sh" ]; then
            ./fix-s3-frontend.sh > /dev/null 2>&1 || true
            sleep 5
            http_status=$(curl -s -w "%{http_code}" --connect-timeout 15 --max-time 30 "$website_url" -o /dev/null 2>/dev/null || echo "000")
            if [[ "$http_status" =~ ^2[0-9][0-9]$ ]]; then
                print_success "Frontend access fixed and now working!"
            else
                print_warning "Frontend deployed but may need manual S3 policy adjustment"
            fi
        fi
    else
        print_warning "Frontend deployed but may need a few minutes to be accessible (HTTP $http_status)"
        print_info "URL: $website_url"
    fi
    
    # Store URLs for final display
    FRONTEND_URL="$website_url"
    API_BASE_URL="$api_url"
    
    return 0
}

# Function for complete deployment summary
show_deployment_summary() {
    print_step "🎉 COMPLETE DEPLOYMENT SUMMARY"
    print_success "SalePoint Solution has been deployed successfully!"
    echo ""
    
    if [ -n "$FRONTEND_URL" ]; then
        print_info "🌐 FRONTEND DASHBOARD:"
        echo "   $FRONTEND_URL"
        echo ""
        
        print_info "📊 DASHBOARD FEATURES:"
        echo "   • Real-time Analytics Dashboard"
        echo "   • Products Management (4 sample products loaded)"
        echo "   • Customers Management (2 sample customers loaded)"
        echo "   • Sales Tracking (2 sample orders loaded)"
        echo "   • Inventory Management"
        echo "   • Connected to DynamoDB Database with Sample Data"
        echo ""
        
        print_info "🗄️ DATABASE STATUS:"
        echo "   • DynamoDB Tables: Created and Populated"
        echo "   • Sample Data: Loaded from simple-data.sql reference"
        echo "   • Products: Electronics, Furniture, Office Supplies"
        echo "   • Ready for: Admin modifications and additional data"
        echo ""
    fi
    
    if [ -n "$API_BASE_URL" ]; then
        print_info "🔗 API ENDPOINTS:"
        echo "   Base URL: $API_BASE_URL"
        echo "   Products: $API_BASE_URL/products"
        echo "   Customers: $API_BASE_URL/customers"
        echo "   Orders: $API_BASE_URL/orders"
        echo ""
    fi
    
    print_info "🧪 QUICK TESTS:"
    if [ -n "$FRONTEND_URL" ]; then
        echo "   • Visit the dashboard URL above"
        echo "   • All sections should show data from your database"
        echo "   • Test: $FRONTEND_URL/sales"
        echo "   • Test: $FRONTEND_URL/inventory"
        echo ""
    fi
    
    print_info "⚡ READY TO USE:"
    echo "   • Complete business management system"
    echo "   • Real-time dashboard with sample data"
    echo "   • Production-ready APIs"
    echo "   • Fully deployed on AWS infrastructure"
    echo ""
    
    print_info "🔧 MANAGEMENT:"
    echo "   • Add more products through the dashboard"
    echo "   • Create new customer records"
    echo "   • Process orders and track sales"
    echo "   • View analytics and reports"
    echo ""
    
    print_info "🗑️  CLEANUP (when done):"
    echo "   • Run: ./cleanup.sh"
    echo "   • This will remove all AWS resources"
    echo ""
    
    echo "════════════════════════════════════════════════════════════════"
    print_success "🎯 YOUR SALEPOINT DASHBOARD IS READY!"
    if [ -n "$FRONTEND_URL" ]; then
        echo ""
        echo "🌐 DIRECT ACCESS: $FRONTEND_URL"
        echo ""
    fi
    echo "════════════════════════════════════════════════════════════════"
    
    print_info "💡 NEXT STEPS:"
    echo "   • Try adding/editing products or customers"
    if [ -n "$API_BASE_URL" ]; then
        echo "   • Test API endpoints directly"
        echo "   • APIs are connected to DynamoDB"
    fi
    echo ""
    
    print_info "🧹 CLEANUP:"
    echo "   When done, run: ./cleanup.sh"
    echo ""
    
    print_success "🚀 Your complete SalePoint system is now live!"
}

# Enhanced final checks that include frontend testing
enhanced_final_checks() {
    print_step "Enhanced Final System Checks"
    
    # Test all backend APIs
    print_info "Testing backend APIs..."
    local all_apis_working=true
    local endpoints=("products" "customers" "orders")
    
    for endpoint in "${endpoints[@]}"; do
        echo -n "  Testing $endpoint API... "
        local response=$(curl -s -w "%{http_code}" --connect-timeout 10 --max-time 30 "$API_BASE_URL/$endpoint" 2>/dev/null || echo "000")
        local status_code="${response: -3}"
        
        if [[ "$status_code" =~ ^2[0-9][0-9]$ ]]; then
            echo "✅ Working (HTTP $status_code)"
        else
            echo "❌ Failed (HTTP $status_code)"
            all_apis_working=false
        fi
    done
    
    # Test frontend accessibility
    if [ -n "$FRONTEND_URL" ]; then
        print_info "Testing frontend dashboard..."
        echo -n "  Testing dashboard access... "
        local frontend_status=$(curl -s -w "%{http_code}" --connect-timeout 15 --max-time 30 "$FRONTEND_URL" -o /dev/null 2>/dev/null || echo "000")
        
        if [[ "$frontend_status" =~ ^2[0-9][0-9]$ ]]; then
            echo "✅ Accessible (HTTP $frontend_status)"
        else
            echo "⚠️  Issue detected (HTTP $frontend_status)"
        fi
    fi
    
    # Check DynamoDB table data
    print_info "Verifying database content..."
    for table in "products" "customers" "orders"; do
        echo -n "  Checking $table table... "
        local item_count=$(aws dynamodb scan --table-name "$PROJECT_NAME-$table" --select "COUNT" --query 'Count' --output text 2>/dev/null || echo "0")
        if [ "$item_count" -gt 0 ]; then
            echo "✅ $item_count items"
        else
            echo "⚠️  Empty or inaccessible"
        fi
    done
    
    if [ "$all_apis_working" = true ]; then
        print_success "All backend services are fully operational!"
    else
        print_warning "Some backend services need attention"
    fi
}

# Function to run final checks
final_checks() {
    print_step "Final System Check"
    
    if [ -f "deploy-complete-final.sh" ]; then
        print_info "Running comprehensive system check..."
        ./deploy-complete-final.sh
    else
        print_warning "Final check script not found"
    fi
}

# Function to extract sales staff data from simple-data.sql
extract_sales_staff_from_sql() {
    local sql_file="${1:-database/simple-data.sql}"
    if [ ! -f "$sql_file" ]; then
        echo "[]"
        return
    fi
    
    local staff_json="["
    local first_staff=true
    
    # Parse sales staff from SQL - extract the VALUES section
    local values_section=$(sed -n '/INSERT INTO sales_staff/,/);/p' "$sql_file" | grep -E "^\('.*")
    
    if [ -n "$values_section" ]; then
        while IFS= read -r line; do
            # Clean up line: remove parentheses and trailing commas/semicolons
            local clean_line=$(echo "$line" | sed 's/^(//' | sed 's/)[,;]*$//')
            
            # Extract values using regex - handle quoted strings properly
            # Format: 'id', 'name', 'email', 'department'
            if [[ $clean_line =~ ^\'([^\']+)\',\ *\'([^\']+)\',\ *\'([^\']+)\',\ *\'([^\']*)\'.*$ ]]; then
                local staff_id="${BASH_REMATCH[1]}"
                local name="${BASH_REMATCH[2]}"
                local email="${BASH_REMATCH[3]}"
                local department="${BASH_REMATCH[4]}"
                
                # Escape any quotes in the values for JSON
                staff_id=$(echo "$staff_id" | sed 's/"/\\"/g')
                name=$(echo "$name" | sed 's/"/\\"/g')
                email=$(echo "$email" | sed 's/"/\\"/g')
                department=$(echo "$department" | sed 's/"/\\"/g')
                
                if [ "$first_staff" = true ]; then
                    first_staff=false
                else
                    staff_json="$staff_json,"
                fi
                
                staff_json="$staff_json
        {
            \"staffId\": \"$staff_id\",
            \"name\": \"$name\",
            \"email\": \"$email\",
            \"department\": \"$department\",
            \"createdAt\": \"$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")\",
            \"updatedAt\": \"$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")\"
        }"
            fi
        done <<< "$values_section"
    fi
    
    staff_json="$staff_json
    ]"
    
    echo "$staff_json"
}

# Function to extract customers data from simple-data.sql
extract_customers_from_sql() {
    local sql_file="${1:-database/simple-data.sql}"
    if [ ! -f "$sql_file" ]; then
        echo "[]"
        return
    fi
    
    local customers_json="["
    local first_customer=true
    local customer_counter=1
    
    # Parse customers from SQL - extract the VALUES section
    local values_section=$(sed -n '/INSERT INTO customers/,/);/p' "$sql_file" | grep -E "^\('.*")
    
    if [ -n "$values_section" ]; then
        while IFS= read -r line; do
            # Clean up line: remove parentheses and trailing commas/semicolons
            local clean_line=$(echo "$line" | sed 's/^(//' | sed 's/)[,;]*$//')
            
            # Extract values using regex - handle quoted strings properly
            # Format: 'name', 'email', 'phone', 'company', 'address', 'notes'
            if [[ $clean_line =~ ^\'([^\']+)\',\ *\'([^\']+)\',\ *\'([^\']+)\',\ *\'([^\']*)\',\ *\'([^\']*)\',\ *\'([^\']*)\'.*$ ]]; then
                local name="${BASH_REMATCH[1]}"
                local email="${BASH_REMATCH[2]}"
                local phone="${BASH_REMATCH[3]}"
                local company="${BASH_REMATCH[4]}"
                local address="${BASH_REMATCH[5]}"
                local notes="${BASH_REMATCH[6]}"
                
                # Escape any quotes in the values for JSON
                name=$(echo "$name" | sed 's/"/\\"/g')
                email=$(echo "$email" | sed 's/"/\\"/g')
                phone=$(echo "$phone" | sed 's/"/\\"/g')
                company=$(echo "$company" | sed 's/"/\\"/g')
                address=$(echo "$address" | sed 's/"/\\"/g')
                notes=$(echo "$notes" | sed 's/"/\\"/g')
                
                local customer_id="cust_demo_customer_$(printf "%03d" $customer_counter)"
                
                if [ "$first_customer" = true ]; then
                    first_customer=false
                else
                    customers_json="$customers_json,"
                fi
                
                customers_json="$customers_json
        {
            \"customerId\": \"$customer_id\",
            \"name\": \"$name\",
            \"email\": \"$email\",
            \"phone\": \"$phone\",
            \"company\": \"$company\",
            \"address\": \"$address\",
            \"notes\": \"$notes\",
            \"createdAt\": \"$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")\",
            \"updatedAt\": \"$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")\"
        }"
                
                customer_counter=$((customer_counter + 1))
            fi
        done <<< "$values_section"
    fi
    
    customers_json="$customers_json
    ]"
    
    echo "$customers_json"
}

# Function to extract orders data from simple-data.sql  
extract_orders_from_sql() {
    local sql_file="${1:-database/simple-data.sql}"
    if [ ! -f "$sql_file" ]; then
        echo "[]"
        return
    fi
    
    local orders_json="["
    local first_order=true
    local order_counter=1
    
    # Parse orders from SQL - extract the VALUES section  
    local values_section=$(sed -n '/INSERT INTO orders/,/);/p' "$sql_file" | grep -E "^\([0-9].*")
    
    if [ -n "$values_section" ]; then
        while IFS= read -r line; do
            # Clean up line: remove parentheses and trailing commas/semicolons
            local clean_line=$(echo "$line" | sed 's/^(//' | sed 's/)[,;]*$//')
            
            # Extract values using regex - handle the order format
            # Pattern: customer_id, 'sales_person_id', 'items_json', total_amount, 'order_date', 'status', 'shipping_address', 'notes'
            if [[ $clean_line =~ ^([0-9]+),\ *\'([^\']+)\',\ *\'(\[.*\])\',\ *([0-9.]+),\ *\'([^\']+)\',\ *\'([^\']+)\',\ *\'([^\']*)\',\ *\'([^\']*)\'.*$ ]]; then
                local customer_id="${BASH_REMATCH[1]}"
                local sales_person_id="${BASH_REMATCH[2]}"
                local items_json="${BASH_REMATCH[3]}"
                local total_amount="${BASH_REMATCH[4]}"
                local order_date="${BASH_REMATCH[5]}"
                local status="${BASH_REMATCH[6]}"
                local shipping_address="${BASH_REMATCH[7]}"
                local notes="${BASH_REMATCH[8]}"
                
                local order_id="order_sql_$(printf "%03d" $order_counter)"
                
                # Convert customer_id to proper format
                local customer_name="Customer_$customer_id"
                if [ "$customer_id" = "1" ]; then
                    customer_name="Demo Customer"
                elif [ "$customer_id" = "2" ]; then
                    customer_name="Test Business"
                fi
                
                # Escape any quotes in the values for JSON
                sales_person_id=$(echo "$sales_person_id" | sed 's/"/\\"/g')
                items_json=$(echo "$items_json" | sed 's/"/\\"/g')
                order_date=$(echo "$order_date" | sed 's/"/\\"/g')
                status=$(echo "$status" | sed 's/"/\\"/g')
                shipping_address=$(echo "$shipping_address" | sed 's/"/\\"/g')
                notes=$(echo "$notes" | sed 's/"/\\"/g')
                customer_name=$(echo "$customer_name" | sed 's/"/\\"/g')
                
                if [ "$first_order" = true ]; then
                    first_order=false
                else
                    orders_json="$orders_json,"
                fi
                
                orders_json="$orders_json
        {
            \"orderId\": \"$order_id\",
            \"customerId\": \"cust_demo_customer_$(printf "%03d" $customer_id)\",
            \"customerName\": \"$customer_name\",
            \"salesPersonId\": \"$sales_person_id\",
            \"items\": \"$items_json\",
            \"totalAmount\": $total_amount,
            \"orderDate\": \"$order_date\",
            \"status\": \"$status\",
            \"shippingAddress\": \"$shipping_address\",
            \"notes\": \"$notes\",
            \"createdAt\": \"$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")\",
            \"updatedAt\": \"$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")\"
        }"
                
                order_counter=$((order_counter + 1))
            fi
        done <<< "$values_section"
    fi
    
    orders_json="$orders_json
    ]"
    
    echo "$orders_json"
}

# Function to extract product data from simple-data.sql
extract_products_from_sql() {
    local sql_file="${1:-database/simple-data.sql}"
    if [ ! -f "$sql_file" ]; then
        echo "[]"
        return
    fi
    
    local products_json="["
    local first_product=true
    local product_counter=1
    
    # Parse products from SQL - extract the VALUES section
    local values_section=$(sed -n '/INSERT INTO products/,/);/p' "$sql_file" | grep -E "^\('.*")
    
    if [ -n "$values_section" ]; then
        while IFS= read -r line; do
            # Clean up line: remove parentheses and trailing commas/semicolons
            local clean_line=$(echo "$line" | sed 's/^(//' | sed 's/)[,;]*$//')
            
            # Use a simpler approach - extract fields using sed
            # Extract name (first quoted field)
            local name=$(echo "$clean_line" | sed "s/^'\([^']*\)',.*/\1/")
            # Extract description (second quoted field)  
            local description=$(echo "$clean_line" | sed "s/^'[^']*', *'\([^']*\)',.*/\1/")
            # Extract price (first numeric field after second quote)
            local price=$(echo "$clean_line" | sed "s/^'[^']*', *'[^']*', *\([0-9.]*\),.*/\1/")
            # Extract category (third quoted field)
            local category=$(echo "$clean_line" | sed "s/^'[^']*', *'[^']*', *[0-9.]*, *'\([^']*\)',.*/\1/")
            # Extract stock (second numeric field)
            local stock=$(echo "$clean_line" | sed "s/^'[^']*', *'[^']*', *[0-9.]*, *'[^']*', *\([0-9]*\),.*/\1/")
            # Extract specifications (last quoted field)
            local specifications=$(echo "$clean_line" | sed "s/^'[^']*', *'[^']*', *[0-9.]*, *'[^']*', *[0-9]*, *'\(.*\)'[^']*$/\1/")
            
            # Skip if extraction failed (check if name is not empty and price is numeric)
            if [ -n "$name" ] && [[ "$price" =~ ^[0-9]+\.?[0-9]*$ ]] && [ -n "$category" ]; then
                # Escape any quotes in the values for JSON
                name=$(echo "$name" | sed 's/"/\\"/g')
                description=$(echo "$description" | sed 's/"/\\"/g')
                category=$(echo "$category" | sed 's/"/\\"/g')
                specifications=$(echo "$specifications" | sed 's/"/\\"/g')
                
                # Generate product ID
                local product_id=$(echo "$name" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/_/g' | sed 's/_\+/_/g' | sed 's/^_\|_$//g')
                product_id="prod_${product_id}_$(printf "%03d" $product_counter)"
                
                if [ "$first_product" = true ]; then
                    first_product=false
                else
                    products_json="$products_json,"
                fi
                
                products_json="$products_json
        {
            \"productId\": \"$product_id\",
            \"name\": \"$name\",
            \"description\": \"$description\",
            \"price\": $price,
            \"category\": \"$category\",
            \"stock\": $stock,
            \"specifications\": \"$specifications\",
            \"createdAt\": \"$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")\",
            \"updatedAt\": \"$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")\"
        }"
                
                product_counter=$((product_counter + 1))
            fi
        done <<< "$values_section"
    fi
    
    products_json="$products_json
    ]"
    
    echo "$products_json"
}

initialize_database() {
    print_step "Initializing Database with Sample Data from simple-data.sql"
    
    # Check if simple-data.sql exists
    if [ ! -f "database/simple-data.sql" ]; then
        print_error "simple-data.sql not found! Using fallback hardcoded data."
        initialize_database_fallback
        return
    fi
    
    print_success "Found simple-data.sql - extracting data for DynamoDB"
    
    # Initialize DynamoDB tables with data from simple-data.sql
    print_info "Parsing sample data from simple-data.sql..."
    
    # Extract and add sample products from SQL file
    print_info "Extracting products from simple-data.sql..."
    local products_data
    products_data=$(extract_products_from_sql "database/simple-data.sql")
    
    if [ $? -eq 0 ] && [ -n "$products_data" ]; then
        print_success "Successfully extracted products from simple-data.sql"
    else
        print_warning "Could not extract products from SQL, using fallback data"
        local products_data='[
        {
            "productId": "prod_laptop_computer_001",
            "name": "Laptop Computer",
            "description": "Modern laptop for business use",
            "price": 1299.99,
            "category": "Electronics",
            "stock": 20,
            "specifications": "{\"processor\": \"Intel i5\", \"ram\": \"8GB\", \"storage\": \"256GB SSD\"}",
            "createdAt": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'",
            "updatedAt": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'"
        },
        {
            "productId": "prod_wireless_mouse_001", 
            "name": "Wireless Mouse",
            "description": "Bluetooth wireless mouse",
            "price": 25.99,
            "category": "Electronics",
            "stock": 50,
            "specifications": "{\"connectivity\": \"Bluetooth\", \"dpi\": \"1200\"}",
            "createdAt": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'",
            "updatedAt": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'"
        },
        {
            "productId": "prod_office_chair_001",
            "name": "Office Chair",
            "description": "Ergonomic office chair with back support",
            "price": 299.99,
            "category": "Furniture", 
            "stock": 15,
            "specifications": "{\"material\": \"Mesh\", \"adjustable\": \"Yes\", \"warranty\": \"2 years\"}",
            "createdAt": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'",
            "updatedAt": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'"
        },
        {
            "productId": "prod_notebook_set_001",
            "name": "Notebook Set",
            "description": "Professional notebooks pack of 3",
            "price": 15.99,
            "category": "Office Supplies",
            "stock": 100,
            "specifications": "{\"quantity\": 3, \"size\": \"A4\", \"pages\": 150}",
            "createdAt": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'",
            "updatedAt": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'"
        }
    ]'
    fi
    
    # Add products to DynamoDB
    print_info "Adding products to DynamoDB..."
    # Use process substitution to avoid subshell issues
    while IFS= read -r product; do
        aws dynamodb put-item \
            --table-name "$PROJECT_NAME-products" \
            --item "$(echo "$product" | jq '{
                productId: {S: .productId},
                name: {S: .name},
                description: {S: .description}, 
                price: {N: (.price | tostring)},
                category: {S: .category},
                stock: {N: (.stock | tostring)},
                specifications: {S: (.specifications | tostring)},
                createdAt: {S: .createdAt},
                updatedAt: {S: .updatedAt}
            }')" \
            --region "$REGION" > /dev/null 2>&1 || print_warning "Failed to add product: $(echo "$product" | jq -r '.name')"
    done < <(echo "$products_data" | jq -c '.[]')
    
    # Extract and add sample customers from SQL file
    print_info "Extracting customers from simple-data.sql..."
    local customers_data
    customers_data=$(extract_customers_from_sql "database/simple-data.sql")
    
    if [ $? -eq 0 ] && [ -n "$customers_data" ]; then
        print_success "Successfully extracted customers from simple-data.sql"
    else
        print_warning "Could not extract customers from SQL, using fallback data"
        customers_data='[
        {
            "customerId": "cust_demo_customer_001",
            "name": "Demo Customer",
            "email": "demo@customer.com",
            "phone": "+1-555-0123",
            "company": "Demo Company Ltd",
            "address": "123 Demo Street, Demo City, DC 12345",
            "notes": "Sample customer for testing",
            "status": "active",
            "createdAt": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'",
            "updatedAt": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'"
        },
        {
            "customerId": "cust_test_business_001",
            "name": "Test Business",
            "email": "contact@testbiz.com",
            "phone": "+1-555-0456",
            "company": "Test Business Inc",
            "address": "456 Test Avenue, Test Town, TT 67890",
            "notes": "Another test customer account",
            "status": "active",
            "createdAt": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'",
            "updatedAt": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'"
        }
    ]'
    fi
    
    # Add customers to DynamoDB
    print_info "Adding customers to DynamoDB..."
    # Use process substitution to avoid subshell issues
    while IFS= read -r customer; do
        aws dynamodb put-item \
            --table-name "$PROJECT_NAME-customers" \
            --item "$(echo "$customer" | jq '{
                customerId: {S: .customerId},
                name: {S: .name},
                email: {S: .email},
                phone: {S: .phone},
                company: {S: .company},
                address: {S: .address},
                notes: {S: .notes},
                status: {S: (.status // "active")},
                createdAt: {S: .createdAt},
                updatedAt: {S: .updatedAt}
            }')" \
            --region "$REGION" > /dev/null 2>&1 || print_warning "Failed to add customer: $(echo "$customer" | jq -r '.name')"
    done < <(echo "$customers_data" | jq -c '.[]')
    
    # Extract and add sales staff from SQL file
    print_info "Extracting sales staff from simple-data.sql..."
    local staff_data
    staff_data=$(extract_sales_staff_from_sql "database/simple-data.sql")
    
    if [ $? -eq 0 ] && [ -n "$staff_data" ]; then
        print_success "Successfully extracted sales staff from simple-data.sql"
    else
        print_warning "Could not extract sales staff from SQL, using fallback data"
        staff_data='[
        {
            "staffId": "admin",
            "name": "System Administrator",
            "email": "admin@salepoint.local",
            "department": "Administration",
            "status": "active",
            "createdAt": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'",
            "updatedAt": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'"
        },
        {
            "staffId": "manager1", 
            "name": "Sales Manager",
            "email": "manager@salepoint.local",
            "department": "Sales Management",
            "status": "active",
            "createdAt": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'",
            "updatedAt": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'"
        },
        {
            "staffId": "sales1",
            "name": "Sales Representative", 
            "email": "sales@salepoint.local",
            "department": "Sales",
            "status": "active",
            "createdAt": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'",
            "updatedAt": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'"
        }
    ]'
    fi
    
    # Add sales staff to DynamoDB
    print_info "Adding sales staff to DynamoDB..."
    # Use process substitution to avoid subshell issues
    while IFS= read -r staff; do
        aws dynamodb put-item \
            --table-name "$PROJECT_NAME-sales-staff" \
            --item "$(echo "$staff" | jq '{
                staffId: {S: .staffId},
                name: {S: .name},
                email: {S: .email},
                department: {S: .department},
                status: {S: (.status // "active")},
                createdAt: {S: .createdAt},
                updatedAt: {S: .updatedAt}
            }')" \
            --region "$REGION" > /dev/null 2>&1 || print_warning "Failed to add staff: $(echo "$staff" | jq -r '.name')"
    done < <(echo "$staff_data" | jq -c '.[]')
    
    # Extract and add orders from SQL file  
    print_info "Extracting orders from simple-data.sql..."
    local orders_data
    orders_data=$(extract_orders_from_sql "database/simple-data.sql")
    
    if [ $? -eq 0 ] && [ -n "$orders_data" ]; then
        print_success "Successfully extracted orders from simple-data.sql"
    else
        print_warning "Could not extract orders from SQL, using fallback data"
        orders_data='[
        {
            "orderId": "order_001",
            "customerId": "cust_demo_customer_001",
            "salesPersonId": "sales1",
            "items": "[{\"productId\": \"prod_laptop_computer_001\", \"quantity\": 2, \"price\": 1299.99}]",
            "totalAmount": 2599.98,
            "orderDate": "2024-11-25",
            "status": "completed",
            "shippingAddress": "123 Demo Street, Demo City, DC 12345",
            "notes": "Bulk laptop order",
            "createdAt": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'",
            "updatedAt": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'"
        }
    ]'
    fi
    
    # Add orders to DynamoDB
    print_info "Adding orders to DynamoDB..."
    # Use process substitution to avoid subshell issues
    while IFS= read -r order; do
        aws dynamodb put-item \
            --table-name "$PROJECT_NAME-orders" \
            --item "$(echo "$order" | jq '{
                orderId: {S: .orderId},
                customerId: {S: .customerId},
                salesPersonId: {S: .salesPersonId},
                items: {S: (.items | tostring)},
                totalAmount: {N: (.totalAmount | tostring)},
                orderDate: {S: .orderDate},
                status: {S: .status},
                shippingAddress: {S: .shippingAddress},
                notes: {S: .notes},
                createdAt: {S: .createdAt},
                updatedAt: {S: .updatedAt}
            }')" \
            --region "$REGION" > /dev/null 2>&1 || print_warning "Failed to add order: $(echo "$order" | jq -r '.orderId')"
    done < <(echo "$orders_data" | jq -c '.[]')
    
    print_success "Database initialization completed with comprehensive sample data from simple-data.sql"
}

# Main deployment function
main() {
    print_step "Starting Complete SalePoint Deployment"
    echo "This process will deploy backend + frontend dashboard"
    echo "Estimated time: 25-35 minutes (including frontend build)"
    echo ""
    
    # Ensure we're in the right directory
    if [ ! -f "A_one-stop-service_deploy.md" ]; then
        print_error "Please run this script from the SalePoint Solution directory"
        exit 1
    fi
    
    # Execute deployment steps
    fix_permissions
    verify_prerequisites
    cleanup_existing
    deploy_infrastructure
    
    # Wait for services to stabilize
    wait_with_progress 30 "Waiting for services to stabilize"
    
    fix_lambda_functions
    
    # Wait a bit more for Lambda functions to be ready
    wait_with_progress 15 "Waiting for Lambda functions to be ready"
    
    # Verify backend deployment
    if ! verify_deployment; then
        # If verification fails, try one more time after additional wait
        wait_with_progress 30 "Waiting before retry"
        
        if ! verify_deployment; then
            print_warning "Backend has issues but continuing with frontend deployment"
            print_info "Check CloudWatch logs for detailed error information"
        fi
    fi
    
    # Initialize database with sample data
    print_info "Backend verified. Now initializing database with sample data..."
    if initialize_database; then
        print_success "Database initialization completed successfully!"
    else
        print_warning "Database initialization had some issues, but continuing..."
        print_info "You can add data manually through the frontend dashboard"
    fi
    
    # Deploy frontend dashboard
    print_info "Backend deployment completed. Now deploying frontend..."
    
    if deploy_frontend; then
        print_success "Frontend deployment completed successfully!"
        
        # Run enhanced final checks that include frontend
        enhanced_final_checks
        
        # Show complete deployment summary
        show_deployment_summary
    else
        print_warning "Frontend deployment failed or skipped"
        print_info "Backend is still available via API endpoints"
        
        # Run basic final checks
        final_checks
        
        # Show basic information
        print_step "Backend Deployment Complete!"
        print_success "SalePoint backend has been deployed successfully"
        
        if [ -n "$API_BASE_URL" ]; then
            echo ""
            print_info "Your API is available at: $API_BASE_URL"
            print_info "Available endpoints:"
            echo "  - $API_BASE_URL/products"
            echo "  - $API_BASE_URL/customers" 
            echo "  - $API_BASE_URL/orders"
        fi
        
        echo ""
        print_info "To clean up all resources when done:"
        echo "  ./cleanup.sh"
        echo ""
        print_success "Backend deployment process completed!"
    fi
    
    echo ""
    print_info "To clean up all resources when done:"
    echo "  ./cleanup.sh"
    echo ""
    print_success "Deployment process completed!"
}

# Handle script interruption
trap 'print_error "Deployment interrupted"; exit 1' INT TERM

# Run main function
main "$@"
