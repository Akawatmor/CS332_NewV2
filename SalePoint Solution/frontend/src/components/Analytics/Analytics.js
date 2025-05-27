import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  People as PeopleIcon,
  ShoppingCart as ShoppingCartIcon,
} from '@mui/icons-material';
import { apiService } from '../../services/apiService';

function Analytics({ userRole }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('30');
  const [analyticsData, setAnalyticsData] = useState({
    salesSummary: {
      totalSales: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
      growthRate: 0,
    },
    topProducts: [],
    customerAnalytics: {
      totalCustomers: 0,
      newCustomers: 0,
      activeCustomers: 0,
    },
    inventoryInsights: {
      lowStockItems: 0,
      outOfStockItems: 0,
      totalProductValue: 0,
    },
    salesByCategory: [],
    recentActivity: [],
  });

  useEffect(() => {
    if (userRole === 'admin' || userRole === 'manager') {
      loadAnalytics();
    }
  }, [timeRange, userRole]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load various analytics data
      const [
        salesResponse,
        inventoryResponse,
        customersResponse,
        productsResponse
      ] = await Promise.allSettled([
        apiService.getSalesReport({ days: timeRange }),
        apiService.getInventoryReport(),
        apiService.getCustomerReport({ days: timeRange }),
        apiService.getProducts({ limit: 1000 })
      ]);

      // Process sales data
      const salesData = salesResponse.status === 'fulfilled' ? salesResponse.value : {};
      
      // Process inventory data
      const inventoryData = inventoryResponse.status === 'fulfilled' ? inventoryResponse.value : {};
      
      // Process customer data
      const customersData = customersResponse.status === 'fulfilled' ? customersResponse.value : {};
      
      // Process products data
      const productsData = productsResponse.status === 'fulfilled' ? productsResponse.value : {};

      // Aggregate analytics data
      const newAnalyticsData = {
        salesSummary: {
          totalSales: salesData.totalOrders || 0,
          totalRevenue: salesData.totalRevenue || 0,
          averageOrderValue: salesData.averageOrderValue || 0,
          growthRate: salesData.growthRate || 0,
        },
        topProducts: salesData.topProducts || productsData.products?.slice(0, 5) || [],
        customerAnalytics: {
          totalCustomers: customersData.totalCustomers || 0,
          newCustomers: customersData.newCustomers || 0,
          activeCustomers: customersData.activeCustomers || 0,
        },
        inventoryInsights: {
          lowStockItems: inventoryData.lowStockCount || 0,
          outOfStockItems: inventoryData.outOfStockCount || 0,
          totalProductValue: inventoryData.totalValue || 0,
        },
        salesByCategory: salesData.salesByCategory || [],
        recentActivity: salesData.recentActivity || [],
      };

      setAnalyticsData(newAnalyticsData);
    } catch (err) {
      console.error('Error loading analytics:', err);
      setError('Failed to load analytics data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTimeRangeChange = (event) => {
    setTimeRange(event.target.value);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB'
    }).format(amount || 0);
  };

  const formatPercentage = (value) => {
    return `${(value || 0).toFixed(1)}%`;
  };

  const getGrowthIcon = (rate) => {
    if (rate > 0) {
      return <TrendingUpIcon color="success" />;
    } else if (rate < 0) {
      return <TrendingDownIcon color="error" />;
    }
    return null;
  };

  if (userRole !== 'admin' && userRole !== 'manager') {
    return (
      <Box textAlign="center" py={4}>
        <Typography variant="h5" color="textSecondary">
          Access Restricted
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Analytics are only available to managers and administrators.
        </Typography>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Analytics Dashboard</Typography>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Time Range</InputLabel>
          <Select
            value={timeRange}
            label="Time Range"
            onChange={handleTimeRangeChange}
          >
            <MenuItem value="7">Last 7 days</MenuItem>
            <MenuItem value="30">Last 30 days</MenuItem>
            <MenuItem value="90">Last 3 months</MenuItem>
            <MenuItem value="365">Last year</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Sales
                  </Typography>
                  <Typography variant="h4" color="primary">
                    {analyticsData.salesSummary.totalSales}
                  </Typography>
                  <Box display="flex" alignItems="center" mt={1}>
                    {getGrowthIcon(analyticsData.salesSummary.growthRate)}
                    <Typography variant="body2" color="textSecondary" ml={0.5}>
                      {formatPercentage(analyticsData.salesSummary.growthRate)}
                    </Typography>
                  </Box>
                </Box>
                <ShoppingCartIcon color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Revenue
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {formatCurrency(analyticsData.salesSummary.totalRevenue)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Last {timeRange} days
                  </Typography>
                </Box>
                <TrendingUpIcon color="success" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Avg Order Value
                  </Typography>
                  <Typography variant="h4" color="info.main">
                    {formatCurrency(analyticsData.salesSummary.averageOrderValue)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Per transaction
                  </Typography>
                </Box>
                <ShoppingCartIcon color="info" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Active Customers
                  </Typography>
                  <Typography variant="h4" color="secondary.main">
                    {analyticsData.customerAnalytics.activeCustomers}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {analyticsData.customerAnalytics.newCustomers} new
                  </Typography>
                </Box>
                <PeopleIcon color="secondary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Top Products */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Top Selling Products
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Product</TableCell>
                      <TableCell>Sales</TableCell>
                      <TableCell>Revenue</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {analyticsData.topProducts.map((product, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            {product.name || `Product ${index + 1}`}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {product.category}
                          </Typography>
                        </TableCell>
                        <TableCell>{product.salesCount || 0}</TableCell>
                        <TableCell>{formatCurrency(product.revenue || product.price * (product.salesCount || 1))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Inventory Insights */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Inventory Insights
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box textAlign="center" p={2}>
                    <Typography variant="h3" color="warning.main">
                      {analyticsData.inventoryInsights.lowStockItems}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Low Stock Items
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box textAlign="center" p={2}>
                    <Typography variant="h3" color="error.main">
                      {analyticsData.inventoryInsights.outOfStockItems}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Out of Stock
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Box textAlign="center" p={2}>
                    <Typography variant="h4" color="success.main">
                      {formatCurrency(analyticsData.inventoryInsights.totalProductValue)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Total Inventory Value
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Sales by Category */}
        {analyticsData.salesByCategory.length > 0 && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Sales by Category
                </Typography>
                <Box>
                  {analyticsData.salesByCategory.map((category, index) => (
                    <Box key={index} display="flex" justifyContent="space-between" alignItems="center" py={1}>
                      <Typography variant="body2">{category.name}</Typography>
                      <Box display="flex" alignItems="center">
                        <Chip 
                          label={`${category.sales} sales`} 
                          size="small" 
                          sx={{ mr: 1 }}
                        />
                        <Typography variant="body2" fontWeight="bold">
                          {formatCurrency(category.revenue)}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Recent Activity */}
        {analyticsData.recentActivity.length > 0 && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recent Sales Activity
                </Typography>
                <Box>
                  {analyticsData.recentActivity.map((activity, index) => (
                    <Box key={index} py={1} borderBottom={index < analyticsData.recentActivity.length - 1 ? 1 : 0} borderColor="divider">
                      <Typography variant="body2" fontWeight="bold">
                        {activity.customerName || 'Customer'} - {formatCurrency(activity.amount)}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {activity.date || 'Recent'} • {activity.products} item(s)
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}

export default Analytics;
