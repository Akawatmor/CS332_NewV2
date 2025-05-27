import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  Inventory as InventoryIcon,
  AttachMoney as MoneyIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { apiService } from '../../services/apiService';
import { createErrorForDisplay } from '../../utils/errorHandler';

function Dashboard({ userRole }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    totalProducts: 0,
    totalCustomers: 0,
    totalSales: 0,
    lowStockProducts: 0,
    recentSales: [],
    topProducts: [],
    stockAlerts: [],
  });

  useEffect(() => {
    loadDashboardData();
  }, [userRole]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load dashboard data based on user role
      const promises = [];

      // All users can see basic stats
      promises.push(apiService.getProducts({ limit: 1000 }));
      promises.push(apiService.getCustomers({ limit: 1000 }));
      
      // Managers and admins can see more detailed analytics
      if (userRole === 'admin' || userRole === 'manager') {
        promises.push(apiService.getSales({ limit: 100 }));
        promises.push(apiService.getInventory({ lowStock: true }));
        promises.push(apiService.getAnalytics({ type: 'summary' }));
      }

      const results = await Promise.allSettled(promises);

      const [productsResult, customersResult, salesResult, inventoryResult, analyticsResult] = results;

      const newDashboardData = {
        totalProducts: productsResult.status === 'fulfilled' ? (productsResult.value.products?.length || 0) : 0,
        totalCustomers: customersResult.status === 'fulfilled' ? (customersResult.value.customers?.length || 0) : 0,
        totalSales: salesResult?.status === 'fulfilled' ? (salesResult.value.sales?.length || 0) : 0,
        lowStockProducts: inventoryResult?.status === 'fulfilled' ? (inventoryResult.value.lowStockProducts?.length || 0) : 0,
        recentSales: salesResult?.status === 'fulfilled' ? (salesResult.value.sales?.slice(0, 5) || []) : [],
        topProducts: productsResult.status === 'fulfilled' ? (productsResult.value.products?.slice(0, 5) || []) : [],
        stockAlerts: inventoryResult?.status === 'fulfilled' ? (inventoryResult.value.lowStockProducts?.slice(0, 5) || []) : [],
      };

      setDashboardData(newDashboardData);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      const errorDisplay = createErrorForDisplay(err.message || 'Failed to load dashboard data. Please try again.');
      setError(errorDisplay.message);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon, color = 'primary', subtitle }) => (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="h6">
              {title}
            </Typography>
            <Typography variant="h4" component="div" color={color}>
              {value}
            </Typography>
            {subtitle && (
              <Typography color="textSecondary" variant="body2">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box color={`${color}.main`}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" action={
        <button onClick={loadDashboardData}>Retry</button>
      }>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Typography variant="body1" color="textSecondary" paragraph>
        Welcome to Sale Point - Your centralized sales management platform
      </Typography>

      <Grid container spacing={3}>
        {/* Key Metrics */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Products"
            value={dashboardData.totalProducts}
            icon={<InventoryIcon fontSize="large" />}
            color="primary"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Customers"
            value={dashboardData.totalCustomers}
            icon={<PeopleIcon fontSize="large" />}
            color="secondary"
          />
        </Grid>

        {(userRole === 'admin' || userRole === 'manager') && (
          <>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Recent Sales"
                value={dashboardData.totalSales}
                icon={<MoneyIcon fontSize="large" />}
                color="success"
                subtitle="Last 100 orders"
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Low Stock Alert"
                value={dashboardData.lowStockProducts}
                icon={<WarningIcon fontSize="large" />}
                color="warning"
                subtitle="Products running low"
              />
            </Grid>
          </>
        )}

        {/* Quick Actions */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Box mt={2}>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Common sales tasks:
                </Typography>
                <Box mt={1}>
                  <Chip
                    label="Product Comparison"
                    variant="outlined"
                    icon={<CheckCircleIcon />}
                    sx={{ mr: 1, mb: 1 }}
                  />
                  <Chip
                    label="Stock Check"
                    variant="outlined"
                    icon={<CheckCircleIcon />}
                    sx={{ mr: 1, mb: 1 }}
                  />
                  <Chip
                    label="Customer Support"
                    variant="outlined"
                    icon={<CheckCircleIcon />}
                    sx={{ mr: 1, mb: 1 }}
                  />
                  <Chip
                    label="Document Access"
                    variant="outlined"
                    icon={<CheckCircleIcon />}
                    sx={{ mr: 1, mb: 1 }}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* System Status */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                System Status
              </Typography>
              <Box mt={2}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="body2">Data Synchronization</Typography>
                  <Chip label="Active" color="success" size="small" />
                </Box>
                <LinearProgress variant="determinate" value={100} color="success" sx={{ mb: 2 }} />
                
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="body2">API Connectivity</Typography>
                  <Chip label="Healthy" color="success" size="small" />
                </Box>
                <LinearProgress variant="determinate" value={95} color="success" sx={{ mb: 2 }} />
                
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="body2">Database Status</Typography>
                  <Chip label="Online" color="success" size="small" />
                </Box>
                <LinearProgress variant="determinate" value={98} color="success" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activity */}
        {(userRole === 'admin' || userRole === 'manager') && dashboardData.recentSales.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recent Sales Activity
                </Typography>
                <Box mt={2}>
                  {dashboardData.recentSales.map((sale, index) => (
                    <Box
                      key={index}
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                      py={1}
                      borderBottom={index < dashboardData.recentSales.length - 1 ? 1 : 0}
                      borderColor="divider"
                    >
                      <Box>
                        <Typography variant="body2">
                          Sale #{sale.id || `00${index + 1}`}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {sale.customerName || 'Customer'} - {sale.createdAt || 'Today'}
                        </Typography>
                      </Box>
                      <Typography variant="body2" fontWeight="bold">
                        ฿{sale.total || '0.00'}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Stock Alerts */}
        {(userRole === 'admin' || userRole === 'manager') && dashboardData.stockAlerts.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom color="warning.main">
                  <WarningIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Stock Alerts
                </Typography>
                <Box mt={2}>
                  {dashboardData.stockAlerts.map((product, index) => (
                    <Box
                      key={index}
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                      py={1}
                      borderBottom={index < dashboardData.stockAlerts.length - 1 ? 1 : 0}
                      borderColor="divider"
                    >
                      <Box>
                        <Typography variant="body2">
                          {product.name || `Product ${index + 1}`}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          Category: {product.category || 'General'}
                        </Typography>
                      </Box>
                      <Chip
                        label={`${product.stock_quantity || 0} left`}
                        color="warning"
                        size="small"
                      />
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

export default Dashboard;
