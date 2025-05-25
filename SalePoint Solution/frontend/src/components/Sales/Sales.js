import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  InputAdornment,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Alert,
  CircularProgress,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Visibility as ViewIcon,
  Receipt as ReceiptIcon,
  ShoppingCart as CartIcon,
} from '@mui/icons-material';
import { apiService } from '../../services/apiService';

function Sales({ userRole }) {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedSale, setSelectedSale] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState('view');

  const pageSize = 20;

  useEffect(() => {
    loadSales();
  }, [page, searchTerm, statusFilter]);

  const loadSales = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: pageSize,
        search: searchTerm || undefined,
        status: statusFilter || undefined,
      };
      
      const response = await apiService.getSales(params);
      setSales(response.sales || []);
      setTotalPages(Math.ceil((response.total || 0) / pageSize));
      setError(null);
    } catch (err) {
      console.error('Error loading sales:', err);
      setError('Failed to load sales data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
    setPage(1);
  };

  const handleStatusFilter = (event) => {
    setStatusFilter(event.target.value);
    setPage(1);
  };

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  const handleSaleClick = (sale, mode = 'view') => {
    setSelectedSale(sale);
    setDialogMode(mode);
    setDialogOpen(true);
  };

  const handleCreateSale = () => {
    setSelectedSale({
      customerId: '',
      customerName: '',
      items: [],
      total: 0,
      status: 'pending',
      notes: '',
    });
    setDialogMode('add');
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedSale(null);
  };

  const getStatusChip = (status) => {
    const statusColors = {
      pending: 'warning',
      confirmed: 'info',
      shipped: 'primary',
      delivered: 'success',
      cancelled: 'error',
    };

    return (
      <Chip
        label={status?.charAt(0)?.toUpperCase() + status?.slice(1) || 'Pending'}
        color={statusColors[status] || 'default'}
        size="small"
      />
    );
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB'
    }).format(price || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    try {
      return new Date(dateString).toLocaleDateString('th-TH');
    } catch (error) {
      return 'Invalid date';
    }
  };

  if (loading && sales.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Sales</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateSale}
        >
          New Sale
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Search and Filter */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="Search by order ID, customer name..."
                value={searchTerm}
                onChange={handleSearch}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={handleStatusFilter}
                >
                  <MenuItem value="">All Status</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="confirmed">Confirmed</MenuItem>
                  <MenuItem value="shipped">Shipped</MenuItem>
                  <MenuItem value="delivered">Delivered</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('');
                  setPage(1);
                }}
              >
                Clear
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Sales Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Order ID</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Total</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Sales Person</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sales.map((sale, index) => (
              <TableRow key={sale.orderId || index} hover>
                <TableCell>
                  <Box display="flex" alignItems="center">
                    <ReceiptIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body2" fontWeight="bold">
                      #{sale.orderId || `ORD-${String(index + 1).padStart(4, '0')}`}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {sale.customerName || 'Unknown Customer'}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    ID: {sale.customerId || 'N/A'}
                  </Typography>
                </TableCell>
                <TableCell>{formatDate(sale.createdAt || sale.orderDate)}</TableCell>
                <TableCell>{formatPrice(sale.total)}</TableCell>
                <TableCell>{getStatusChip(sale.status)}</TableCell>
                <TableCell>
                  {sale.salesPersonName || sale.salesPersonId || 'Unassigned'}
                </TableCell>
                <TableCell align="center">
                  <IconButton
                    size="small"
                    onClick={() => handleSaleClick(sale, 'view')}
                  >
                    <ViewIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {totalPages > 1 && (
        <Box display="flex" justifyContent="center" mt={3}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={handlePageChange}
            color="primary"
          />
        </Box>
      )}

      {/* Sale Dialog */}
      <Dialog open={dialogOpen} onClose={handleDialogClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <CartIcon sx={{ mr: 1 }} />
            {dialogMode === 'add' ? 'New Sale' : `Order #${selectedSale?.orderId || 'Unknown'}`}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedSale && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Customer Information
                </Typography>
                <Typography variant="body2">
                  <strong>Name:</strong> {selectedSale.customerName || 'Unknown'}
                </Typography>
                <Typography variant="body2">
                  <strong>ID:</strong> {selectedSale.customerId || 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Order Information
                </Typography>
                <Typography variant="body2">
                  <strong>Date:</strong> {formatDate(selectedSale.createdAt)}
                </Typography>
                <Typography variant="body2">
                  <strong>Status:</strong> {selectedSale.status}
                </Typography>
                <Typography variant="body2">
                  <strong>Total:</strong> {formatPrice(selectedSale.total)}
                </Typography>
              </Grid>
              
              {selectedSale.items && selectedSale.items.length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Order Items
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Product</TableCell>
                          <TableCell>Quantity</TableCell>
                          <TableCell>Price</TableCell>
                          <TableCell>Subtotal</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedSale.items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.productName || `Product ${index + 1}`}</TableCell>
                            <TableCell>{item.quantity || 1}</TableCell>
                            <TableCell>{formatPrice(item.price)}</TableCell>
                            <TableCell>{formatPrice((item.quantity || 1) * (item.price || 0))}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
              )}

              {selectedSale.notes && (
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Notes
                  </Typography>
                  <Typography variant="body2">
                    {selectedSale.notes}
                  </Typography>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Close</Button>
          {dialogMode === 'view' && (
            <Button variant="contained" color="primary">
              Print Receipt
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Sales;
