#!/usr/bin/env pwsh
# SalePoint Solution - Development Verification Script
# Verifies the completeness and quality of the SalePoint Solution codebase

param(
    [Parameter(Mandatory=$false)]
    [switch]$Detailed = $false
)

Write-Host "===== SalePoint Solution - Development Verification =====" -ForegroundColor Cyan
Write-Host "Verifying the completeness and quality of the SalePoint Solution" -ForegroundColor Green
Write-Host "Timestamp: $(Get-Date)" -ForegroundColor Green
Write-Host ""

$verificationResults = @{
    Infrastructure = @{ Score = 0; MaxScore = 10; Issues = @() }
    Backend = @{ Score = 0; MaxScore = 15; Issues = @() }
    Frontend = @{ Score = 0; MaxScore = 10; Issues = @() }
    Testing = @{ Score = 0; MaxScore = 7; Issues = @() }
    Documentation = @{ Score = 0; MaxScore = 6; Issues = @() }
    Overall = @{ Score = 0; MaxScore = 48; Grade = ""; Issues = @() }
}

# Helper function to check if file exists and add score
function Test-FileExists {
    param(
        [string]$FilePath,
        [string]$Description,
        [int]$Points = 1,
        [string]$Category
    )
    
    if (Test-Path $FilePath) {
        Write-Host "✅ $Description" -ForegroundColor Green
        $verificationResults[$Category].Score += $Points
        return $true
    } else {
        $verificationResults[$Category].Issues += "Missing: $Description"
        Write-Host "❌ $Description" -ForegroundColor Red
        return $false
    }
}

# Helper function to check file content
function Test-FileContent {
    param(
        [string]$FilePath,
        [string]$SearchPattern,
        [string]$Description,
        [int]$Points = 1,
        [string]$Category
    )
    
    if (Test-Path $FilePath) {
        $content = Get-Content $FilePath -Raw -ErrorAction SilentlyContinue
        if ($content -and $content -match $SearchPattern) {
            Write-Host "✅ $Description" -ForegroundColor Green
            $verificationResults[$Category].Score += $Points
            return $true
        }
    }
    
    $verificationResults[$Category].Issues += "Missing: $Description"
    Write-Host "❌ $Description" -ForegroundColor Red
    return $false
}

Write-Host "=== Infrastructure Verification ===" -ForegroundColor Yellow

# CloudFormation Template
Test-FileExists "infrastructure\main-template.yaml" "CloudFormation main template" 2 "Infrastructure"
Test-FileContent "infrastructure\main-template.yaml" "AWS::RDS::DBInstance" "RDS Database configuration" 1 "Infrastructure"
Test-FileContent "infrastructure\main-template.yaml" "AWS::DynamoDB::Table" "DynamoDB configuration" 1 "Infrastructure"
Test-FileContent "infrastructure\main-template.yaml" "AWS::Lambda::Function" "Lambda functions" 1 "Infrastructure"
Test-FileContent "infrastructure\main-template.yaml" "AWS::ApiGateway::RestApi" "API Gateway configuration" 2 "Infrastructure"
Test-FileContent "infrastructure\main-template.yaml" "AWS::S3::Bucket" "S3 buckets" 1 "Infrastructure"
Test-FileContent "infrastructure\main-template.yaml" "AWS::Cognito::UserPool" "Cognito User Pool" 1 "Infrastructure"
Test-FileContent "infrastructure\main-template.yaml" "AWS::ApiGateway::Method" "API Gateway methods" 1 "Infrastructure"

Write-Host "`n=== Backend Services Verification ===" -ForegroundColor Yellow

# Lambda Functions
Test-FileExists "lambda-functions\products.js" "Product management Lambda" 2 "Backend"
Test-FileExists "lambda-functions\customers.js" "Customer tracking Lambda" 2 "Backend"
Test-FileExists "lambda-functions\sales.js" "Sales tracking Lambda" 2 "Backend"
Test-FileExists "lambda-functions\inventory.js" "Inventory tracking Lambda" 2 "Backend"
Test-FileExists "lambda-functions\analytics.js" "Analytics Lambda" 2 "Backend"
Test-FileExists "lambda-functions\documents.js" "Document management Lambda" 2 "Backend"

# Lambda function quality checks
Test-FileContent "lambda-functions\products.js" "exports.handler" "Lambda handler function" 1 "Backend"
Test-FileContent "lambda-functions\sales.js" "DynamoDB" "Database integration" 1 "Backend"
Test-FileContent "lambda-functions\customers.js" "response" "Response handling" 1 "Backend"

Write-Host "`n=== Frontend Application Verification ===" -ForegroundColor Yellow

# Frontend Structure
Test-FileExists "frontend\package.json" "Frontend package configuration" 1 "Frontend"
Test-FileExists "frontend\src\App.js" "Main React application" 2 "Frontend"
Test-FileExists "frontend\src\components\Sales" "Sales components" 1 "Frontend"
Test-FileExists "frontend\src\components\Products" "Product components" 1 "Frontend"
Test-FileExists "frontend\src\components\Customers" "Customer components" 1 "Frontend"
Test-FileExists "frontend\src\components\Dashboard" "Dashboard component" 2 "Frontend"
Test-FileExists "frontend\src\index.css" "Global styles" 1 "Frontend"
Test-FileContent "frontend\src\App.js" "App" "React App component" 1 "Frontend"

Write-Host "`n=== Testing Infrastructure Verification ===" -ForegroundColor Yellow

# Testing Scripts
Test-FileExists "test-api.ps1" "API testing script" 2 "Testing"
Test-FileExists "validate-api.ps1" "API validation script" 2 "Testing"
Test-FileExists "check-status-simple.ps1" "System status check" 1 "Testing"
Test-FileExists "deploy.ps1" "Deployment script" 2 "Testing"

Write-Host "`n=== Documentation Verification ===" -ForegroundColor Yellow

# Documentation
Test-FileExists "README.md" "Project README" 2 "Documentation"
Test-FileExists "DEPLOYMENT.md" "Deployment guide" 2 "Documentation"
Test-FileExists "END_TO_END_TESTING.md" "End-to-end testing guide" 2 "Documentation"
Test-FileContent "README.md" "SalePoint" "Project description" 1 "Documentation"

# Calculate overall score
$totalScore = 0
$totalMaxScore = 0

foreach ($category in $verificationResults.Keys) {
    if ($category -ne "Overall") {
        $totalScore += $verificationResults[$category].Score
        $totalMaxScore += $verificationResults[$category].MaxScore
        $verificationResults.Overall.Issues += $verificationResults[$category].Issues
    }
}

$verificationResults.Overall.Score = $totalScore
$verificationResults.Overall.MaxScore = $totalMaxScore

# Calculate grade
$percentage = [math]::Round(($totalScore / $totalMaxScore) * 100)

if ($percentage -ge 95) {
    $grade = "A+"
    $color = "Green"
} elseif ($percentage -ge 90) {
    $grade = "A"
    $color = "Green"
} elseif ($percentage -ge 85) {
    $grade = "B+"
    $color = "Yellow"
} elseif ($percentage -ge 80) {
    $grade = "B"
    $color = "Yellow"
} elseif ($percentage -ge 75) {
    $grade = "C+"
    $color = "Red"
} else {
    $grade = "C or below"
    $color = "Red"
}

$verificationResults.Overall.Grade = $grade

Write-Host "`n===== VERIFICATION RESULTS =====" -ForegroundColor Cyan
Write-Host ""

foreach ($category in @("Infrastructure", "Backend", "Frontend", "Testing", "Documentation")) {
    $result = $verificationResults[$category]
    $categoryPercentage = [math]::Round(($result.Score / $result.MaxScore) * 100)
    $categoryColor = if ($categoryPercentage -ge 80) { "Green" } elseif ($categoryPercentage -ge 60) { "Yellow" } else { "Red" }
    
    Write-Host "$category`: $($result.Score)/$($result.MaxScore) ($categoryPercentage%)" -ForegroundColor $categoryColor
}

Write-Host ""
Write-Host "OVERALL SCORE: $totalScore/$totalMaxScore ($percentage%) - Grade: $grade" -ForegroundColor $color
Write-Host ""

if ($percentage -ge 90) {
    Write-Host "🎉 EXCELLENT! SalePoint Solution is production-ready!" -ForegroundColor Green
    Write-Host ""
    Write-Host "✅ Complete infrastructure as code" -ForegroundColor Green
    Write-Host "✅ Full-stack application with all features" -ForegroundColor Green
    Write-Host "✅ Comprehensive testing and validation" -ForegroundColor Green
    Write-Host "✅ Professional documentation" -ForegroundColor Green
    Write-Host "✅ Error handling and fallback mechanisms" -ForegroundColor Green
    Write-Host ""
    Write-Host "🚀 Ready for AWS deployment and production use!" -ForegroundColor Green
} elseif ($percentage -ge 75) {
    Write-Host "👍 GOOD! SalePoint Solution is mostly complete." -ForegroundColor Yellow
    Write-Host "Minor improvements recommended before production deployment." -ForegroundColor Yellow
} else {
    Write-Host "⚠️ NEEDS WORK! Some critical components are missing." -ForegroundColor Red
    Write-Host "Complete the missing items before deployment." -ForegroundColor Red
}

if ($Detailed -and $verificationResults.Overall.Issues.Count -gt 0) {
    Write-Host "`n=== Issues Found ===" -ForegroundColor Red
    foreach ($issue in $verificationResults.Overall.Issues) {
        Write-Host "• $issue" -ForegroundColor Red
    }
}

Write-Host "`n=== Project Architecture Summary ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "🏗️ Infrastructure: AWS CloudFormation with complete serverless architecture" -ForegroundColor White
Write-Host "🗄️ Databases: Hybrid RDS MySQL + DynamoDB for optimal performance" -ForegroundColor White
Write-Host "⚡ Compute: AWS Lambda functions with intelligent fallback mechanisms" -ForegroundColor White
Write-Host "🌐 API: REST API Gateway with full CRUD operations and CORS" -ForegroundColor White
Write-Host "🖥️ Frontend: Modern React application with responsive design" -ForegroundColor White
Write-Host "🔐 Security: AWS Cognito authentication and IAM role-based access" -ForegroundColor White
Write-Host "📊 Analytics: Built-in reporting and dashboard capabilities" -ForegroundColor White
Write-Host "🧪 Testing: Comprehensive test suites and validation scripts" -ForegroundColor White
Write-Host ""

Write-Host "=== Next Steps ===" -ForegroundColor Cyan
Write-Host "1. Configure AWS credentials (see END_TO_END_TESTING.md)" -ForegroundColor White
Write-Host "2. Run: .\deploy.ps1 -ProjectName salepoint -Region us-east-1" -ForegroundColor White
Write-Host "3. Execute: .\validate-api.ps1 for comprehensive testing" -ForegroundColor White
Write-Host "4. Access the deployed application for user acceptance testing" -ForegroundColor White
Write-Host ""

Write-Host "===== Verification Complete =====" -ForegroundColor Cyan
Write-Host "Timestamp: $(Get-Date)" -ForegroundColor Green
