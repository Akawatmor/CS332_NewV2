# 🚨 SalePoint Complete Cleanup Guide

## ⚠️ CRITICAL WARNING ⚠️

**This cleanup process will DELETE EVERYTHING related to your SalePoint deployment.**

After running cleanup, you will need to **start from Step 1 in COMPLETE.md** to redeploy the entire solution.

---

## 🗑️ What Gets Deleted

### AWS Resources
- ❌ **CloudFormation Stacks** - All infrastructure
- ❌ **S3 Buckets** - Frontend website and all uploaded files  
- ❌ **Lambda Functions** - All backend logic
- ❌ **API Gateway APIs** - All API endpoints
- ❌ **DynamoDB Tables** - All data storage
- ❌ **IAM Roles** - Service permissions (where allowed)

### Local Files
- ❌ **Frontend Builds** - `frontend/build/` directory
- ❌ **Node Modules** - `frontend/node_modules/`
- ❌ **Environment Files** - `.env` configurations
- ❌ **Backup Files** - All `.backup` files
- ❌ **Deployment Artifacts** - Logs and temporary files
- ❌ **Configuration Files** - Reset to defaults

---

## 🔧 How to Run Cleanup

### Method 1: Interactive Cleanup (Recommended)
```bash
cd "/Users/kong/Desktop/CS232-332_Cloud/final_project/CS332_NewV2_1/SalePoint Solution"
chmod +x cleanup.sh
./cleanup.sh
```

**What happens:**
1. Shows warning about deletion
2. Lists all resources to be deleted
3. Requires you to type `DELETE` to confirm
4. Gives you 5 seconds to cancel with Ctrl+C
5. Deletes everything completely

### Method 2: Force Cleanup (No Confirmation)
```bash
./cleanup.sh salepoint-lab us-east-1 true
```

**⚠️ WARNING:** This skips all confirmations and deletes immediately!

### Method 3: Custom Project Name
```bash
./cleanup.sh your-custom-name us-east-1 false
```

---

## 📋 Cleanup Process Steps

The cleanup script performs these steps in order:

### Step 1: S3 Bucket Cleanup
- Finds all buckets with project name
- Empties all files from buckets
- Prepares buckets for deletion

### Step 2: CloudFormation Stack Deletion
- Deletes the main infrastructure stack
- Monitors deletion progress (up to 20 minutes)
- Reports deletion status

### Step 3: Orphaned Resource Cleanup
- Removes any Lambda functions not in stack
- Deletes any API Gateway APIs not in stack
- Cleans up leftover resources

### Step 4: Complete Local Cleanup
- Deletes `frontend/build/` directory
- Removes `node_modules/`
- Deletes `.env` files
- Removes backup files
- Resets configuration to defaults
- Cleans npm cache

### Step 5: Verification
- Checks for remaining resources
- Reports cleanup status
- Provides next steps

---

## 💡 After Cleanup - How to Redeploy

Once cleanup is complete, follow these steps to redeploy:

### Step 1: Open Complete Guide
```bash
# Read the complete deployment guide
cat COMPLETE.md
```

### Step 2: Run Fresh Deployment
```bash
# Deploy everything from scratch
chmod +x deploy-complete.sh
./deploy-complete.sh
```

### Step 3: Access New Deployment
- New dashboard URL will be provided
- New API endpoints will be created
- Fresh configuration files generated

---

## 🕐 Expected Cleanup Times

| Resource Type | Deletion Time |
|---------------|---------------|
| S3 Buckets | 1-2 minutes |
| CloudFormation Stack | 5-15 minutes |
| Lambda Functions | 1-2 minutes |
| API Gateway | 1-2 minutes |
| Local Files | 30 seconds |
| **Total Time** | **8-20 minutes** |

---

## 🔍 Verifying Complete Cleanup

### Check AWS Console
1. **CloudFormation**: No stacks with your project name
2. **S3**: No buckets with your project name  
3. **Lambda**: No functions with your project name
4. **API Gateway**: No APIs with your project name

### Check Local Directory
- ✅ No `frontend/build/` directory
- ✅ No `frontend/node_modules/`
- ✅ No `.env` files
- ✅ No `.backup` files
- ✅ Configuration files reset to defaults

---

## 🚨 Emergency Cleanup

If the script fails or gets stuck:

### Manual AWS Cleanup
```bash
# Delete CloudFormation stack manually
aws cloudformation delete-stack --stack-name salepoint-lab

# List and delete remaining resources
aws s3 ls | grep salepoint
aws lambda list-functions | grep salepoint
aws apigateway get-rest-apis | grep salepoint
```

### Manual Local Cleanup
```bash
# Remove local files manually
rm -rf frontend/build/
rm -rf frontend/node_modules/
rm -f frontend/.env
rm -f frontend/src/*.backup
```

---

## 💰 Credit Recovery

After cleanup completion:
- ✅ **Immediate**: No new charges accrue
- ✅ **5-10 minutes**: Resource billing stops
- ✅ **1 hour**: Credits usage stabilizes
- ✅ **24 hours**: Full credit recovery visible

**Expected credit savings**: 50-100 credits per day

---

## 🔄 Ready to Redeploy?

After successful cleanup:

1. **Open COMPLETE.md**
2. **Follow Method 1: One-Command Deployment**
3. **Run**: `./deploy-complete.sh`
4. **Access your new dashboard**

Your fresh SalePoint deployment will have:
- New URLs and endpoints
- Clean configuration
- Fresh data storage
- Updated builds

---

## 📞 Troubleshooting

### Cleanup Script Won't Run
```bash
chmod +x cleanup.sh
```

### Permission Denied Errors
```bash
# Check AWS credentials
aws sts get-caller-identity
```

### Stuck Deletion
- Wait up to 20 minutes for CloudFormation
- Check AWS console for error details
- Try manual deletion commands above

### Partial Cleanup
- Run cleanup script again
- Check AWS console for remaining resources
- Delete manually if needed

---

## ✅ Cleanup Completion Checklist

- [ ] CloudFormation stack deleted
- [ ] S3 buckets removed
- [ ] Lambda functions deleted
- [ ] API Gateway APIs removed
- [ ] Local build files deleted
- [ ] Configuration files reset
- [ ] AWS console shows no remaining resources
- [ ] Ready to follow COMPLETE.md for fresh deployment

**🎉 Cleanup Complete! Ready for fresh deployment!**
