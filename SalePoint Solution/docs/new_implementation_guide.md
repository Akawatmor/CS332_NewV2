# SalePoint Solution - Step-by-Step Implementation Guide (Beginner Friendly)

This guide will help you set up the SalePoint Solution in AWS Academy Learner Lab, even if you have little or no AWS experience. Every step is explained in detail. Follow the steps in order for best results.

---

## Table of Contents
1. [AWS Account & Environment Preparation](#step-1)
2. [VPC & Networking](#step-2)
3. [Database Setup (RDS & DynamoDB)](#step-3)
4. [Storage Setup (S3)](#step-4)
5. [Lambda Functions & Layers](#step-5)
6. [API Gateway Setup](#step-6)
7. [Web Application Setup](#step-7)
8. [Database Initialization](#step-8)
9. [Amazon QuickSight Dashboard](#step-9)
10. [Web App Hosting on S3](#step-10)
11. [Testing](#step-11)
12. [Cleanup](#step-12)

---

<a id="step-1"></a>
## 1. AWS Account & Environment Preparation
- Log in to AWS Academy Learner Lab.
- Use a modern web browser (Chrome, Edge, Safari, etc.).
- Make sure you have the "LabRole" IAM role (default in Learner Lab).

---

<a id="step-2"></a>
## 2. VPC & Networking
1. Go to the AWS Console search bar, type "VPC" and open the VPC Dashboard.
2. Check if a "default VPC" exists in your region (it will be named "default").
3. If not, click **Actions > Create Default VPC** and follow the prompts.

---

<a id="step-3"></a>
## 3. Database Setup (RDS & DynamoDB)

### 3.1 Create Amazon RDS (MySQL) Database
1. Go to the **Amazon RDS** console.
2. Click **Create database**.
3. Choose **Standard create**.
4. Engine: **MySQL**.
5. Template: **Free tier**.
6. Settings:
   - DB instance identifier: `salepoint-rds`
   - Master username: `admin`
   - Master password: (create and save a secure password)
7. DB instance class: **db.t2.micro** (burstable)
8. Storage: Keep default settings.
9. Connectivity:
   - Public access: **Yes**
   - VPC: **Default VPC**
   - Subnet group: **default**
   - Security group: **Create new**, name it `salepoint-rds-sg`
10. Additional configuration:
    - Initial database name: `salepointdb`
    - Enable automated backups (7 days)
11. Click **Create database**.
12. Wait for status to become **Available**.

#### Configure Security Group for RDS
1. Go to **EC2 > Security Groups**.
2. Find `salepoint-rds-sg`.
3. Edit **Inbound rules**:
   - Add rule: Type: MySQL/Aurora, Port: 3306, Source: 0.0.0.0/0 (for testing only; restrict in production).
4. Save rules.

### 3.2 Create DynamoDB Tables

#### Table 1: SalesReps_Customers
1. Go to **DynamoDB** console.
2. Click **Create table**.
3. Table name: `SalesReps_Customers`
4. Partition key: `CustomerID` (String)
5. Sort key: `SalesRepID` (String)
6. Capacity: **On-demand**
7. Click **Create table**.

#### Add GSI (Global Secondary Index) for SalesRepID
1. Select `SalesReps_Customers` table.
2. Go to **Indexes** tab.
3. Click **Create index**.
   - Partition key: `SalesRepID` (String)
   - Index name: `SalesRepID-index`
   - Project all attributes
4. Click **Create index**.

#### Table 2: SalesTracking
1. In DynamoDB, click **Create table**.
2. Table name: `SalesTracking`
3. Partition key: `SaleID` (String)
4. Sort key: `Timestamp` (String)
5. Capacity: **On-demand**
6. Click **Create table**.

#### Add GSIs for SalesTracking
1. Select `SalesTracking` table.
2. Go to **Indexes** tab.
3. Create index: `SalesRepID-index` (Partition key: SalesRepID)
4. Create index: `CustomerID-index` (Partition key: CustomerID)

---

<a id="step-4"></a>
## 4. Storage Setup (S3)

### 4.1 Create S3 Bucket for Product Files
1. Go to **S3** console.
2. Click **Create bucket**.
3. Bucket name: `salepoint-files-[unique-id]` (add a unique string, e.g., your initials).
4. Region: Same as your other services.
5. Block Public Access: **Uncheck** "Block all public access".
6. Acknowledge the warning.
7. Click **Create bucket**.

### 4.2 Set S3 Bucket Policy for Public Access
1. Select your bucket.
2. Go to **Permissions > Bucket Policy**.
3. Paste this policy (replace `[bucket-name]`):
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::[bucket-name]/*"
        }
    ]
}
```
4. Click **Save**.

### 4.3 Create Folders in S3
1. In your bucket, click **Create folder**.
2. Create `product-images` and `product-specs` folders.

### 4.4 Upload Files
1. Click into each folder and use **Upload** to add images or PDFs as needed.

---

<a id="step-5"></a>
## 5. Lambda Functions & Layers

### 5.1 Prepare MySQL Layer for Lambda
1. On your Mac, open Terminal.
2. Run:
   ```zsh
   mkdir -p mysql-layer/nodejs
   cd mysql-layer/nodejs
   npm init -y
   npm install mysql
   cd ..
   zip -r mysql-layer.zip nodejs
   ```
3. In AWS Lambda console, go to **Layers > Create layer**.
4. Name: `mysql-layer`, upload `mysql-layer.zip`, select Node.js 14.x.
5. Click **Create**.

### 5.2 Create Lambda Functions

#### GetProductInfo
1. Go to **Lambda** console > **Create function** > **Author from scratch**.
2. Name: `GetProductInfo`, Runtime: Node.js 14.x, Architecture: x86_64.
3. Permissions: Use existing role, select **LabRole**.
4. Click **Create function**.
5. In the function, go to **Layers** and **Add a layer**: select `mysql-layer`.
6. In the code editor, paste the code from `src/lambda/getProductInfo.js`.
7. Go to **Configuration > Environment variables** and add:
   - `DB_HOST`: (your RDS endpoint)
   - `DB_USER`: `admin`
   - `DB_PASSWORD`: (your RDS password)
   - `DB_NAME`: `salepointdb`
   - `S3_BUCKET`: (your S3 bucket name)
8. Click **Save**.

#### CustomerSalesRepTracking
1. Repeat steps above, name: `CustomerSalesRepTracking`.
2. Paste code from `src/lambda/customerSalesRepTracking.js`.
3. Click **Save**.

#### SalesTracking
1. Repeat steps above, name: `SalesTracking`.
2. Paste code from `src/lambda/salesTracking.js`.
3. Click **Save**.

---

## Lambda Function Example Code

### GetProductInfo Lambda (Node.js)
```javascript
const mysql = require('mysql');
const AWS = require('aws-sdk');
const s3 = new AWS.S3();

exports.handler = async (event) => {
    // Your code here
};
```

### CustomerSalesRepTracking Lambda (Node.js)
```javascript
const mysql = require('mysql');
const AWS = require('aws-sdk');
const s3 = new AWS.S3();

exports.handler = async (event) => {
    // Your code here
};
```

### SalesTracking Lambda (Node.js)
```javascript
const mysql = require('mysql');
const AWS = require('aws-sdk');
const s3 = new AWS.S3();

exports.handler = async (event) => {
    // Your code here
};
```

---

<a id="step-6"></a>
## 6. API Gateway Setup

### 6.1 Create REST API
1. Go to **API Gateway** console.
2. Click **Create API > REST API > Build**.
3. API name: `SalePointAPI`, Endpoint type: Regional.
4. Click **Create API**.

### 6.2 Create Resources and Methods
- For each resource, click **Actions > Create Resource**.
- For each method, select the resource, click **Actions > Create Method**, choose method (GET, POST, etc.), and link to the correct Lambda function.

#### Example Resource Structure
- `/products` (GET → GetProductInfo)
- `/products/{productId}` (GET → GetProductInfo)
- `/customers/{customerId}` (GET → CustomerSalesRepTracking)
- `/salesreps/{salesRepId}/customers` (GET → CustomerSalesRepTracking)
- `/assignments` (POST → CustomerSalesRepTracking)
- `/sales` (GET, POST → SalesTracking)
- `/sales/{saleId}` (GET, PUT → SalesTracking)

### 6.3 Deploy API
1. Click **Actions > Deploy API**.
2. Stage name: `prod`.
3. Click **Deploy**.
4. Copy the **Invoke URL** for use in your web app.

---

<a id="step-7"></a>
## 7. Web Application Setup

### 7.1 Prepare Files
- Use the files in `src/web/`:
  - `index.html`, `products.html`, `customers.html`, `sales.html`, `dashboard.html`
  - `css/styles.css`
  - `js/main.js`, `js/products.js`, `js/customers.js`, `js/sales.js`, `js/dashboard.js`

### 7.2 Update API URL
- In each JS file (e.g., `js/products.js`), set the `API_URL` variable to your API Gateway Invoke URL.

---

<a id="step-8"></a>
## 8. Database Initialization

### 8.1 Connect to RDS and Run SQL
1. Install MySQL client (e.g., MySQL Workbench, DBeaver, or use Terminal):
   ```zsh
   brew install mysql
   ```
2. Get your RDS endpoint from the RDS console.
3. In Terminal, connect:
   ```zsh
   mysql -h <RDS-endpoint> -u admin -p salepointdb
   ```
4. Paste and run the SQL from `src/db/database_init.sql`.

---

## SQL Database Initialization Script
```sql
CREATE TABLE IF NOT EXISTS `Customers` (
  `CustomerID` varchar(255) NOT NULL,
  `Name` varchar(255) DEFAULT NULL,
  `Email` varchar(255) DEFAULT NULL,
  `Phone` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`CustomerID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `SalesReps` (
  `SalesRepID` varchar(255) NOT NULL,
  `Name` varchar(255) DEFAULT NULL,
  `Email` varchar(255) DEFAULT NULL,
  `Phone` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`SalesRepID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `Products` (
  `ProductID` varchar(255) NOT NULL,
  `Name` varchar(255) DEFAULT NULL,
  `Description` text DEFAULT NULL,
  `Price` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`ProductID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `Sales` (
  `SaleID` varchar(255) NOT NULL,
  `ProductID` varchar(255) DEFAULT NULL,
  `CustomerID` varchar(255) DEFAULT NULL,
  `SalesRepID` varchar(255) DEFAULT NULL,
  `Timestamp` datetime DEFAULT NULL,
  `Amount` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`SaleID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE `Sales`
  ADD CONSTRAINT `fk_product`
  FOREIGN KEY (`ProductID`)
  REFERENCES `Products` (`ProductID`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Sales`
  ADD CONSTRAINT `fk_customer`
  FOREIGN KEY (`CustomerID`)
  REFERENCES `Customers` (`CustomerID`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Sales`
  ADD CONSTRAINT `fk_salesrep`
  FOREIGN KEY (`SalesRepID`)
  REFERENCES `SalesReps` (`SalesRepID`)
  ON DELETE CASCADE ON UPDATE CASCADE;
```

---

<a id="step-9"></a>
## 9. Amazon QuickSight Dashboard
1. Go to **QuickSight** console.
2. If new, follow the setup wizard (choose Enterprise edition).
3. Grant access to your RDS and S3.
4. Create a new dataset:
   - Source: RDS
   - Connect to `salepoint-rds`, select tables
5. Create visualizations (bar, line, pie charts, etc.) as needed.
6. Save and publish your dashboard.

---

<a id="step-10"></a>
## 10. Web App Hosting on S3

### 10.1 Create S3 Bucket for Web Hosting
1. Go to **S3** console.
2. Click **Create bucket**.
3. Name: `salepoint-webapp` (must be unique).
4. Block Public Access: **Uncheck** "Block all public access".
5. Click **Create bucket**.

### 10.2 Enable Static Website Hosting
1. Select your bucket > **Properties** > **Static website hosting** > **Edit**.
2. Enable, set index document: `index.html`, error document: `error.html` (create a simple error.html if needed).
3. Save changes.

### 10.3 Set Bucket Policy
1. Go to **Permissions > Bucket Policy**.
2. Paste the public read policy (see step 4.2, replace bucket name).

### 10.4 Upload Web Files
1. Upload all files from `src/web/` to the bucket, preserving folder structure.
2. After upload, open the website URL from the bucket's **Static website hosting** section.

---

<a id="step-11"></a>
## 11. Testing
1. Open your S3 website URL in a browser.
2. Test:
   - Product search and details
   - Customer management
   - Sales tracking
   - Dashboard
3. If something doesn't work, check API Gateway logs, Lambda logs, and browser console for errors.

---

<a id="step-12"></a>
## 12. Cleanup
1. Delete S3 buckets (empty them first).
2. Delete Lambda functions.
3. Delete API Gateway.
4. Delete DynamoDB tables.
5. Delete RDS database.
6. Terminate QuickSight subscription if needed.

---

## Tips & Troubleshooting
- If you get permission errors, check that your Lambda functions use the **LabRole** and that the role has access to RDS, S3, and DynamoDB.
- If you can't connect to RDS, check security group inbound rules and that you use the correct endpoint, username, and password.
- For more help, see AWS documentation or ask your instructor.

---

Congratulations! You have set up the SalePoint Solution from scratch, step by step.
