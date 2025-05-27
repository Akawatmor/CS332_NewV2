    print_step "Fixing Lambda Functions"
    
    local fix_applied=false
    
    # First try the comprehensive Lambda 502 fix script
    if [ -f "sh/fix-lambda-502.sh" ]; then
        print_info "Running comprehensive Lambda 502 fix script..."
        if ./sh/fix-lambda-502.sh; then
            print_success "Lambda 502 fixes completed successfully!"
            fix_applied=true
        else
            print_warning "Lambda 502 fix script encountered issues, trying alternative fix..."
        fi
    fi
    
    # If the main fix didn't work or isn't available, try the sales lambda fix
    if [ "$fix_applied" = false ] && [ -f "fix-sales-lambda.sh" ]; then
        print_info "Running sales Lambda fix script..."
        if ./fix-sales-lambda.sh; then
            print_success "Sales Lambda fixes completed successfully!"
            fix_applied=true
        else
            print_warning "Sales Lambda fix script encountered issues..."
        fi
    fi
    
    # If no specific fix scripts are available, try manual fixes
    if [ "$fix_applied" = false ]; then
        print_info "Attempting manual Lambda function updates..."
        
        # Check if we have the fixed deployment packages
        local packages_updated=0
        
        # Update Orders function if fixed package exists
        if [ -d "lambda-deployment-orders-fixed" ]; then
            print_info "Updating Orders function with fixed package..."
            if aws lambda update-function-code \
                --function-name "salepoint-orders" \
                --zip-file fileb://lambda-deployment-orders-fixed.zip \
                --region us-east-1 >/dev/null 2>&1; then
                print_success "Orders function updated"
                ((packages_updated++))
            fi
        fi
        
        # Update Products function if fixed package exists  
        if [ -d "lambda-deployment-products-fixed" ]; then
            print_info "Updating Products function with fixed package..."
            if aws lambda update-function-code \
                --function-name "salepoint-products" \
                --zip-file fileb://lambda-deployment-products-fixed.zip \
                --region us-east-1 >/dev/null 2>&1; then
                print_success "Products function updated"
                ((packages_updated++))
            fi
        fi
        
        # Update Customers function if fixed package exists
        if [ -d "lambda-deployment-customers-fixed" ]; then
            print_info "Updating Customers function with fixed package..."
            if aws lambda update-function-code \
                --function-name "salepoint-customers" \
                --zip-file fileb://lambda-deployment-customers-fixed.zip \
                --region us-east-1 >/dev/null 2>&1; then
                print_success "Customers function updated"
                ((packages_updated++))
            fi
        fi
        

# Test the function
source temp_test_function.sh
fix_lambda_functions

