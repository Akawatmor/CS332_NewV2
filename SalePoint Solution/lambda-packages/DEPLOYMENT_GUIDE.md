# SalePoint Solution - AWS Lambda Deployment Guide

This guide will help you deploy the SalePoint Lambda functions to AWS.

## Prerequisites

1. **AWS CLI installed and configured**
   ```bash
   aws configure
   ```
   Make sure you have:
   - AWS Access Key ID
   - AWS Secret Access Key
   - Default region (e.g., us-east-1)

2. **Required AWS Permissions**
   Your AWS user needs permissions for:
   - Lambda (create, update functions)
   - DynamoDB (create tables)
   - IAM (create roles and policies)
   - CloudWatch Logs

## Deployment Steps

### Step 1: Make Scripts Executable
```bash
chmod +x setup-iam.sh
chmod +x setup-dynamodb.sh
chmod +x deploy-lambdas.sh
```

### Step 2: Set Up IAM Role
```bash
./setup-iam.sh
```
This will:
- Create an IAM role for Lambda execution
- Create policies for DynamoDB access and CloudWatch logging
- Output the Role ARN (copy this for step 4)

### Step 3: Set Up DynamoDB Tables
```bash
./setup-dynamodb.sh
```
This will create four DynamoDB tables:
- SalePoint-Customers
- SalePoint-Products
- SalePoint-Inventory
- SalePoint-Sales

### Step 4: Update Deployment Script
Edit `deploy-lambdas.sh` and update:
```bash
ROLE_ARN="arn:aws:iam::YOUR_ACCOUNT_ID:role/salepoint-lambda-execution-role"
```
Replace with the actual Role ARN from Step 2.

### Step 5: Deploy Lambda Functions
```bash
./deploy-lambdas.sh
```
This will deploy all four Lambda functions:
- salepoint-customers
- salepoint-inventory
- salepoint-products
- salepoint-sales

## Manual Deployment (Alternative)

If you prefer to deploy manually through AWS Console:

1. **Go to AWS Lambda Console**
2. **Create Function** → **Author from scratch**
3. **Function name**: salepoint-customers
4. **Runtime**: Node.js 18.x
5. **Execution role**: Use existing role (salepoint-lambda-execution-role)
6. **Upload ZIP file**: customers-fixed.zip
7. **Set Handler**: index.handler
8. **Environment Variables**:
   - DYNAMODB_REGION: us-east-1
   - CUSTOMERS_TABLE: SalePoint-Customers
   - PRODUCTS_TABLE: SalePoint-Products
   - INVENTORY_TABLE: SalePoint-Inventory
   - SALES_TABLE: SalePoint-Sales

Repeat for all four functions.

## Testing the Functions

### Test Event for Customers Function
```json
{
  "httpMethod": "POST",
  "body": "{\"name\":\"John Doe\",\"email\":\"john@example.com\",\"phone\":\"123-456-7890\"}"
}
```

### Test Event for Products Function
```json
{
  "httpMethod": "POST",
  "body": "{\"name\":\"Test Product\",\"price\":99.99,\"category\":\"Electronics\"}"
}
```

### Test Event for Inventory Function
```json
{
  "httpMethod": "POST",
  "body": "{\"productId\":\"prod123\",\"quantity\":50,\"location\":\"Warehouse A\"}"
}
```

### Test Event for Sales Function
```json
{
  "httpMethod": "POST",
  "body": "{\"customerId\":\"cust123\",\"productId\":\"prod123\",\"quantity\":2,\"totalAmount\":199.98}"
}
```

## API Gateway Setup (Optional)

To expose these functions as REST APIs:

1. **Create REST API** in API Gateway
2. **Create Resources** for each service:
   - /customers
   - /products
   - /inventory
   - /sales
3. **Create Methods** (GET, POST, PUT, DELETE)
4. **Integrate** with corresponding Lambda functions
5. **Deploy API** to a stage

## Troubleshooting

### Common Issues:

1. **Permission Denied**: Check IAM role has correct policies
2. **Table Not Found**: Ensure DynamoDB tables are created
3. **Function Not Found**: Check function names match exactly
4. **Timeout**: Increase Lambda timeout in configuration

### Checking Logs:
```bash
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/salepoint-"
aws logs tail "/aws/lambda/salepoint-customers" --follow
```

## Cost Optimization

- Use provisioned concurrency for consistent performance
- Monitor CloudWatch metrics for optimization opportunities
- Consider DynamoDB on-demand billing for variable workloads

## Security Best Practices

- Use least-privilege IAM policies
- Enable CloudTrail for audit logging
- Consider VPC deployment for enhanced security
- Use AWS Secrets Manager for sensitive data

## Next Steps

1. Set up API Gateway for REST endpoints
2. Implement authentication (Cognito)
3. Add monitoring and alerting
4. Set up CI/CD pipeline
5. Configure auto-scaling policies
