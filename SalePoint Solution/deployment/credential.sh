#!/bin/bash

# AWS Learner Lab Credentials Setup Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo "=========================================="
echo "AWS Learner Lab Credentials Setup"
echo "=========================================="
echo ""

print_status "This script will help you set up AWS credentials for Learner Lab"
echo ""

# Check if running in Git Bash or similar
if [[ "$OSTYPE" == "msys" ]]; then
    print_status "Detected Git Bash environment"
    PROFILE_FILE="$HOME/.bash_profile"
elif [[ "$OSTYPE" == "cygwin" ]]; then
    print_status "Detected Cygwin environment"
    PROFILE_FILE="$HOME/.bash_profile"
else
    print_status "Detected Unix-like environment"
    PROFILE_FILE="$HOME/.bashrc"
fi

echo "Please copy your AWS credentials from AWS Learner Lab:"
echo ""

# Prompt for credentials
read -p "Enter your AWS Access Key ID: " AWS_ACCESS_KEY_ID
read -p "Enter your AWS Secret Access Key: " AWS_SECRET_ACCESS_KEY
read -p "Enter your AWS Session Token: " AWS_SESSION_TOKEN
read -p "Enter your AWS Region (default: us-east-1): " AWS_REGION

# Set default region if not provided
if [ -z "$AWS_REGION" ]; then
    AWS_REGION="us-east-1"
fi

print_status "Setting up environment variables..."

# Export for current session
export AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY"
export AWS_SESSION_TOKEN="$AWS_SESSION_TOKEN"
export AWS_DEFAULT_REGION="$AWS_REGION"

print_success "Environment variables set for current session"

# Ask if user wants to save to profile
read -p "Do you want to save these credentials to your profile file? (y/N): " save_to_profile

if [[ $save_to_profile =~ ^[Yy]$ ]]; then
    print_status "Adding credentials to $PROFILE_FILE"
    
    # Create backup of profile file
    if [ -f "$PROFILE_FILE" ]; then
        cp "$PROFILE_FILE" "${PROFILE_FILE}.backup"
    fi
    
    # Add credentials to profile
    cat >> "$PROFILE_FILE" << EOF

# AWS Learner Lab Credentials (added $(date))
export AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY"
export AWS_SESSION_TOKEN="$AWS_SESSION_TOKEN"
export AWS_DEFAULT_REGION="$AWS_REGION"
EOF
    
    print_success "Credentials saved to $PROFILE_FILE"
    print_warning "You may need to restart your terminal or run: source $PROFILE_FILE"
else
    print_warning "Credentials are only set for current session"
fi

# Test credentials
print_status "Testing AWS credentials..."

if aws sts get-caller-identity &> /dev/null; then
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    USER_ARN=$(aws sts get-caller-identity --query Arn --output text)
    
    print_success "AWS credentials are working!"
    print_status "Account ID: $ACCOUNT_ID"
    print_status "User ARN: $USER_ARN"
    
    echo ""
    print_success "You can now run the deployment script:"
    print_status "./deploy-aws.sh"
else
    print_error "AWS credentials test failed. Please check your credentials and try again."
    exit 1
fi

echo ""
print_warning "Important Notes:"
echo "- AWS Learner Lab sessions expire. You'll need to update credentials when they expire."
echo "- The session token is required for Learner Lab and expires with your lab session."
echo "- Make sure to copy all three credentials (Access Key, Secret Key, Session Token) from AWS Learner Lab."