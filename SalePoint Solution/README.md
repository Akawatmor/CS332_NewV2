# SalePoint Solution - AWS Deployment Guide

A comprehensive sales management system built with AWS services including Lambda, RDS MySQL, DynamoDB, S3, and API Gateway.

## 🚀 Quick Start

### Prerequisites

1. **AWS Account** - AWS Learner Lab or personal AWS account
2. **AWS CLI** - Installed and configured with appropriate credentials
3. **Node.js** - Version 18.x or higher (for local development)
4. **MySQL Client** - For database initialization
5. **Bash Shell** - Linux, macOS, or Windows with WSL/Git Bash

### Deployment Commands

```bash
# Clone the repository
git clone <repository-url>
cd "SalePoint Solution/deployment"

# Make deployment script executable
chmod +x deploy-aws.sh

# Check prerequisites
./deploy-aws.sh --check-only

# Deploy everything
./deploy-aws.sh
```

## 📋 Architecture Overview

### AWS Services Used

- **Lambda Functions** (6 functions)
  - Product management
  - Customer management
  - Sales tracking
  - Sales representative management
  - Customer-Sales Rep assignments
  - Dashboard analytics

- **RDS MySQL** - Primary database for transactional data
- **DynamoDB** - Session management, caching, and logging
- **S3** - Static website hosting, file storage, and backups
- **API Gateway** - RESTful API endpoints
- **CloudWatch** - Monitoring and logging

### System Components

```
Frontend (S3 Static Website)
    ↓
API Gateway
    ↓
Lambda Functions (with MySQL Layer)
    ↓
RDS MySQL + DynamoDB + S3 Storage
```

## 🛠 Detailed Deployment Steps

### Step 1: Environment Setup

1. **Configure AWS CLI**
   ```bash
   aws configure
   # Enter your AWS Access Key ID, Secret Key, Region (us-east-1), and output format (json)
   ```

2. **Verify AWS Access**
   ```bash
   aws sts get-caller-identity
   ```

### Step 2: Automatic Deployment

Run the master deployment script:

```bash
./deploy-aws.sh
```

This script will:
1. Create Lambda layer with MySQL dependencies
2. Deploy all Lambda functions
3. Create RDS MySQL database
4. Set up DynamoDB tables
5. Configure S3 buckets with static hosting
6. Create API Gateway with all endpoints

### Step 3: Manual Steps After Deployment

1. **Initialize Database Schema**
   ```bash
   # Get database endpoint from deployment output
   DB_ENDPOINT=$(cat db-endpoint.txt)
   
   # Run schema creation
   mysql -h $DB_ENDPOINT -u admin -p salepoint_db < ../src/db/schema.sql
   ```

2. **Update Frontend Configuration**
   ```javascript
   // Update src/web/js/config.js
   CONFIG.api.baseURL = 'https://your-api-id.execute-api.us-east-1.amazonaws.com/prod';
   ```

3. **Upload Web Application**
   ```bash
   # Upload to S3 bucket
   aws s3 sync ../src/web/ s3://your-web-bucket-name/
   ```

## 🔧 Manual Deployment (Step by Step)

If you prefer to deploy components individually:

### 1. Lambda Layer
```bash
# Create MySQL dependencies layer
cd deployment
chmod +x setup-lambda-layer.sh
./setup-lambda-layer.sh
```

### 2. DynamoDB Tables
```bash
chmod +x setup-dynamodb.sh
./setup-dynamodb.sh
```

### 3. S3 Buckets
```bash
chmod +x setup-s3.sh
./setup-s3.sh
```

### 4. API Gateway
```bash
chmod +x setup-api-gateway.sh
./setup-api-gateway.sh
```

### 5. RDS Database
```bash
# Create RDS instance manually through AWS Console or CLI
aws rds create-db-instance \
  --db-instance-identifier salepoint-db \
  --db-instance-class db.t3.micro \
  --engine mysql \
  --master-username admin \
  --master-user-password "YourSecurePassword123!" \
  --allocated-storage 20 \
  --db-name salepoint_db
```

## 📁 Project Structure

```
SalePoint Solution/
├── src/
│   ├── web/                    # Frontend application
│   │   ├── index.html         # Main HTML file
│   │   ├── css/
│   │   │   └── styles.css     # Comprehensive styling
│   │   └── js/
│   │       ├── config.js      # Configuration module
│   │       ├── api.js         # API communication
│   │       ├── app.js         # Main application
│   │       ├── dashboard.js   # Dashboard functionality
│   │       ├── products.js    # Product management
│   │       ├── customers.js   # Customer management
│   │       ├── sales.js       # Sales management
│   │       └── salesReps.js   # Sales rep management
│   ├── lambda/                # Lambda function code
│   │   ├── getProductInfo.js
│   │   ├── customerManagement.js
│   │   ├── customerSalesRepTracking.js
│   │   ├── salesTracking.js
│   │   ├── salesRepresentatives.js
│   │   └── dashboardAnalytics.js
│   └── db/
│       └── schema.sql         # MySQL database schema
└── deployment/               # Deployment scripts
    ├── deploy-aws.sh         # Master deployment script
    ├── setup-api-gateway.sh  # API Gateway setup
    ├── setup-dynamodb.sh     # DynamoDB setup
    ├── setup-s3.sh          # S3 setup
    ├── lambda-layer-config.json
    └── environment-variables.env
```

## 🔧 Configuration

### Environment Variables

Copy `environment-variables.env` to `.env` and update the values:

```bash
cp environment-variables.env .env
# Edit .env with your specific values
```

Key variables to update:
- `AWS_ACCOUNT_ID` - Your AWS account ID
- `DB_HOST` - RDS endpoint after creation
- `DB_PASSWORD` - Your secure database password
- `API_GATEWAY_ID` - Generated after API Gateway creation

### Frontend Configuration

Update `src/web/js/config.js`:

```javascript
const CONFIG = {
    api: {
        baseURL: 'https://your-api-id.execute-api.us-east-1.amazonaws.com/prod',
        timeout: 30000,
        retryAttempts: 3
    },
    // ... other configuration
};
```

## 🧪 Testing the Deployment

### 1. Test API Endpoints

```bash
# Test health check
curl https://your-api-id.execute-api.us-east-1.amazonaws.com/prod/products

# Test with browser
open https://your-api-id.execute-api.us-east-1.amazonaws.com/prod/dashboard
```

### 2. Test Web Application

```bash
# Open website
open http://your-web-bucket.s3-website-us-east-1.amazonaws.com
```

### 3. Database Connection Test

```bash
# Connect to database
mysql -h your-db-endpoint.rds.amazonaws.com -u admin -p salepoint_db

# Test query
mysql> SELECT COUNT(*) FROM products;
```

## 🚨 Troubleshooting

### Common Issues

1. **Lambda Function Timeouts**
   - Increase timeout in Lambda configuration
   - Check database connection settings
   - Review CloudWatch logs

2. **API Gateway CORS Errors**
   - Verify CORS configuration in API Gateway
   - Check preflight OPTIONS requests

3. **Database Connection Issues**
   - Verify security group settings
   - Check RDS endpoint and credentials
   - Ensure database is publicly accessible

4. **S3 Access Issues**
   - Verify bucket policies for public read access
   - Check static website hosting configuration

### Debugging Commands

```bash
# Check Lambda logs
aws logs tail /aws/lambda/getProductInfo --follow

# Check RDS status
aws rds describe-db-instances --db-instance-identifier salepoint-db

# Check API Gateway configuration
aws apigateway get-rest-api --rest-api-id your-api-id

# Test Lambda function directly
aws lambda invoke --function-name getProductInfo output.json
```

## 🔐 Security Considerations

### Production Deployment

1. **Database Security**
   - Change default passwords
   - Use parameter store for secrets
   - Enable encryption at rest

2. **Network Security**
   - Configure VPC with private subnets
   - Use security groups with minimal access
   - Enable VPC endpoints for AWS services

3. **IAM Security**
   - Use least privilege principle
   - Create specific IAM roles for each Lambda
   - Enable CloudTrail for audit logging

4. **Application Security**
   - Implement authentication/authorization
   - Add input validation and sanitization
   - Use HTTPS only

### Security Checklist

- [ ] Database passwords changed from defaults
- [ ] IAM roles follow least privilege
- [ ] CloudTrail enabled for audit logging
- [ ] Security groups configured properly
- [ ] SSL/TLS certificates configured
- [ ] Input validation implemented
- [ ] Error handling doesn't expose sensitive data

## 💰 Cost Optimization

### AWS Learner Lab Considerations

- Use `t3.micro` instances for RDS (free tier eligible)
- Set DynamoDB to on-demand billing
- Use S3 standard storage class
- Monitor usage with CloudWatch

### Production Cost Optimization

- Use reserved instances for predictable workloads
- Implement S3 lifecycle policies
- Use CloudWatch for monitoring and alerts
- Consider Lambda provisioned concurrency for high traffic

## 📊 Monitoring and Maintenance

### CloudWatch Dashboards

The deployment automatically sets up monitoring for:
- Lambda function performance
- RDS database metrics
- API Gateway request metrics
- DynamoDB usage patterns

### Log Management

- Lambda logs: `/aws/lambda/function-name`
- API Gateway logs: CloudWatch API Gateway logs
- Application logs: Custom CloudWatch log groups

### Backup Strategy

- RDS automated backups (7 days retention)
- S3 versioning enabled
- DynamoDB point-in-time recovery
- Lambda function code in version control

## 🆘 Support and Maintenance

### Regular Maintenance Tasks

1. **Weekly**
   - Review CloudWatch dashboards
   - Check error logs
   - Monitor costs

2. **Monthly**
   - Update Lambda dependencies
   - Review and rotate access keys
   - Audit IAM permissions

3. **Quarterly**
   - Update application code
   - Review backup and disaster recovery
   - Performance optimization review

### Getting Help

1. Check CloudWatch logs for detailed error messages
2. Review AWS documentation for service-specific issues
3. Use AWS support for infrastructure issues
4. Check the project repository for updates and bug fixes

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

**Note**: This deployment guide assumes you're using AWS Learner Lab or have appropriate AWS permissions. Some steps may require administrator access to your AWS account.
