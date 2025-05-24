#!/bin/bash

# SalePoint Solution - Complete AWS Deployment Script
# This is the master deployment script that orchestrates the entire deployment process

set -e

echo "=========================================="
echo "SalePoint Solution - AWS Deployment"
echo "=========================================="
echo ""

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOYMENT_LOG="deployment-$(date +%Y%m%d_%H%M%S).log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed. Please install AWS CLI first."
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS credentials are not configured. Please configure AWS CLI first."
        exit 1
    fi
    
    # Check if we're in AWS Learner Lab (optional warning)
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    if [[ $ACCOUNT_ID == 123456789012 ]]; then
        print_warning "This appears to be an example account ID. Make sure you're using AWS Learner Lab."
    fi
    
    # Check required files
    required_files=(
        "lambda-layer-config.json"
        "setup-api-gateway.sh"
        "setup-dynamodb.sh"
        "setup-s3.sh"
        "environment-variables.env"
    )
    
    for file in "${required_files[@]}"; do
        if [ ! -f "$SCRIPT_DIR/$file" ]; then
            print_error "Required file not found: $file"
            exit 1
        fi
    done
    
    print_success "Prerequisites check completed"
}

# Function to create Lambda layer
create_lambda_layer() {
    print_status "Creating Lambda layer for MySQL dependencies..."
    
    # Create temporary directory for layer
    LAYER_DIR=$(mktemp -d)
    cd "$LAYER_DIR"
    
    # Create layer structure
    mkdir -p nodejs
    cd nodejs
    
    # Initialize package.json
    cat > package.json << EOF
{
  "name": "mysql-layer",
  "version": "1.0.0",
  "description": "MySQL dependencies for SalePoint Lambda functions",
  "dependencies": {
    "mysql2": "^3.6.0",
    "aws-sdk": "^2.1490.0"
  }
}
EOF
    
    # Install dependencies
    npm install --production
    
    # Create layer zip
    cd ..
    zip -r mysql-layer.zip nodejs/
    
    # Upload layer to AWS
    LAYER_ARN=$(aws lambda publish-layer-version \
        --layer-name mysql-layer \
        --description "MySQL dependencies for SalePoint Solution" \
        --zip-file fileb://mysql-layer.zip \
        --compatible-runtimes nodejs18.x nodejs20.x \
        --query LayerVersionArn --output text)
    
    print_success "Lambda layer created: $LAYER_ARN"
    
    # Clean up
    cd "$SCRIPT_DIR"
    rm -rf "$LAYER_DIR"
    
    # Save layer ARN for later use
    echo "$LAYER_ARN" > layer-arn.txt
}

# Function to deploy Lambda functions
deploy_lambda_functions() {
    print_status "Deploying Lambda functions..."
    
    # Read layer ARN
    if [ -f layer-arn.txt ]; then
        LAYER_ARN=$(cat layer-arn.txt)
    else
        print_error "Layer ARN not found. Please create the layer first."
        exit 1
    fi
    
    # Lambda functions to deploy
    lambda_functions=(
        "getProductInfo"
        "customerManagement"
        "customerSalesRepTracking"
        "salesTracking"
        "salesRepresentatives"
        "dashboardAnalytics"
    )
    
    for func in "${lambda_functions[@]}"; do
        print_status "Deploying Lambda function: $func"
        
        # Check if function file exists
        if [ ! -f "../src/lambda/$func.js" ]; then
            print_warning "Lambda function file not found: $func.js, skipping..."
            continue
        fi
        
        # Create deployment package
        TEMP_DIR=$(mktemp -d)
        cp "../src/lambda/$func.js" "$TEMP_DIR/index.js"
        cd "$TEMP_DIR"
        zip -r "$func.zip" index.js
        
        # Check if function exists
        if aws lambda get-function --function-name "$func" &> /dev/null; then
            # Update existing function
            aws lambda update-function-code \
                --function-name "$func" \
                --zip-file "fileb://$func.zip"
            
            # Update layer configuration
            aws lambda update-function-configuration \
                --function-name "$func" \
                --layers "$LAYER_ARN"
        else
            # Create new function
            aws lambda create-function \
                --function-name "$func" \
                --runtime nodejs18.x \
                --role "arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/LabRole" \
                --handler index.handler \
                --zip-file "fileb://$func.zip" \
                --timeout 30 \
                --memory-size 256 \
                --layers "$LAYER_ARN" \
                --environment Variables="{
                    DB_HOST=\${DB_HOST},
                    DB_USER=\${DB_USER},
                    DB_PASSWORD=\${DB_PASSWORD},
                    DB_NAME=\${DB_NAME}
                }"
        fi
        
        cd "$SCRIPT_DIR"
        rm -rf "$TEMP_DIR"
        
        print_success "Deployed Lambda function: $func"
    done
}

# Function to create RDS database
create_rds_database() {
    print_status "Creating RDS MySQL database..."
    
    # Check if DB instance already exists
    if aws rds describe-db-instances --db-instance-identifier salepoint-db &> /dev/null; then
        print_warning "RDS instance 'salepoint-db' already exists, skipping creation..."
        return
    fi
    
    # Create DB subnet group (if it doesn't exist)
    if ! aws rds describe-db-subnet-groups --db-subnet-group-name salepoint-subnet-group &> /dev/null; then
        # Get default VPC subnets
        SUBNET_IDS=$(aws ec2 describe-subnets \
            --filters "Name=default-for-az,Values=true" \
            --query 'Subnets[*].SubnetId' \
            --output text)
        
        if [ -z "$SUBNET_IDS" ]; then
            print_error "No default subnets found. Please configure VPC subnets manually."
            return
        fi
        
        aws rds create-db-subnet-group \
            --db-subnet-group-name salepoint-subnet-group \
            --db-subnet-group-description "SalePoint DB Subnet Group" \
            --subnet-ids $SUBNET_IDS
    fi
    
    # Create security group for RDS
    VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query 'Vpcs[0].VpcId' --output text)
    
    # Create security group
    SG_ID=$(aws ec2 create-security-group \
        --group-name salepoint-db-sg \
        --description "Security group for SalePoint RDS instance" \
        --vpc-id "$VPC_ID" \
        --query 'GroupId' --output text 2>/dev/null || \
        aws ec2 describe-security-groups \
        --filters "Name=group-name,Values=salepoint-db-sg" \
        --query 'SecurityGroups[0].GroupId' --output text)
    
    # Add inbound rule for MySQL
    aws ec2 authorize-security-group-ingress \
        --group-id "$SG_ID" \
        --protocol tcp \
        --port 3306 \
        --cidr 0.0.0.0/0 2>/dev/null || echo "Security group rule already exists"
    
    # Create RDS instance
    aws rds create-db-instance \
        --db-instance-identifier salepoint-db \
        --db-instance-class db.t3.micro \
        --engine mysql \
        --engine-version 8.0.35 \
        --master-username admin \
        --master-user-password "SalePoint123!" \
        --allocated-storage 20 \
        --db-name salepoint_db \
        --vpc-security-group-ids "$SG_ID" \
        --db-subnet-group-name salepoint-subnet-group \
        --backup-retention-period 7 \
        --multi-az false \
        --publicly-accessible true \
        --storage-type gp2 \
        --auto-minor-version-upgrade true \
        --deletion-protection false
    
    print_status "Waiting for RDS instance to become available..."
    aws rds wait db-instance-available --db-instance-identifier salepoint-db
    
    # Get RDS endpoint
    DB_ENDPOINT=$(aws rds describe-db-instances \
        --db-instance-identifier salepoint-db \
        --query 'DBInstances[0].Endpoint.Address' \
        --output text)
    
    print_success "RDS instance created: $DB_ENDPOINT"
    
    # Save DB endpoint
    echo "$DB_ENDPOINT" > db-endpoint.txt
}

# Function to run deployment steps
run_deployment() {
    print_status "Starting complete AWS deployment for SalePoint Solution..."
    
    # Make scripts executable
    chmod +x setup-*.sh
    
    # Step 1: Create Lambda layer
    create_lambda_layer
    
    # Step 2: Create RDS database
    create_rds_database
    
    # Step 3: Deploy Lambda functions
    deploy_lambda_functions
    
    # Step 4: Setup DynamoDB
    print_status "Setting up DynamoDB tables..."
    ./setup-dynamodb.sh
    
    # Step 5: Setup S3 buckets
    print_status "Setting up S3 buckets..."
    ./setup-s3.sh
    
    # Step 6: Setup API Gateway
    print_status "Setting up API Gateway..."
    ./setup-api-gateway.sh
    
    print_success "All AWS resources deployed successfully!"
}

# Function to display deployment summary
show_deployment_summary() {
    echo ""
    print_success "=========================================="
    print_success "SalePoint Solution Deployment Complete!"
    print_success "=========================================="
    echo ""
    
    # Read configuration files
    if [ -f api-gateway-config.json ]; then
        API_ENDPOINT=$(cat api-gateway-config.json | grep -o '"apiEndpoint":"[^"]*' | cut -d'"' -f4)
        echo "API Gateway Endpoint: $API_ENDPOINT"
    fi
    
    if [ -f s3-config.json ]; then
        WEBSITE_URL=$(cat s3-config.json | grep -o '"websiteUrl":"[^"]*' | cut -d'"' -f4)
        echo "Website URL: $WEBSITE_URL"
    fi
    
    if [ -f db-endpoint.txt ]; then
        DB_ENDPOINT=$(cat db-endpoint.txt)
        echo "Database Endpoint: $DB_ENDPOINT"
    fi
    
    echo ""
    echo "Next Steps:"
    echo "1. Update environment variables in your Lambda functions"
    echo "2. Initialize the database schema:"
    echo "   mysql -h $DB_ENDPOINT -u admin -p salepoint_db < ../src/db/schema.sql"
    echo "3. Update frontend config.js with the API Gateway endpoint"
    echo "4. Upload your web application to the S3 bucket"
    echo "5. Test the application at the website URL"
    echo ""
    
    print_warning "Important Security Notes:"
    echo "- Change default database password in production"
    echo "- Configure proper IAM roles and policies"
    echo "- Enable CloudTrail for audit logging"
    echo "- Set up CloudWatch alarms for monitoring"
    echo ""
}

# Function to handle cleanup on error
cleanup_on_error() {
    print_error "Deployment failed. Cleaning up temporary files..."
    rm -f layer-arn.txt db-endpoint.txt
    exit 1
}

# Function to show help
show_help() {
    echo "SalePoint Solution - AWS Deployment Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --check-only     Only check prerequisites, don't deploy"
    echo "  --skip-rds       Skip RDS database creation"
    echo "  --skip-lambda    Skip Lambda function deployment"
    echo "  --help           Show this help message"
    echo ""
    echo "This script deploys the complete SalePoint Solution to AWS including:"
    echo "- Lambda functions with MySQL layer"
    echo "- RDS MySQL database"
    echo "- DynamoDB tables"
    echo "- S3 buckets with static website hosting"
    echo "- API Gateway with proper endpoints"
    echo ""
}

# Parse command line arguments
SKIP_RDS=false
SKIP_LAMBDA=false
CHECK_ONLY=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --check-only)
            CHECK_ONLY=true
            shift
            ;;
        --skip-rds)
            SKIP_RDS=true
            shift
            ;;
        --skip-lambda)
            SKIP_LAMBDA=true
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Main execution
main() {
    # Set up error handling
    trap cleanup_on_error ERR
    
    # Start logging
    exec > >(tee -a "$DEPLOYMENT_LOG")
    exec 2>&1
    
    print_status "Deployment log: $DEPLOYMENT_LOG"
    
    # Check prerequisites
    check_prerequisites
    
    if [ "$CHECK_ONLY" = true ]; then
        print_success "Prerequisites check completed. Ready for deployment."
        exit 0
    fi
    
    # Run deployment
    run_deployment
    
    # Show summary
    show_deployment_summary
    
    print_success "Deployment completed successfully!"
    print_status "Deployment log saved to: $DEPLOYMENT_LOG"
}

# Run main function
main "$@"
