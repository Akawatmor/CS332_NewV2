# SalePoint Solution - Bash Deployment Scripts

This directory contains bash equivalents of the PowerShell deployment scripts, optimized for AWS Academy Learner Lab environment and cross-platform compatibility.

## Prerequisites

### Required Software
- **AWS CLI v2**: [Download and install](https://aws.amazon.com/cli/)
- **jq**: JSON processor for parsing API responses
  - Ubuntu/Debian: `sudo apt-get install jq`
  - macOS: `brew install jq`
  - Windows: Download from [jq website](https://jqlang.github.io/jq/)
- **curl**: For API testing (usually pre-installed)
- **Node.js & npm**: For frontend build process
- **zip**: For Lambda deployment packages

### AWS Setup
1. Configure AWS credentials from your Learner Lab:
   - Go to AWS Academy Learner Lab
   - Click "AWS Details" → "Download AWS CLI"
   - Run `aws configure` with the provided credentials

## Scripts Overview

### 1. `deploy-learner-lab.sh` - Main Deployment Script

**Purpose**: Complete deployment of SalePoint Solution to AWS Learner Lab

**Usage**:
```bash
# Basic deployment
./deploy-learner-lab.sh

# Custom configuration
./deploy-learner-lab.sh my-project us-west-2 production false true

# Parameters:
# 1. PROJECT_NAME (default: salepoint-lab)
# 2. REGION (default: us-east-1)
# 3. ENVIRONMENT (default: learnerlab)
# 4. SKIP_CLEANUP (default: false)
# 5. MONITOR_CREDITS (default: true)
```

**What it does**:
- ✅ Validates AWS credentials and environment
- ✅ Deploys CloudFormation infrastructure
- ✅ Packages and deploys Lambda functions
- ✅ Configures API Gateway
- ✅ Builds and deploys React frontend
- ✅ Sets up Cognito users
- ✅ Performs comprehensive testing
- ✅ Provides deployment summary

### 2. `test-api.sh` - API Testing Script

**Purpose**: Tests all deployed API endpoints

**Usage**:
```bash
./test-api.sh https://your-api-id.execute-api.us-east-1.amazonaws.com/prod
```

**Features**:
- Tests health endpoint
- Validates all API endpoints (products, customers, sales, inventory, analytics)
- Provides clear pass/fail status

### 3. `cleanup.sh` - Resource Cleanup Script

**Purpose**: Safely removes all AWS resources created by deployment

**Usage**:
```bash
# Interactive cleanup
./cleanup.sh

# Automated cleanup
./cleanup.sh my-project us-west-2 true

# Parameters:
# 1. PROJECT_NAME (default: salepoint-lab)
# 2. REGION (default: us-east-1)
# 3. FORCE_DELETE (default: false)
```

**What it cleans**:
- CloudFormation stacks
- S3 buckets (empties first)
- Orphaned Lambda functions
- Orphaned API Gateway APIs
- Local deployment files

### 4. `demo-solution.sh` - Feature Demonstration

**Purpose**: Showcases SalePoint functionality and provides usage guide

**Usage**:
```bash
./demo-solution.sh
```

**Features**:
- System health checks
- API functionality tests
- Performance metrics
- Architecture overview
- User guide with login credentials

## File Structure

```
SalePoint Solution/
├── deploy-learner-lab.sh      # Main deployment script (bash)
├── deploy-learner-lab.ps1     # Main deployment script (PowerShell)
├── test-api.sh                # API testing (bash)
├── cleanup.sh                 # Resource cleanup (bash)
├── demo-solution.sh           # Feature demo (bash)
├── verify-solution.ps1        # Solution verification (PowerShell)
├── deployment-info.json       # Generated deployment metadata
├── infrastructure/            # CloudFormation templates
├── lambda-functions/          # Lambda function source code
├── frontend/                  # React application
└── deployments/              # Generated deployment packages
```

## Deployment Process

### Step-by-Step Deployment

1. **Prepare Environment**:
   ```bash
   # Ensure you're in the SalePoint Solution directory
   cd "path/to/SalePoint Solution"
   
   # Make scripts executable (Linux/macOS)
   chmod +x *.sh
   ```

2. **Run Deployment**:
   ```bash
   ./deploy-learner-lab.sh
   ```

3. **Monitor Progress**:
   - The script provides real-time progress updates
   - CloudFormation deployment takes 15-20 minutes
   - Full deployment typically completes in 25-30 minutes

4. **Access Application**:
   - Frontend URL will be displayed upon completion
   - Login credentials are provided in the output

5. **Test Deployment**:
   ```bash
   # Test APIs
   ./test-api.sh <API_URL>
   
   # Run demo
   ./demo-solution.sh
   
   # Verify solution (if PowerShell available)
   pwsh -File verify-solution.ps1
   ```

6. **Cleanup When Done**:
   ```bash
   ./cleanup.sh
   ```

## Learner Lab Specific Features

### Credit Monitoring
- Automatically checks existing resource usage
- Warns about potential credit consumption
- Suggests cleanup when limits are approached

### Error Handling
- Comprehensive error handling for common Learner Lab issues
- Specific guidance for IAM permission problems
- Timeout handling for slow operations

### Resource Optimization
- Uses unique suffixes to avoid naming conflicts
- Optimized for Learner Lab resource limits
- Efficient cleanup to minimize credit usage

## Troubleshooting

### Common Issues

**1. Permission Denied**
```bash
# Make script executable
chmod +x deploy-learner-lab.sh
```

**2. AWS Credentials Not Found**
```bash
# Configure AWS CLI
aws configure
# Use credentials from AWS Academy Learner Lab
```

**3. jq Command Not Found**
```bash
# Ubuntu/Debian
sudo apt-get install jq

# macOS
brew install jq

# Windows - download from https://jqlang.github.io/jq/
```

**4. CloudFormation Stack Creation Failed**
- Check IAM permissions in Learner Lab
- Verify region availability
- Check for resource limits

**5. Frontend Build Failed**
```bash
# Navigate to frontend directory and check dependencies
cd frontend
npm install
npm run build
```

### Debug Mode

Enable verbose output for troubleshooting:
```bash
# Run with debug output
bash -x deploy-learner-lab.sh
```

## Cross-Platform Compatibility

### Windows
- Use Git Bash, WSL2, or PowerShell with Linux compatibility
- Ensure jq and curl are available
- Consider using the PowerShell version instead

### macOS/Linux
- Scripts should work out of the box
- Install dependencies via package manager
- Ensure AWS CLI v2 is installed

## Security Considerations

### Credentials
- Never commit AWS credentials to version control
- Use temporary Learner Lab credentials only
- Rotate credentials regularly

### Resource Access
- Scripts use least-privilege access patterns
- All resources are scoped to the project
- Cleanup scripts remove all created resources

## Performance Optimization

### Parallel Operations
- Lambda deployments run in parallel where possible
- API testing includes performance metrics
- Frontend optimization for fast loading

### Resource Efficiency
- Minimal resource footprint for Learner Lab
- Efficient packaging for Lambda functions
- Optimized CloudFormation templates

## Support and Maintenance

### Getting Help
1. Check the troubleshooting section above
2. Review AWS CloudFormation console for stack events
3. Check CloudWatch logs for Lambda function errors
4. Verify AWS Academy Learner Lab session is active

### Script Maintenance
- Scripts are designed to be self-contained
- No external dependencies beyond AWS CLI and standard tools
- Regular testing ensures compatibility with AWS updates

## Migration from PowerShell

If you're migrating from the PowerShell version:

1. **Functionality Parity**: All PowerShell features are implemented in bash
2. **Parameter Compatibility**: Similar parameter structure
3. **Output Format**: Consistent formatting and progress reporting
4. **Deployment Info**: Same JSON format for deployment metadata

## License and Usage

These scripts are designed for educational use in AWS Academy Learner Lab environments. Please ensure compliance with your institution's policies and AWS Academy terms of use.
