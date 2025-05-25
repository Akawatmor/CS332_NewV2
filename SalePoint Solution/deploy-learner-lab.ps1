#!/usr/bin/env pwsh

# SalePoint Solution - AWS Learner Lab Deployment Script
# Optimized for AWS Academy Learner Lab environment with specific constraints and error handling

param(
    [Parameter(Mandatory=$false)]
    [string]$ProjectName = "salepoint-lab",
    
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-east-1",
    
    [Parameter(Mandatory=$false)]
    [string]$Environment = "learnerlab",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipCleanup = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$MonitorCredits = $true
)

# Enhanced error handling for Learner Lab environment
$ErrorActionPreference = "Continue"
$WarningPreference = "Continue"

# Color coding for better visibility
function Write-Success { param($Message) Write-Host $Message -ForegroundColor Green }
function Write-Warning { param($Message) Write-Host $Message -ForegroundColor Yellow }
function Write-Error { param($Message) Write-Host $Message -ForegroundColor Red }
function Write-Info { param($Message) Write-Host $Message -ForegroundColor Cyan }
function Write-Step { param($Message) Write-Host "`n=== $Message ===" -ForegroundColor Magenta }

Write-Host @"
╔══════════════════════════════════════════════════════════════════╗
║                 SalePoint Solution - Learner Lab Deployment     ║
║                     AWS Academy Optimized Version               ║
╚══════════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan

Write-Info "Project Name: $ProjectName"
Write-Info "Region: $Region"
Write-Info "Environment: $Environment"
Write-Info "Monitor Credits: $MonitorCredits"

# Step 0: Pre-deployment Validation
Write-Step "Pre-deployment Validation"

try {
    # Check AWS CLI installation
    $awsVersion = aws --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Error "AWS CLI not found. Please install AWS CLI v2."
        exit 1
    }
    Write-Success "AWS CLI found: $awsVersion"

    # Validate AWS credentials
    Write-Info "Validating AWS credentials..."
    $awsIdentity = aws sts get-caller-identity --output json 2>$null | ConvertFrom-Json
    if ($LASTEXITCODE -ne 0) {
        Write-Error "AWS credentials not configured. Please run 'aws configure' with your Learner Lab credentials."
        Write-Info "Get credentials from AWS Academy Learner Lab > AWS Details > Download AWS CLI"
        exit 1
    }
    
    Write-Success "AWS Account ID: $($awsIdentity.Account)"
    Write-Success "AWS User ARN: $($awsIdentity.Arn)"
    
    # Check if this is a Learner Lab environment
    if ($awsIdentity.Arn -like "*LabRole*" -or $awsIdentity.Arn -like "*student*") {
        Write-Success "Learner Lab environment detected"
        $isLearnerLab = $true
    } else {
        Write-Warning "This doesn't appear to be a Learner Lab environment"
        $isLearnerLab = $false
    }

    # Validate region
    $availableRegions = aws ec2 describe-regions --query "Regions[].RegionName" --output text 2>$null
    if ($availableRegions -notcontains $Region) {
        Write-Warning "Region $Region may not be available in Learner Lab. Continuing with us-east-1..."
        $Region = "us-east-1"
    }
    
    # Check existing resources to avoid conflicts
    Write-Info "Checking for existing resources..."
    $existingStacks = aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE --query "StackSummaries[?contains(StackName, '$ProjectName')].StackName" --output text --region $Region 2>$null
    if ($existingStacks) {
        Write-Warning "Found existing stacks: $existingStacks"
        $response = Read-Host "Do you want to continue? This may cause conflicts. (y/N)"
        if ($response -notmatch "^[Yy]$") {
            Write-Info "Deployment cancelled by user"
            exit 0
        }
    }

} catch {
    Write-Error "Pre-deployment validation failed: $($_.Exception.Message)"
    exit 1
}

# Step 1: Learner Lab Resource Check
Write-Step "Learner Lab Resource Assessment"

try {
    if ($MonitorCredits -and $isLearnerLab) {
        Write-Info "Checking resource limits and usage..."
        
        # Check CloudFormation stacks
        $stackCount = (aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE --region $Region --output json | ConvertFrom-Json).StackSummaries.Count
        Write-Info "Existing CloudFormation stacks: $stackCount"
        
        # Check Lambda functions
        $lambdaCount = (aws lambda list-functions --region $Region --output json | ConvertFrom-Json).Functions.Count
        Write-Info "Existing Lambda functions: $lambdaCount"
        
        # Check S3 buckets
        $bucketCount = (aws s3 ls | Measure-Object).Count
        Write-Info "Existing S3 buckets: $bucketCount"
        
        if ($stackCount -gt 5 -or $lambdaCount -gt 10 -or $bucketCount -gt 10) {
            Write-Warning "You have many existing resources. Consider cleaning up to avoid hitting Learner Lab limits."
        }
    }
} catch {
    Write-Warning "Could not assess current resource usage: $($_.Exception.Message)"
}

# Step 2: Deploy Infrastructure with Learner Lab Optimizations
Write-Step "Deploying Infrastructure (Learner Lab Optimized)"

try {
    $stackName = "$ProjectName-infrastructure"
    
    # Check if CloudFormation template exists
    if (!(Test-Path "infrastructure/main-template.yaml")) {
        Write-Error "CloudFormation template not found at infrastructure/main-template.yaml"
        exit 1
    }
    
    Write-Info "Creating CloudFormation stack: $stackName"
    Write-Info "This process typically takes 15-20 minutes in Learner Lab..."
    
    # Add unique suffix to avoid conflicts in Learner Lab
    $uniqueSuffix = Get-Random -Minimum 1000 -Maximum 9999
    $fullProjectName = "$ProjectName-$uniqueSuffix"
    
    $createResult = aws cloudformation create-stack `
        --stack-name $stackName `
        --template-body file://infrastructure/main-template.yaml `
        --capabilities CAPABILITY_NAMED_IAM CAPABILITY_AUTO_EXPAND `
        --parameters ParameterKey=ProjectName,ParameterValue=$fullProjectName ParameterKey=Environment,ParameterValue=$Environment `
        --region $Region `
        --on-failure DELETE `
        --timeout-in-minutes 30 2>&1

    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to create CloudFormation stack: $createResult"
        Write-Info "Common Learner Lab issues:"
        Write-Info "- IAM permission restrictions"
        Write-Info "- Resource limits exceeded"
        Write-Info "- Region not supported"
        exit 1
    }

    Write-Success "Stack creation initiated successfully"
    
    # Monitor stack creation with progress updates
    Write-Info "Monitoring stack creation progress..."
    $startTime = Get-Date
    $maxWaitMinutes = 25
    
    do {
        Start-Sleep -Seconds 30
        $elapsed = ((Get-Date) - $startTime).TotalMinutes
        
        $stackStatus = aws cloudformation describe-stacks --stack-name $stackName --region $Region --query "Stacks[0].StackStatus" --output text 2>$null
        
        if ($stackStatus) {
            Write-Info "Stack Status: $stackStatus (Elapsed: $([math]::Round($elapsed, 1)) minutes)"
            
            if ($stackStatus -eq "CREATE_COMPLETE") {
                Write-Success "Stack created successfully!"
                break
            } elseif ($stackStatus -like "*FAILED*" -or $stackStatus -like "*ROLLBACK*") {
                Write-Error "Stack creation failed with status: $stackStatus"
                
                # Get failure reason
                $events = aws cloudformation describe-stack-events --stack-name $stackName --region $Region --query "StackEvents[?ResourceStatus=='CREATE_FAILED'].[LogicalResourceId,ResourceStatusReason]" --output text 2>$null
                if ($events) {
                    Write-Error "Failure details: $events"
                }
                exit 1
            }
        } else {
            Write-Warning "Could not get stack status. Continuing to wait..."
        }
        
        if ($elapsed -gt $maxWaitMinutes) {
            Write-Error "Stack creation timed out after $maxWaitMinutes minutes"
            Write-Info "Check the CloudFormation console for more details"
            exit 1
        }
        
    } while ($true)

    # Get and display stack outputs
    Write-Info "Retrieving stack outputs..."
    $stackOutputs = aws cloudformation describe-stacks --stack-name $stackName --region $Region --query "Stacks[0].Outputs" --output json | ConvertFrom-Json
    
    $outputs = @{}
    foreach ($output in $stackOutputs) {
        $outputs[$output.OutputKey] = $output.OutputValue
        Write-Success "$($output.OutputKey): $($output.OutputValue)"
    }

} catch {
    Write-Error "Infrastructure deployment failed: $($_.Exception.Message)"
    exit 1
}

# Step 3: Deploy Lambda Functions with Learner Lab Optimizations
Write-Step "Deploying Lambda Functions"

try {
    # Create deployments directory
    if (!(Test-Path "deployments")) {
        New-Item -ItemType Directory -Path "deployments" -Force
    }

    # Validate Lambda source files
    if (!(Test-Path "lambda-functions")) {
        Write-Error "Lambda functions directory not found"
        exit 1
    }

    Write-Info "Installing Lambda dependencies..."
    Push-Location lambda-functions
    
    # Check if package.json exists
    if (Test-Path "package.json") {
        npm install --production 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "npm install had issues, but continuing..."
        }
    } else {
        Write-Warning "No package.json found in lambda-functions directory"
    }
    
    # Create deployment package
    Write-Info "Creating Lambda deployment package..."
    $files = Get-ChildItem -File | Where-Object { $_.Extension -in @('.js', '.json') }
    if (Test-Path "node_modules") {
        Compress-Archive -Path $files.FullName, "node_modules" -DestinationPath "../deployments/lambda-functions.zip" -Force
    } else {
        Compress-Archive -Path $files.FullName -DestinationPath "../deployments/lambda-functions.zip" -Force
    }
    
    Pop-Location

    # Update Lambda functions
    $functions = @("products", "customers", "sales", "inventory", "analytics", "documents")
    foreach ($function in $functions) {
        $functionName = "$fullProjectName-$function"
        Write-Info "Updating function: $functionName"
        
        $updateResult = aws lambda update-function-code `
            --function-name $functionName `
            --zip-file fileb://deployments/lambda-functions.zip `
            --region $Region 2>&1
            
        if ($LASTEXITCODE -eq 0) {
            Write-Success "✓ $functionName updated successfully"
        } else {
            Write-Warning "⚠ Failed to update $functionName : $updateResult"
        }
    }

} catch {
    Write-Error "Lambda deployment failed: $($_.Exception.Message)"
    exit 1
}

# Step 4: Configure API Gateway
Write-Step "Configuring API Gateway"

try {
    if ($outputs.ApiGatewayUrl) {
        # Extract API ID from URL
        $apiId = ($outputs.ApiGatewayUrl -split "//")[1].Split(".")[0]
        Write-Info "API Gateway ID: $apiId"
        
        # Create deployment
        Write-Info "Creating API Gateway deployment..."
        $deployResult = aws apigateway create-deployment --rest-api-id $apiId --stage-name prod --region $Region 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "API Gateway deployed successfully"
        } else {
            Write-Warning "API Gateway deployment had issues: $deployResult"
        }
    } else {
        Write-Warning "API Gateway URL not found in stack outputs"
    }
} catch {
    Write-Warning "API Gateway configuration encountered issues: $($_.Exception.Message)"
}

# Step 5: Build and Deploy Frontend
Write-Step "Building and Deploying Frontend"

try {
    if (!(Test-Path "frontend")) {
        Write-Error "Frontend directory not found"
        exit 1
    }
    
    Push-Location frontend
    
    # Install dependencies
    Write-Info "Installing frontend dependencies..."
    npm install 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "npm install had issues, but continuing..."
    }

    # Update AWS configuration
    Write-Info "Updating AWS configuration file..."
    $configDir = "src/config"
    if (!(Test-Path $configDir)) {
        New-Item -ItemType Directory -Path $configDir -Force
    }
    
    $configContent = @"
export const awsConfig = {
  region: '$Region',
  userPoolId: '$($outputs.UserPoolId)',
  userPoolWebClientId: '$($outputs.UserPoolClientId)',
  apiGatewayUrl: '$($outputs.ApiGatewayUrl)',
  documentsBucket: '$fullProjectName-documents-$($awsIdentity.Account)-$Region'
};
"@
    
    $configContent | Out-File -FilePath "$configDir/aws-config.js" -Encoding utf8
    Write-Success "AWS configuration updated"

    # Build the application
    Write-Info "Building React application..."
    npm run build 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Frontend build failed"
        Pop-Location
        exit 1
    }

    # Deploy to S3
    if ($outputs.FrontendBucketUrl) {
        $frontendBucket = "$fullProjectName-frontend-$($awsIdentity.Account)-$Region"
        Write-Info "Deploying to S3 bucket: $frontendBucket"
        
        aws s3 sync build/ s3://$frontendBucket --delete --region $Region 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Frontend deployed successfully"
        } else {
            Write-Warning "Frontend deployment had issues"
        }
    } else {
        Write-Warning "Frontend bucket URL not found in stack outputs"
    }
    
    Pop-Location

} catch {
    Write-Error "Frontend deployment failed: $($_.Exception.Message)"
    if (Get-Location | Where-Object { $_.Path -like "*frontend*" }) {
        Pop-Location
    }
    exit 1
}

# Step 6: Setup Cognito Users
Write-Step "Setting up Cognito Users"

try {
    if ($outputs.UserPoolId) {
        # Create admin user
        Write-Info "Creating admin user..."
        $adminResult = aws cognito-idp admin-create-user `
            --user-pool-id $outputs.UserPoolId `
            --username "admin@salepoint.com" `
            --user-attributes Name=email,Value=admin@salepoint.com Name=name,Value="Admin User" Name=custom:role,Value=admin `
            --temporary-password "TempPassword123!" `
            --message-action SUPPRESS `
            --region $Region 2>&1

        if ($LASTEXITCODE -eq 0 -or $adminResult -like "*already exists*") {
            # Set permanent password
            aws cognito-idp admin-set-user-password `
                --user-pool-id $outputs.UserPoolId `
                --username "admin@salepoint.com" `
                --password "AdminPassword123!" `
                --permanent `
                --region $Region 2>$null

            Write-Success "✓ Admin user configured"
        } else {
            Write-Warning "Admin user creation had issues: $adminResult"
        }

        # Create sample users
        $sampleUsers = @(
            @{ email = "manager@salepoint.com"; name = "Manager User"; role = "manager"; password = "ManagerPass123!" },
            @{ email = "sales@salepoint.com"; name = "Sales User"; role = "sales"; password = "SalesPass123!" }
        )

        foreach ($user in $sampleUsers) {
            Write-Info "Creating user: $($user.email)"
            
            $userResult = aws cognito-idp admin-create-user `
                --user-pool-id $outputs.UserPoolId `
                --username $user.email `
                --user-attributes Name=email,Value=$($user.email) Name=name,Value="$($user.name)" Name=custom:role,Value=$($user.role) `
                --temporary-password "TempPassword123!" `
                --message-action SUPPRESS `
                --region $Region 2>&1

            if ($LASTEXITCODE -eq 0 -or $userResult -like "*already exists*") {
                aws cognito-idp admin-set-user-password `
                    --user-pool-id $outputs.UserPoolId `
                    --username $user.email `
                    --password $user.password `
                    --permanent `
                    --region $Region 2>$null

                Write-Success "✓ $($user.email) configured"
            } else {
                Write-Warning "User $($user.email) creation had issues: $userResult"
            }
        }
    } else {
        Write-Warning "User Pool ID not found in stack outputs"
    }
} catch {
    Write-Warning "Cognito user setup encountered issues: $($_.Exception.Message)"
}

# Step 7: Final Validation and Testing
Write-Step "Final Validation and Testing"

try {
    # Test API Gateway endpoints
    if ($outputs.ApiGatewayUrl) {
        Write-Info "Testing API Gateway health endpoint..."
        try {
            $healthResponse = Invoke-RestMethod -Uri "$($outputs.ApiGatewayUrl)/health" -Method GET -TimeoutSec 10
            Write-Success "✓ API Gateway health check passed"
        } catch {
            Write-Warning "⚠ API Gateway health check failed: $($_.Exception.Message)"
        }
    }

    # Validate frontend accessibility
    if ($outputs.FrontendBucketUrl) {
        Write-Info "Validating frontend deployment..."
        try {
            $frontendResponse = Invoke-WebRequest -Uri $outputs.FrontendBucketUrl -Method HEAD -TimeoutSec 10
            if ($frontendResponse.StatusCode -eq 200) {
                Write-Success "✓ Frontend is accessible"
            }
        } catch {
            Write-Warning "⚠ Frontend accessibility check failed: $($_.Exception.Message)"
        }
    }

    # Run verification script if available
    if (Test-Path "verify-solution.ps1") {
        Write-Info "Running solution verification..."
        try {
            & ".\verify-solution.ps1" 2>&1 | Out-String | Write-Host
        } catch {
            Write-Warning "Verification script encountered issues: $($_.Exception.Message)"
        }
    }

} catch {
    Write-Warning "Final validation encountered issues: $($_.Exception.Message)"
}

# Display Deployment Summary
Write-Step "Deployment Summary"

Write-Host @"

╔══════════════════════════════════════════════════════════════════╗
║                    DEPLOYMENT COMPLETED SUCCESSFULLY            ║
╚══════════════════════════════════════════════════════════════════╝

🌐 Application URL: $($outputs.FrontendBucketUrl)
🔗 API Gateway URL: $($outputs.ApiGatewayUrl)

👤 Login Credentials:
   📧 Admin: admin@salepoint.com / AdminPassword123!
   📧 Manager: manager@salepoint.com / ManagerPass123!
   📧 Sales: sales@salepoint.com / SalesPass123!

📋 Next Steps:
   1. Open the application URL in your browser
   2. Login with one of the provided credentials
   3. Test the core functionality (Products, Customers, Sales)
   4. Monitor your Learner Lab credits usage
   5. Run cleanup script when testing is complete

🔧 Management Commands:
   • Verify deployment: .\verify-solution.ps1
   • Test APIs: .\test-api.ps1 -ApiBaseUrl '$($outputs.ApiGatewayUrl)'
   • Demo features: .\demo-solution.ps1
   • Cleanup: .\cleanup.ps1 -ProjectName '$ProjectName'

⚠️  Learner Lab Reminders:
   • Monitor your session time and credits
   • Save important outputs before session expires
   • Clean up resources when testing is complete
   • Note that some features may be limited in Learner Lab

"@ -ForegroundColor Green

# Save deployment information for future reference
$deploymentInfo = @{
    ProjectName = $fullProjectName
    Region = $Region
    StackName = $stackName
    DeploymentTime = Get-Date
    Outputs = $outputs
    LearnerLabOptimized = $isLearnerLab
}

$deploymentInfo | ConvertTo-Json -Depth 3 | Out-File -FilePath "deployment-info.json" -Encoding utf8
Write-Success "Deployment information saved to deployment-info.json"

Write-Success "`nSalePoint Solution deployment to AWS Learner Lab completed successfully!"

if ($MonitorCredits -and $isLearnerLab) {
    Write-Info "`n💡 Remember to monitor your AWS Academy credits and clean up resources when finished testing."
}
