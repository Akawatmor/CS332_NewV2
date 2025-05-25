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
  Avatar,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
} from '@mui/icons-material';
import { apiService } from '../../services/apiService';

function Customers({ userRole }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState('view');

  const pageSize = 20;

  useEffect(() => {
    loadCustomers();
  }, [page, searchTerm]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: pageSize,
        search: searchTerm || undefined,
      };
      
      const response = await apiService.getCustomers(params);
      setCustomers(response.customers || []);
      setTotalPages(Math.ceil((response.total || 0) / pageSize));
      setError(null);
    } catch (err) {
      console.error('Error loading customers:', err);
      setError('Failed to load customers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
    setPage(1);
  };

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  const handleCustomerClick = (customer, mode = 'view') => {
    setSelectedCustomer(customer);
    setDialogMode(mode);
    setDialogOpen(true);
  };

  const handleAddCustomer = () => {
    setSelectedCustomer({
      name: '',
      email: '',
      phone: '',
      address: '',
      company: '',
      notes: '',
      status: 'active',
    });
    setDialogMode('add');
    setDialogOpen(true);
  };

  const handleSaveCustomer = async () => {
    try {
      if (dialogMode === 'add') {
        await apiService.createCustomer(selectedCustomer);
      } else if (dialogMode === 'edit') {
        await apiService.updateCustomer(selectedCustomer.customerId, selectedCustomer);
      }
      setDialogOpen(false);
      loadCustomers();
    } catch (err) {
      console.error('Error saving customer:', err);
      setError('Failed to save customer. Please try again.');
    }
  };

  const handleDeleteCustomer = async (customerId) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      try {
        await apiService.deleteCustomer(customerId);
        loadCustomers();
      } catch (err) {
        console.error('Error deleting customer:', err);
        setError('Failed to delete customer. Please try again.');
      }
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedCustomer(null);
  };

  const handleInputChange = (field, value) => {
    setSelectedCustomer(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getStatusChip = (status) => {
    const statusColors = {
      active: 'success',
      inactive: 'error',
      pending: 'warning',
    };

    return (
      <Chip
        label={status?.charAt(0)?.toUpperCase() + status?.slice(1) || 'Active'}
        color={statusColors[status] || 'default'}
        size="small"
      />
    );
  };

  const getInitials = (name) => {
    return name
      ?.split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2) || 'CU';
  };

  if (loading && customers.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Customers</Typography>
        {(userRole === 'admin' || userRole === 'manager') && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddCustomer}
          >
            Add Customer
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Search */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                placeholder="Search customers by name, email, or company..."
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
              <Button
                fullWidth
                variant="outlined"
                onClick={() => {
                  setSearchTerm('');
                  setPage(1);
                }}
              >
                Clear Search
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Customer</TableCell>
              <TableCell>Contact</TableCell>
              <TableCell>Company</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Sales Person</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {customers.map((customer, index) => (
              <TableRow key={customer.customerId || index} hover>
                <TableCell>
                  <Box display="flex" alignItems="center">
                    <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                      {getInitials(customer.name)}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {customer.name || 'Unknown Customer'}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        ID: {customer.customerId || `temp-${index}`}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box>
                    {customer.email && (
                      <Box display="flex" alignItems="center" mb={0.5}>
                        <EmailIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2">{customer.email}</Typography>
                      </Box>
                    )}
                    {customer.phone && (
                      <Box display="flex" alignItems="center">
                        <PhoneIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2">{customer.phone}</Typography>
                      </Box>
                    )}
                  </Box>
                </TableCell>
                <TableCell>{customer.company || '-'}</TableCell>
                <TableCell>{getStatusChip(customer.status)}</TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center">
                    <PersonIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body2">
                      {customer.salesPersonName || customer.salesPersonId || 'Unassigned'}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell align="center">
                  <IconButton
                    size="small"
                    onClick={() => handleCustomerClick(customer, 'view')}
                  >
                    <ViewIcon />
                  </IconButton>
                  {(userRole === 'admin' || userRole === 'manager') && (
                    <>
                      <IconButton
                        size="small"
                        onClick={() => handleCustomerClick(customer, 'edit')}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteCustomer(customer.customerId)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </>
                  )}
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

      {/* Customer Dialog */}
      <Dialog open={dialogOpen} onClose={handleDialogClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {dialogMode === 'add' ? 'Add Customer' : 
           dialogMode === 'edit' ? 'Edit Customer' : 'Customer Details'}
        </DialogTitle>
        <DialogContent>
          {selectedCustomer && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Full Name"
                  value={selectedCustomer.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  disabled={dialogMode === 'view'}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={selectedCustomer.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  disabled={dialogMode === 'view'}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Phone"
                  value={selectedCustomer.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  disabled={dialogMode === 'view'}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Company"
                  value={selectedCustomer.company}
                  onChange={(e) => handleInputChange('company', e.target.value)}
                  disabled={dialogMode === 'view'}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Address"
                  multiline
                  rows={2}
                  value={selectedCustomer.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  disabled={dialogMode === 'view'}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notes"
                  multiline
                  rows={3}
                  value={selectedCustomer.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  disabled={dialogMode === 'view'}
                />
              </Grid>
              {dialogMode === 'view' && (
                <>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="textSecondary">
                      <strong>Created:</strong> {selectedCustomer.createdAt || 'Unknown'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="textSecondary">
                      <strong>Last Updated:</strong> {selectedCustomer.updatedAt || 'Unknown'}
                    </Typography>
                  </Grid>
                </>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>
            {dialogMode === 'view' ? 'Close' : 'Cancel'}
          </Button>
          {dialogMode !== 'view' && (
            <Button onClick={handleSaveCustomer} variant="contained">
              {dialogMode === 'add' ? 'Add Customer' : 'Save Changes'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Customers;
