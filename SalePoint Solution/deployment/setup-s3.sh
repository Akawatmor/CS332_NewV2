#!/bin/bash

# SalePoint Solution - S3 Bucket Setup and Static Website Hosting Configuration
# This script creates S3 buckets and configures static website hosting

set -e

echo "Starting S3 bucket setup for SalePoint Solution..."

# Configuration variables
BUCKET_PREFIX="salepoint-solution"
REGION="${AWS_DEFAULT_REGION:-us-east-1}"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Generate unique bucket names
WEB_BUCKET="${BUCKET_PREFIX}-web-${ACCOUNT_ID}-${REGION}"
ASSETS_BUCKET="${BUCKET_PREFIX}-assets-${ACCOUNT_ID}-${REGION}"
BACKUPS_BUCKET="${BUCKET_PREFIX}-backups-${ACCOUNT_ID}-${REGION}"

echo "Using Account ID: $ACCOUNT_ID"
echo "Using Region: $REGION"
echo "Web Bucket: $WEB_BUCKET"
echo "Assets Bucket: $ASSETS_BUCKET"
echo "Backups Bucket: $BACKUPS_BUCKET"

# Function to create bucket with proper configuration
create_bucket() {
    local bucket_name=$1
    local purpose=$2
    
    echo "Creating bucket: $bucket_name for $purpose"
    
    if [ "$REGION" = "us-east-1" ]; then
        aws s3api create-bucket --bucket "$bucket_name" --region "$REGION"
    else
        aws s3api create-bucket \
            --bucket "$bucket_name" \
            --region "$REGION" \
            --create-bucket-configuration LocationConstraint="$REGION"
    fi
    
    # Enable versioning
    aws s3api put-bucket-versioning \
        --bucket "$bucket_name" \
        --versioning-configuration Status=Enabled
    
    # Add bucket tags
    aws s3api put-bucket-tagging \
        --bucket "$bucket_name" \
        --tagging 'TagSet=[
            {Key=Project,Value=SalePoint},
            {Key=Environment,Value=Production},
            {Key=Purpose,Value='$purpose'}
        ]'
    
    echo "Created and configured bucket: $bucket_name"
}

# Create buckets
create_bucket "$WEB_BUCKET" "Static Website Hosting"
create_bucket "$ASSETS_BUCKET" "Application Assets and Uploads"
create_bucket "$BACKUPS_BUCKET" "Database Backups and Archives"

# Configure web bucket for static website hosting
echo "Configuring static website hosting for $WEB_BUCKET..."

# Set bucket policy for public read access to web content
cat > web-bucket-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::$WEB_BUCKET/*"
        }
    ]
}
EOF

aws s3api put-bucket-policy \
    --bucket "$WEB_BUCKET" \
    --policy file://web-bucket-policy.json

# Configure website hosting
aws s3api put-bucket-website \
    --bucket "$WEB_BUCKET" \
    --website-configuration '{
        "IndexDocument": {"Suffix": "index.html"},
        "ErrorDocument": {"Key": "error.html"}
    }'

# Disable block public access for web bucket (required for static hosting)
aws s3api delete-public-access-block --bucket "$WEB_BUCKET"

echo "Static website hosting configured for $WEB_BUCKET"

# Configure CORS for assets bucket
echo "Configuring CORS for $ASSETS_BUCKET..."

cat > assets-cors-config.json << EOF
{
    "CORSRules": [
        {
            "AllowedOrigins": ["*"],
            "AllowedMethods": ["GET", "POST", "PUT", "DELETE", "HEAD"],
            "AllowedHeaders": ["*"],
            "ExposeHeaders": ["ETag"],
            "MaxAgeSeconds": 3000
        }
    ]
}
EOF

aws s3api put-bucket-cors \
    --bucket "$ASSETS_BUCKET" \
    --cors-configuration file://assets-cors-config.json

# Configure lifecycle policies for backups bucket
echo "Configuring lifecycle policy for $BACKUPS_BUCKET..."

cat > backup-lifecycle-config.json << EOF
{
    "Rules": [
        {
            "ID": "DatabaseBackupLifecycle",
            "Status": "Enabled",
            "Filter": {"Prefix": "database-backups/"},
            "Transitions": [
                {
                    "Days": 30,
                    "StorageClass": "STANDARD_IA"
                },
                {
                    "Days": 90,
                    "StorageClass": "GLACIER"
                },
                {
                    "Days": 365,
                    "StorageClass": "DEEP_ARCHIVE"
                }
            ]
        },
        {
            "ID": "LogArchiveLifecycle",
            "Status": "Enabled",
            "Filter": {"Prefix": "logs/"},
            "Transitions": [
                {
                    "Days": 7,
                    "StorageClass": "STANDARD_IA"
                },
                {
                    "Days": 30,
                    "StorageClass": "GLACIER"
                }
            ],
            "Expiration": {
                "Days": 2555
            }
        }
    ]
}
EOF

aws s3api put-bucket-lifecycle-configuration \
    --bucket "$BACKUPS_BUCKET" \
    --lifecycle-configuration file://backup-lifecycle-config.json

# Configure server-side encryption for all buckets
echo "Enabling server-side encryption..."

configure_bucket_encryption() {
    local bucket_name=$1
    
    aws s3api put-bucket-encryption \
        --bucket "$bucket_name" \
        --server-side-encryption-configuration '{
            "Rules": [
                {
                    "ApplyServerSideEncryptionByDefault": {
                        "SSEAlgorithm": "AES256"
                    }
                }
            ]
        }'
}

configure_bucket_encryption "$WEB_BUCKET"
configure_bucket_encryption "$ASSETS_BUCKET"
configure_bucket_encryption "$BACKUPS_BUCKET"

# Upload web assets
echo "Uploading web assets to $WEB_BUCKET..."

# Create a simple error page
cat > error.html << EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Page Not Found - SalePoint</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-align: center;
            padding: 50px;
            margin: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .error-container {
            max-width: 500px;
        }
        h1 { font-size: 4rem; margin: 0; }
        h2 { font-size: 1.5rem; margin: 10px 0; }
        p { font-size: 1.1rem; margin: 20px 0; }
        a {
            color: #fff;
            text-decoration: none;
            padding: 10px 20px;
            border: 2px solid #fff;
            border-radius: 5px;
            display: inline-block;
            margin-top: 20px;
            transition: all 0.3s ease;
        }
        a:hover {
            background: #fff;
            color: #667eea;
        }
    </style>
</head>
<body>
    <div class="error-container">
        <h1>404</h1>
        <h2>Page Not Found</h2>
        <p>The page you're looking for doesn't exist.</p>
        <a href="/index.html">Return to SalePoint</a>
    </div>
</body>
</html>
EOF

# Upload error page
aws s3 cp error.html "s3://$WEB_BUCKET/error.html" --content-type "text/html"

# Upload web application files (if they exist)
if [ -d "../src/web" ]; then
    echo "Uploading web application files..."
    aws s3 sync ../src/web/ "s3://$WEB_BUCKET/" \
        --exclude "*.DS_Store" \
        --exclude "*.git*" \
        --cache-control "max-age=31536000" \
        --metadata-directive REPLACE
    
    # Set proper content types
    aws s3 cp "s3://$WEB_BUCKET/index.html" "s3://$WEB_BUCKET/index.html" \
        --content-type "text/html" \
        --cache-control "max-age=300" \
        --metadata-directive REPLACE
    
    aws s3 sync "s3://$WEB_BUCKET/css/" "s3://$WEB_BUCKET/css/" \
        --content-type "text/css" \
        --cache-control "max-age=31536000" \
        --metadata-directive REPLACE
    
    aws s3 sync "s3://$WEB_BUCKET/js/" "s3://$WEB_BUCKET/js/" \
        --content-type "application/javascript" \
        --cache-control "max-age=31536000" \
        --metadata-directive REPLACE
else
    echo "Web application files not found. Upload them manually to s3://$WEB_BUCKET/"
fi

# Create folder structure in assets bucket
echo "Creating folder structure in assets bucket..."
aws s3api put-object --bucket "$ASSETS_BUCKET" --key "product-images/" --content-length 0
aws s3api put-object --bucket "$ASSETS_BUCKET" --key "invoices/" --content-length 0
aws s3api put-object --bucket "$ASSETS_BUCKET" --key "reports/" --content-length 0
aws s3api put-object --bucket "$ASSETS_BUCKET" --key "uploads/" --content-length 0

# Create folder structure in backups bucket
echo "Creating folder structure in backups bucket..."
aws s3api put-object --bucket "$BACKUPS_BUCKET" --key "database-backups/" --content-length 0
aws s3api put-object --bucket "$BACKUPS_BUCKET" --key "logs/" --content-length 0
aws s3api put-object --bucket "$BACKUPS_BUCKET" --key "exports/" --content-length 0

# Get website URL
WEBSITE_URL="http://$WEB_BUCKET.s3-website-$REGION.amazonaws.com"
if [ "$REGION" = "us-east-1" ]; then
    WEBSITE_URL="http://$WEB_BUCKET.s3-website.amazonaws.com"
fi

echo ""
echo "========================================"
echo "S3 bucket setup completed!"
echo "========================================"
echo "Region: $REGION"
echo "Account ID: $ACCOUNT_ID"
echo ""
echo "Created Buckets:"
echo "1. Web Hosting: $WEB_BUCKET"
echo "   - Purpose: Static website hosting"
echo "   - Website URL: $WEBSITE_URL"
echo "   - Public read access enabled"
echo ""
echo "2. Assets: $ASSETS_BUCKET"
echo "   - Purpose: Application assets and uploads"
echo "   - CORS enabled for API access"
echo "   - Folders: product-images/, invoices/, reports/, uploads/"
echo ""
echo "3. Backups: $BACKUPS_BUCKET"
echo "   - Purpose: Database backups and archives"
echo "   - Lifecycle policies configured"
echo "   - Folders: database-backups/, logs/, exports/"
echo ""
echo "All buckets have:"
echo "- Versioning enabled"
echo "- Server-side encryption (AES256)"
echo "- Appropriate tags for cost management"
echo ""
echo "Website URL: $WEBSITE_URL"
echo "========================================"

# Save configuration to file
cat > s3-config.json << EOF
{
  "region": "$REGION",
  "accountId": "$ACCOUNT_ID",
  "buckets": {
    "web": "$WEB_BUCKET",
    "assets": "$ASSETS_BUCKET",
    "backups": "$BACKUPS_BUCKET"
  },
  "websiteUrl": "$WEBSITE_URL",
  "features": {
    "versioning": true,
    "encryption": "AES256",
    "staticHosting": true,
    "corsEnabled": true,
    "lifecyclePolicies": true
  },
  "folderStructure": {
    "assets": ["product-images/", "invoices/", "reports/", "uploads/"],
    "backups": ["database-backups/", "logs/", "exports/"]
  }
}
EOF

echo "Configuration saved to s3-config.json"

# Clean up temporary files
rm -f web-bucket-policy.json assets-cors-config.json backup-lifecycle-config.json error.html

echo ""
echo "Next steps:"
echo "1. Update your frontend config.js with the S3 bucket URLs"
echo "2. Upload your web application files to s3://$WEB_BUCKET/"
echo "3. Test the website at: $WEBSITE_URL"
echo "4. Configure CloudFront for better performance (optional)"
