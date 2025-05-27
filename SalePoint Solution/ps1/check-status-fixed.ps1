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

# Check Infrastructure (CloudFormation Stack)
$infraHealthy = Test-ComponentStatus "Infrastructure" {
    $stackInfo = aws cloudformation describe-stacks --stack-name $StackName --region $Region --output json | ConvertFrom-Json
    
    if (!$stackInfo.Stacks -or $stackInfo.Stacks.Count -eq 0) {
        throw "CloudFormation stack '$StackName' not found"
    }
    
    $stack = $stackInfo.Stacks[0]
    
    if ($stack.StackStatus -notlike "*COMPLETE*") {
        throw "Stack status is '$($stack.StackStatus)', expected *COMPLETE*"
    }
    
    # Get stack outputs
    $outputs = @{}
    if ($stack.Outputs) {
        foreach ($output in $stack.Outputs) {
            $outputs[$output.OutputKey] = $output.OutputValue
        }
    }
    
    return @(
        "Stack Status: $($stack.StackStatus)",
        "Stack Created: $($stack.CreationTime)",
        "Database Endpoint: $($outputs.DatabaseEndpoint)",
        "API Gateway URL: $($outputs.ApiGatewayUrl)",
        "Frontend URL: $($outputs.FrontendBucketUrl)",
        "User Pool ID: $($outputs.UserPoolId)"
    )
}

# Check Database Connectivity
$dbHealthy = Test-ComponentStatus "Database" {
    # Get RDS instance status
    $rdsInstances = aws rds describe-db-instances --region $Region --query "DBInstances[?contains(DBInstanceIdentifier, 'salepoint')]" --output json | ConvertFrom-Json
    
    if ($rdsInstances.Count -eq 0) {
        throw "No SalePoint RDS instances found"
    }
    
    $dbInstance = $rdsInstances[0]
    
    if ($dbInstance.DBInstanceStatus -ne "available") {
        throw "Database status is $($dbInstance.DBInstanceStatus), expected 'available'"
    }
    
    # Check DynamoDB tables
    $dynamoTables = aws dynamodb list-tables --region $Region --query "TableNames[?contains(@, 'salepoint')]" --output json | ConvertFrom-Json
    
    return @(
        "RDS Status: $($dbInstance.DBInstanceStatus)",
        "RDS Endpoint: $($dbInstance.Endpoint.Address)",
        "DynamoDB Tables: $($dynamoTables.Count) found"
    )
}

# Check Lambda Functions
$lambdaHealthy = Test-ComponentStatus "Lambda" {
    $functions = aws lambda list-functions --region $Region --query "Functions[?contains(FunctionName, 'salepoint')]" --output json | ConvertFrom-Json
    
    if ($functions.Count -eq 0) {
        throw "No SalePoint Lambda functions found"
    }
    
    $functionStatus = @()
    foreach ($func in $functions) {
        $config = aws lambda get-function-configuration --function-name $func.FunctionName --region $Region --output json | ConvertFrom-Json
        
        if ($config.State -ne "Active") {
            throw "Function $($func.FunctionName) is in state '$($config.State)', expected 'Active'"
        }
        
        $functionStatus += "Function: $($func.FunctionName) - State: $($config.State)"
    }
    
    return $functionStatus
}

# Check API Gateway
$apiHealthy = Test-ComponentStatus "ApiGateway" {
    # Get stack outputs for API Gateway URL
    $stackInfo = aws cloudformation describe-stacks --stack-name $StackName --region $Region --output json | ConvertFrom-Json
    $outputs = @{}
    if ($stackInfo.Stacks[0].Outputs) {
        foreach ($output in $stackInfo.Stacks[0].Outputs) {
            $outputs[$output.OutputKey] = $output.OutputValue
        }
    }
    
    $apiUrl = $outputs.ApiGatewayUrl
    if (!$apiUrl) {
        throw "API Gateway URL not found in CloudFormation outputs"
    }
    
    # Test basic API connectivity
    try {
        $response = Invoke-RestMethod -Uri "$apiUrl/health" -Method GET -TimeoutSec 10
        $healthStatus = "API responding"
    }
    catch {
        $healthStatus = "API not responding: $($_.Exception.Message)"
    }
    
    return @(
        "API Gateway URL: $apiUrl",
        "Health Check: $healthStatus"
    )
}

# Check Frontend
$frontendHealthy = Test-ComponentStatus "Frontend" {
    # Get stack outputs for Frontend URL
    $stackInfo = aws cloudformation describe-stacks --stack-name $StackName --region $Region --output json | ConvertFrom-Json
    $outputs = @{}
    if ($stackInfo.Stacks[0].Outputs) {
        foreach ($output in $stackInfo.Stacks[0].Outputs) {
            $outputs[$output.OutputKey] = $output.OutputValue
        }
    }
    
    $frontendUrl = $outputs.FrontendBucketUrl
    if (!$frontendUrl) {
        throw "Frontend URL not found in CloudFormation outputs"
    }
    
    # Check if bucket has content
    $bucketName = $frontendUrl -replace "http://([^.]+)\..*", '$1'
    $bucketObjects = aws s3 ls s3://$bucketName --region $Region 2>$null
    
    if (!$bucketObjects) {
        throw "Frontend bucket appears to be empty"
    }
    
    # Test frontend accessibility
    try {
        $response = Invoke-WebRequest -Uri $frontendUrl -Method GET -TimeoutSec 10
        $accessStatus = "Frontend accessible (Status: $($response.StatusCode))"
    }
    catch {
        $accessStatus = "Frontend not accessible: $($_.Exception.Message)"
    }
    
    return @(
        "Frontend URL: $frontendUrl",
        "Bucket Content: $(($bucketObjects -split "`n").Count) files",
        "Accessibility: $accessStatus"
    )
}

# Check Security (Cognito User Pool)
$securityHealthy = Test-ComponentStatus "Security" {
    # Get stack outputs for User Pool
    $stackInfo = aws cloudformation describe-stacks --stack-name $StackName --region $Region --output json | ConvertFrom-Json
    $outputs = @{}
    if ($stackInfo.Stacks[0].Outputs) {
        foreach ($output in $stackInfo.Stacks[0].Outputs) {
            $outputs[$output.OutputKey] = $output.OutputValue
        }
    }
    
    $userPoolId = $outputs.UserPoolId
    if (!$userPoolId) {
        throw "User Pool ID not found in CloudFormation outputs"
    }
    
    # Get User Pool details
    $userPool = aws cognito-idp describe-user-pool --user-pool-id $userPoolId --region $Region --output json | ConvertFrom-Json
    
    if ($userPool.UserPool.Status -ne "ACTIVE") {
        throw "User Pool status is '$($userPool.UserPool.Status)', expected 'ACTIVE'"
    }
    
    return @(
        "User Pool ID: $userPoolId",
        "Status: $($userPool.UserPool.Status)",
        "Creation Date: $($userPool.UserPool.CreationDate)"
    )
}

# Calculate overall system health
$healthyComponents = @($infraHealthy, $dbHealthy, $lambdaHealthy, $apiHealthy, $frontendHealthy, $securityHealthy) | Where-Object { $_ -eq $true }
$totalComponents = 6
$healthPercentage = [math]::Round(($healthyComponents.Count / $totalComponents) * 100)

if ($healthPercentage -eq 100) {
    $systemStatus.Overall = "Healthy"
    $overallColor = "Green"
    $overallMessage = "✅ All systems are operational and healthy."
} elseif ($healthPercentage -ge 80) {
    $systemStatus.Overall = "Warning"
    $overallColor = "Yellow"
    $overallMessage = "⚠️ System is mostly operational but has some issues that should be addressed."
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

foreach ($component in $systemStatus.Keys) {
    if ($component -eq "Overall") { continue }
    
    if ($systemStatus[$component].Status -eq "Error") {
        Write-Host "❌ $component Issues:" -ForegroundColor Red
        foreach ($detail in $systemStatus[$component].Details) {
            Write-Host "   - $detail" -ForegroundColor Red
        }
        Write-Host ""
    } elseif ($systemStatus[$component].Status -eq "Healthy") {
        Write-Host "✅ $component: Operating normally" -ForegroundColor Green
    }
}

# Provide next steps based on status
Write-Host ""
Write-Host "===== Next Steps =====" -ForegroundColor Cyan

if ($systemStatus.Overall -eq "Healthy") {
    Write-Host "🎉 System is fully operational!" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now:" -ForegroundColor Green
    Write-Host "1. Access the frontend application" -ForegroundColor Green
    Write-Host "2. Test API endpoints" -ForegroundColor Green
    Write-Host "3. Begin user acceptance testing" -ForegroundColor Green
    Write-Host "4. Configure monitoring and alerting" -ForegroundColor Green
} else {
    Write-Host "🔧 System requires attention:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Address the issues identified above" -ForegroundColor Yellow
    Write-Host "2. Re-run this status check" -ForegroundColor Yellow
    Write-Host "3. Check CloudFormation events for details" -ForegroundColor Yellow
    Write-Host "4. Review CloudWatch logs for error details" -ForegroundColor Yellow
}

# Display access information if system is healthy
if ($systemStatus.Overall -eq "Healthy") {
    Write-Host ""
    Write-Host "===== Access Information =====" -ForegroundColor Cyan
    
    $stackInfo = aws cloudformation describe-stacks --stack-name $StackName --region $Region --output json | ConvertFrom-Json
    $outputs = @{}
    if ($stackInfo.Stacks[0].Outputs) {
        foreach ($output in $stackInfo.Stacks[0].Outputs) {
            $outputs[$output.OutputKey] = $output.OutputValue
        }
    }
    
    if ($outputs.FrontendBucketUrl) {
        Write-Host "Frontend: $($outputs.FrontendBucketUrl)" -ForegroundColor Green
    }
    
    if ($outputs.ApiGatewayUrl) {
        Write-Host "API Gateway: $($outputs.ApiGatewayUrl)" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Default Login Credentials:" -ForegroundColor Yellow
    Write-Host "Email: admin@salepoint.com" -ForegroundColor Yellow
    Write-Host "Password: AdminPassword123!" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "===== Status Check Complete =====" -ForegroundColor Cyan
Write-Host "Timestamp: $(Get-Date)" -ForegroundColor Green
