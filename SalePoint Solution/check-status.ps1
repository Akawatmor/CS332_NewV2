#!/usr/bin/env pwsh
# SalePoint Post-Deployment Status Check
# Comprehensive system status validation after deployment

param(
    [Parameter(Mandatory=$false)]
    [string]$StackName = "salepoint-infrastructure",
    
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-east-1"
)

Write-Host "===== SalePoint System Status Check =====" -ForegroundColor Cyan
Write-Host "Stack Name: $StackName" -ForegroundColor Green
Write-Host "Region: $Region" -ForegroundColor Green
Write-Host "Timestamp: $(Get-Date)" -ForegroundColor Green
Write-Host ""

# Initialize status tracking
$systemStatus = @{
    Infrastructure = @{ Status = "Unknown"; Details = @() }
    Database = @{ Status = "Unknown"; Details = @() }
    Lambda = @{ Status = "Unknown"; Details = @() }
    ApiGateway = @{ Status = "Unknown"; Details = @() }
    Frontend = @{ Status = "Unknown"; Details = @() }
    Security = @{ Status = "Unknown"; Details = @() }
    Overall = "Unknown"
}

function Test-ComponentStatus {
    param(
        [string]$Component,
        [scriptblock]$TestScript
    )
    
    Write-Host "Checking $Component..." -ForegroundColor Yellow
    
    try {
        $result = & $TestScript
        $systemStatus[$Component].Status = "Healthy"
        $systemStatus[$Component].Details = $result
        Write-Host "✓ ${Component}: Healthy" -ForegroundColor Green
        return $true
    }
    catch {
        $systemStatus[$Component].Status = "Error"
        $systemStatus[$Component].Details = @("Error: $($_.Exception.Message)")
        Write-Host "✗ ${Component}: Error - $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Check CloudFormation Infrastructure
$infraHealthy = Test-ComponentStatus "Infrastructure" {
    $stack = aws cloudformation describe-stacks --stack-name $StackName --region $Region --query "Stacks[0]" --output json | ConvertFrom-Json
    
    if ($stack.StackStatus -ne "CREATE_COMPLETE" -and $stack.StackStatus -ne "UPDATE_COMPLETE") {
        throw "Stack status is $($stack.StackStatus), expected CREATE_COMPLETE or UPDATE_COMPLETE"
    }
    
    $outputs = @{}
    foreach ($output in $stack.Outputs) {
        $outputs[$output.OutputKey] = $output.OutputValue
    }
    
    $requiredOutputs = @("DatabaseEndpoint", "ApiGatewayUrl", "FrontendBucketUrl", "UserPoolId", "UserPoolClientId")
    $missingOutputs = @()
    
    foreach ($required in $requiredOutputs) {
        if (!$outputs[$required]) {
            $missingOutputs += $required
        }
    }
    
    if ($missingOutputs.Count -gt 0) {
        throw "Missing required outputs: $($missingOutputs -join ', ')"
    }
    
    return @(
        "Stack Status: $($stack.StackStatus)",
        "Database Endpoint: $($outputs.DatabaseEndpoint)",
        "API Gateway URL: $($outputs.ApiGatewayUrl)",
        "Frontend URL: $($outputs.FrontendBucketUrl)",
        "User Pool ID: $($outputs.UserPoolId)"
    )
}

# Check Database Connectivity
$dbHealthy = Test-ComponentStatus "Database" {
    # Get RDS instance status
    $rdsInstances = aws rds describe-db-instances --region $Region --query "DBInstances[?contains(DBInstanceIdentifier, ``salepoint``)]" --output json | ConvertFrom-Json
    
    if ($rdsInstances.Count -eq 0) {
        throw "No SalePoint RDS instances found"
    }
    
    $dbInstance = $rdsInstances[0]
    
    if ($dbInstance.DBInstanceStatus -ne "available") {
        throw "Database status is $($dbInstance.DBInstanceStatus), expected 'available'"
    }
    
    # Check DynamoDB tables
    $dynamoTables = aws dynamodb list-tables --region $Region --query "TableNames[?contains(@, ``salepoint``)]" --output json | ConvertFrom-Json
    
    return @(
        "RDS Status: $($dbInstance.DBInstanceStatus)",
        "RDS Endpoint: $($dbInstance.Endpoint.Address)",
        "DynamoDB Tables: $($dynamoTables.Count) found"
    )
}

# Check Lambda Functions
$lambdaHealthy = Test-ComponentStatus "Lambda" {
    $functions = aws lambda list-functions --region $Region --query "Functions[?contains(FunctionName, ``salepoint``)]" --output json | ConvertFrom-Json
    
    if ($functions.Count -eq 0) {
        throw "No SalePoint Lambda functions found"
    }
    
    $functionStatus = @()
    $errorCount = 0
    
    foreach ($function in $functions) {
        $state = $function.State
        if ($state -eq "Active") {
            $functionStatus += "$($function.FunctionName): Active"
        } else {
            $functionStatus += "$($function.FunctionName): $state (Issue)"
            $errorCount++
        }
    }
    
    if ($errorCount -gt 0) {
        throw "$errorCount Lambda functions have issues"
    }
    
    return $functionStatus
}

# Check API Gateway
$apiHealthy = Test-ComponentStatus "ApiGateway" {
    # Get API Gateway from CloudFormation outputs
    $stack = aws cloudformation describe-stacks --stack-name $StackName --region $Region --query "Stacks[0].Outputs" --output json | ConvertFrom-Json
    $apiUrl = ($stack | Where-Object { $_.OutputKey -eq "ApiGatewayUrl" }).OutputValue
    
    if (!$apiUrl) {
        throw "API Gateway URL not found in CloudFormation outputs"
    }
    
    # Test a simple endpoint
    try {
        $response = Invoke-RestMethod -Uri "$apiUrl/products" -Method GET -TimeoutSec 10 -ErrorAction Stop
        $endpointTest = "GET /products: Success"
    }
    catch {
        $endpointTest = "GET /products: Failed - $($_.Exception.Message)"
    }
    
    return @(
        "API URL: $apiUrl",
        "Endpoint Test: $endpointTest"
    )
}

# Check Frontend Deployment
$frontendHealthy = Test-ComponentStatus "Frontend" {
    # Get frontend bucket URL from CloudFormation
    $stack = aws cloudformation describe-stacks --stack-name $StackName --region $Region --query "Stacks[0].Outputs" --output json | ConvertFrom-Json
    $frontendUrl = ($stack | Where-Object { $_.OutputKey -eq "FrontendBucketUrl" }).OutputValue
    
    if (!$frontendUrl) {
        throw "Frontend URL not found in CloudFormation outputs"
    }
    
    # Check if bucket has content
    $bucketName = $frontendUrl -replace "http://([^.]+)\..*", "`$1"
    $bucketObjects = aws s3 ls s3://$bucketName --region $Region 2>$null
    
    if (!$bucketObjects) {
        throw "Frontend bucket appears to be empty"
    }
    
    # Test if frontend is accessible
    try {
        $response = Invoke-WebRequest -Uri $frontendUrl -Method HEAD -TimeoutSec 10 -ErrorAction Stop
        $accessTest = "Frontend accessible: HTTP $($response.StatusCode)"
    }
    catch {
        $accessTest = "Frontend access test failed: $($_.Exception.Message)"
    }
    
    return @(
        "Frontend URL: $frontendUrl",
        "Bucket Content: $($bucketObjects.Split("`n").Count) objects",
        "Access Test: $accessTest"
    )
}

# Check Security Configuration
$securityHealthy = Test-ComponentStatus "Security" {
    # Check Cognito User Pool
    $stack = aws cloudformation describe-stacks --stack-name $StackName --region $Region --query "Stacks[0].Outputs" --output json | ConvertFrom-Json
    $userPoolId = ($stack | Where-Object { $_.OutputKey -eq "UserPoolId" }).OutputValue
    
    if (!$userPoolId) {
        throw "User Pool ID not found in CloudFormation outputs"
    }
    
    $userPool = aws cognito-idp describe-user-pool --user-pool-id $userPoolId --region $Region --output json | ConvertFrom-Json
    
    if ($userPool.UserPool.Status -ne "Enabled") {
        throw "User Pool status is $($userPool.UserPool.Status), expected 'Enabled'"
    }
    
    # Check if admin user exists
    try {
        $adminUser = aws cognito-idp admin-get-user --user-pool-id $userPoolId --username "admin@salepoint.com" --region $Region --output json 2>$null | ConvertFrom-Json
        $adminStatus = "Admin user exists: $($adminUser.UserStatus)"
    }
    catch {
        $adminStatus = "Admin user not found"
    }
    
    return @(
        "User Pool Status: $($userPool.UserPool.Status)",
        "User Pool ID: $userPoolId",
        "Admin User: $adminStatus"
    )
}

Write-Host ""
Write-Host "===== System Health Summary =====" -ForegroundColor Cyan

$healthyComponents = 0
$totalComponents = $systemStatus.Keys.Count - 1  # Exclude 'Overall'

foreach ($component in $systemStatus.Keys) {
    if ($component -eq "Overall") { continue }
    
    $status = $systemStatus[$component].Status
    $color = switch ($status) {
        "Healthy" { "Green"; $healthyComponents++ }
        "Error" { "Red" }
        default { "Yellow" }
    }
    
    Write-Host "$component`: $status" -ForegroundColor $color
    
    # Show details for failed components
    if ($status -eq "Error" -and $systemStatus[$component].Details.Count -gt 0) {
        foreach ($detail in $systemStatus[$component].Details) {
            Write-Host "  - $detail" -ForegroundColor Red
        }
    }
}

# Calculate overall health
$healthPercentage = [math]::Round(($healthyComponents / $totalComponents) * 100, 1)

if ($healthyComponents -eq $totalComponents) {
    $systemStatus.Overall = "Healthy"
    $overallColor = "Green"
    $overallMessage = "🎉 System is fully operational!"
} elseif ($healthyComponents -gt ($totalComponents * 0.7)) {
    $systemStatus.Overall = "Degraded"
    $overallColor = "Yellow"
    $overallMessage = "⚠️ System is mostly operational but has some issues."
} else {
    $systemStatus.Overall = "Critical"
    $overallColor = "Red"
    $overallMessage = "❌ System has critical issues that need immediate attention."
}

Write-Host ""
Write-Host "Overall System Health: $($systemStatus.Overall) ($healthPercentage%)" -ForegroundColor $overallColor
Write-Host $overallMessage -ForegroundColor $overallColor

# Provide specific recommendations
Write-Host ""
Write-Host "===== Recommendations =====" -ForegroundColor Cyan

if ($systemStatus.Overall -eq "Healthy") {
    Write-Host "✓ Run API validation: .\validate-api.ps1" -ForegroundColor Green
    Write-Host "✓ Test the frontend application" -ForegroundColor Green
    Write-Host "✓ Load sample data if not already done" -ForegroundColor Green
    Write-Host "✓ Setup monitoring and alerting" -ForegroundColor Green
} else {
    if ($systemStatus.Infrastructure.Status -eq "Error") {
        Write-Host "→ Check CloudFormation stack events for deployment issues" -ForegroundColor Yellow
        Write-Host "→ Verify AWS permissions and resource limits" -ForegroundColor Yellow
    }
    
    if ($systemStatus.Database.Status -eq "Error") {
        Write-Host "→ Check RDS instance status and security groups" -ForegroundColor Yellow
        Write-Host "→ Verify database connectivity from Lambda functions" -ForegroundColor Yellow
    }
    
    if ($systemStatus.Lambda.Status -eq "Error") {
        Write-Host "→ Check Lambda function logs in CloudWatch" -ForegroundColor Yellow
        Write-Host "→ Verify VPC configuration and security groups" -ForegroundColor Yellow
    }
    
    if ($systemStatus.ApiGateway.Status -eq "Error") {
        Write-Host "→ Check API Gateway configuration and deployments" -ForegroundColor Yellow
        Write-Host "→ Verify Lambda permissions for API Gateway" -ForegroundColor Yellow
    }
    
    if ($systemStatus.Frontend.Status -eq "Error") {
        Write-Host "→ Re-run frontend build and deployment" -ForegroundColor Yellow
        Write-Host "→ Check S3 bucket permissions and website configuration" -ForegroundColor Yellow
    }
    
    if ($systemStatus.Security.Status -eq "Error") {
        Write-Host "→ Check Cognito User Pool configuration" -ForegroundColor Yellow
        Write-Host "→ Create admin user if missing" -ForegroundColor Yellow
    }
}

# Save status report
$reportFile = "system-status-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
$systemStatus | ConvertTo-Json -Depth 3 | Out-File -FilePath $reportFile -Encoding utf8
Write-Host ""
Write-Host "Status report saved to: $reportFile" -ForegroundColor Gray

# Display URLs for easy access
if ($systemStatus.Infrastructure.Status -eq "Healthy") {
    Write-Host ""
    Write-Host "===== Quick Access URLs =====" -ForegroundColor Cyan
    
    $stack = aws cloudformation describe-stacks --stack-name $StackName --region $Region --query "Stacks[0].Outputs" --output json | ConvertFrom-Json
    $outputs = @{}
    foreach ($output in $stack) {
        $outputs[$output.OutputKey] = $output.OutputValue
    }
    
    if ($outputs.FrontendBucketUrl) {
        Write-Host "Frontend Application: $($outputs.FrontendBucketUrl)" -ForegroundColor Green
    }
    
    if ($outputs.ApiGatewayUrl) {
        Write-Host "API Gateway: $($outputs.ApiGatewayUrl)" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Default Login Credentials:" -ForegroundColor Yellow
    Write-Host "Email: admin@salepoint.com" -ForegroundColor Yellow
    Write-Host "Password: AdminPassword123!" -ForegroundColor Yellow
}
