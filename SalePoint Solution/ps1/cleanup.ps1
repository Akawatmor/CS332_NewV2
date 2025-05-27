# SalePoint Cleanup Script
# Run this script to remove all AWS resources created for SalePoint

param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectName = "salepoint",
    
    [Parameter(Mandatory=$true)]
    [string]$Region = "us-east-1",
    
    [switch]$Force
)

Write-Host "SalePoint Cleanup Script" -ForegroundColor Red
Write-Host "This will delete ALL resources for project: $ProjectName" -ForegroundColor Yellow
Write-Host "Region: $Region" -ForegroundColor Yellow

if (-not $Force) {
    $confirmation = Read-Host "Are you sure you want to proceed? Type 'DELETE' to confirm"
    if ($confirmation -ne "DELETE") {
        Write-Host "Cleanup cancelled." -ForegroundColor Green
        exit 0
    }
}

$ErrorActionPreference = "Continue"

try {
    # Get AWS account ID
    $awsIdentity = aws sts get-caller-identity --output json | ConvertFrom-Json
    $accountId = $awsIdentity.Account

    Write-Host "`n=== Step 1: Emptying S3 Buckets ===" -ForegroundColor Cyan
    
    # Empty frontend bucket
    $frontendBucket = "$ProjectName-frontend-$accountId-$Region"
    Write-Host "Emptying frontend bucket: $frontendBucket" -ForegroundColor Yellow
    try {
        aws s3 rm s3://$frontendBucket --recursive --region $Region
        Write-Host "Frontend bucket emptied successfully" -ForegroundColor Green
    }
    catch {
        Write-Host "Error emptying frontend bucket: $($_.Exception.Message)" -ForegroundColor Red
    }

    # Empty documents bucket
    $documentsBucket = "$ProjectName-documents-$accountId-$Region"
    Write-Host "Emptying documents bucket: $documentsBucket" -ForegroundColor Yellow
    try {
        aws s3 rm s3://$documentsBucket --recursive --region $Region
        Write-Host "Documents bucket emptied successfully" -ForegroundColor Green
    }
    catch {
        Write-Host "Error emptying documents bucket: $($_.Exception.Message)" -ForegroundColor Red
    }

    Write-Host "`n=== Step 2: Deleting CloudFormation Stack ===" -ForegroundColor Cyan
    
    $stackName = "$ProjectName-infrastructure"
    Write-Host "Deleting CloudFormation stack: $stackName" -ForegroundColor Yellow
    
    try {
        aws cloudformation delete-stack --stack-name $stackName --region $Region
        
        Write-Host "Waiting for stack deletion to complete..." -ForegroundColor Yellow
        Write-Host "This may take 10-15 minutes..." -ForegroundColor Yellow
        
        aws cloudformation wait stack-delete-complete --stack-name $stackName --region $Region
        
        Write-Host "CloudFormation stack deleted successfully!" -ForegroundColor Green
    }
    catch {
        Write-Host "Error deleting CloudFormation stack: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "You may need to manually delete some resources in the AWS console." -ForegroundColor Yellow
    }

    Write-Host "`n=== Step 3: Cleaning Local Files ===" -ForegroundColor Cyan
    
    # Clean deployment artifacts
    if (Test-Path "deployments") {
        Write-Host "Removing deployment artifacts..." -ForegroundColor Yellow
        Remove-Item -Path "deployments" -Recurse -Force
        Write-Host "Deployment artifacts removed" -ForegroundColor Green
    }

    # Clean frontend build
    if (Test-Path "frontend/build") {
        Write-Host "Removing frontend build..." -ForegroundColor Yellow
        Remove-Item -Path "frontend/build" -Recurse -Force
        Write-Host "Frontend build removed" -ForegroundColor Green
    }

    # Clean node_modules (optional)
    $cleanNodeModules = Read-Host "Do you want to remove node_modules folders? (y/n)"
    if ($cleanNodeModules -eq "y" -or $cleanNodeModules -eq "Y") {
        if (Test-Path "frontend/node_modules") {
            Write-Host "Removing frontend node_modules..." -ForegroundColor Yellow
            Remove-Item -Path "frontend/node_modules" -Recurse -Force
        }
        if (Test-Path "lambda-functions/node_modules") {
            Write-Host "Removing lambda-functions node_modules..." -ForegroundColor Yellow
            Remove-Item -Path "lambda-functions/node_modules" -Recurse -Force
        }
        Write-Host "Node modules removed" -ForegroundColor Green
    }

    Write-Host "`n=== Cleanup Summary ===" -ForegroundColor Green
    Write-Host "✓ S3 buckets emptied" -ForegroundColor Green
    Write-Host "✓ CloudFormation stack deleted" -ForegroundColor Green
    Write-Host "✓ Local artifacts cleaned" -ForegroundColor Green
    
    Write-Host "`nAll SalePoint resources have been cleaned up!" -ForegroundColor Green
    Write-Host "Please verify in the AWS console that all resources are deleted." -ForegroundColor Yellow

}
catch {
    Write-Host "`nCleanup failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Some resources may need to be manually deleted in the AWS console." -ForegroundColor Yellow
}

Write-Host "`nCleanup process completed." -ForegroundColor White
