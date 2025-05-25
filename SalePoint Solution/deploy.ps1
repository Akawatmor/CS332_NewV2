# SalePoint Deployment Script
# Run this script to deploy the complete SalePoint application

param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectName = "salepoint",
    
    [Parameter(Mandatory=$true)]
    [string]$Region = "us-east-1",
    
    [Parameter(Mandatory=$false)]
    [string]$Environment = "dev"
)

Write-Host "Starting SalePoint deployment..." -ForegroundColor Green
Write-Host "Project Name: $ProjectName" -ForegroundColor Yellow
Write-Host "Region: $Region" -ForegroundColor Yellow
Write-Host "Environment: $Environment" -ForegroundColor Yellow

# Set error handling
$ErrorActionPreference = "Stop"

try {
    # Step 1: Validate AWS CLI configuration
    Write-Host "`n=== Step 1: Validating AWS Configuration ===" -ForegroundColor Cyan
    $awsIdentity = aws sts get-caller-identity --output json | ConvertFrom-Json
    Write-Host "AWS Account ID: $($awsIdentity.Account)" -ForegroundColor Green
    Write-Host "AWS User ARN: $($awsIdentity.Arn)" -ForegroundColor Green

    # Step 2: Deploy CloudFormation Infrastructure
    Write-Host "`n=== Step 2: Deploying Infrastructure ===" -ForegroundColor Cyan
    Write-Host "Creating CloudFormation stack..." -ForegroundColor Yellow
    
    $stackName = "$ProjectName-infrastructure"
    aws cloudformation create-stack `
        --stack-name $stackName `
        --template-body file://infrastructure/main-template.yaml `
        --capabilities CAPABILITY_NAMED_IAM `
        --parameters ParameterKey=ProjectName,ParameterValue=$ProjectName ParameterKey=Environment,ParameterValue=$Environment `
        --region $Region

    Write-Host "Waiting for stack creation to complete (this may take 15-20 minutes)..." -ForegroundColor Yellow
    aws cloudformation wait stack-create-complete --stack-name $stackName --region $Region

    # Get stack outputs
    Write-Host "Getting stack outputs..." -ForegroundColor Yellow
    $stackOutputs = aws cloudformation describe-stacks --stack-name $stackName --region $Region --query "Stacks[0].Outputs" --output json | ConvertFrom-Json
    
    $outputs = @{}
    foreach ($output in $stackOutputs) {
        $outputs[$output.OutputKey] = $output.OutputValue
    }

    Write-Host "Stack created successfully!" -ForegroundColor Green
    Write-Host "Database Endpoint: $($outputs.DatabaseEndpoint)" -ForegroundColor Green
    Write-Host "API Gateway URL: $($outputs.ApiGatewayUrl)" -ForegroundColor Green
    Write-Host "Frontend Bucket URL: $($outputs.FrontendBucketUrl)" -ForegroundColor Green

    # Step 3: Package and Deploy Lambda Functions
    Write-Host "`n=== Step 3: Deploying Lambda Functions ===" -ForegroundColor Cyan
    
    # Create deployments directory if it doesn't exist
    if (!(Test-Path "deployments")) {
        New-Item -ItemType Directory -Path "deployments"
    }

    # Install Lambda dependencies
    Write-Host "Installing Lambda dependencies..." -ForegroundColor Yellow
    Push-Location lambda-functions
    npm install
    
    # Create deployment package
    Write-Host "Creating deployment package..." -ForegroundColor Yellow
    Compress-Archive -Path *.js,node_modules,package.json -DestinationPath ../deployments/lambda-functions.zip -Force
    Pop-Location

    # Update Lambda functions
    $functions = @("products", "customers", "sales", "inventory", "analytics", "documents")
    foreach ($function in $functions) {
        Write-Host "Updating $function function..." -ForegroundColor Yellow
        aws lambda update-function-code `
            --function-name "$ProjectName-$function" `
            --zip-file fileb://deployments/lambda-functions.zip `
            --region $Region
    }

    Write-Host "Lambda functions updated successfully!" -ForegroundColor Green

    # Step 4: Deploy API Gateway
    Write-Host "`n=== Step 4: Deploying API Gateway ===" -ForegroundColor Cyan
    
    # Extract API Gateway ID from URL
    $apiId = ($outputs.ApiGatewayUrl -split "//")[1].Split(".")[0]
    Write-Host "API Gateway ID: $apiId" -ForegroundColor Yellow
    
    # Create deployment
    Write-Host "Creating API Gateway deployment..." -ForegroundColor Yellow
    aws apigateway create-deployment --rest-api-id $apiId --stage-name prod --region $Region

    Write-Host "API Gateway deployed successfully!" -ForegroundColor Green

    # Step 5: Build and Deploy Frontend
    Write-Host "`n=== Step 5: Building and Deploying Frontend ===" -ForegroundColor Cyan
    
    Push-Location frontend
    
    # Install frontend dependencies
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    npm install

    # Update AWS configuration file
    Write-Host "Updating AWS configuration..." -ForegroundColor Yellow
    $configContent = @"
export const awsConfig = {
  region: '$Region',
  userPoolId: '$($outputs.UserPoolId)',
  userPoolWebClientId: '$($outputs.UserPoolClientId)',
  apiGatewayUrl: '$($outputs.ApiGatewayUrl)',
  documentsBucket: '$ProjectName-documents-$($awsIdentity.Account)-$Region'
};
"@
    
    $configContent | Out-File -FilePath "src/config/aws-config.js" -Encoding utf8

    # Build the application
    Write-Host "Building React application..." -ForegroundColor Yellow
    npm run build

    # Deploy to S3
    Write-Host "Deploying to S3..." -ForegroundColor Yellow
    $frontendBucket = $ProjectName + "-frontend-" + $awsIdentity.Account + "-" + $Region
    aws s3 sync build/ s3://$frontendBucket --delete --region $Region

    Pop-Location

    Write-Host "Frontend deployed successfully!" -ForegroundColor Green

    # Step 6: Setup Cognito Users
    Write-Host "`n=== Step 6: Setting up Cognito Users ===" -ForegroundColor Cyan
    
    # Create admin user
    Write-Host "Creating admin user..." -ForegroundColor Yellow
    try {
        aws cognito-idp admin-create-user `
            --user-pool-id $outputs.UserPoolId `
            --username "admin@salepoint.com" `
            --user-attributes Name=email,Value=admin@salepoint.com Name=name,Value="Admin User" Name=custom:role,Value=admin `
            --temporary-password "TempPassword123!" `
            --message-action SUPPRESS `
            --region $Region

        # Set permanent password
        aws cognito-idp admin-set-user-password `
            --user-pool-id $outputs.UserPoolId `
            --username "admin@salepoint.com" `
            --password "AdminPassword123!" `
            --permanent `
            --region $Region

        Write-Host "Admin user created successfully!" -ForegroundColor Green
        Write-Host "Email: admin@salepoint.com" -ForegroundColor Green
        Write-Host "Password: AdminPassword123!" -ForegroundColor Green
    }
    catch {
        Write-Host "Admin user may already exist or there was an error: $($_.Exception.Message)" -ForegroundColor Yellow
    }

    # Create sample users
    $sampleUsers = @(
        @{ email = "manager@salepoint.com"; name = "Manager User"; role = "manager"; password = "ManagerPass123!" },
        @{ email = "sales@salepoint.com"; name = "Sales User"; role = "sales"; password = "SalesPass123!" }
    )

    foreach ($user in $sampleUsers) {
        Write-Host "Creating user: $($user.email)..." -ForegroundColor Yellow
        try {
            aws cognito-idp admin-create-user `
                --user-pool-id $outputs.UserPoolId `
                --username $user.email `
                --user-attributes Name=email,Value=$($user.email) Name=name,Value="$($user.name)" Name=custom:role,Value=$($user.role) `
                --temporary-password "TempPassword123!" `
                --message-action SUPPRESS `
                --region $Region

            aws cognito-idp admin-set-user-password `
                --user-pool-id $outputs.UserPoolId `
                --username $user.email `
                --password $user.password `
                --permanent `
                --region $Region

            Write-Host "User $($user.email) created successfully!" -ForegroundColor Green
        }
        catch {
            Write-Host "User $($user.email) may already exist: $($_.Exception.Message)" -ForegroundColor Yellow
        }    }

    # Step 7: Test API Gateway
    Write-Host "`n=== Step 7: Testing API Gateway ===" -ForegroundColor Cyan
    
    Write-Host "Running API endpoint tests..." -ForegroundColor Yellow
    $testScript = Join-Path $PSScriptRoot "test-api.ps1"
    
    if (Test-Path $testScript) {
        try {
            & $testScript -ApiBaseUrl $outputs.ApiGatewayUrl -Region $Region
        }
        catch {
            Write-Host "API testing completed with some issues: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "API test script not found, skipping tests..." -ForegroundColor Yellow
    }

    # Display final information
    Write-Host "`n=== Deployment Complete! ===" -ForegroundColor Green
    Write-Host "Application URL: $($outputs.FrontendBucketUrl)" -ForegroundColor Green
    Write-Host "API Gateway URL: $($outputs.ApiGatewayUrl)" -ForegroundColor Green
    Write-Host "`nLogin Credentials:" -ForegroundColor Yellow
    Write-Host "Admin: admin@salepoint.com / AdminPassword123!" -ForegroundColor Yellow
    Write-Host "Manager: manager@salepoint.com / ManagerPass123!" -ForegroundColor Yellow
    Write-Host "Sales: sales@salepoint.com / SalesPass123!" -ForegroundColor Yellow

    Write-Host "`nNext Steps:" -ForegroundColor Cyan
    Write-Host "1. Access the application using the URL above" -ForegroundColor White
    Write-Host "2. Login with one of the provided credentials" -ForegroundColor White
    Write-Host "3. Run the database schema setup (see DEPLOYMENT.md)" -ForegroundColor White
    Write-Host "4. Optionally load sample data" -ForegroundColor White

}
catch {
    Write-Host "`nDeployment failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Check the logs above for more details." -ForegroundColor Red
    exit 1
}

Write-Host "`nDeployment completed successfully!" -ForegroundColor Green
