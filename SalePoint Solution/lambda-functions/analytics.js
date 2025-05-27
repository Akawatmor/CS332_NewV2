const AWS = require('aws-sdk');
const mysql = require('mysql2/promise');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const CUSTOMERS_TABLE = process.env.CUSTOMERS_TABLE;
const ORDERS_TABLE = process.env.ORDERS_TABLE;

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 10,
  acquireTimeout: 60000,
  timeout: 60000
};

let connection = null;

async function getConnection() {
  if (!connection) {
    connection = await mysql.createConnection(dbConfig);
  }
  return connection;
}

exports.handler = async (event) => {
  console.log('Analytics Lambda Event:', JSON.stringify(event, null, 2));
  
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };

  try {
    const httpMethod = event.httpMethod;
    const pathParameters = event.pathParameters;
    const queryStringParameters = event.queryStringParameters || {};

    switch (httpMethod) {
      case 'OPTIONS':
        return {
          statusCode: 200,
          headers,
          body: ''
        };

      case 'GET':
        if (pathParameters && pathParameters.type) {
          return await getSpecificAnalytics(pathParameters.type, queryStringParameters, headers);
        } else {
          return await getDashboardAnalytics(queryStringParameters, headers);
        }

      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ message: 'Method not allowed' })
        };
    }

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: 'Internal server error',
        error: error.message
      })
    };
  }
};

async function getDashboardAnalytics(queryParams, headers) {
  const db = await getConnection();
  
  // Get date range (default to last 30 days)
  const endDate = queryParams.endDate || new Date().toISOString().split('T')[0];
  const startDate = queryParams.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  try {
    // Product analytics
    const [productStats] = await db.execute(`
      SELECT 
        COUNT(*) as totalProducts,
        SUM(stock_quantity) as totalStock,
        SUM(stock_quantity * price) as totalStockValue,
        COUNT(CASE WHEN stock_quantity = 0 THEN 1 END) as outOfStockProducts,
        COUNT(CASE WHEN stock_quantity <= 10 THEN 1 END) as lowStockProducts
      FROM products
    `);

    // Category breakdown
    const [categoryStats] = await db.execute(`
      SELECT 
        category,
        COUNT(*) as productCount,
        SUM(stock_quantity) as totalStock,
        AVG(price) as averagePrice
      FROM products 
      GROUP BY category
      ORDER BY productCount DESC
    `);

    // Customer analytics from DynamoDB
    const customerParams = {
      TableName: CUSTOMERS_TABLE
    };
    const customersResult = await dynamodb.scan(customerParams).promise();
    
    const totalCustomers = customersResult.Count;
    const activeCustomers = customersResult.Items.filter(c => c.status === 'active').length;
    const customersBySalesPerson = customersResult.Items.reduce((acc, customer) => {
      const salesPerson = customer.salesPersonId || 'Unassigned';
      acc[salesPerson] = (acc[salesPerson] || 0) + 1;
      return acc;
    }, {});

    // Order analytics from DynamoDB
    const orderParams = {
      TableName: ORDERS_TABLE,
      FilterExpression: 'createdAt BETWEEN :startDate AND :endDate',
      ExpressionAttributeValues: {
        ':startDate': startDate,
        ':endDate': endDate + 'T23:59:59.999Z'
      }
    };
    const ordersResult = await dynamodb.scan(orderParams).promise();
    
    const orders = ordersResult.Items;
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    const ordersByStatus = orders.reduce((acc, order) => {
      const status = order.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    // Monthly revenue trend (last 6 months)
    const monthlyRevenue = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date();
      monthStart.setMonth(monthStart.getMonth() - i);
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      monthEnd.setDate(0);
      monthEnd.setHours(23, 59, 59, 999);

      const monthOrders = orders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= monthStart && orderDate <= monthEnd;
      });

      const monthRevenue = monthOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
      
      monthlyRevenue.push({
        month: monthStart.toISOString().substring(0, 7), // YYYY-MM format
        revenue: monthRevenue,
        orderCount: monthOrders.length
      });
    }

    // Top products by order frequency
    const productFrequency = {};
    orders.forEach(order => {
      if (order.items) {
        order.items.forEach(item => {
          const productId = item.productId;
          if (!productFrequency[productId]) {
            productFrequency[productId] = {
              productId,
              productName: item.productName,
              orderCount: 0,
              totalQuantitySold: 0,
              totalRevenue: 0
            };
          }
          productFrequency[productId].orderCount += 1;
          productFrequency[productId].totalQuantitySold += item.quantity;
          productFrequency[productId].totalRevenue += item.totalPrice;
        });
      }
    });

    const topProducts = Object.values(productFrequency)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        dateRange: { startDate, endDate },
        overview: {
          totalProducts: productStats[0].totalProducts,
          totalStock: productStats[0].totalStock,
          totalStockValue: parseFloat(productStats[0].totalStockValue || 0).toFixed(2),
          outOfStockProducts: productStats[0].outOfStockProducts,
          lowStockProducts: productStats[0].lowStockProducts,
          totalCustomers,
          activeCustomers,
          totalOrders,
          totalRevenue: totalRevenue.toFixed(2),
          averageOrderValue: averageOrderValue.toFixed(2)
        },
        categoryBreakdown: categoryStats,
        customersBySalesPerson,
        ordersByStatus,
        monthlyRevenue,
        topProducts
      })
    };

  } catch (error) {
    throw error;
  }
}

async function getSpecificAnalytics(type, queryParams, headers) {
  const db = await getConnection();
  
  switch (type) {
    case 'sales-performance':
      return await getSalesPerformanceAnalytics(queryParams, headers);
      
    case 'inventory-status':
      return await getInventoryStatusAnalytics(queryParams, headers);
      
    case 'customer-insights':
      return await getCustomerInsightsAnalytics(queryParams, headers);
      
    case 'product-performance':
      return await getProductPerformanceAnalytics(queryParams, headers);
      
    default:
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          message: 'Invalid analytics type. Available types: sales-performance, inventory-status, customer-insights, product-performance' 
        })
      };
  }
}

async function getSalesPerformanceAnalytics(queryParams, headers) {
  const salesPersonId = queryParams.salesPersonId;
  const endDate = queryParams.endDate || new Date().toISOString().split('T')[0];
  const startDate = queryParams.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  let filterExpression = 'createdAt BETWEEN :startDate AND :endDate';
  let expressionAttributeValues = {
    ':startDate': startDate,
    ':endDate': endDate + 'T23:59:59.999Z'
  };

  if (salesPersonId) {
    filterExpression += ' AND salesPersonId = :salesPersonId';
    expressionAttributeValues[':salesPersonId'] = salesPersonId;
  }

  const orderParams = {
    TableName: ORDERS_TABLE,
    FilterExpression: filterExpression,
    ExpressionAttributeValues: expressionAttributeValues
  };

  const ordersResult = await dynamodb.scan(orderParams).promise();
  const orders = ordersResult.Items;

  // Sales performance by sales person
  const salesPerformance = {};
  orders.forEach(order => {
    const salesPerson = order.salesPersonId || 'Unassigned';
    if (!salesPerformance[salesPerson]) {
      salesPerformance[salesPerson] = {
        salesPersonId: salesPerson,
        orderCount: 0,
        totalRevenue: 0,
        averageOrderValue: 0
      };
    }
    salesPerformance[salesPerson].orderCount += 1;
    salesPerformance[salesPerson].totalRevenue += order.totalAmount || 0;
  });

  // Calculate averages
  Object.values(salesPerformance).forEach(sp => {
    sp.averageOrderValue = sp.orderCount > 0 ? sp.totalRevenue / sp.orderCount : 0;
    sp.totalRevenue = parseFloat(sp.totalRevenue.toFixed(2));
    sp.averageOrderValue = parseFloat(sp.averageOrderValue.toFixed(2));
  });

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      dateRange: { startDate, endDate },
      salesPersonId: salesPersonId || 'all',
      performance: Object.values(salesPerformance).sort((a, b) => b.totalRevenue - a.totalRevenue)
    })
  };
}

async function getInventoryStatusAnalytics(queryParams, headers) {
  const db = await getConnection();
  
  const [inventoryStatus] = await db.execute(`
    SELECT 
      category,
      COUNT(*) as totalProducts,
      SUM(stock_quantity) as totalStock,
      SUM(CASE WHEN stock_quantity = 0 THEN 1 ELSE 0 END) as outOfStock,
      SUM(CASE WHEN stock_quantity <= 10 AND stock_quantity > 0 THEN 1 ELSE 0 END) as lowStock,
      SUM(stock_quantity * price) as totalValue,
      AVG(price) as averagePrice
    FROM products 
    GROUP BY category
    ORDER BY totalValue DESC
  `);

  const [lowStockProducts] = await db.execute(`
    SELECT id, name, category, stock_quantity, price
    FROM products 
    WHERE stock_quantity <= 10
    ORDER BY stock_quantity ASC, category
  `);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      categoryStatus: inventoryStatus.map(row => ({
        ...row,
        totalValue: parseFloat(row.totalValue || 0).toFixed(2),
        averagePrice: parseFloat(row.averagePrice || 0).toFixed(2)
      })),
      lowStockProducts: lowStockProducts.map(product => ({
        ...product,
        price: parseFloat(product.price).toFixed(2)
      }))
    })
  };
}

async function getCustomerInsightsAnalytics(queryParams, headers) {
  const customerParams = {
    TableName: CUSTOMERS_TABLE
  };
  const customersResult = await dynamodb.scan(customerParams).promise();
  const customers = customersResult.Items;

  // Customer segmentation by order value
  const segments = {
    high_value: customers.filter(c => (c.totalValue || 0) >= 10000).length,
    medium_value: customers.filter(c => (c.totalValue || 0) >= 1000 && (c.totalValue || 0) < 10000).length,
    low_value: customers.filter(c => (c.totalValue || 0) < 1000).length
  };

  // Customer distribution by sales person
  const customerDistribution = customers.reduce((acc, customer) => {
    const salesPerson = customer.salesPersonId || 'Unassigned';
    if (!acc[salesPerson]) {
      acc[salesPerson] = {
        salesPersonId: salesPerson,
        customerCount: 0,
        totalCustomerValue: 0,
        averageCustomerValue: 0
      };
    }
    acc[salesPerson].customerCount += 1;
    acc[salesPerson].totalCustomerValue += customer.totalValue || 0;
    return acc;
  }, {});

  // Calculate averages
  Object.values(customerDistribution).forEach(dist => {
    dist.averageCustomerValue = dist.customerCount > 0 ? dist.totalCustomerValue / dist.customerCount : 0;
    dist.totalCustomerValue = parseFloat(dist.totalCustomerValue.toFixed(2));
    dist.averageCustomerValue = parseFloat(dist.averageCustomerValue.toFixed(2));
  });

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      totalCustomers: customers.length,
      customerSegments: segments,
      customerDistribution: Object.values(customerDistribution).sort((a, b) => b.totalCustomerValue - a.totalCustomerValue),
      topCustomers: customers
        .sort((a, b) => (b.totalValue || 0) - (a.totalValue || 0))
        .slice(0, 10)
        .map(c => ({
          customerId: c.customerId,
          name: c.name,
          email: c.email,
          totalOrders: c.totalOrders || 0,
          totalValue: parseFloat(c.totalValue || 0).toFixed(2),
          salesPersonId: c.salesPersonId
        }))
    })
  };
}

async function getProductPerformanceAnalytics(queryParams, headers) {
  const db = await getConnection();
  const endDate = queryParams.endDate || new Date().toISOString().split('T')[0];
  const startDate = queryParams.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Get orders in date range
  const orderParams = {
    TableName: ORDERS_TABLE,
    FilterExpression: 'createdAt BETWEEN :startDate AND :endDate',
    ExpressionAttributeValues: {
      ':startDate': startDate,
      ':endDate': endDate + 'T23:59:59.999Z'
    }
  };

  const ordersResult = await dynamodb.scan(orderParams).promise();
  const orders = ordersResult.Items;

  // Analyze product performance
  const productPerformance = {};
  orders.forEach(order => {
    if (order.items) {
      order.items.forEach(item => {
        const productId = item.productId;
        if (!productPerformance[productId]) {
          productPerformance[productId] = {
            productId,
            productName: item.productName,
            totalQuantitySold: 0,
            totalRevenue: 0,
            orderCount: 0,
            averageOrderQuantity: 0
          };
        }
        productPerformance[productId].totalQuantitySold += item.quantity;
        productPerformance[productId].totalRevenue += item.totalPrice;
        productPerformance[productId].orderCount += 1;
      });
    }
  });

  // Calculate averages and format
  const performanceArray = Object.values(productPerformance).map(perf => ({
    ...perf,
    averageOrderQuantity: perf.orderCount > 0 ? perf.totalQuantitySold / perf.orderCount : 0,
    totalRevenue: parseFloat(perf.totalRevenue.toFixed(2)),
    averageOrderQuantity: parseFloat((perf.orderCount > 0 ? perf.totalQuantitySold / perf.orderCount : 0).toFixed(2))
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      dateRange: { startDate, endDate },
      topSellingProducts: performanceArray.sort((a, b) => b.totalQuantitySold - a.totalQuantitySold).slice(0, 10),
      topRevenueProducts: performanceArray.sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 10),
      totalProductsSold: performanceArray.reduce((sum, p) => sum + p.totalQuantitySold, 0),
      totalProductRevenue: performanceArray.reduce((sum, p) => sum + p.totalRevenue, 0).toFixed(2)
    })
  };
}
