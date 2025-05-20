# SalePoint Solution - AWS Architecture Diagram

```
+---------------------+          +------------------+          +------------------+
|                     |          |                  |          |                  |
|   Web Application   |--------->| API Gateway      |--------->| Lambda Functions |
|   (Web Interface)   |          | (REST API)       |          | (Business Logic) |
|                     |          |                  |          |                  |
+---------------------+          +------------------+          +----------+-------+
                                                                          |
                                                                          |
                                                                          v
+---------------------+          +------------------+          +----------+-------+
|                     |          |                  |          |                  |
|   Amazon QuickSight |<---------| Amazon RDS       |<---------| Amazon DynamoDB |
|   (Dashboards)      |          | (Relational Data)|          | (NoSQL Data)    |
|                     |          |                  |          |                  |
+---------------------+          +------------------+          +------------------+
                                          ^
                                          |
                                          |
                                          v
                                 +------------------+
                                 |                  |
                                 | Amazon S3        |
                                 | (File Storage)   |
                                 |                  |
                                 +------------------+
```

## Component Descriptions

### Web Application
- Provides the user interface for sales staff
- Allows searching for products, customer information, and checking inventory
- Shows sales status and tracking information

### Amazon API Gateway
- Creates and manages RESTful APIs
- Secures access with API keys or IAM roles
- Connects frontend to backend services

### AWS Lambda Functions
- Handles business logic without server management
- Processes data between frontend and databases
- Triggers actions based on events (updates, sales, etc.)

### Amazon RDS
- Stores structured data (products, inventory, pricing)
- Maintains consistent information across departments
- Supports SQL queries for complex data retrieval

### Amazon DynamoDB
- Stores NoSQL data (customer assignments, sales tracking)
- Offers high-speed access for sales status information
- Scales automatically with demand

### Amazon S3
- Stores product images and PDF specification documents
- Provides direct download URLs for sales staff
- Ensures high availability of files

### Amazon QuickSight
- Creates interactive dashboards for management
- Visualizes sales data and performance metrics
- Offers insights without coding

## Data Flow

1. Sales staff access the Web Application interface
2. API Gateway routes requests to appropriate Lambda functions
3. Lambda functions retrieve/process data from RDS, DynamoDB, or S3
4. Results are returned to the Web Application for display
5. Data is continuously synchronized across all systems
6. QuickSight generates dashboards from RDS data for management

## Security

- API Gateway secures API access with API keys
- IAM roles restrict access to AWS services
- LabRole policy is used for all AWS service interactions
