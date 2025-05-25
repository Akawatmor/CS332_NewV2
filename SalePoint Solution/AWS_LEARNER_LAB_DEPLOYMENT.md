# SalePoint Solution - AWS Learner Lab Deployment Guide

## Overview
This guide provides step-by-step instructions for deploying the SalePoint Solution to AWS Academy Learner Lab environment.

## Prerequisites

### 1. AWS Learner Lab Environment
- Active AWS Academy Learner Lab access
- Lab started with sufficient credits (recommend minimum 100 credits)
- Lab session time remaining (minimum 2 hours for initial deployment)

### 2. Local Development Environment
- PowerShell 5.1 or PowerShell Core 7+
- AWS CLI v2 installed and configured
- Node.js 18+ and npm
- Git (for version control)

## Step-by-Step Deployment

### Phase 1: Learner Lab Setup and Credential Configuration

#### 1.1 Start Your AWS Learner Lab
1. Log into AWS Academy
2. Navigate to your course and click "AWS Academy Learner Lab"
3. Click "Start Lab" and wait for the lab to be ready (green circle)
4. Note your available credits and session time

#### 1.2 Download AWS Credentials
1. In the Learner Lab interface, click "AWS Details"
2. Click "Download AWS CLI" to get your credentials
3. Extract the downloaded file to get:
   - `accessKeys.csv` (contains AWS credentials)
   - Instructions for CLI configuration

#### 1.3 Configure AWS CLI for Learner Lab
```powershell
# Method 1: Using AWS configure (recommended for Learner Lab)
aws configure
# Enter the following when prompted:
# AWS Access Key ID: [from accessKeys.csv]
# AWS Secret Access Key: [from accessKeys.csv]
# Default region name: us-east-1
# Default output format: json

# Method 2: Set environment variables (alternative)
$env:AWS_ACCESS_KEY_ID = "YOUR_ACCESS_KEY_FROM_CSV"
$env:AWS_SECRET_ACCESS_KEY = "YOUR_SECRET_KEY_FROM_CSV"
$env:AWS_SESSION_TOKEN = "YOUR_SESSION_TOKEN_FROM_CSV"
$env:AWS_DEFAULT_REGION = "us-east-1"
```

#### 1.4 Verify AWS Configuration
```powershell
# Test your AWS credentials
aws sts get-caller-identity

# Check available regions (Learner Lab typically supports us-east-1)
aws ec2 describe-regions --output table
```

### Phase 2: Pre-Deployment Validation

#### 2.1 Validate Project Structure
```powershell
# Navigate to the SalePoint Solution directory
cd "c:\Users\PetchAdmin\Desktop\Git Project Repository\CS232_NewV2\SalePoint Solution"

# Verify all required files exist
Get-ChildItem -Recurse | Where-Object { $_.Name -match "\.(yaml|js|json|md)$" } | Select-Object FullName
```

#### 2.2 Check Learner Lab Limits
Important Learner Lab constraints to consider:
- **Service Limits**: Some AWS services may have reduced limits
- **Region Restrictions**: Typically limited to us-east-1
- **IAM Permissions**: May have restricted IAM capabilities
- **Duration**: Lab sessions have time limits

#### 2.3 Validate CloudFormation Template
```powershell
# Validate the CloudFormation template syntax
aws cloudformation validate-template --template-body file://infrastructure/main-template.yaml
```

### Phase 3: Deployment Execution

#### 3.1 Run the Deployment Script
```powershell
# Execute the deployment with Learner Lab specific parameters
.\deploy.ps1 -ProjectName "salepoint-lab" -Region "us-east-1" -Environment "learnerlab"
```

#### 3.2 Monitor Deployment Progress
The deployment will proceed through these stages:
1. **AWS Configuration Validation** (2-3 minutes)
2. **CloudFormation Stack Creation** (15-20 minutes)
3. **Lambda Function Deployment** (5-10 minutes)
4. **API Gateway Configuration** (2-3 minutes)
5. **Frontend Build and Deployment** (5-8 minutes)
6. **Cognito User Setup** (2-3 minutes)
7. **Final Testing** (3-5 minutes)

**Total Expected Time: 30-45 minutes**

#### 3.3 Handle Common Learner Lab Issues

**Issue 1: IAM Permission Errors**
```powershell
# If you encounter IAM permission errors, try these alternatives:
# 1. Simplified stack name
$stackName = "salepoint-simple"

# 2. Use existing service roles if available
aws iam list-roles --query "Roles[?contains(RoleName, 'LabRole')].RoleName"
```

**Issue 2: Resource Limit Errors**
```powershell
# Check current resource usage
aws cloudformation describe-account-attributes --region us-east-1
aws lambda list-functions --region us-east-1
aws s3 ls
```

**Issue 3: Session Timeout**
```powershell
# If your session expires during deployment:
# 1. Note the CloudFormation stack name: "salepoint-lab-infrastructure"
# 2. Restart your Learner Lab
# 3. Reconfigure AWS CLI credentials
# 4. Resume deployment by checking stack status:
aws cloudformation describe-stacks --stack-name salepoint-lab-infrastructure --region us-east-1
```

### Phase 4: Post-Deployment Validation

#### 4.1 Verify Infrastructure Deployment
```powershell
# Check CloudFormation stack status
aws cloudformation describe-stacks --stack-name salepoint-lab-infrastructure --region us-east-1 --query "Stacks[0].StackStatus"

# Get stack outputs
aws cloudformation describe-stacks --stack-name salepoint-lab-infrastructure --region us-east-1 --query "Stacks[0].Outputs"
```

#### 4.2 Test Application Components
```powershell
# Test Lambda functions
aws lambda list-functions --region us-east-1 --query "Functions[?contains(FunctionName, 'salepoint')].FunctionName"

# Test API Gateway
$apiUrl = aws cloudformation describe-stacks --stack-name salepoint-lab-infrastructure --region us-east-1 --query "Stacks[0].Outputs[?OutputKey=='ApiGatewayUrl'].OutputValue" --output text
Invoke-RestMethod -Uri "$apiUrl/health" -Method GET

# Test S3 frontend deployment
$frontendUrl = aws cloudformation describe-stacks --stack-name salepoint-lab-infrastructure --region us-east-1 --query "Stacks[0].Outputs[?OutputKey=='FrontendBucketUrl'].OutputValue" --output text
Write-Host "Frontend URL: $frontendUrl"
```

#### 4.3 Access the Application
1. **Get the Frontend URL** from CloudFormation outputs
2. **Open in Browser**: Navigate to the S3 website URL
3. **Login Credentials** (as created during deployment):
   - **Admin**: admin@salepoint.com / AdminPassword123!
   - **Manager**: manager@salepoint.com / ManagerPass123!
   - **Sales**: sales@salepoint.com / SalesPass123!

### Phase 5: Testing and Validation

#### 5.1 Run Automated Tests
```powershell
# Run the comprehensive verification script
.\verify-solution.ps1

# Run API endpoint tests
.\test-api.ps1 -ApiBaseUrl $apiUrl -Region "us-east-1"

# Run feature demonstration
.\demo-solution.ps1
```

#### 5.2 Manual Testing Checklist
- [ ] Frontend loads successfully
- [ ] User authentication works with all three user types
- [ ] Product management (CRUD operations)
- [ ] Customer management (CRUD operations)
- [ ] Sales creation and tracking
- [ ] Inventory monitoring
- [ ] Analytics dashboard displays data
- [ ] Document upload/download functionality

## Learner Lab Specific Considerations

### Resource Management
- **Monitor Credits**: Keep track of your AWS credits usage
- **Session Management**: Plan deployments within session time limits
- **Clean Up**: Use the cleanup script when testing is complete

### Limitations and Workarounds
1. **Limited IAM Permissions**: Some advanced IAM features may be restricted
2. **Region Constraints**: Deployment limited to supported regions (typically us-east-1)
3. **Service Limits**: Some services may have reduced quotas
4. **Time Limits**: Lab sessions have maximum duration

### Cost Optimization
```powershell
# Monitor costs during deployment
aws ce get-cost-and-usage --time-period Start=2024-01-01,End=2024-01-31 --granularity MONTHLY --metrics UnblendedCost
```

## Troubleshooting

### Common Deployment Issues

**1. CloudFormation Stack Creation Fails**
```powershell
# Check stack events for errors
aws cloudformation describe-stack-events --stack-name salepoint-lab-infrastructure --region us-east-1

# Common fixes:
# - Ensure unique S3 bucket names
# - Verify IAM permissions
# - Check resource limits
```

**2. Lambda Function Deployment Errors**
```powershell
# Check Lambda function status
aws lambda get-function --function-name salepoint-lab-products --region us-east-1

# Update function code manually if needed
aws lambda update-function-code --function-name salepoint-lab-products --zip-file fileb://deployments/lambda-functions.zip --region us-east-1
```

**3. Frontend Deployment Issues**
```powershell
# Check S3 bucket and website configuration
aws s3 ls s3://salepoint-lab-frontend-*
aws s3api get-bucket-website --bucket salepoint-lab-frontend-*
```

**4. API Gateway Issues**
```powershell
# Check API Gateway deployment
aws apigateway get-rest-apis --region us-east-1
aws apigateway get-deployments --rest-api-id YOUR_API_ID --region us-east-1
```

## Cleanup Instructions

When you're finished testing, clean up resources to preserve credits:

```powershell
# Run the cleanup script
.\cleanup.ps1 -ProjectName "salepoint-lab" -Region "us-east-1"

# Manual cleanup if needed
aws cloudformation delete-stack --stack-name salepoint-lab-infrastructure --region us-east-1

# Verify cleanup
aws cloudformation describe-stacks --region us-east-1
```

## Success Criteria

Your deployment is successful when:
1. CloudFormation stack status is "CREATE_COMPLETE"
2. All Lambda functions are active and responding
3. API Gateway endpoints return valid responses
4. Frontend application loads and allows user login
5. All CRUD operations work for products, customers, and sales
6. Analytics dashboard displays sample data

## Support Resources

- **AWS Academy Support**: Contact your instructor for Learner Lab issues
- **AWS Documentation**: https://docs.aws.amazon.com/
- **Troubleshooting Guide**: See TROUBLESHOOTING.md in the project directory
- **Project Verification**: Run `.\verify-solution.ps1` for automated validation

## Next Steps After Deployment

1. **Load Sample Data**: Use the data loading scripts in `/sample-data/`
2. **Customize Configuration**: Modify settings in `/frontend/src/config/`
3. **Extend Functionality**: Add custom features using the provided API framework
4. **Monitor Performance**: Use CloudWatch logs and metrics for monitoring
5. **Document Changes**: Update project documentation for any modifications

---

**Note**: This deployment guide is specifically designed for AWS Academy Learner Lab environments. For production deployments, additional security and optimization considerations apply.
