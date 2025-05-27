#!/bin/bash

# SalePoint AWS Academy Learner Lab Fix
# This script fixes the CloudFormation template validation issue in AWS Academy environments

set -e

# Color functions
print_success() { echo -e "\033[32m✅ $1\033[0m"; }
print_warning() { echo -e "\033[33m⚠️  $1\033[0m"; }
print_error() { echo -e "\033[31m❌ $1\033[0m"; }
print_info() { echo -e "\033[36mℹ️  $1\033[0m"; }
print_step() { echo -e "\n\033[35m=== $1 ===\033[0m"; }

print_step "AWS Academy Learner Lab Fix Applied"

echo "🔧 This fix resolves the following error:"
echo "   'AccessDenied when calling the ValidateTemplate operation'"
echo ""

print_success "The following scripts have been updated to skip template validation in AWS Academy:"
echo "   • deploy-foolproof.sh"
echo "   • deploy-complete.sh" 
echo "   • sh/deploy-complete.sh"
echo ""

print_info "The scripts now automatically detect AWS Academy Learner Lab and skip validation"
print_info "Template validation will still occur during actual CloudFormation deployment"
echo ""

print_step "Ready to Deploy"
print_success "You can now run the deployment script without errors:"
echo ""
echo "   cd \"$(pwd)\""
echo "   ./deploy-foolproof.sh"
echo ""

print_warning "AWS Academy Learner Lab Limitations:"
echo "   • cloudformation:ValidateTemplate is restricted"
echo "   • Some IAM operations may be limited"
echo "   • Template validation happens during deployment instead"
echo ""

print_info "This is normal behavior in AWS Academy environments"
print_info "Your deployment will work exactly the same - just without pre-validation"
