# SalePoint Deployment Guide - AWS Learner Lab Edition

## Prerequisites

1. **AWS Learner Lab Access**
   - Ensure you have an active AWS Learner Lab environment
   - Start your lab session and note down the AWS credentials
   - **Important**: Learner Lab has IAM restrictions - use simplified deployment

2. **Node.js 18+ installed locally**
   - Download from: https://nodejs.org/
   - Verify installation: `node --version`

3. **AWS CLI installed and configured**
   - Install: https://aws.amazon.com/cli/
   - Configure with your lab credentials: `aws configure`
   - **Use temporary credentials from Learner Lab**

4. **Git (if cloning the repository)**

## Learner Lab Specific Architecture

The SalePoint Learner Lab solution includes:
- **API Layer**: API Gateway with Lambda function integrations using existing LabRole
- **Database**: DynamoDB tables (compatible with Learner Lab restrictions)
- **Storage**: Lambda functions for business logic
- **No Custom IAM**: Uses existing LabRole to comply with Learner Lab restrictions

## Current Deployment Status

✅ **DEPLOYED AND WORKING**
- CloudFormation Stack: `salepoint-lab` (CREATE_COMPLETE)
- API Gateway URL: `https://jr4rw0w0uh.execute-api.us-east-1.amazonaws.com/prod`
- DynamoDB Tables: 3 tables (customers, orders, products)
- Lambda Functions: 2 functions (products, customers)

## API Gateway Endpoints

✅ **Currently Available and Working:**

### Products API
- `GET /products` - ✅ Working (returns test response)
- **URL**: https://jr4rw0w0uh.execute-api.us-east-1.amazonaws.com/prod/products

### Customers API  
- `GET /customers` - ✅ Working (returns test response)
- **URL**: https://jr4rw0w0uh.execute-api.us-east-1.amazonaws.com/prod/customers

🚧 **Coming Soon** (extend existing Lambda functions):
- `POST /products` - Create new product
- `PUT /products/{productId}` - Update product  
- `DELETE /products/{productId}` - Delete product
- `POST /customers` - Create new customer
- `PUT /customers/{customerId}` - Update customer
- `DELETE /customers/{customerId}` - Delete customer
- Sales, Inventory, Analytics, and Documents APIs

All endpoints support CORS for browser compatibility.

## Quick Deployment

### ✅ Already Deployed (Current Status)

The SalePoint infrastructure is already successfully deployed with frontend! 

**🌐 Live Dashboard**: http://salepoint-frontend-747605646409-us-east-1.s3-website-us-east-1.amazonaws.com

**📊 Backend APIs**: https://jr4rw0w0uh.execute-api.us-east-1.amazonaws.com/prod

```bash
# Check current deployment status
aws cloudformation describe-stacks --stack-name salepoint-lab

# Test the working APIs
./test-learner-lab.sh

# View stack outputs
aws cloudformation describe-stacks --stack-name salepoint-lab --query 'Stacks[0].Outputs' --output table
```

### 🔄 Complete Deployment (Backend + Frontend)

```bash
# Deploy everything including frontend
./deploy-complete.sh

# Or deploy individually:
./deploy-learner-lab-simple.sh  # Backend only
./test-learner-lab.sh           # Test and update config
```

## Deployment Steps

### Step 1: Setup Environment

1. **Configure AWS Credentials**
   ```powershell
   aws configure
   # Enter your AWS Access Key ID, Secret Access Key, and Region (us-east-1)
   ```

2. **Clone or Download the Project**
   ```powershell
   cd "C:\Users\PetchAdmin\Desktop\Git Project Repository\CS232_NewV2\SalePoint Solution"
   ```

### Step 2: Deploy Infrastructure

1. **Deploy CloudFormation Stack**
   ```powershell
   aws cloudformation create-stack `
     --stack-name salepoint-infrastructure `
     --template-body file://infrastructure/main-template.yaml `
     --capabilities CAPABILITY_NAMED_IAM `
     --parameters ParameterKey=ProjectName,ParameterValue=salepoint
   ```

2. **Wait for Stack Creation (15-20 minutes)**
   ```powershell
   aws cloudformation wait stack-create-complete --stack-name salepoint-infrastructure
   ```

3. **Get Stack Outputs**
   ```powershell
   aws cloudformation describe-stacks --stack-name salepoint-infrastructure --query "Stacks[0].Outputs"
   ```

### Step 3: Database Setup

1. **Connect to RDS Database**
   - Get the database endpoint from CloudFormation outputs
   - Use MySQL Workbench or command line to connect
   - Credentials: admin / SalePoint123!

2. **Run Database Schema**
   ```sql
   source database/schema.sql
   ```

3. **Load Sample Data (Optional)**
   ```sql
   source database/sample-data.sql
   ```

### Step 4: Deploy Lambda Functions

1. **Package Lambda Functions**
   ```powershell
   cd lambda-functions
   npm install
   ```

2. **Create Deployment Package**
   ```powershell
   # For each function
   Compress-Archive -Path *.js,node_modules -DestinationPath ../deployments/lambda-functions.zip
   ```

3. **Update Lambda Functions**
   ```powershell
   aws lambda update-function-code --function-name salepoint-products --zip-file fileb://../deployments/lambda-functions.zip
   aws lambda update-function-code --function-name salepoint-customers --zip-file fileb://../deployments/lambda-functions.zip
   aws lambda update-function-code --function-name salepoint-sales --zip-file fileb://../deployments/lambda-functions.zip
   aws lambda update-function-code --function-name salepoint-inventory --zip-file fileb://../deployments/lambda-functions.zip
   aws lambda update-function-code --function-name salepoint-analytics --zip-file fileb://../deployments/lambda-functions.zip
   aws lambda update-function-code --function-name salepoint-documents --zip-file fileb://../deployments/lambda-functions.zip
   ```

### Step 5: Setup API Gateway

1. **Create API Gateway Deployment**
   ```powershell
   # Get API Gateway ID from CloudFormation outputs
   $API_ID = "your-api-gateway-id"
   aws apigateway create-deployment --rest-api-id $API_ID --stage-name prod
   ```

### Step 6: Deploy Frontend

1. **Build React Application**
   ```powershell
   cd frontend
   npm install
   ```

2. **Update AWS Configuration**
   - Edit `src/config/aws-config.js` with your actual AWS values from CloudFormation outputs

3. **Build for Production**
   ```powershell
   npm run build
   ```

4. **Deploy to S3**
   ```powershell
   # Get bucket name from CloudFormation outputs
   $BUCKET_NAME = "your-frontend-bucket-name"
   aws s3 sync build/ s3://$BUCKET_NAME --delete
   ```

### Step 7: Setup Cognito Users

1. **Create Admin User**
   ```powershell
   $USER_POOL_ID = "your-user-pool-id"
   aws cognito-idp admin-create-user `
     --user-pool-id $USER_POOL_ID `
     --username admin@salepoint.com `
     --user-attributes Name=email,Value=admin@salepoint.com Name=name,Value="Admin User" Name=custom:role,Value=admin `
     --temporary-password TempPassword123! `
     --message-action SUPPRESS
   ```

2. **Set Permanent Password**
   ```powershell
   aws cognito-idp admin-set-user-password `
     --user-pool-id $USER_POOL_ID `
     --username admin@salepoint.com `
     --password AdminPassword123! `
     --permanent
   ```

## Access the Application

### 🌐 Live Dashboard (Ready to Use!)

**Frontend URL**: http://salepoint-frontend-747605646409-us-east-1.s3-website-us-east-1.amazonaws.com

**Features Available:**
- ✅ Dashboard Overview
- ✅ Products Management (connected to API)
- ✅ Customers Management (connected to API) 
- ✅ Sales Tracking Interface
- ✅ Inventory Management Interface
- ✅ Analytics Dashboard Interface
- ✅ Modern Material-UI Design

### 🔗 API Endpoints (Working)

**Base URL**: https://jr4rw0w0uh.execute-api.us-east-1.amazonaws.com/prod

- `GET /products` - ✅ Working
- `GET /customers` - ✅ Working

**Test APIs directly:**
```bash
# Test Products API
curl https://jr4rw0w0uh.execute-api.us-east-1.amazonaws.com/prod/products

# Test Customers API  
curl https://jr4rw0w0uh.execute-api.us-east-1.amazonaws.com/prod/customers
```

## Troubleshooting

### Common Issues

1. **Lambda Functions Not Working**
   - Check VPC configuration
   - Verify security groups allow database access
   - Check CloudWatch logs

2. **Database Connection Issues**
   - Verify RDS is in the correct VPC
   - Check security group rules
   - Ensure Lambda functions are in private subnets

3. **Frontend Can't Connect to API**
   - Verify API Gateway URL in aws-config.js
   - Check CORS configuration
   - Ensure Cognito settings are correct

### Monitoring

1. **CloudWatch Logs**
   ```powershell
   aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/salepoint"
   ```

2. **API Gateway Logs**
   - Enable CloudWatch logging in API Gateway console

3. **RDS Performance Insights**
   - Monitor database performance in AWS console

## Cleanup

To remove all resources:

```powershell
# Delete S3 bucket contents first
aws s3 rm s3://your-frontend-bucket-name --recursive
aws s3 rm s3://your-documents-bucket-name --recursive

# Delete CloudFormation stack
aws cloudformation delete-stack --stack-name salepoint-infrastructure
```

## Support

For issues or questions:
1. Check CloudWatch logs
2. Verify AWS Learner Lab permissions
3. Review the troubleshooting section above
