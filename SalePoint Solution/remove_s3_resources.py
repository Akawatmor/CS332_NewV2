#!/usr/bin/env python3
"""
This script removes the FrontendBucket and FrontendBucketPolicy resources from the CloudFormation template
"""
import sys
import re
import os

def remove_s3_resources(input_file, output_file):
    with open(input_file, 'r') as f:
        content = f.read()
    
    # Pattern to match the FrontendBucket and FrontendBucketPolicy sections
    frontend_bucket_pattern = r'  FrontendBucket:\s+Type: AWS::S3::Bucket\s+Properties:(?:[^{}]|{[^{}]*})*?(?=\n  \w)'
    frontend_bucket_policy_pattern = r'  FrontendBucketPolicy:\s+Type: AWS::S3::BucketPolicy\s+Properties:(?:[^{}]|{[^{}]*})*?(?=\n  \w)'
    
    # Remove the FrontendBucket section
    content = re.sub(frontend_bucket_pattern, '', content, flags=re.DOTALL)
    
    # Remove the FrontendBucketPolicy section
    content = re.sub(frontend_bucket_policy_pattern, '', content, flags=re.DOTALL)
    
    # Clean up potential double newlines
    content = re.sub(r'\n\s*\n\s*\n', '\n\n', content)
    
    with open(output_file, 'w') as f:
        f.write(content)
    
    print(f"S3 bucket resources removed and saved to {output_file}")

if __name__ == "__main__":
    script_dir = os.path.dirname(os.path.realpath(__file__))
    input_file = os.path.join(script_dir, "infrastructure/learner-lab-template.yaml")
    output_file = os.path.join(script_dir, "infrastructure/learner-lab-template-modified.yaml")
    
    remove_s3_resources(input_file, output_file)
