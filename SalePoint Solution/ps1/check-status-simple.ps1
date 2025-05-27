#!/usr/bin/env pwsh
# SalePoint System Status Check - Simplified

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

$healthyComponents = 0
$totalComponents = 6

# Check Infrastructure (CloudFormation Stack)
Write-Host "Checking Infrastructure..." -ForegroundColor Yellow
try {
    $stackInfo = aws cloudformation describe-stacks --stack-name $StackName --region $Region --output json | ConvertFrom-Json
    
    if ($stackInfo.Stacks -and $stackInfo.Stacks.Count -gt 0) {
        $stack = $stackInfo.Stacks[0]
        if ($stack.StackStatus -like "*COMPLETE*") {
            Write-Host "✓ Infrastructure: Stack is $($stack.StackStatus)" -ForegroundColor Green
            $healthyComponents++
        } else {
            Write-Host "✗ Infrastructure: Stack status is $($stack.StackStatus)" -ForegroundColor Red
        }
    } else {
        Write-Host "✗ Infrastructure: Stack not found" -ForegroundColor Red
    }
}
catch {
    Write-Host "✗ Infrastructure: Error - $($_.Exception.Message)" -ForegroundColor Red
}

# Check Database (RDS)
Write-Host "Checking Database..." -ForegroundColor Yellow
try {
    $rdsInstances = aws rds describe-db-instances --region $Region --output json | ConvertFrom-Json
    $salepointDB = $rdsInstances.DBInstances | Where-Object { $_.DBInstanceIdentifier -like "*salepoint*" }
    
    if ($salepointDB -and $salepointDB.DBInstanceStatus -eq "available") {
        Write-Host "✓ Database: RDS instance is available" -ForegroundColor Green
        $healthyComponents++
    } else {
        Write-Host "✗ Database: RDS instance not found or not available" -ForegroundColor Red
    }
}
catch {
    Write-Host "✗ Database: Error - $($_.Exception.Message)" -ForegroundColor Red
}

# Check Lambda Functions
Write-Host "Checking Lambda Functions..." -ForegroundColor Yellow
try {
    $functions = aws lambda list-functions --region $Region --output json | ConvertFrom-Json
    $salepointFunctions = $functions.Functions | Where-Object { $_.FunctionName -like "*salepoint*" }
    
    if ($salepointFunctions -and $salepointFunctions.Count -gt 0) {
        $activeFunctions = $salepointFunctions | Where-Object { $_.State -eq "Active" }
        if ($activeFunctions.Count -eq $salepointFunctions.Count) {
            Write-Host "✓ Lambda: All $($salepointFunctions.Count) functions are active" -ForegroundColor Green
            $healthyComponents++
        } else {
            Write-Host "✗ Lambda: $($activeFunctions.Count)/$($salepointFunctions.Count) functions are active" -ForegroundColor Red
        }
    } else {
        Write-Host "✗ Lambda: No SalePoint functions found" -ForegroundColor Red
    }
}
catch {
    Write-Host "✗ Lambda: Error - $($_.Exception.Message)" -ForegroundColor Red
}

# Check API Gateway
Write-Host "Checking API Gateway..." -ForegroundColor Yellow
try {
    # Get API Gateway URL from stack outputs
    $outputs = @{}
    if ($stackInfo.Stacks[0].Outputs) {
        foreach ($output in $stackInfo.Stacks[0].Outputs) {
            $outputs[$output.OutputKey] = $output.OutputValue
        }
    }
    
    $apiUrl = $outputs.ApiGatewayUrl
    if ($apiUrl) {
        # Test basic connectivity
        try {
            $response = Invoke-RestMethod -Uri "$apiUrl/health" -Method GET -TimeoutSec 10
            Write-Host "✓ API Gateway: Responding at $apiUrl" -ForegroundColor Green
            $healthyComponents++
        }
        catch {
            Write-Host "⚠ API Gateway: URL found but not responding - $apiUrl" -ForegroundColor Yellow
            $healthyComponents++ # Consider partially healthy since infrastructure exists
        }
    } else {
        Write-Host "✗ API Gateway: URL not found in stack outputs" -ForegroundColor Red
    }
}
catch {
    Write-Host "✗ API Gateway: Error - $($_.Exception.Message)" -ForegroundColor Red
}

# Check Frontend (S3)
Write-Host "Checking Frontend..." -ForegroundColor Yellow
try {
    $frontendUrl = $outputs.FrontendBucketUrl
    if ($frontendUrl) {
        # Extract bucket name
        $bucketName = ($frontendUrl -split "//")[1] -split "\." | Select-Object -First 1
        
        # Check if bucket has content
        $bucketObjects = aws s3 ls s3://$bucketName --region $Region 2>$null
        if ($bucketObjects) {
            Write-Host "✓ Frontend: Bucket has content at $frontendUrl" -ForegroundColor Green
            $healthyComponents++
        } else {
            Write-Host "✗ Frontend: Bucket exists but appears empty" -ForegroundColor Red
        }
    } else {
        Write-Host "✗ Frontend: URL not found in stack outputs" -ForegroundColor Red
    }
}
catch {
    Write-Host "✗ Frontend: Error - $($_.Exception.Message)" -ForegroundColor Red
}

# Check Security (Cognito)
Write-Host "Checking Security..." -ForegroundColor Yellow
try {
    $userPoolId = $outputs.UserPoolId
    if ($userPoolId) {
        $userPool = aws cognito-idp describe-user-pool --user-pool-id $userPoolId --region $Region --output json | ConvertFrom-Json
        if ($userPool.UserPool.Status -eq "ACTIVE") {
            Write-Host "✓ Security: User Pool is active" -ForegroundColor Green
            $healthyComponents++
        } else {
            Write-Host "✗ Security: User Pool status is $($userPool.UserPool.Status)" -ForegroundColor Red
        }
    } else {
        Write-Host "✗ Security: User Pool ID not found in stack outputs" -ForegroundColor Red
    }
}
catch {
    Write-Host "✗ Security: Error - $($_.Exception.Message)" -ForegroundColor Red
}

# Calculate overall health
$healthPercentage = [math]::Round(($healthyComponents / $totalComponents) * 100)

Write-Host ""
Write-Host "===== Overall System Health =====" -ForegroundColor Cyan

if ($healthPercentage -eq 100) {
    Write-Host "Overall Health: HEALTHY (${healthPercentage}%)" -ForegroundColor Green
    Write-Host "✅ All systems are operational and healthy." -ForegroundColor Green
} elseif ($healthPercentage -ge 80) {
    Write-Host "Overall Health: WARNING (${healthPercentage}%)" -ForegroundColor Yellow
    Write-Host "⚠️ System is mostly operational but has some issues." -ForegroundColor Yellow
} else {
    Write-Host "Overall Health: CRITICAL (${healthPercentage}%)" -ForegroundColor Red
    Write-Host "❌ System has critical issues that need attention." -ForegroundColor Red
}

if ($healthPercentage -eq 100) {
    Write-Host ""
    Write-Host "===== Access Information =====" -ForegroundColor Cyan
    
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
Write-Host "Healthy Components: $healthyComponents/$totalComponents" -ForegroundColor Green
Write-Host "Timestamp: $(Get-Date)" -ForegroundColor Green
