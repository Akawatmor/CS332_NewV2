# 🚀 SalePoint Complete Deployment Guide - Step by Step

## Overview
This guide provides the exact order and steps to deploy the SalePoint solution from scratch or redeploy it completely.

## ✅ Current Status (What's Already Working)
- Backend APIs: ✅ Deployed and working
- Frontend Demo: ✅ Deployed and accessible 
- Dashboard URL: http://salepoint-frontend-747605646409-us-east-1.s3-website-us-east-1.amazonaws.com

---

## 🔧 **OPTION A: Quick Deployment (Recommended)**
*Use this if you want to deploy everything quickly*

### Step 1: Deploy Complete Solution
```bash
cd "/Users/kong/Desktop/CS232-332_Cloud/final_project/CS332_NewV2_1/SalePoint Solution"
./deploy-complete.sh
```
**What it does**: Deploys backend + frontend + configures everything automatically

---

## 🔧 **OPTION B: Step-by-Step Deployment**
*Use this if you want to understand each component*

### Step 1: Deploy Backend Infrastructure
```bash
cd "/Users/kong/Desktop/CS232-332_Cloud/final_project/CS332_NewV2_1/SalePoint Solution"
./deploy-learner-lab-simple.sh
```
**What it does**: 
- Creates CloudFormation stack
- Deploys API Gateway
- Creates Lambda functions
- Sets up DynamoDB tables

### Step 2: Test and Configure
```bash
./test-learner-lab.sh
```
**What it does**:
- Tests all API endpoints
- Updates aws-config.js with real API URLs
- Validates deployment

### Step 3: Deploy Frontend (Regular Version)
```bash
cd frontend
npm install
npm run build
aws s3 sync build/ s3://salepoint-frontend-747605646409-us-east-1 --delete
```

### Step 4: Deploy Demo Frontend (No Authentication)
```bash
./deploy-demo.sh
```
**What it does**:
- Builds authentication-free version
- Uploads to S3
- Provides immediate dashboard access

---

## 🔧 **OPTION C: Incremental Deployment**
*Use this if you want maximum control*

### Step 1: Deploy Backend Only
```bash
./deploy-learner-lab-simple.sh
```

### Step 2: Validate Backend
```bash
./test-api.sh
```

### Step 3: Update Configuration
```bash
./test-learner-lab.sh
```

### Step 4: Build Frontend
```bash
cd frontend
npm install
npm run build
cd ..
```

### Step 5: Deploy Demo Version
```bash
./deploy-demo.sh
```

---

## 📋 **Complete Fresh Deployment Process**

If you want to start completely fresh:

### Step 1: Clean Up (Optional)
```bash
./cleanup-learner-lab.sh  # Only if you want to start fresh
```

### Step 2: Deploy Everything
```bash
./deploy-complete.sh      # Complete deployment
```

### Step 3: Test Deployment
```bash
./test-learner-lab.sh     # Verify everything works
```

---

## 🎯 **Recommended Order for First-Time Setup**

1. **`./deploy-learner-lab-simple.sh`** - Deploy backend infrastructure
2. **`./test-learner-lab.sh`** - Test APIs and update config
3. **`./deploy-demo.sh`** - Deploy working frontend demo

This gives you a fully working system in 3 simple steps!

---

## 📝 **File Descriptions**

| File | Purpose | When to Use |
|------|---------|-------------|
| `deploy-complete.sh` | Deploy everything at once | First deployment or complete refresh |
| `deploy-learner-lab-simple.sh` | Deploy backend only | When you want to test backend first |
| `test-learner-lab.sh` | Test APIs and update config | After backend deployment |
| `deploy-demo.sh` | Deploy demo frontend | For immediate working dashboard |
| `cleanup-learner-lab.sh` | Remove all resources | To start fresh or save credits |
| `test-api.sh` | Quick API test | To verify backend is working |

---

## 🚀 **Quick Start (30 seconds)**

```bash
cd "/Users/kong/Desktop/CS232-332_Cloud/final_project/CS332_NewV2_1/SalePoint Solution"
./deploy-complete.sh
```

That's it! Your SalePoint solution will be fully deployed and accessible.

---

## 💡 **Current Working URLs**

- **Demo Dashboard**: http://salepoint-frontend-747605646409-us-east-1.s3-website-us-east-1.amazonaws.com
- **API Base URL**: https://jr4rw0w0uh.execute-api.us-east-1.amazonaws.com/prod
- **Products API**: https://jr4rw0w0uh.execute-api.us-east-1.amazonaws.com/prod/products
- **Customers API**: https://jr4rw0w0uh.execute-api.us-east-1.amazonaws.com/prod/customers

No authentication required for demo version!

---

## 🔧 **Lambda Handler Troubleshooting**

### If you encounter "Runtime.HandlerNotFound" errors:

**Problem**: Lambda function returns 502 Bad Gateway with handler not found error
**Cause**: Deployment package structure or handler configuration mismatch

**Solution Steps**:
```bash
# 1. Check current handler configuration
aws lambda get-function-configuration --function-name salepoint-orders --query 'Handler'

# 2. Verify deployment package structure
# Correct structure should be:
# orders-deployment-final.zip
# ├── index.js              (contains exports.handler)
# ├── package.json          (lists dependencies)
# └── node_modules/         (if using external packages)

# 3. Create correctly structured package
cd lambda-deployment-orders-fixed/
# Ensure index.js has: exports.handler = async (event) => { ... }
npm install aws-sdk uuid
zip -r ../orders-deployment-final.zip .

# 4. Deploy the fix
aws lambda update-function-code \
    --function-name salepoint-orders \
    --zip-file fileb://../orders-deployment-final.zip

# 5. Test the fix
curl https://pjyf881u7f.execute-api.us-east-1.amazonaws.com/prod/orders
```

**Status**: ✅ This issue has been resolved (May 26, 2025)
- Fixed deployment package structure
- Updated orders function successfully  
- All APIs now operational

---
