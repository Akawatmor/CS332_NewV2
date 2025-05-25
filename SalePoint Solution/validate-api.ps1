#!/usr/bin/env pwsh
# SalePoint API Gateway Validation Script
# Comprehensive testing of all API endpoints after deployment

param(
    [Parameter(Mandatory=$false)]
    [string]$StackName = "salepoint-infrastructure",
    
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-east-1"
)

Write-Host "===== SalePoint API Gateway Validation =====" -ForegroundColor Cyan
Write-Host "Stack Name: $StackName" -ForegroundColor Green
Write-Host "Region: $Region" -ForegroundColor Green
Write-Host ""

# Get API Gateway URL from CloudFormation stack
try {
    Write-Host "Retrieving API Gateway URL from CloudFormation..." -ForegroundColor Yellow
    $stackOutputs = aws cloudformation describe-stacks --stack-name $StackName --region $Region --query "Stacks[0].Outputs" --output json | ConvertFrom-Json
    
    $outputs = @{}
    foreach ($output in $stackOutputs) {
        $outputs[$output.OutputKey] = $output.OutputValue
    }

    if (!$outputs.ApiGatewayUrl) {
        Write-Host "❌ Could not find ApiGatewayUrl in CloudFormation outputs" -ForegroundColor Red
        exit 1
    }

    $apiBaseUrl = $outputs.ApiGatewayUrl
    Write-Host "✓ Found API Gateway URL: $apiBaseUrl" -ForegroundColor Green
}
catch {
    Write-Host "❌ Failed to retrieve CloudFormation outputs: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Function to test HTTP endpoint with detailed validation
function Test-EndpointDetailed {
    param(
        [string]$Method,
        [string]$Endpoint,
        [string]$Body = $null,
        [string]$Description,
        [hashtable]$ExpectedResponseFields = @{},
        [int]$ExpectedStatusCode = 200
    )
    
    try {
        Write-Host "Testing: $Description" -ForegroundColor Yellow
        Write-Host "  $Method $apiBaseUrl$Endpoint" -ForegroundColor Gray
        
        $headers = @{
            'Content-Type' = 'application/json'
            'Accept' = 'application/json'
        }
        
        $params = @{
            Uri = "$apiBaseUrl$Endpoint"
            Method = $Method
            Headers = $headers
            TimeoutSec = 30
        }
        
        if ($Body -and ($Method -eq "POST" -or $Method -eq "PUT")) {
            $params.Body = $Body
            Write-Host "  Request Body: $Body" -ForegroundColor Gray
        }
        
        $response = Invoke-RestMethod @params
        
        # Validate response structure
        $validationPassed = $true
        if ($ExpectedResponseFields.Count -gt 0) {
            foreach ($field in $ExpectedResponseFields.Keys) {
                if (($response -is [array] -and $response.Count -gt 0 -and $response[0].PSObject.Properties.Name -contains $field) -or
                    ($response.PSObject.Properties.Name -contains $field)) {
                    Write-Host "  ✓ Field '$field' present in response" -ForegroundColor DarkGreen
                } else {
                    Write-Host "  ✗ Field '$field' missing from response" -ForegroundColor Red
                    $validationPassed = $false
                }
            }
        }
        
        if ($validationPassed) {
            Write-Host "  ✓ Success - Status: $ExpectedStatusCode, Validation: Passed" -ForegroundColor Green
        } else {
            Write-Host "  ⚠ Success - Status: $ExpectedStatusCode, Validation: Failed" -ForegroundColor Yellow
        }
        
        # Show sample response
        if ($response) {
            $responseJson = $response | ConvertTo-Json -Depth 2 -Compress
            if ($responseJson.Length -gt 300) {
                $responseJson = $responseJson.Substring(0, 300) + "..."
            }
            Write-Host "  Sample Response: $responseJson" -ForegroundColor Gray
        }
        
        return @{ Success = $true; ValidationPassed = $validationPassed; Response = $response }
    }
    catch {
        $statusCode = "Unknown"
        if ($_.Exception.Response) {
            $statusCode = $_.Exception.Response.StatusCode.value__
        }
        
        Write-Host "  ✗ Failed - Status: $statusCode, Error: $($_.Exception.Message)" -ForegroundColor Red
        return @{ Success = $false; ValidationPassed = $false; Response = $null }
    }
    finally {
        Write-Host ""
    }
}

# Track comprehensive test results
$testResults = @{
    Passed = 0
    Failed = 0
    ValidationFailed = 0
    Total = 0
    Details = @()
}

function Update-TestResults {
    param(
        [hashtable]$Result,
        [string]$TestName
    )
    
    $testResults.Total++
    
    if ($Result.Success) {
        if ($Result.ValidationPassed) {
            $testResults.Passed++
            $status = "PASS"
        } else {
            $testResults.ValidationFailed++
            $status = "VALIDATION_FAIL"
        }
    } else {
        $testResults.Failed++
        $status = "FAIL"
    }
    
    $testResults.Details += @{
        Test = $TestName
        Status = $status
        Response = $Result.Response
    }
}

Write-Host "===== Testing Products API =====" -ForegroundColor Cyan

# Test Products endpoints
$result = Test-EndpointDetailed "GET" "/products" -Description "Get all products" -ExpectedResponseFields @{ "product_id" = "string"; "name" = "string"; "price" = "number" }
Update-TestResults $result "Products-GET"

$result = Test-EndpointDetailed "OPTIONS" "/products" -Description "Products CORS preflight"
Update-TestResults $result "Products-OPTIONS"

# Test product creation
$newProduct = @{
    product_id = "TEST-API-$(Get-Random)"
    name = "API Test Product"
    description = "Product created during API validation"
    price = 149.99
    stock_quantity = 25
    category_id = 1
} | ConvertTo-Json

$result = Test-EndpointDetailed "POST" "/products" -Body $newProduct -Description "Create new product" -ExpectedResponseFields @{ "message" = "string" } -ExpectedStatusCode 201
Update-TestResults $result "Products-POST"

Write-Host "===== Testing Customers API =====" -ForegroundColor Cyan

$result = Test-EndpointDetailed "GET" "/customers" -Description "Get all customers" -ExpectedResponseFields @{ "customer_id" = "string"; "name" = "string"; "email" = "string" }
Update-TestResults $result "Customers-GET"

$result = Test-EndpointDetailed "OPTIONS" "/customers" -Description "Customers CORS preflight"
Update-TestResults $result "Customers-OPTIONS"

# Test customer creation
$newCustomer = @{
    customer_id = "TEST-CUST-$(Get-Random)"
    name = "API Test Customer Corp"
    email = "test-api@example.com"
    phone = "555-0199"
    assigned_sales_rep_id = "SR001"
} | ConvertTo-Json

$result = Test-EndpointDetailed "POST" "/customers" -Body $newCustomer -Description "Create new customer" -ExpectedResponseFields @{ "message" = "string" } -ExpectedStatusCode 201
Update-TestResults $result "Customers-POST"

Write-Host "===== Testing Sales API =====" -ForegroundColor Cyan

$result = Test-EndpointDetailed "GET" "/sales" -Description "Get all sales" -ExpectedResponseFields @{ "sale_id" = "string"; "customer_id" = "string"; "total_amount" = "number" }
Update-TestResults $result "Sales-GET"

$result = Test-EndpointDetailed "OPTIONS" "/sales" -Description "Sales CORS preflight"
Update-TestResults $result "Sales-OPTIONS"

# Test sale creation
$newSale = @{
    customer_id = "CUST001"
    sales_rep_id = "SR001"
    total_amount = 449.97
    notes = "API validation test sale"
    items = @(
        @{
            product_id = "PROD001"
            quantity = 3
            price = 149.99
        }
    )
} | ConvertTo-Json

$result = Test-EndpointDetailed "POST" "/sales" -Body $newSale -Description "Create new sale" -ExpectedResponseFields @{ "message" = "string" } -ExpectedStatusCode 201
Update-TestResults $result "Sales-POST"

Write-Host "===== Testing Inventory API =====" -ForegroundColor Cyan

$result = Test-EndpointDetailed "GET" "/inventory" -Description "Get inventory status" -ExpectedResponseFields @{ "product_id" = "string"; "stock_quantity" = "number" }
Update-TestResults $result "Inventory-GET"

$result = Test-EndpointDetailed "OPTIONS" "/inventory" -Description "Inventory CORS preflight"
Update-TestResults $result "Inventory-OPTIONS"

Write-Host "===== Testing Analytics API =====" -ForegroundColor Cyan

$result = Test-EndpointDetailed "GET" "/analytics" -Description "Get analytics data" -ExpectedResponseFields @{ "total_sales" = "number"; "sales_by_rep" = "array" }
Update-TestResults $result "Analytics-GET"

$result = Test-EndpointDetailed "OPTIONS" "/analytics" -Description "Analytics CORS preflight"
Update-TestResults $result "Analytics-OPTIONS"

Write-Host "===== Testing Documents API =====" -ForegroundColor Cyan

$result = Test-EndpointDetailed "GET" "/documents" -Description "Get all documents" -ExpectedResponseFields @{ "document_id" = "string"; "title" = "string"; "category" = "string" }
Update-TestResults $result "Documents-GET"

$result = Test-EndpointDetailed "OPTIONS" "/documents" -Description "Documents CORS preflight"
Update-TestResults $result "Documents-OPTIONS"

Write-Host "===== Comprehensive Test Results =====" -ForegroundColor Cyan
Write-Host "Total Tests: $($testResults.Total)" -ForegroundColor White
Write-Host "Passed: $($testResults.Passed)" -ForegroundColor Green
Write-Host "Validation Failed: $($testResults.ValidationFailed)" -ForegroundColor Yellow
Write-Host "Failed: $($testResults.Failed)" -ForegroundColor Red

$successRate = [math]::Round((($testResults.Passed + $testResults.ValidationFailed) / $testResults.Total) * 100, 1)
$validationRate = [math]::Round(($testResults.Passed / $testResults.Total) * 100, 1)

Write-Host "Connection Success Rate: $successRate%" -ForegroundColor $(if ($successRate -ge 90) { "Green" } elseif ($successRate -ge 70) { "Yellow" } else { "Red" })
Write-Host "Data Validation Rate: $validationRate%" -ForegroundColor $(if ($validationRate -ge 80) { "Green" } elseif ($validationRate -ge 60) { "Yellow" } else { "Red" })

Write-Host "`n===== Detailed Results =====" -ForegroundColor Cyan
foreach ($detail in $testResults.Details) {
    $color = switch ($detail.Status) {
        "PASS" { "Green" }
        "VALIDATION_FAIL" { "Yellow" }
        "FAIL" { "Red" }
    }
    Write-Host "$($detail.Test): $($detail.Status)" -ForegroundColor $color
}

# Final recommendations
Write-Host "`n===== Recommendations =====" -ForegroundColor Cyan

if ($testResults.Failed -eq 0 -and $testResults.ValidationFailed -eq 0) {
    Write-Host "🎉 Perfect! All API endpoints are working correctly with proper data validation." -ForegroundColor Green
    Write-Host "✓ The SalePoint API is ready for production use." -ForegroundColor Green
} elseif ($testResults.Failed -eq 0) {
    Write-Host "✅ Good! All endpoints are reachable, but some data validation issues were found." -ForegroundColor Yellow
    Write-Host "→ Review Lambda function responses to ensure proper data structure." -ForegroundColor Yellow
} elseif ($testResults.Failed -le 2) {
    Write-Host "⚠️ Most endpoints are working, but some issues need attention." -ForegroundColor Yellow
    Write-Host "→ Check CloudWatch logs for the failing endpoints." -ForegroundColor Yellow
    Write-Host "→ Verify Lambda function permissions and database connectivity." -ForegroundColor Yellow
} else {
    Write-Host "❌ Multiple critical issues found with the API Gateway setup." -ForegroundColor Red
    Write-Host "→ Verify CloudFormation deployment completed successfully." -ForegroundColor Red
    Write-Host "→ Check API Gateway method configurations and Lambda integrations." -ForegroundColor Red
    Write-Host "→ Review Lambda function logs in CloudWatch." -ForegroundColor Red
}

Write-Host "`nNext Steps:" -ForegroundColor Cyan
Write-Host "1. Review CloudWatch logs: /aws/lambda/salepoint-*" -ForegroundColor White
Write-Host "2. Test the frontend application with this API URL: $apiBaseUrl" -ForegroundColor White
Write-Host "3. Monitor API Gateway metrics and usage patterns" -ForegroundColor White
Write-Host "4. Setup API Gateway caching for better performance" -ForegroundColor White

# Export results for further analysis
$resultsFile = "api-validation-results-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
$testResults | ConvertTo-Json -Depth 3 | Out-File -FilePath $resultsFile -Encoding utf8
Write-Host "`nDetailed results saved to: $resultsFile" -ForegroundColor Gray
