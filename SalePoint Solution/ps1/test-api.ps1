#!/usr/bin/env pwsh
# SalePoint API Testing Script
# Tests all API endpoints after deployment

param(
    [Parameter(Mandatory=$true)]
    [string]$ApiBaseUrl,
    
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-east-1"
)

Write-Host "===== SalePoint API Gateway Testing Script =====" -ForegroundColor Cyan
Write-Host "API Base URL: $ApiBaseUrl" -ForegroundColor Green
Write-Host "Region: $Region" -ForegroundColor Green
Write-Host ""

# Function to test HTTP endpoint
function Test-Endpoint {
    param(
        [string]$Method,
        [string]$Endpoint,
        [string]$Body = $null,
        [string]$Description
    )
    
    try {
        Write-Host "Testing: $Description" -ForegroundColor Yellow
        Write-Host "  $Method $Endpoint" -ForegroundColor Gray
        
        $headers = @{
            'Content-Type' = 'application/json'
            'Accept' = 'application/json'
        }
        
        $params = @{
            Uri = "$ApiBaseUrl$Endpoint"
            Method = $Method
            Headers = $headers
            TimeoutSec = 30
        }
        
        if ($Body -and ($Method -eq "POST" -or $Method -eq "PUT")) {
            $params.Body = $Body
        }
        
        $response = Invoke-RestMethod @params
        Write-Host "  ✓ Success - Status: 200" -ForegroundColor Green
        
        if ($response) {
            $responseJson = $response | ConvertTo-Json -Depth 3 -Compress
            if ($responseJson.Length -gt 200) {
                $responseJson = $responseJson.Substring(0, 200) + "..."
            }
            Write-Host "  Response: $responseJson" -ForegroundColor Gray
        }
        
        return $true
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $errorMessage = $_.Exception.Message
        
        if ($statusCode) {
            Write-Host "  ✗ Failed - Status: $statusCode" -ForegroundColor Red
        } else {
            Write-Host "  ✗ Failed - $errorMessage" -ForegroundColor Red
        }
        return $false
    }
    finally {
        Write-Host ""
    }
}

# Track test results
$testResults = @{
    Passed = 0
    Failed = 0
    Total = 0
}

function Update-TestResults {
    param([bool]$Success)
    $testResults.Total++
    if ($Success) {
        $testResults.Passed++
    } else {
        $testResults.Failed++
    }
}

Write-Host "===== Testing Products API =====" -ForegroundColor Cyan

# Test Products endpoints
Update-TestResults (Test-Endpoint "GET" "/products" -Description "Get all products")
Update-TestResults (Test-Endpoint "OPTIONS" "/products" -Description "Products CORS preflight")

# Test product creation
$newProduct = @{
    product_id = "TEST-$(Get-Random)"
    name = "Test Product"
    description = "Test product for API validation"
    price = 99.99
    stock_quantity = 10
    category_id = 1
} | ConvertTo-Json

Update-TestResults (Test-Endpoint "POST" "/products" -Body $newProduct -Description "Create new product")

Write-Host "===== Testing Customers API =====" -ForegroundColor Cyan

# Test Customers endpoints
Update-TestResults (Test-Endpoint "GET" "/customers" -Description "Get all customers")
Update-TestResults (Test-Endpoint "OPTIONS" "/customers" -Description "Customers CORS preflight")

# Test customer creation
$newCustomer = @{
    customer_id = "TEST-CUST-$(Get-Random)"
    name = "Test Customer Corp"
    email = "test@example.com"
    phone = "555-0123"
    assigned_sales_rep_id = "SR001"
} | ConvertTo-Json

Update-TestResults (Test-Endpoint "POST" "/customers" -Body $newCustomer -Description "Create new customer")

Write-Host "===== Testing Sales API =====" -ForegroundColor Cyan

# Test Sales endpoints
Update-TestResults (Test-Endpoint "GET" "/sales" -Description "Get all sales")
Update-TestResults (Test-Endpoint "OPTIONS" "/sales" -Description "Sales CORS preflight")

# Test sale creation
$newSale = @{
    customer_id = "CUST001"
    sales_rep_id = "SR001"
    total_amount = 299.97
    notes = "Test sale from API"
    items = @(
        @{
            product_id = "PROD001"
            quantity = 2
            price = 99.99
        }
    )
} | ConvertTo-Json

Update-TestResults (Test-Endpoint "POST" "/sales" -Body $newSale -Description "Create new sale")

Write-Host "===== Testing Inventory API =====" -ForegroundColor Cyan

# Test Inventory endpoints
Update-TestResults (Test-Endpoint "GET" "/inventory" -Description "Get inventory status")
Update-TestResults (Test-Endpoint "OPTIONS" "/inventory" -Description "Inventory CORS preflight")

Write-Host "===== Testing Analytics API =====" -ForegroundColor Cyan

# Test Analytics endpoints
Update-TestResults (Test-Endpoint "GET" "/analytics" -Description "Get analytics data")
Update-TestResults (Test-Endpoint "OPTIONS" "/analytics" -Description "Analytics CORS preflight")

Write-Host "===== Testing Documents API =====" -ForegroundColor Cyan

# Test Documents endpoints
Update-TestResults (Test-Endpoint "GET" "/documents" -Description "Get all documents")
Update-TestResults (Test-Endpoint "OPTIONS" "/documents" -Description "Documents CORS preflight")

Write-Host "===== Test Results Summary =====" -ForegroundColor Cyan
Write-Host "Total Tests: $($testResults.Total)" -ForegroundColor White
Write-Host "Passed: $($testResults.Passed)" -ForegroundColor Green
Write-Host "Failed: $($testResults.Failed)" -ForegroundColor Red

$successRate = [math]::Round(($testResults.Passed / $testResults.Total) * 100, 1)
Write-Host "Success Rate: $successRate%" -ForegroundColor $(if ($successRate -ge 80) { "Green" } elseif ($successRate -ge 60) { "Yellow" } else { "Red" })

if ($testResults.Failed -eq 0) {
    Write-Host "`n🎉 All tests passed! API Gateway is fully functional." -ForegroundColor Green
} elseif ($testResults.Passed -gt $testResults.Failed) {
    Write-Host "`n⚠️  Most tests passed, but some endpoints may need attention." -ForegroundColor Yellow
} else {
    Write-Host "`n❌ Multiple tests failed. Please check API Gateway configuration and Lambda functions." -ForegroundColor Red
}

Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Check CloudWatch logs for any Lambda function errors" -ForegroundColor White
Write-Host "2. Verify database connectivity from Lambda functions" -ForegroundColor White
Write-Host "3. Test the frontend application with this API URL" -ForegroundColor White
Write-Host "4. Monitor API Gateway metrics in CloudWatch" -ForegroundColor White
