#!/bin/bash

# SalePoint Solution - DynamoDB Table Creation Script
# This script creates DynamoDB tables for session management and caching

set -e

echo "Starting DynamoDB table creation for SalePoint Solution..."

# Configuration variables
REGION="${AWS_DEFAULT_REGION:-us-east-1}"
TABLE_PREFIX="SalePoint"

echo "Using Region: $REGION"

# Function to create table and wait for it to be active
create_table_and_wait() {
    local table_name=$1
    local key_schema=$2
    local attribute_definitions=$3
    local billing_mode=${4:-PAY_PER_REQUEST}
    local gsi_config=$5
    
    echo "Creating table: $table_name"
    
    if [ -n "$gsi_config" ]; then
        aws dynamodb create-table \
            --table-name "$table_name" \
            --key-schema "$key_schema" \
            --attribute-definitions "$attribute_definitions" \
            --billing-mode "$billing_mode" \
            --global-secondary-indexes "$gsi_config" \
            --region "$REGION" \
            --no-cli-pager
    else
        aws dynamodb create-table \
            --table-name "$table_name" \
            --key-schema "$key_schema" \
            --attribute-definitions "$attribute_definitions" \
            --billing-mode "$billing_mode" \
            --region "$REGION" \
            --no-cli-pager
    fi
    
    echo "Waiting for table $table_name to become active..."
    aws dynamodb wait table-exists --table-name "$table_name" --region "$REGION"
    echo "Table $table_name is now active"
}

# Create Sessions table for user session management
echo "Creating Sessions table..."
create_table_and_wait \
    "${TABLE_PREFIX}-Sessions" \
    "AttributeName=session_id,KeyType=HASH" \
    "AttributeName=session_id,AttributeType=S AttributeName=user_id,AttributeType=S AttributeName=expires_at,AttributeType=N" \
    "PAY_PER_REQUEST" \
    '[{
        "IndexName": "UserIdIndex",
        "KeySchema": [{"AttributeName": "user_id", "KeyType": "HASH"}],
        "Projection": {"ProjectionType": "ALL"}
    }]'

# Create Cache table for application caching
echo "Creating Cache table..."
create_table_and_wait \
    "${TABLE_PREFIX}-Cache" \
    "AttributeName=cache_key,KeyType=HASH" \
    "AttributeName=cache_key,AttributeType=S AttributeName=expires_at,AttributeType=N" \
    "PAY_PER_REQUEST"

# Create API Logs table for request logging and monitoring
echo "Creating API Logs table..."
create_table_and_wait \
    "${TABLE_PREFIX}-APILogs" \
    "AttributeName=log_id,KeyType=HASH AttributeName=timestamp,KeyType=RANGE" \
    "AttributeName=log_id,AttributeType=S AttributeName=timestamp,AttributeType=N AttributeName=user_id,AttributeType=S AttributeName=endpoint,AttributeType=S" \
    "PAY_PER_REQUEST" \
    '[{
        "IndexName": "UserEndpointIndex",
        "KeySchema": [
            {"AttributeName": "user_id", "KeyType": "HASH"},
            {"AttributeName": "timestamp", "KeyType": "RANGE"}
        ],
        "Projection": {"ProjectionType": "ALL"}
    }, {
        "IndexName": "EndpointTimestampIndex",
        "KeySchema": [
            {"AttributeName": "endpoint", "KeyType": "HASH"},
            {"AttributeName": "timestamp", "KeyType": "RANGE"}
        ],
        "Projection": {"ProjectionType": "ALL"}
    }]'

# Create User Preferences table
echo "Creating User Preferences table..."
create_table_and_wait \
    "${TABLE_PREFIX}-UserPreferences" \
    "AttributeName=user_id,KeyType=HASH" \
    "AttributeName=user_id,AttributeType=S" \
    "PAY_PER_REQUEST"

# Create Application Metrics table for analytics
echo "Creating Application Metrics table..."
create_table_and_wait \
    "${TABLE_PREFIX}-AppMetrics" \
    "AttributeName=metric_type,KeyType=HASH AttributeName=timestamp,KeyType=RANGE" \
    "AttributeName=metric_type,AttributeType=S AttributeName=timestamp,AttributeType=N AttributeName=date_key,AttributeType=S" \
    "PAY_PER_REQUEST" \
    '[{
        "IndexName": "DateKeyIndex",
        "KeySchema": [
            {"AttributeName": "date_key", "KeyType": "HASH"},
            {"AttributeName": "timestamp", "KeyType": "RANGE"}
        ],
        "Projection": {"ProjectionType": "ALL"}
    }]'

# Create Error Logs table for error tracking
echo "Creating Error Logs table..."
create_table_and_wait \
    "${TABLE_PREFIX}-ErrorLogs" \
    "AttributeName=error_id,KeyType=HASH" \
    "AttributeName=error_id,AttributeType=S AttributeName=timestamp,AttributeType=N AttributeName=function_name,AttributeType=S AttributeName=error_type,AttributeType=S" \
    "PAY_PER_REQUEST" \
    '[{
        "IndexName": "FunctionTimestampIndex",
        "KeySchema": [
            {"AttributeName": "function_name", "KeyType": "HASH"},
            {"AttributeName": "timestamp", "KeyType": "RANGE"}
        ],
        "Projection": {"ProjectionType": "ALL"}
    }, {
        "IndexName": "ErrorTypeTimestampIndex",
        "KeySchema": [
            {"AttributeName": "error_type", "KeyType": "HASH"},
            {"AttributeName": "timestamp", "KeyType": "RANGE"}
        ],
        "Projection": {"ProjectionType": "ALL"}
    }]'

# Enable TTL on appropriate tables
echo "Enabling TTL on Sessions table..."
aws dynamodb update-time-to-live \
    --table-name "${TABLE_PREFIX}-Sessions" \
    --time-to-live-specification "AttributeName=expires_at,Enabled=true" \
    --region "$REGION" \
    --no-cli-pager

echo "Enabling TTL on Cache table..."
aws dynamodb update-time-to-live \
    --table-name "${TABLE_PREFIX}-Cache" \
    --time-to-live-specification "AttributeName=expires_at,Enabled=true" \
    --region "$REGION" \
    --no-cli-pager

echo "Enabling TTL on API Logs table (30 days retention)..."
aws dynamodb update-time-to-live \
    --table-name "${TABLE_PREFIX}-APILogs" \
    --time-to-live-specification "AttributeName=expires_at,Enabled=true" \
    --region "$REGION" \
    --no-cli-pager

echo "Enabling TTL on Error Logs table (90 days retention)..."
aws dynamodb update-time-to-live \
    --table-name "${TABLE_PREFIX}-ErrorLogs" \
    --time-to-live-specification "AttributeName=expires_at,Enabled=true" \
    --region "$REGION" \
    --no-cli-pager

# Create table tags for cost management
echo "Adding tags to DynamoDB tables..."

add_table_tags() {
    local table_name=$1
    
    aws dynamodb tag-resource \
        --resource-arn "arn:aws:dynamodb:$REGION:$(aws sts get-caller-identity --query Account --output text):table/$table_name" \
        --tags "Key=Project,Value=SalePoint Key=Environment,Value=Production Key=Component,Value=Database" \
        --region "$REGION" \
        --no-cli-pager
}

add_table_tags "${TABLE_PREFIX}-Sessions"
add_table_tags "${TABLE_PREFIX}-Cache"
add_table_tags "${TABLE_PREFIX}-APILogs"
add_table_tags "${TABLE_PREFIX}-UserPreferences"
add_table_tags "${TABLE_PREFIX}-AppMetrics"
add_table_tags "${TABLE_PREFIX}-ErrorLogs"

# Get account ID for output
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo ""
echo "========================================"
echo "DynamoDB tables creation completed!"
echo "========================================"
echo "Region: $REGION"
echo "Account ID: $ACCOUNT_ID"
echo ""
echo "Created Tables:"
echo "1. ${TABLE_PREFIX}-Sessions"
echo "   - Purpose: User session management"
echo "   - TTL: Enabled on expires_at"
echo "   - GSI: UserIdIndex"
echo ""
echo "2. ${TABLE_PREFIX}-Cache"
echo "   - Purpose: Application data caching"
echo "   - TTL: Enabled on expires_at"
echo ""
echo "3. ${TABLE_PREFIX}-APILogs"
echo "   - Purpose: API request logging and monitoring"
echo "   - TTL: Enabled (30 days retention)"
echo "   - GSI: UserEndpointIndex, EndpointTimestampIndex"
echo ""
echo "4. ${TABLE_PREFIX}-UserPreferences"
echo "   - Purpose: User-specific application preferences"
echo ""
echo "5. ${TABLE_PREFIX}-AppMetrics"
echo "   - Purpose: Application analytics and metrics"
echo "   - GSI: DateKeyIndex"
echo ""
echo "6. ${TABLE_PREFIX}-ErrorLogs"
echo "   - Purpose: Error tracking and debugging"
echo "   - TTL: Enabled (90 days retention)"
echo "   - GSI: FunctionTimestampIndex, ErrorTypeTimestampIndex"
echo ""
echo "All tables are configured with PAY_PER_REQUEST billing mode"
echo "and appropriate tags for cost management."
echo "========================================"

# Save configuration to file
cat > dynamodb-config.json << EOF
{
  "region": "$REGION",
  "accountId": "$ACCOUNT_ID",
  "tablePrefix": "$TABLE_PREFIX",
  "tables": {
    "sessions": "${TABLE_PREFIX}-Sessions",
    "cache": "${TABLE_PREFIX}-Cache",
    "apiLogs": "${TABLE_PREFIX}-APILogs",
    "userPreferences": "${TABLE_PREFIX}-UserPreferences",
    "appMetrics": "${TABLE_PREFIX}-AppMetrics",
    "errorLogs": "${TABLE_PREFIX}-ErrorLogs"
  },
  "ttlEnabled": {
    "sessions": true,
    "cache": true,
    "apiLogs": true,
    "errorLogs": true
  },
  "globalSecondaryIndexes": {
    "sessions": ["UserIdIndex"],
    "apiLogs": ["UserEndpointIndex", "EndpointTimestampIndex"],
    "appMetrics": ["DateKeyIndex"],
    "errorLogs": ["FunctionTimestampIndex", "ErrorTypeTimestampIndex"]
  }
}
EOF

echo "Configuration saved to dynamodb-config.json"
