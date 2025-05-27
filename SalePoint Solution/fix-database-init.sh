#!/bin/bash

# Quick fix script for database initialization issues

set -e

PROJECT_NAME="salepoint"
REGION="us-east-1"

echo "🔧 Quick Database Initialization Fix"
echo "======================================"

# Check if tables exist
echo "📊 Checking DynamoDB tables..."
for table in "salepoint-products" "salepoint-customers" "salepoint-orders"; do
    echo -n "  Checking $table... "
    if aws dynamodb describe-table --table-name "$table" --region "$REGION" >/dev/null 2>&1; then
        echo "✅ Exists"
        
        # Check if table has data
        count=$(aws dynamodb scan --table-name "$table" --select "COUNT" --query 'Count' --output text 2>/dev/null || echo "0")
        echo "    Items: $count"
        
        if [ "$count" = "0" ]; then
            echo "    🔄 Adding sample data..."
            
            case $table in
                "salepoint-products")
                    aws dynamodb put-item --table-name "$table" --item '{
                        "productId": {"S": "prod_001"},
                        "name": {"S": "Sample Product"},
                        "price": {"N": "99.99"},
                        "category": {"S": "Electronics"},
                        "stock": {"N": "10"}
                    }' --region "$REGION" || echo "    ⚠️ Failed to add sample product"
                    ;;
                "salepoint-customers")
                    aws dynamodb put-item --table-name "$table" --item '{
                        "customerId": {"S": "cust_001"},
                        "name": {"S": "Sample Customer"},
                        "email": {"S": "customer@example.com"},
                        "status": {"S": "active"}
                    }' --region "$REGION" || echo "    ⚠️ Failed to add sample customer"
                    ;;
                "salepoint-orders")
                    aws dynamodb put-item --table-name "$table" --item '{
                        "orderId": {"S": "order_001"},
                        "customerId": {"S": "cust_001"},
                        "totalAmount": {"N": "99.99"},
                        "status": {"S": "completed"}
                    }' --region "$REGION" || echo "    ⚠️ Failed to add sample order"
                    ;;
            esac
        fi
    else
        echo "❌ Missing"
    fi
done

echo ""
echo "✅ Database initialization fix completed!"
echo "Run ./deploy-status-check.sh to verify the fix"
