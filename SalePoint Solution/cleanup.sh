#!/bin/bash

# SalePoint Solution - Cleanup Script (Bash Version)
# Removes all AWS resources created by the deployment script

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
║                SalePoint Solution - Resource Cleanup            ║
║                   AWS Learner Lab Safe Cleanup                  ║
╚══════════════════════════════════════════════════════════════════╝
EOF
echo -e "\033[0m"

print_info "Project Name: $PROJECT_NAME"
print_info "Region: $REGION"
print_info "Force Delete: $FORCE_DELETE"

# Confirmation unless forced
if [[ "$FORCE_DELETE" != "true" ]]; then
    echo
    print_warning "This will delete ALL AWS resources created by the SalePoint deployment."
    print_warning "This action cannot be undone."
    echo
    read -p "Are you sure you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Cleanup cancelled by user"
        exit 0
    fi
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

# Step 4: Clean up local files
print_step "Cleaning Up Local Files"

# Remove deployment artifacts
LOCAL_FILES=("deployments/" "deployment-info.json")

for FILE in "${LOCAL_FILES[@]}"; do
    if [[ -e "$FILE" ]]; then
        print_info "Removing local file/directory: $FILE"
        rm -rf "$FILE"
        print_success "✓ Removed $FILE"
    fi
done

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
print_step "Cleanup Summary"

cat << EOF

╔══════════════════════════════════════════════════════════════════╗
║                     CLEANUP COMPLETED                           ║
╚══════════════════════════════════════════════════════════════════╝

✅ CloudFormation stack deletion initiated/completed
✅ S3 buckets emptied
✅ Orphaned Lambda functions removed
✅ Orphaned API Gateway APIs removed
✅ Local deployment files cleaned up

💡 Learner Lab Notes:
   • Resource deletion may take several minutes to complete
   • Check the CloudFormation console to verify stack deletion
   • Some resources may require manual deletion if they have dependencies
   • Your Learner Lab credits should stop being consumed once resources are deleted

🔍 To verify complete cleanup:
   • Check CloudFormation console for remaining stacks
   • Check S3 console for remaining buckets
   • Check Lambda console for remaining functions

EOF

print_success "SalePoint Solution cleanup completed!"

if [[ -n "$REMAINING_STACKS" || -n "$REMAINING_BUCKETS" ]]; then
    print_warning "\n⚠️  Some resources may still exist. Please check the AWS console and delete manually if needed."
fi
