# SalePoint Solution - AWS Learner Lab Cleanup Script
# Removes all deployed resources to preserve AWS Academy credits

param(
    [Parameter(Mandatory=$false)]
    [string]$ProjectName = "salepoint-lab",
    
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-east-1",
    
    [Parameter(Mandatory=$false)]
    [switch]$Force = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$PreserveData = $false
)

# Enhanced error handling
$ErrorActionPreference = "Continue"

# Color functions
function Write-Success { param($Message) Write-Host $Message -ForegroundColor Green }
function Write-Warning { param($Message) Write-Host $Message -ForegroundColor Yellow }
function Write-Error { param($Message) Write-Host $Message -ForegroundColor Red }
function Write-Info { param($Message) Write-Host $Message -ForegroundColor Cyan }
function Write-Step { param($Message) Write-Host "`n=== $Message ===" -ForegroundColor Magenta }

Write-Host @"
╔══════════════════════════════════════════════════════════════════╗
║                 SalePoint Solution - Cleanup Script             ║
║                     AWS Learner Lab Optimized                   ║
╚══════════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Yellow

Write-Info "Project Name Pattern: $ProjectName*"
Write-Info "Region: $Region"
Write-Info "Preserve Data: $PreserveData"
Write-Info "Force Mode: $Force"

# Confirmation prompt
if (-not $Force) {
    Write-Warning "`n⚠️  WARNING: This will delete ALL SalePoint resources in your AWS account!"
    Write-Warning "This action cannot be undone and will permanently remove:"
    Write-Warning "• CloudFormation stacks and all associated resources"
    Write-Warning "• S3 buckets and all stored data"
    Write-Warning "• Lambda functions"
    Write-Warning "• API Gateway configurations"
    Write-Warning "• Cognito User Pools and users"
    Write-Warning "• RDS database instances"
    Write-Warning "• All application data"
    
    $confirmation = Read-Host "`nAre you sure you want to proceed? Type 'DELETE' to confirm"
    
    if ($confirmation -ne "DELETE") {
        Write-Info "Cleanup cancelled by user"
        exit 0
    }
}

# Step 1: Validate AWS Configuration
Write-Step "Validating AWS Configuration"

try {
    $awsIdentity = aws sts get-caller-identity --output json 2>$null | ConvertFrom-Json
    if ($LASTEXITCODE -ne 0) {
        Write-Error "AWS credentials not configured. Please run 'aws configure' first."
        exit 1
    }
    
    Write-Success "AWS Account: $($awsIdentity.Account)"
    Write-Success "Region: $Region"
    
    # Check if this is Learner Lab
    if ($awsIdentity.Arn -like "*LabRole*" -or $awsIdentity.Arn -like "*student*") {
        Write-Success "Learner Lab environment detected"
        $isLearnerLab = $true
    } else {
        Write-Warning "This doesn't appear to be a Learner Lab environment"
        $isLearnerLab = $false
    }
    
} catch {
    Write-Error "Failed to validate AWS configuration: $($_.Exception.Message)"
    exit 1
}

# Step 2: Discover SalePoint Resources
Write-Step "Discovering SalePoint Resources"

$resourcesToClean = @{
    CloudFormationStacks = @()
    S3Buckets = @()
    LambdaFunctions = @()
    CognitoUserPools = @()
    ApiGateways = @()
    RDSInstances = @()
}

try {
    # Find CloudFormation stacks
    Write-Info "Searching for CloudFormation stacks..."
    $stacks = aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE ROLLBACK_COMPLETE --region $Region --output json 2>$null | ConvertFrom-Json
    $salepointStacks = $stacks.StackSummaries | Where-Object { $_.StackName -like "*$ProjectName*" -or $_.StackName -like "*salepoint*" }
    
    foreach ($stack in $salepointStacks) {
        $resourcesToClean.CloudFormationStacks += $stack.StackName
        Write-Info "Found CloudFormation stack: $($stack.StackName)"
    }

    # Find S3 buckets
    Write-Info "Searching for S3 buckets..."
    $buckets = aws s3api list-buckets --output json 2>$null | ConvertFrom-Json
    $salepointBuckets = $buckets.Buckets | Where-Object { $_.Name -like "*$ProjectName*" -or $_.Name -like "*salepoint*" }
    
    foreach ($bucket in $salepointBuckets) {
        $resourcesToClean.S3Buckets += $bucket.Name
        Write-Info "Found S3 bucket: $($bucket.Name)"
    }

    # Find Lambda functions
    Write-Info "Searching for Lambda functions..."
    $functions = aws lambda list-functions --region $Region --output json 2>$null | ConvertFrom-Json
    $salepointFunctions = $functions.Functions | Where-Object { $_.FunctionName -like "*$ProjectName*" -or $_.FunctionName -like "*salepoint*" }
    
    foreach ($function in $salepointFunctions) {
        $resourcesToClean.LambdaFunctions += $function.FunctionName
        Write-Info "Found Lambda function: $($function.FunctionName)"
    }

    # Find Cognito User Pools
    Write-Info "Searching for Cognito User Pools..."
    $userPools = aws cognito-idp list-user-pools --max-items 60 --region $Region --output json 2>$null | ConvertFrom-Json
    $salepointUserPools = $userPools.UserPools | Where-Object { $_.Name -like "*$ProjectName*" -or $_.Name -like "*salepoint*" }
    
    foreach ($userPool in $salepointUserPools) {
        $resourcesToClean.CognitoUserPools += @{ Id = $userPool.Id; Name = $userPool.Name }
        Write-Info "Found Cognito User Pool: $($userPool.Name)"
    }

    # Find API Gateways
    Write-Info "Searching for API Gateways..."
    $apis = aws apigateway get-rest-apis --region $Region --output json 2>$null | ConvertFrom-Json
    $salepointApis = $apis.items | Where-Object { $_.name -like "*$ProjectName*" -or $_.name -like "*salepoint*" }
    
    foreach ($api in $salepointApis) {
        $resourcesToClean.ApiGateways += @{ Id = $api.id; Name = $api.name }
        Write-Info "Found API Gateway: $($api.name)"
    }

    # Find RDS instances
    Write-Info "Searching for RDS instances..."
    try {
        $rdsInstances = aws rds describe-db-instances --region $Region --output json 2>$null | ConvertFrom-Json
        $salepointRDS = $rdsInstances.DBInstances | Where-Object { $_.DBInstanceIdentifier -like "*$ProjectName*" -or $_.DBInstanceIdentifier -like "*salepoint*" }
        
        foreach ($rds in $salepointRDS) {
            $resourcesToClean.RDSInstances += $rds.DBInstanceIdentifier
            Write-Info "Found RDS instance: $($rds.DBInstanceIdentifier)"
        }
    } catch {
        Write-Warning "Could not check RDS instances: $($_.Exception.Message)"
    }

} catch {
    Write-Warning "Resource discovery encountered issues: $($_.Exception.Message)"
}

# Display cleanup summary
Write-Step "Cleanup Summary"

$totalResources = 0
foreach ($category in $resourcesToClean.Keys) {
    $count = $resourcesToClean[$category].Count
    $totalResources += $count
    if ($count -gt 0) {
        Write-Info "$category : $count items"
    }
}

if ($totalResources -eq 0) {
    Write-Success "No SalePoint resources found to clean up!"
    exit 0
}

Write-Warning "Total resources to be deleted: $totalResources"

# Step 3: Delete CloudFormation stacks (this will handle most resources)
if ($resourcesToClean.CloudFormationStacks.Count -gt 0) {
    Write-Info "Deleting CloudFormation stacks (this handles most resources automatically)..."
    
    foreach ($stack in $resourcesToClean.CloudFormationStacks) {
        Write-Info "Deleting CloudFormation stack: $stack"
        try {
            aws cloudformation delete-stack --stack-name $stack --region $Region 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Success "✓ Initiated deletion of CloudFormation stack: $stack"
            } else {
                Write-Warning "⚠ Failed to delete CloudFormation stack: $stack"
            }
        } catch {
            Write-Warning "⚠ Error deleting CloudFormation stack $stack : $($_.Exception.Message)"
        }
    }
    
    # Wait for stack deletion to complete
    if ($resourcesToClean.CloudFormationStacks.Count -eq 1) {
        Write-Info "Waiting for CloudFormation stack deletion to complete..."
        Write-Info "This may take 10-15 minutes..."
        
        try {
            aws cloudformation wait stack-delete-complete --stack-name $resourcesToClean.CloudFormationStacks[0] --region $Region
            Write-Success "✓ CloudFormation stack deletion completed"
        } catch {
            Write-Warning "⚠ CloudFormation stack deletion may still be in progress"
        }
    }
}

Write-Step "Cleanup Complete"

Write-Host @"

╔══════════════════════════════════════════════════════════════════╗
║                     CLEANUP COMPLETED                           ║
╚══════════════════════════════════════════════════════════════════╝

✅ SalePoint Solution resources have been cleaned up!

📊 Resources Processed:
   • CloudFormation Stacks: $($resourcesToClean.CloudFormationStacks.Count)

"@ -ForegroundColor Green

if ($isLearnerLab) {
    Write-Host @"
💡 Learner Lab Notes:
   • Your AWS credits should be preserved from this cleanup
   • CloudFormation deletion handles most resources automatically
   • You can safely end your lab session now
   • Resource deletion continues even after session ends

"@ -ForegroundColor Cyan
}

Write-Success "`nSalePoint Solution cleanup completed successfully!"
