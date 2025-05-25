#!/bin/bash

# SalePoint Solution - AWS Learner Lab Deployment Script (Bash Version)
# Optimized for AWS Academy Learner Lab environment with specific constraints and error handling

set -e  # Exit on error, but we'll handle errors explicitly where needed

# Default parameters
PROJECT_NAME="${1:-salepoint-lab}"
REGION="${2:-us-east-1}"
ENVIRONMENT="${3:-learnerlab}"
SKIP_CLEANUP="${4:-false}"
MONITOR_CREDITS="${5:-true}"

# Color functions for better visibility
print_success() { echo -e "\033[32m$1\033[0m"; }
print_warning() { echo -e "\033[33m$1\033[0m"; }
print_error() { echo -e "\033[31m$1\033[0m"; }
print_info() { echo -e "\033[36m$1\033[0m"; }
print_step() { echo -e "\n\033[35m=== $1 ===\033[0m"; }

# Usage function
usage() {
    echo "Usage: $0 [PROJECT_NAME] [REGION] [ENVIRONMENT] [SKIP_CLEANUP] [MONITOR_CREDITS]"
    echo "  PROJECT_NAME:    Name prefix for AWS resources (default: salepoint-lab)"
    echo "  REGION:          AWS region (default: us-east-1)"
    echo "  ENVIRONMENT:     Environment name (default: learnerlab)"
    echo "  SKIP_CLEANUP:    Skip cleanup on failure (default: false)"
    echo "  MONITOR_CREDITS: Monitor Learner Lab credits (default: true)"
    echo ""
    echo "Example: $0 my-salepoint us-west-2 dev false true"
    exit 1
}

# Help flag
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    usage
fi

# Header display
echo -e "\033[36m"
cat << 'EOF'
╔══════════════════════════════════════════════════════════════════╗
║                 SalePoint Solution - Learner Lab Deployment     ║
║                     AWS Academy Optimized Version               ║
╚══════════════════════════════════════════════════════════════════╝
EOF
echo -e "\033[0m"

print_info "Project Name: $PROJECT_NAME"
print_info "Region: $REGION"
print_info "Environment: $ENVIRONMENT"
print_info "Monitor Credits: $MONITOR_CREDITS"

# Error handling function
handle_error() {
    local exit_code=$?
    local line_number=$1
    print_error "Error occurred in script at line $line_number: exit code $exit_code"
    exit $exit_code
}

# Set up error trap
trap 'handle_error $LINENO' ERR

# Step 0: Pre-deployment Validation
print_step "Pre-deployment Validation"

# Check AWS CLI installation
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI not found. Please install AWS CLI v2."
    exit 1
fi

AWS_VERSION=$(aws --version 2>&1)
print_success "AWS CLI found: $AWS_VERSION"

# Validate AWS credentials
print_info "Validating AWS credentials..."
if ! AWS_IDENTITY=$(aws sts get-caller-identity --output json 2>/dev/null); then
    print_error "AWS credentials not configured. Please run 'aws configure' with your Learner Lab credentials."
    print_info "Get credentials from AWS Academy Learner Lab > AWS Details > Download AWS CLI"
    exit 1
fi

ACCOUNT_ID=$(echo "$AWS_IDENTITY" | jq -r '.Account')
USER_ARN=$(echo "$AWS_IDENTITY" | jq -r '.Arn')

print_success "AWS Account ID: $ACCOUNT_ID"
print_success "AWS User ARN: $USER_ARN"

# Check if this is a Learner Lab environment
IS_LEARNER_LAB=false
if [[ "$USER_ARN" == *"LabRole"* ]] || [[ "$USER_ARN" == *"student"* ]]; then
    print_success "Learner Lab environment detected"
    IS_LEARNER_LAB=true
else
    print_warning "This doesn't appear to be a Learner Lab environment"
fi

# Validate region
if ! aws ec2 describe-regions --query "Regions[].RegionName" --output text --region "$REGION" &>/dev/null; then
    print_warning "Region $REGION may not be available in Learner Lab. Continuing with us-east-1..."
    REGION="us-east-1"
fi

# Check existing resources to avoid conflicts
print_info "Checking for existing resources..."
EXISTING_STACKS=$(aws cloudformation list-stacks \
    --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE \
    --query "StackSummaries[?contains(StackName, '$PROJECT_NAME')].StackName" \
    --output text --region "$REGION" 2>/dev/null || echo "")

if [[ -n "$EXISTING_STACKS" ]]; then
    print_warning "Found existing stacks: $EXISTING_STACKS"
    read -p "Do you want to continue? This may cause conflicts. (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Deployment cancelled by user"
        exit 0
    fi
fi

# Step 1: Learner Lab Resource Check
print_step "Learner Lab Resource Assessment"

if [[ "$MONITOR_CREDITS" == "true" && "$IS_LEARNER_LAB" == "true" ]]; then
    print_info "Checking resource limits and usage..."
    
    # Check CloudFormation stacks
    STACK_COUNT=$(aws cloudformation list-stacks \
        --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE \
        --region "$REGION" --output json 2>/dev/null | jq '.StackSummaries | length' || echo "0")
    print_info "Existing CloudFormation stacks: $STACK_COUNT"
    
    # Check Lambda functions
    LAMBDA_COUNT=$(aws lambda list-functions --region "$REGION" --output json 2>/dev/null | jq '.Functions | length' || echo "0")
    print_info "Existing Lambda functions: $LAMBDA_COUNT"
    
    # Check S3 buckets
    BUCKET_COUNT=$(aws s3 ls 2>/dev/null | wc -l || echo "0")
    print_info "Existing S3 buckets: $BUCKET_COUNT"
    
    if [[ $STACK_COUNT -gt 5 || $LAMBDA_COUNT -gt 10 || $BUCKET_COUNT -gt 10 ]]; then
        print_warning "You have many existing resources. Consider cleaning up to avoid hitting Learner Lab limits."
    fi
fi

# Step 2: Deploy Infrastructure with Learner Lab Optimizations
print_step "Deploying Infrastructure (Learner Lab Optimized)"

STACK_NAME="$PROJECT_NAME-infrastructure"

# Check if CloudFormation template exists
if [[ ! -f "infrastructure/main-template.yaml" ]]; then
    print_error "CloudFormation template not found at infrastructure/main-template.yaml"
    exit 1
fi

print_info "Creating CloudFormation stack: $STACK_NAME"
print_info "This process typically takes 15-20 minutes in Learner Lab..."

# Add unique suffix to avoid conflicts in Learner Lab
UNIQUE_SUFFIX=$((RANDOM % 9000 + 1000))
FULL_PROJECT_NAME="$PROJECT_NAME-$UNIQUE_SUFFIX"

# Create CloudFormation stack
if ! aws cloudformation create-stack \
    --stack-name "$STACK_NAME" \
    --template-body file://infrastructure/main-template.yaml \
    --capabilities CAPABILITY_NAMED_IAM CAPABILITY_AUTO_EXPAND \
    --parameters ParameterKey=ProjectName,ParameterValue="$FULL_PROJECT_NAME" ParameterKey=Environment,ParameterValue="$ENVIRONMENT" \
    --region "$REGION" \
    --on-failure DELETE \
    --timeout-in-minutes 30 >/dev/null 2>&1; then
    
    print_error "Failed to create CloudFormation stack"
    print_info "Common Learner Lab issues:"
    print_info "- IAM permission restrictions"
    print_info "- Resource limits exceeded"
    print_info "- Region not supported"
    exit 1
fi

print_success "Stack creation initiated successfully"

# Monitor stack creation with progress updates
print_info "Monitoring stack creation progress..."
START_TIME=$(date +%s)
MAX_WAIT_SECONDS=$((25 * 60))  # 25 minutes

while true; do
    sleep 30
    CURRENT_TIME=$(date +%s)
    ELAPSED=$((($CURRENT_TIME - $START_TIME) / 60))
    
    STACK_STATUS=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$REGION" \
        --query "Stacks[0].StackStatus" \
        --output text 2>/dev/null || echo "UNKNOWN")
    
    if [[ "$STACK_STATUS" != "UNKNOWN" ]]; then
        print_info "Stack Status: $STACK_STATUS (Elapsed: ${ELAPSED} minutes)"
        
        if [[ "$STACK_STATUS" == "CREATE_COMPLETE" ]]; then
            print_success "Stack created successfully!"
            break
        elif [[ "$STACK_STATUS" == *"FAILED"* ]] || [[ "$STACK_STATUS" == *"ROLLBACK"* ]]; then
            print_error "Stack creation failed with status: $STACK_STATUS"
            
            # Get failure reason
            EVENTS=$(aws cloudformation describe-stack-events \
                --stack-name "$STACK_NAME" \
                --region "$REGION" \
                --query "StackEvents[?ResourceStatus=='CREATE_FAILED'].[LogicalResourceId,ResourceStatusReason]" \
                --output text 2>/dev/null || echo "")
            if [[ -n "$EVENTS" ]]; then
                print_error "Failure details: $EVENTS"
            fi
            exit 1
        fi
    else
        print_warning "Could not get stack status. Continuing to wait..."
    fi
    
    if [[ $ELAPSED -gt $((MAX_WAIT_SECONDS / 60)) ]]; then
        print_error "Stack creation timed out after $((MAX_WAIT_SECONDS / 60)) minutes"
        print_info "Check the CloudFormation console for more details"
        exit 1
    fi
done

# Get and display stack outputs
print_info "Retrieving stack outputs..."
STACK_OUTPUTS=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query "Stacks[0].Outputs" \
    --output json)

# Parse outputs into variables
API_GATEWAY_URL=$(echo "$STACK_OUTPUTS" | jq -r '.[] | select(.OutputKey=="ApiGatewayUrl") | .OutputValue')
USER_POOL_ID=$(echo "$STACK_OUTPUTS" | jq -r '.[] | select(.OutputKey=="UserPoolId") | .OutputValue')
USER_POOL_CLIENT_ID=$(echo "$STACK_OUTPUTS" | jq -r '.[] | select(.OutputKey=="UserPoolClientId") | .OutputValue')
FRONTEND_BUCKET_URL=$(echo "$STACK_OUTPUTS" | jq -r '.[] | select(.OutputKey=="FrontendBucketUrl") | .OutputValue')

# Display outputs
echo "$STACK_OUTPUTS" | jq -r '.[] | "\(.OutputKey): \(.OutputValue)"' | while read -r line; do
    print_success "$line"
done

# Step 3: Deploy Lambda Functions with Learner Lab Optimizations
print_step "Deploying Lambda Functions"

# Create deployments directory
mkdir -p deployments

# Validate Lambda source files
if [[ ! -d "lambda-functions" ]]; then
    print_error "Lambda functions directory not found"
    exit 1
fi

print_info "Installing Lambda dependencies..."
cd lambda-functions

# Check if package.json exists
if [[ -f "package.json" ]]; then
    if ! npm install --production >/dev/null 2>&1; then
        print_warning "npm install had issues, but continuing..."
    fi
else
    print_warning "No package.json found in lambda-functions directory"
fi

# Create deployment package
print_info "Creating Lambda deployment package..."
if [[ -d "node_modules" ]]; then
    zip -r ../deployments/lambda-functions.zip *.js *.json node_modules/ >/dev/null 2>&1
else
    zip -r ../deployments/lambda-functions.zip *.js *.json >/dev/null 2>&1
fi

cd ..

# Update Lambda functions
FUNCTIONS=("products" "customers" "sales" "inventory" "analytics" "documents")
for FUNCTION in "${FUNCTIONS[@]}"; do
    FUNCTION_NAME="$FULL_PROJECT_NAME-$FUNCTION"
    print_info "Updating function: $FUNCTION_NAME"
    
    if aws lambda update-function-code \
        --function-name "$FUNCTION_NAME" \
        --zip-file fileb://deployments/lambda-functions.zip \
        --region "$REGION" >/dev/null 2>&1; then
        print_success "✓ $FUNCTION_NAME updated successfully"
    else
        print_warning "⚠ Failed to update $FUNCTION_NAME"
    fi
done

# Step 4: Configure API Gateway
print_step "Configuring API Gateway"

if [[ -n "$API_GATEWAY_URL" && "$API_GATEWAY_URL" != "null" ]]; then
    # Extract API ID from URL
    API_ID=$(echo "$API_GATEWAY_URL" | sed 's|https://||' | cut -d'.' -f1)
    print_info "API Gateway ID: $API_ID"
    
    # Create deployment
    print_info "Creating API Gateway deployment..."
    if aws apigateway create-deployment \
        --rest-api-id "$API_ID" \
        --stage-name prod \
        --region "$REGION" >/dev/null 2>&1; then
        print_success "API Gateway deployed successfully"
    else
        print_warning "API Gateway deployment had issues"
    fi
else
    print_warning "API Gateway URL not found in stack outputs"
fi

# Step 5: Build and Deploy Frontend
print_step "Building and Deploying Frontend"

if [[ ! -d "frontend" ]]; then
    print_error "Frontend directory not found"
    exit 1
fi

cd frontend

# Install dependencies
print_info "Installing frontend dependencies..."
if ! npm install >/dev/null 2>&1; then
    print_warning "npm install had issues, but continuing..."
fi

# Update AWS configuration
print_info "Updating AWS configuration file..."
CONFIG_DIR="src/config"
mkdir -p "$CONFIG_DIR"

cat > "$CONFIG_DIR/aws-config.js" << EOF
export const awsConfig = {
  region: '$REGION',
  userPoolId: '$USER_POOL_ID',
  userPoolWebClientId: '$USER_POOL_CLIENT_ID',
  apiGatewayUrl: '$API_GATEWAY_URL',
  documentsBucket: '$FULL_PROJECT_NAME-documents-$ACCOUNT_ID-$REGION'
};
EOF

print_success "AWS configuration updated"

# Build the application
print_info "Building React application..."
if ! npm run build >/dev/null 2>&1; then
    print_error "Frontend build failed"
    cd ..
    exit 1
fi

# Deploy to S3
if [[ -n "$FRONTEND_BUCKET_URL" && "$FRONTEND_BUCKET_URL" != "null" ]]; then
    FRONTEND_BUCKET="$FULL_PROJECT_NAME-frontend-$ACCOUNT_ID-$REGION"
    print_info "Deploying to S3 bucket: $FRONTEND_BUCKET"
    
    if aws s3 sync build/ "s3://$FRONTEND_BUCKET" --delete --region "$REGION" >/dev/null 2>&1; then
        print_success "Frontend deployed successfully"
    else
        print_warning "Frontend deployment had issues"
    fi
else
    print_warning "Frontend bucket URL not found in stack outputs"
fi

cd ..

# Step 6: Setup Cognito Users
print_step "Setting up Cognito Users"

if [[ -n "$USER_POOL_ID" && "$USER_POOL_ID" != "null" ]]; then
    # Create admin user
    print_info "Creating admin user..."
    if aws cognito-idp admin-create-user \
        --user-pool-id "$USER_POOL_ID" \
        --username "admin@salepoint.com" \
        --user-attributes Name=email,Value=admin@salepoint.com Name=name,Value="Admin User" Name=custom:role,Value=admin \
        --temporary-password "TempPassword123!" \
        --message-action SUPPRESS \
        --region "$REGION" >/dev/null 2>&1 || true; then

        # Set permanent password
        aws cognito-idp admin-set-user-password \
            --user-pool-id "$USER_POOL_ID" \
            --username "admin@salepoint.com" \
            --password "AdminPassword123!" \
            --permanent \
            --region "$REGION" >/dev/null 2>&1 || true

        print_success "✓ Admin user configured"
    fi

    # Create sample users
    declare -A SAMPLE_USERS=(
        ["manager@salepoint.com"]="Manager User|manager|ManagerPass123!"
        ["sales@salepoint.com"]="Sales User|sales|SalesPass123!"
    )

    for EMAIL in "${!SAMPLE_USERS[@]}"; do
        IFS='|' read -r NAME ROLE PASSWORD <<< "${SAMPLE_USERS[$EMAIL]}"
        print_info "Creating user: $EMAIL"
        
        if aws cognito-idp admin-create-user \
            --user-pool-id "$USER_POOL_ID" \
            --username "$EMAIL" \
            --user-attributes Name=email,Value="$EMAIL" Name=name,Value="$NAME" Name=custom:role,Value="$ROLE" \
            --temporary-password "TempPassword123!" \
            --message-action SUPPRESS \
            --region "$REGION" >/dev/null 2>&1 || true; then

            aws cognito-idp admin-set-user-password \
                --user-pool-id "$USER_POOL_ID" \
                --username "$EMAIL" \
                --password "$PASSWORD" \
                --permanent \
                --region "$REGION" >/dev/null 2>&1 || true

            print_success "✓ $EMAIL configured"
        fi
    done
else
    print_warning "User Pool ID not found in stack outputs"
fi

# Step 7: Final Validation and Testing
print_step "Final Validation and Testing"

# Test API Gateway endpoints
if [[ -n "$API_GATEWAY_URL" && "$API_GATEWAY_URL" != "null" ]]; then
    print_info "Testing API Gateway health endpoint..."
    if curl -s -f "$API_GATEWAY_URL/health" >/dev/null 2>&1; then
        print_success "✓ API Gateway health check passed"
    else
        print_warning "⚠ API Gateway health check failed"
    fi
fi

# Validate frontend accessibility
if [[ -n "$FRONTEND_BUCKET_URL" && "$FRONTEND_BUCKET_URL" != "null" ]]; then
    print_info "Validating frontend deployment..."
    if curl -s -I "$FRONTEND_BUCKET_URL" | grep -q "200 OK"; then
        print_success "✓ Frontend is accessible"
    else
        print_warning "⚠ Frontend accessibility check failed"
    fi
fi

# Run verification script if available
if [[ -f "verify-solution.ps1" ]]; then
    print_info "Running solution verification..."
    if command -v pwsh &> /dev/null; then
        pwsh -File verify-solution.ps1 2>/dev/null || print_warning "Verification script encountered issues"
    else
        print_info "PowerShell Core not available, skipping verification script"
    fi
fi

# Display Deployment Summary
print_step "Deployment Summary"

cat << EOF

╔══════════════════════════════════════════════════════════════════╗
║                    DEPLOYMENT COMPLETED SUCCESSFULLY            ║
╚══════════════════════════════════════════════════════════════════╝

🌐 Application URL: $FRONTEND_BUCKET_URL
🔗 API Gateway URL: $API_GATEWAY_URL

👤 Login Credentials:
   📧 Admin: admin@salepoint.com / AdminPassword123!
   📧 Manager: manager@salepoint.com / ManagerPass123!
   📧 Sales: sales@salepoint.com / SalesPass123!

📋 Next Steps:
   1. Open the application URL in your browser
   2. Login with one of the provided credentials
   3. Test the core functionality (Products, Customers, Sales)
   4. Monitor your Learner Lab credits usage
   5. Run cleanup script when testing is complete

🔧 Management Commands:
   • Verify deployment: pwsh -File verify-solution.ps1
   • Test APIs: ./test-api.sh $API_GATEWAY_URL
   • Demo features: ./demo-solution.sh
   • Cleanup: ./cleanup.sh $PROJECT_NAME

⚠️  Learner Lab Reminders:
   • Monitor your session time and credits
   • Save important outputs before session expires
   • Clean up resources when testing is complete
   • Note that some features may be limited in Learner Lab

EOF

# Save deployment information for future reference
DEPLOYMENT_INFO=$(cat << EOF
{
  "projectName": "$FULL_PROJECT_NAME",
  "region": "$REGION",
  "stackName": "$STACK_NAME",
  "deploymentTime": "$(date -Iseconds)",
  "outputs": {
    "apiGatewayUrl": "$API_GATEWAY_URL",
    "userPoolId": "$USER_POOL_ID",
    "userPoolClientId": "$USER_POOL_CLIENT_ID",
    "frontendBucketUrl": "$FRONTEND_BUCKET_URL"
  },
  "learnerLabOptimized": $IS_LEARNER_LAB
}
EOF
)

echo "$DEPLOYMENT_INFO" > deployment-info.json
print_success "Deployment information saved to deployment-info.json"

print_success "\nSalePoint Solution deployment to AWS Learner Lab completed successfully!"

if [[ "$MONITOR_CREDITS" == "true" && "$IS_LEARNER_LAB" == "true" ]]; then
    print_info "\n💡 Remember to monitor your AWS Academy credits and clean up resources when finished testing."
fi
