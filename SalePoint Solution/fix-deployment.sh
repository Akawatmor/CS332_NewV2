#!/bin/bash

# Alternative approach: Deploy without CloudFormation creating the bucket

# This script modifies the deploy scripts to make the frontend bucket deployment work
cd "$(dirname "$0")"

echo "Updating deploy-learner-lab-simple.sh to use --no-fail-on-empty-changeset..."
sed -i '' 's|aws cloudformation update-stack|aws cloudformation update-stack --no-fail-on-empty-changeset|' deploy-learner-lab-simple.sh

# Create a modified version of the CloudFormation template without the S3 bucket
echo "Creating a modified version of the CloudFormation template..."
cp infrastructure/learner-lab-template.yaml infrastructure/learner-lab-template-modified.yaml

# Modify the template path in the deploy script
sed -i '' 's|TEMPLATE_FILE="infrastructure/learner-lab-template.yaml"|TEMPLATE_FILE="infrastructure/learner-lab-template-modified.yaml"|' deploy-learner-lab-simple.sh

echo "All updates completed. Follow these steps:"
echo "1. Delete the FrontendBucket and FrontendBucketPolicy resources from the infrastructure/learner-lab-template-modified.yaml file"
echo "2. Run ./deploy-complete.sh --force"
echo ""
echo "The script will now proceed with cleaning up the stack if you want to continue."
read -p "Do you want to delete the current stack completely? (y/n) " confirm

if [[ "$confirm" == "y" || "$confirm" == "Y" ]]; then
  echo "Deleting stack..."
  aws cloudformation delete-stack --stack-name salepoint-lab
  echo "Waiting for stack to be deleted..."
  aws cloudformation wait stack-delete-complete --stack-name salepoint-lab
  echo "Stack deleted. You can now edit the template and re-run deploy-complete.sh"
else
  echo "Skipped stack deletion. You'll need to manually fix the issues."
fi
