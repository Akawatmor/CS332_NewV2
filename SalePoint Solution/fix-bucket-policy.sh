#!/bin/bash

# Script to fix the S3 bucket policy in the CloudFormation template
TEMPLATE_FILE="infrastructure/learner-lab-template.yaml"

# Create backup
cp "$TEMPLATE_FILE" "${TEMPLATE_FILE}.bak"
echo "Created backup at ${TEMPLATE_FILE}.bak"

# Open the file in a text editor for manual editing
echo "Please manually edit the file $TEMPLATE_FILE"
echo "Find the FrontendBucketPolicy section and change:"
echo "Resource: !Sub '\${FrontendBucket}/*'"
echo "to:"
echo "Resource: !Sub 'arn:aws:s3:::\${ProjectName}-frontend-\${AWS::AccountId}-\${AWS::Region}/*'"

if command -v open >/dev/null 2>&1; then
    open -t "$TEMPLATE_FILE"
elif command -v code >/dev/null 2>&1; then
    code "$TEMPLATE_FILE"
else
    echo "Please open the file manually in your preferred text editor"
fi
