#!/bin/bash

# SalePoint Solution - IAM Role Setup Script
# This script creates the required IAM role and policies for Lambda functions

echo "Setting up IAM role for SalePoint Lambda functions..."

ROLE_NAME="salepoint-lambda-execution-role"
POLICY_NAME="salepoint-lambda-policy"

# Trust policy for Lambda
cat > trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Permission policy for DynamoDB and CloudWatch
cat > lambda-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Scan",
        "dynamodb:Query"
      ],
      "Resource": [
        "arn:aws:dynamodb:*:*:table/SalePoint-Customers",
        "arn:aws:dynamodb:*:*:table/SalePoint-Products",
        "arn:aws:dynamodb:*:*:table/SalePoint-Inventory",
        "arn:aws:dynamodb:*:*:table/SalePoint-Sales"
      ]
    }
  ]
}
EOF

# Create IAM role
echo "Creating IAM role: $ROLE_NAME"
aws iam create-role \
    --role-name "$ROLE_NAME" \
    --assume-role-policy-document file://trust-policy.json

if [ $? -eq 0 ]; then
    echo "✅ IAM role created successfully"
else
    echo "❌ Failed to create IAM role (may already exist)"
fi

# Create and attach policy
echo "Creating IAM policy: $POLICY_NAME"
POLICY_ARN=$(aws iam create-policy \
    --policy-name "$POLICY_NAME" \
    --policy-document file://lambda-policy.json \
    --query 'Policy.Arn' \
    --output text)

if [ $? -eq 0 ]; then
    echo "✅ IAM policy created successfully"
    echo "Policy ARN: $POLICY_ARN"
    
    # Attach policy to role
    echo "Attaching policy to role..."
    aws iam attach-role-policy \
        --role-name "$ROLE_NAME" \
        --policy-arn "$POLICY_ARN"
    
    if [ $? -eq 0 ]; then
        echo "✅ Policy attached to role successfully"
    else
        echo "❌ Failed to attach policy to role"
    fi
else
    echo "❌ Failed to create IAM policy (may already exist)"
fi

# Get role ARN
ROLE_ARN=$(aws iam get-role --role-name "$ROLE_NAME" --query 'Role.Arn' --output text)
echo ""
echo "Setup complete!"
echo "Role ARN: $ROLE_ARN"
echo ""
echo "⚠️  Important: Update the ROLE_ARN variable in deploy-lambdas.sh with:"
echo "ROLE_ARN=\"$ROLE_ARN\""

# Cleanup temporary files
rm trust-policy.json lambda-policy.json
