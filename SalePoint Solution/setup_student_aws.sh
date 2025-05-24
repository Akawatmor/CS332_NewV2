#!/bin/bash

# 🎓 Quick AWS Student Setup
# Simple script to configure AWS credentials for student accounts

echo "🎓 AWS Student Account Quick Setup"
echo "=================================="
echo ""

# Create AWS directory
echo "📁 Creating AWS configuration directory..."
mkdir -p ~/.aws
echo "   ✅ Created ~/.aws directory"
echo ""

echo "📚 GETTING YOUR CREDENTIALS:"
echo "============================"
echo ""
echo "🎯 For AWS Academy students:"
echo "1. Go to your AWS Academy course"
echo "2. Click 'Start Lab' (wait for green dot)"
echo "3. Click 'AWS Details' or 'AWS CLI'"
echo "4. Look for credentials that look like this:"
echo ""
echo "   aws_access_key_id = ASIAXXXXXXXXXXX"
echo "   aws_secret_access_key = xxxxxxxxxxxxxxxxx"
echo "   aws_session_token = very_long_token_here"
echo ""
echo "🎯 For AWS Educate students:"
echo "1. Go to AWS Educate Workbench"
echo "2. Click 'Account Details'"
echo "3. Look for AWS CLI credentials"
echo ""

read -p "Press Enter when you have your credentials ready..."
echo ""

# Get credentials interactively
echo "🔧 CREDENTIAL SETUP:"
echo "==================="
echo ""

read -p "📋 AWS Access Key ID (starts with ASIA): " access_key
echo ""

read -p "🔑 AWS Secret Access Key: " -s secret_key
echo ""
echo ""

read -p "🎫 AWS Session Token (very long): " -s session_token
echo ""
echo ""

read -p "🌍 Region (press Enter for us-east-1): " region
if [[ -z "$region" ]]; then
    region="us-east-1"
fi
echo ""

# Validate required fields
if [[ -z "$access_key" || -z "$secret_key" || -z "$session_token" ]]; then
    echo "❌ Error: Missing required credentials"
    echo "   All three fields (Access Key, Secret Key, Session Token) are required"
    echo "   Please run the script again with complete credentials"
    exit 1
fi

# Create credentials file
echo "💾 Creating AWS credentials file..."
cat > ~/.aws/credentials << EOF
[default]
aws_access_key_id=$access_key
aws_secret_access_key=$secret_key
aws_session_token=$session_token
EOF
echo "   ✅ Created ~/.aws/credentials"

# Create config file
cat > ~/.aws/config << EOF
[default]
region=$region
output=json
EOF
echo "   ✅ Created ~/.aws/config with region: $region"
echo ""

# Test configuration
echo "🧪 Testing AWS configuration..."
echo "==============================="
echo ""

if aws sts get-caller-identity > /dev/null 2>&1; then
    echo "🎉 SUCCESS! AWS is configured correctly!"
    echo ""
    echo "👤 Your AWS identity:"
    aws sts get-caller-identity
    echo ""
    echo "🚀 You're ready to deploy your Lambda functions!"
    echo "   Run: ./quick_update_lambdas.sh"
    echo ""
else
    echo "❌ Configuration test failed"
    echo ""
    echo "💡 Common issues:"
    echo "1. Lab session expired - restart your AWS Academy lab"
    echo "2. Incorrect credentials - double-check copy/paste"
    echo "3. Session token missing or incomplete"
    echo ""
    echo "🔄 You can run this script again to retry"
    echo ""
fi

echo "📝 IMPORTANT REMINDERS:"
echo "======================"
echo ""
echo "• Student account sessions expire (usually 4 hours)"
echo "• Run this script again when credentials expire"
echo "• Your Lambda functions handle limited permissions gracefully"
echo "• If deployment fails, the functions will use mock data"
echo ""
