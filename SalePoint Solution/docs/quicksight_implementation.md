# SalePoint Solution - Amazon QuickSight Dashboard Implementation

This guide provides detailed instructions for setting up Amazon QuickSight dashboards for the SalePoint Solution. These dashboards will provide sales managers and executives with visualizations of sales data, product performance, and sales representative performance.

## Prerequisites

1. An AWS account with QuickSight Enterprise Edition enabled
2. Access to the SalePoint Solution databases (Amazon RDS and DynamoDB)
3. Administrator permissions for QuickSight
4. The SalePoint Solution fully deployed

## Step 1: Set Up QuickSight Access to Data Sources

### RDS MySQL Database Access

1. Sign in to the AWS Management Console and navigate to Amazon QuickSight
2. Go to "Manage QuickSight" → "Security & permissions"
3. Under "QuickSight access to AWS services", select "Add or remove"
4. Enable access to Amazon RDS and ensure the specific SalePoint RDS resource is selected
5. Save your changes

### DynamoDB Access

1. In the same "Security & permissions" section, ensure DynamoDB is selected
2. Specifically select the SalesTracking table
3. Save your changes

## Step 2: Create Data Sources

### Create RDS MySQL Data Source

1. In QuickSight, go to "Datasets" and select "New dataset"
2. Choose "MySQL" as the data source
3. Configure the connection:
   - Data source name: `SalePoint-RDS`
   - Connection type: `Direct query`
   - Database server: [Your RDS endpoint from AWS Console]
   - Port: `3306`
   - Database name: `salepoint_db`
   - Username: [Your database username]
   - Password: [Your database password]
4. Click "Create data source"
5. Select the following tables for import:
   - products
   - customers
   - sales_reps
   - sales
   - sales_products
   - product_categories
   - departments
6. Choose "Direct query" for performance with large datasets
7. Finish creating the dataset

### Create DynamoDB Data Source

1. In QuickSight, go to "Datasets" and select "New dataset"
2. Choose "Amazon DynamoDB" as the data source
3. Configure the connection:
   - Data source name: `SalePoint-DynamoDB`
   - Table: `SalesTracking`
4. Click "Create data source"
5. Select all available columns
6. Choose "SPICE" for faster query performance
7. Finish creating the dataset

## Step 3: Create Calculated Fields and Join Data

### Create Calculated Fields for RDS Data

1. Open the RDS dataset for editing
2. Create the following calculated fields:

#### Total Revenue Calculation
```
sum({sales_products.quantity} * {sales_products.unit_price})
```

#### Sales Growth (Month over Month)
```
sum({current_month_sales}) / sum({previous_month_sales}) - 1
```

#### Product Profit Margin
```
({sales_products.unit_price} - {products.cost_price}) / {sales_products.unit_price}
```

#### Days Since Sale
```
dateDiff({sales.sale_date}, now(), 'DD')
```

### Join RDS Tables

1. Create the following table joins:
   - Join `sales` to `customers` on `customer_id`
   - Join `sales` to `sales_reps` on `sales_rep_id`
   - Join `sales` to `sales_products` on `sale_id`
   - Join `sales_products` to `products` on `product_id`
   - Join `products` to `product_categories` on `category_id`
   - Join `sales_reps` to `departments` on `department_id`

## Step 4: Create Analysis and Dashboards

### Sales Overview Dashboard

1. Create a new analysis using the joined RDS dataset
2. Add the following visualizations:

#### Total Sales KPI
- Visualization type: KPI
- Value: Sum of total_amount from sales table
- Comparison: Previous period (MTD, QTD, or YTD)

#### Sales Trend Over Time
- Visualization type: Line chart
- X-axis: sale_date (aggregated by Day, Week, Month)
- Y-axis: Sum of total_amount
- Color: status (to differentiate Completed, Pending, Cancelled)

#### Sales by Product Category
- Visualization type: Pie chart
- Group by: category_name
- Value: Sum of (quantity * unit_price)

#### Top Products by Revenue
- Visualization type: Horizontal bar chart
- Y-axis: product_name
- X-axis: Sum of (quantity * unit_price)
- Sort: Descending by revenue
- Limit: Top 10 products

### Sales Rep Performance Dashboard

1. Create a new sheet in the analysis
2. Add the following visualizations:

#### Sales Rep Performance Table
- Visualization type: Table
- Rows: sales_rep_name
- Values:
  - Count of distinct sale_id (Total Sales)
  - Sum of total_amount (Total Revenue)
  - Calculated Field: Average Sale Value
  - Count of distinct customer_id (Unique Customers)

#### Sales Rep Revenue Comparison
- Visualization type: Bar chart
- Y-axis: sales_rep_name
- X-axis: Sum of total_amount
- Color: Department name
- Sort: Descending by revenue

#### Sales Rep Performance Over Time
- Visualization type: Line chart
- X-axis: sale_date (aggregated by Month)
- Y-axis: Sum of total_amount
- Color: sales_rep_name (Top 5 representatives)

### Customer Analysis Dashboard

1. Create a new sheet in the analysis
2. Add the following visualizations:

#### Top Customers by Revenue
- Visualization type: Horizontal bar chart
- Y-axis: customer_name
- X-axis: Sum of total_amount
- Sort: Descending by revenue
- Limit: Top 10 customers

#### Customer Purchase Frequency
- Visualization type: Heat map
- Rows: customer_name
- Columns: sale_date (aggregated by Month)
- Values: Count of sale_id

#### Customer Geographic Distribution
- Visualization type: Geospatial map
- Locations: customer address (city and state)
- Color: Sum of total_amount (revenue by location)

### Inventory and Product Analysis Dashboard

1. Create a new sheet in the analysis
2. Add the following visualizations:

#### Current Inventory Status
- Visualization type: Horizontal bar chart
- Y-axis: product_name
- X-axis: stock_quantity
- Color: Custom calculation (Red if stock < 10, Yellow if < 20, Green otherwise)
- Sort: Ascending by stock quantity
- Limit: Bottom 20 products (lowest stock)

#### Product Performance Quadrant
- Visualization type: Scatter plot
- X-axis: Sum of quantity sold
- Y-axis: Profit margin (calculated field)
- Size: Total revenue
- Color: category_name

#### Most Frequently Combined Products
- Visualization type: Network diagram or Table
- Rows: product_name A
- Columns: product_name B
- Values: Count of sales where both products appear

## Step 5: Set Up Dashboard Filters and Parameters

### Create Dashboard Filters

1. Add the following filters to each dashboard:
   - Date Range filter: Allow filtering by custom date ranges, MTD, QTD, YTD
   - Status filter: Allow filtering by sale status (Completed, Pending, Cancelled)
   - Product Category filter: Allow filtering by specific product categories
   - Sales Rep filter: Allow filtering by specific sales representatives
   - Customer filter: Allow filtering by specific customers

### Create Parameters for Dynamic Analysis

1. Create the following parameters:
   - Time Granularity: Allow switching between Day, Week, Month, Quarter, Year
   - Performance Metric: Allow switching between Revenue, Units Sold, Profit Margin
   - Top N Items: Allow adjusting how many items appear in "Top N" lists (5, 10, 20, 50)

## Step 6: Set Up Scheduled Data Refresh

1. Go to the "Datasets" section in QuickSight
2. For each dataset, configure the refresh schedule:
   - RDS dataset: Set to refresh daily (preferably during off-hours)
   - DynamoDB dataset: Set to refresh several times per day for near real-time reporting

## Step 7: Share Dashboards and Set Up Email Reports

### Share Dashboards with Users

1. Go to the dashboard you want to share
2. Click the "Share" button in the top-right corner
3. Add users or groups who should have access to the dashboard
4. Set appropriate permissions (Viewer, Co-owner)
5. Click "Share"

### Set Up Email Reports

1. Go to the dashboard
2. Click "Schedule" in the top-right corner
3. Configure the email report:
   - Schedule: Weekly (e.g., Monday mornings)
   - Recipients: Sales managers and executives
   - Format: PDF
   - Include: All sheets or specific sheets
4. Save the schedule

## Step 8: Embed Dashboards in SalePoint Web Application (Optional)

To embed QuickSight dashboards directly in the SalePoint web application:

1. In QuickSight, go to "Manage QuickSight" → "Domains and Embedding"
2. Add the domain of your SalePoint web application
3. For each dashboard you want to embed:
   - Go to the dashboard
   - Click "Share" → "Embed dashboard"
   - Copy the generated code
   - Paste the code in the appropriate location in your web application
   - Update the embedding code to include appropriate authentication

## Appendix A: Sample QuickSight SQL Queries

### Sales Performance by Period
```sql
SELECT 
    DATE_FORMAT(s.sale_date, '%Y-%m') AS sale_month,
    SUM(s.total_amount) AS total_revenue,
    COUNT(s.sale_id) AS total_sales,
    SUM(s.total_amount) / COUNT(s.sale_id) AS avg_sale_value
FROM 
    sales s
WHERE 
    s.status = 'Completed'
GROUP BY 
    DATE_FORMAT(s.sale_date, '%Y-%m')
ORDER BY 
    sale_month DESC;
```

### Product Category Performance
```sql
SELECT 
    pc.name AS category_name,
    SUM(sp.quantity) AS units_sold,
    SUM(sp.quantity * sp.unit_price) AS total_revenue,
    COUNT(DISTINCT s.sale_id) AS order_count
FROM 
    sales s
JOIN 
    sales_products sp ON s.sale_id = sp.sale_id
JOIN 
    products p ON sp.product_id = p.product_id
JOIN 
    product_categories pc ON p.category_id = pc.category_id
WHERE 
    s.status = 'Completed'
GROUP BY 
    pc.name
ORDER BY 
    total_revenue DESC;
```

### Sales Rep Leaderboard
```sql
SELECT 
    CONCAT(sr.first_name, ' ', sr.last_name) AS sales_rep_name,
    d.name AS department,
    COUNT(DISTINCT s.sale_id) AS total_sales,
    SUM(s.total_amount) AS total_revenue,
    COUNT(DISTINCT s.customer_id) AS unique_customers
FROM 
    sales s
JOIN 
    sales_reps sr ON s.sales_rep_id = sr.sales_rep_id
JOIN 
    departments d ON sr.department_id = d.department_id
WHERE 
    s.status = 'Completed'
    AND s.sale_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
GROUP BY 
    sales_rep_name, d.name
ORDER BY 
    total_revenue DESC;
```

## Appendix B: Dashboard Examples

### Sales Overview Dashboard

![Sales Overview Dashboard](https://example.com/images/sales_dashboard.png)

The Sales Overview Dashboard provides a high-level view of sales performance, including:
- Total revenue and growth trends
- Sales by product category
- Geographic distribution of sales
- Sales status breakdown

### Sales Rep Performance Dashboard

![Sales Rep Performance Dashboard](https://example.com/images/sales_rep_dashboard.png)

The Sales Rep Performance Dashboard allows managers to:
- Compare performance across sales representatives
- Track individual performance over time
- Identify top performers and those who may need additional support
- Analyze customer relationships by sales rep

### Product Analysis Dashboard

![Product Analysis Dashboard](https://example.com/images/product_dashboard.png)

The Product Analysis Dashboard helps inventory and product managers:
- Identify top-selling and underperforming products
- Monitor inventory levels
- Analyze product category performance
- Track product profitability

## Appendix C: QuickSight Best Practices

1. **Performance Optimization**
   - Use direct query for recent data and SPICE for historical analysis
   - Create efficient calculated fields
   - Filter data appropriately at the dataset level

2. **Visual Design**
   - Use consistent colors and formatting across dashboards
   - Arrange visualizations in a logical flow (top-down, left-right)
   - Include clear titles and descriptions
   - Use appropriate visualization types for the data

3. **Security**
   - Implement row-level security for sensitive data
   - Grant permissions on a need-to-know basis
   - Regularly audit access permissions

4. **Maintenance**
   - Document all calculated fields and custom SQL
   - Establish a regular review process for dashboards
   - Create a feedback mechanism for users
