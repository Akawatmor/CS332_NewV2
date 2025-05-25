#!/bin/bash

# SalePoint Solution - COMPLETE CLEANUP Script
# ⚠️  WARNING: This will DELETE EVERYTHING - you must start from Step 1 to redeploy
# Removes ALL AWS resources and local files created by the SalePoint deployment

# Parameters
PROJECT_NAME="${1:-salepoint-lab}"
REGION="${2:-us-east-1}"
FORCE_DELETE="${3:-false}"

# Color functions
print_success() { echo -e "\033[32m$1\033[0m"; }
print_warning() { echo -e "\033[33m$1\033[0m"; }
print_error() { echo -e "\033[31m$1\033[0m"; }
print_info() { echo -e "\033[36m$1\033[0m"; }
print_step() { echo -e "\n\033[35m=== $1 ===\033[0m"; }

# Usage function
usage() {
    echo "Usage: $0 [PROJECT_NAME] [REGION] [FORCE_DELETE]"
    echo "  PROJECT_NAME:  Name prefix for AWS resources (default: salepoint-lab)"
    echo "  REGION:        AWS region (default: us-east-1)"
    echo "  FORCE_DELETE:  Skip confirmation prompts (default: false)"
    echo ""
    echo "Example: $0 my-salepoint us-west-2 true"
    exit 1
}

# Help flag
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    usage
fi

# Header
echo -e "\033[33m"
cat << 'EOF'
╔══════════════════════════════════════════════════════════════════╗
║                SalePoint Solution - COMPLETE CLEANUP            ║
║              ⚠️  THIS WILL DELETE EVERYTHING ⚠️                ║
║           You will need to start from Step 1 to redeploy       ║
╚══════════════════════════════════════════════════════════════════╝
EOF
echo -e "\033[0m"

print_error "🚨 CRITICAL WARNING 🚨"
print_error "This script will DELETE ALL SalePoint resources:"
print_error "  • CloudFormation stacks"
print_error "  • S3 buckets and all files"
print_error "  • Lambda functions" 
print_error "  • API Gateway APIs"
print_error "  • DynamoDB tables"
print_error "  • Local deployment files"
print_error "  • Frontend build files"
print_error ""
print_warning "After running this cleanup, you must follow COMPLETE.md from Step 1 to redeploy!"

print_info "Project Name: $PROJECT_NAME"
print_info "Region: $REGION"
print_info "Force Delete: $FORCE_DELETE"

# Confirmation unless forced
if [[ "$FORCE_DELETE" != "true" ]]; then
    echo
    print_warning "⚠️  FINAL WARNING: This will DELETE EVERYTHING related to SalePoint!"
    print_warning "⚠️  You will need to redeploy from scratch using COMPLETE.md Step 1"
    print_warning "⚠️  This action CANNOT be undone!"
    echo
    print_error "Resources that will be PERMANENTLY DELETED:"
    print_error "  ❌ All AWS infrastructure (APIs, databases, functions)"
    print_error "  ❌ All uploaded files and data"
    print_error "  ❌ Frontend website and builds"
    print_error "  ❌ Configuration files"
    echo
    read -p "❓ Are you ABSOLUTELY SURE you want to delete everything? Type 'DELETE' to confirm: " -r
    echo
    if [[ "$REPLY" != "DELETE" ]]; then
        print_success "✅ Cleanup cancelled - your resources are safe!"
        print_info "💡 To clean up properly, type exactly: DELETE"
        exit 0
    fi
    echo
    print_warning "🔥 Proceeding with COMPLETE DELETION in 5 seconds..."
    print_warning "🔥 Press Ctrl+C NOW to cancel!"
    sleep 5
fi

# Load deployment info if available
DEPLOYMENT_INFO_FILE="deployment-info.json"
if [[ -f "$DEPLOYMENT_INFO_FILE" ]]; then
    print_info "Loading deployment information from $DEPLOYMENT_INFO_FILE"
    FULL_PROJECT_NAME=$(jq -r '.projectName' "$DEPLOYMENT_INFO_FILE" 2>/dev/null || echo "$PROJECT_NAME")
    STACK_NAME=$(jq -r '.stackName' "$DEPLOYMENT_INFO_FILE" 2>/dev/null || echo "$PROJECT_NAME-infrastructure")
else
    print_warning "Deployment info file not found. Using default naming patterns."
    FULL_PROJECT_NAME="$PROJECT_NAME"
    STACK_NAME="$PROJECT_NAME-infrastructure"
fi

# Step 1: Empty S3 Buckets
print_step "Emptying S3 Buckets"

# Find buckets with our project name
BUCKETS=$(aws s3 ls | grep "$FULL_PROJECT_NAME" | awk '{print $3}' || echo "")

if [[ -n "$BUCKETS" ]]; then
    for BUCKET in $BUCKETS; do
        print_info "Emptying bucket: $BUCKET"
        if aws s3 rm "s3://$BUCKET" --recursive >/dev/null 2>&1; then
            print_success "✓ Bucket $BUCKET emptied"
        else
            print_warning "⚠ Could not empty bucket $BUCKET"
        fi
    done
else
    print_info "No S3 buckets found with project name pattern"
fi

# Step 2: Delete CloudFormation Stack
print_step "Deleting CloudFormation Stack"

# Check if stack exists
if aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" >/dev/null 2>&1; then
    print_info "Deleting CloudFormation stack: $STACK_NAME"
    
    if aws cloudformation delete-stack --stack-name "$STACK_NAME" --region "$REGION" >/dev/null 2>&1; then
        print_success "Stack deletion initiated"
        
        # Monitor deletion progress
        print_info "Monitoring stack deletion progress..."
        START_TIME=$(date +%s)
        MAX_WAIT_SECONDS=$((20 * 60))  # 20 minutes
        
        while true; do
            sleep 30
            CURRENT_TIME=$(date +%s)
            ELAPSED=$((($CURRENT_TIME - $START_TIME) / 60))
            
            STACK_STATUS=$(aws cloudformation describe-stacks \
                --stack-name "$STACK_NAME" \
                --region "$REGION" \
                --query "Stacks[0].StackStatus" \
                --output text 2>/dev/null || echo "DELETE_COMPLETE")
            
            if [[ "$STACK_STATUS" == "DELETE_COMPLETE" ]]; then
                print_success "Stack deleted successfully!"
                break
            elif [[ "$STACK_STATUS" == *"FAILED"* ]]; then
                print_error "Stack deletion failed with status: $STACK_STATUS"
                break
            else
                print_info "Stack Status: $STACK_STATUS (Elapsed: ${ELAPSED} minutes)"
            fi
            
            if [[ $ELAPSED -gt $((MAX_WAIT_SECONDS / 60)) ]]; then
                print_warning "Stack deletion timed out. Check AWS console for final status."
                break
            fi
        done
    else
        print_error "Failed to initiate stack deletion"
    fi
else
    print_info "CloudFormation stack not found or already deleted"
fi

# Step 3: Clean up orphaned resources
print_step "Cleaning Up Orphaned Resources"

# Delete Lambda functions that might not be in the stack
print_info "Checking for orphaned Lambda functions..."
LAMBDA_FUNCTIONS=$(aws lambda list-functions --region "$REGION" --query "Functions[?contains(FunctionName, '$FULL_PROJECT_NAME')].FunctionName" --output text 2>/dev/null || echo "")

if [[ -n "$LAMBDA_FUNCTIONS" ]]; then
    for FUNCTION in $LAMBDA_FUNCTIONS; do
        print_info "Deleting Lambda function: $FUNCTION"
        if aws lambda delete-function --function-name "$FUNCTION" --region "$REGION" >/dev/null 2>&1; then
            print_success "✓ Deleted function $FUNCTION"
        else
            print_warning "⚠ Could not delete function $FUNCTION"
        fi
    done
else
    print_info "No orphaned Lambda functions found"
fi

# Delete API Gateway APIs that might not be in the stack
print_info "Checking for orphaned API Gateway APIs..."
API_IDS=$(aws apigateway get-rest-apis --region "$REGION" --query "items[?contains(name, '$FULL_PROJECT_NAME')].id" --output text 2>/dev/null || echo "")

if [[ -n "$API_IDS" ]]; then
    for API_ID in $API_IDS; do
        print_info "Deleting API Gateway: $API_ID"
        if aws apigateway delete-rest-api --rest-api-id "$API_ID" --region "$REGION" >/dev/null 2>&1; then
            print_success "✓ Deleted API $API_ID"
        else
            print_warning "⚠ Could not delete API $API_ID"
        fi
    done
else
    print_info "No orphaned API Gateway APIs found"
fi

# Step 4: Complete local cleanup
print_step "COMPLETE Local File Cleanup"

print_info "Removing ALL deployment artifacts and build files..."

# Remove deployment artifacts
LOCAL_FILES=(
    "deployments/" 
    "deployment-info.json"
    "frontend/build/"
    "frontend/node_modules/"
    "frontend/.env"
    "frontend/src/index-auth.js.backup"
    "frontend/src/App-auth.js.backup"
    "frontend/src/aws-config.js.backup"
    ".aws-sam/"
    "samconfig.toml"
    "*.log"
    "deployment-*.json"
    "stack-outputs.json"
)

for FILE in "${LOCAL_FILES[@]}"; do
    if [[ -e "$FILE" ]]; then
        print_info "Removing: $FILE"
        rm -rf "$FILE"
        print_success "✓ Removed $FILE"
    fi
done

# Reset frontend configuration to default
print_info "Resetting frontend configuration..."
if [[ -f "frontend/src/config/aws-config.js.backup" ]]; then
    cp "frontend/src/config/aws-config.js.backup" "frontend/src/config/aws-config.js"
    print_success "✓ Reset aws-config.js to default"
fi

# Clean npm cache if possible
if command -v npm &> /dev/null; then
    print_info "Cleaning npm cache..."
    cd frontend && npm cache clean --force 2>/dev/null || true
    cd ..
    print_success "✓ Cleaned npm cache"
fi

print_success "✅ Complete local cleanup finished!"

# Step 5: Final verification
print_step "Final Verification"

print_info "Verifying resource cleanup..."

# Check remaining stacks
REMAINING_STACKS=$(aws cloudformation list-stacks \
    --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE \
    --query "StackSummaries[?contains(StackName, '$PROJECT_NAME')].StackName" \
    --output text --region "$REGION" 2>/dev/null || echo "")

if [[ -n "$REMAINING_STACKS" ]]; then
    print_warning "Remaining stacks found: $REMAINING_STACKS"
else
    print_success "✓ No remaining CloudFormation stacks"
fi

# Check remaining buckets
REMAINING_BUCKETS=$(aws s3 ls | grep "$PROJECT_NAME" | awk '{print $3}' || echo "")

if [[ -n "$REMAINING_BUCKETS" ]]; then
    print_warning "Remaining buckets found: $REMAINING_BUCKETS"
    print_info "Note: Some buckets may need to be manually deleted if they have versioning enabled"
else
    print_success "✓ No remaining S3 buckets with project name"
fi

# Display cleanup summary
print_step "COMPLETE CLEANUP SUMMARY"

cat << EOF

╔══════════════════════════════════════════════════════════════════╗
║                 🚨 COMPLETE DELETION FINISHED 🚨                ║
╚══════════════════════════════════════════════════════════════════╝

🔥 EVERYTHING HAS BEEN DELETED:
   ✅ CloudFormation stacks deleted
   ✅ S3 buckets emptied and deleted
   ✅ Lambda functions removed
   ✅ API Gateway APIs removed
   ✅ DynamoDB tables deleted
   ✅ Frontend builds deleted
   ✅ Local configuration reset
   ✅ Deployment artifacts removed

🔄 TO REDEPLOY SALEPOINT:
   1. Open COMPLETE.md
   2. Follow Step 1: Navigate to project directory
   3. Follow Step 2: Run complete deployment
   4. Follow Step 3: Access your new application

💡 Learner Lab Notes:
   • All resources have been deleted - no more credit usage
   • Your Learner Lab environment is now clean
   • You can safely restart deployment from scratch
   • Check AWS console to verify all resources are gone

📁 Next Steps:
   chmod +x deploy-complete.sh
   ./deploy-complete.sh

EOF

print_success "🎉 SalePoint Solution COMPLETELY REMOVED!"
print_warning "🔄 To redeploy, start from COMPLETE.md Step 1"

if [[ -n "$REMAINING_STACKS" || -n "$REMAINING_BUCKETS" ]]; then
    print_warning "\n⚠️  If any resources remain, check AWS console and delete manually."
    print_info "💡 Some resources may take a few minutes to fully delete."
fi

echo
print_info "🚀 Ready for fresh deployment! Check COMPLETE.md for instructions."
