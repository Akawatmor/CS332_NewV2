# SalePoint Solution - AWS Learner Lab Quick Start

## 🚀 Quick Deployment Guide (15 minutes)

### Prerequisites Check
- [ ] AWS Academy Learner Lab started (green circle)
- [ ] Minimum 100 credits available
- [ ] Session time remaining: 2+ hours

### Step 1: Configure AWS Credentials (5 minutes)
```powershell
# 1. In Learner Lab, click "AWS Details" → "Download AWS CLI"
# 2. Open PowerShell and run:
aws configure
# Enter credentials from the downloaded file
# Region: us-east-1
# Output: json
```

### Step 2: Deploy SalePoint Solution (30-45 minutes)
```powershell
# Navigate to the project directory
cd "c:\Users\PetchAdmin\Desktop\Git Project Repository\CS232_NewV2\SalePoint Solution"

# Run the Learner Lab optimized deployment
.\deploy-learner-lab.ps1
```

### Step 3: Access Your Application
After deployment completes, you'll see:
- **Frontend URL**: https://your-bucket.s3-website-us-east-1.amazonaws.com
- **API URL**: https://your-api-id.execute-api.us-east-1.amazonaws.com/prod

### Step 4: Login Credentials
- **Admin**: admin@salepoint.com / AdminPassword123!
- **Manager**: manager@salepoint.com / ManagerPass123!
- **Sales**: sales@salepoint.com / SalesPass123!

### Step 5: Test Core Features
- [ ] Login with admin credentials
- [ ] Create a product
- [ ] Add a customer
- [ ] Make a sale
- [ ] View analytics dashboard

### Cleanup When Done
```powershell
# To preserve your credits
.\cleanup-learner-lab.ps1
```

## Troubleshooting

### Common Issues:
1. **Credentials Error**: Re-download from AWS Details
2. **Region Error**: Ensure us-east-1 is selected
3. **Timeout**: Check session time, restart if needed
4. **Permissions**: Verify Learner Lab is started

### Get Help:
- Run `.\verify-solution.ps1` to check deployment
- Check CloudFormation console for stack status
- View Lambda logs in CloudWatch

## Expected Timeline:
- **Setup**: 5 minutes
- **Deployment**: 30-45 minutes  
- **Testing**: 15 minutes
- **Cleanup**: 5 minutes
- **Total**: ~60-75 minutes

## Success Indicators:
✅ CloudFormation stack: CREATE_COMPLETE
✅ Frontend loads without errors
✅ Can login with provided credentials
✅ CRUD operations work for products/customers
✅ Analytics dashboard shows data

---
**Ready to deploy? Run `.\deploy-learner-lab.ps1` and follow the prompts!**
