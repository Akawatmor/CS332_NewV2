#!/bin/bash

# Fix S3 Frontend Access - Resolve 403 Forbidden Error
# This script specifically addresses S3 bucket policy and access issues

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

print_step "Fixing S3 Frontend Access"

# Get Account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query 'Account' --output text 2>/dev/null || echo "")
if [ -z "$ACCOUNT_ID" ]; then
    print_error "Could not get AWS Account ID"
    exit 1
fi

BUCKET_NAME="$PROJECT_NAME-frontend-$ACCOUNT_ID-$REGION"
WEBSITE_URL="http://$BUCKET_NAME.s3-website-$REGION.amazonaws.com"

print_info "Working with bucket: $BUCKET_NAME"
print_info "Website URL: $WEBSITE_URL"

# Check if bucket exists
if ! aws s3 ls "s3://$BUCKET_NAME" > /dev/null 2>&1; then
    print_error "Bucket $BUCKET_NAME does not exist"
    exit 1
fi

print_step "Step 1: Removing Public Access Block"
# Remove public access block completely
aws s3api put-public-access-block --bucket "$BUCKET_NAME" \
    --public-access-block-configuration \
    "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"
print_success "Public access block configuration updated"

print_step "Step 2: Setting Bucket Policy"
# Create a comprehensive bucket policy
cat <<EOF > /tmp/bucket-policy.json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
    }
  ]
}
EOF

# Apply the bucket policy
aws s3api put-bucket-policy --bucket "$BUCKET_NAME" --policy file:///tmp/bucket-policy.json
print_success "Bucket policy applied"
rm /tmp/bucket-policy.json

print_step "Step 3: Configuring Website Hosting"
# Ensure website configuration is correct
aws s3 website "s3://$BUCKET_NAME" --index-document index.html --error-document index.html
print_success "Website hosting configured"

print_step "Step 4: Setting Object ACLs (Optional)"
# Try to make all objects public-read (this may fail with newer AWS accounts)
print_info "Attempting to set public-read ACL on all objects..."
if aws s3 cp "s3://$BUCKET_NAME" "s3://$BUCKET_NAME" --recursive --acl public-read > /dev/null 2>&1; then
    print_success "Object ACLs updated"
else
    print_warning "Could not set object ACLs (this is normal with newer AWS security settings)"
    print_info "The bucket policy should be sufficient for public access"
fi

print_step "Step 5: Verification"
# Wait a moment for changes to propagate
print_info "Waiting for changes to propagate..."
sleep 10

# Test the website
print_info "Testing website access..."
HTTP_STATUS=$(curl -s -w "%{http_code}" --connect-timeout 15 --max-time 30 "$WEBSITE_URL" -o /dev/null 2>/dev/null || echo "000")

if [[ "$HTTP_STATUS" =~ ^2[0-9][0-9]$ ]]; then
    print_success "✅ SUCCESS! Frontend is now accessible"
    echo ""
    print_info "🌐 Frontend URL: $WEBSITE_URL"
    echo ""
    print_info "📱 Test the dashboard:"
    echo "   • Open the URL in your browser"
    echo "   • Check if the dashboard loads"
    echo "   • Verify API connectivity"
    echo ""
else
    print_warning "Still getting HTTP $HTTP_STATUS - This may take a few more minutes to propagate"
    echo ""
    print_info "If the issue persists:"
    echo "1. Wait 5-10 minutes for DNS propagation"
    echo "2. Try accessing the URL directly in your browser"
    echo "3. Check AWS CloudTrail for any access denials"
    echo ""
    print_info "🌐 Frontend URL to test: $WEBSITE_URL"
fi

print_step "Additional Debugging Info"
print_info "Bucket Policy:"
aws s3api get-bucket-policy --bucket "$BUCKET_NAME" --query 'Policy' --output text | jq '.' 2>/dev/null || echo "Policy retrieved"

print_info "Public Access Block:"
aws s3api get-public-access-block --bucket "$BUCKET_NAME" 2>/dev/null || echo "No public access block"

print_info "Website Configuration:"
aws s3api get-bucket-website --bucket "$BUCKET_NAME" 2>/dev/null || echo "No website configuration"

echo ""
print_success "S3 Frontend fix completed!"
