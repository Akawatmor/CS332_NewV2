import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  InputAdornment,
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
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Search as SearchIcon,
  Warning as WarningIcon,
  TrendingDown as TrendingDownIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { apiService } from '../../services/apiService';

function Inventory({ userRole }) {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [stockDialog, setStockDialog] = useState(false);
  const [stockChange, setStockChange] = useState('');
  const [stockReason, setStockReason] = useState('');
  const [stockType, setStockType] = useState('in'); // 'in' or 'out'

  useEffect(() => {
    loadInventory();
  }, [searchTerm]);

  const loadInventory = async () => {
    try {
      setLoading(true);
      const params = {
        search: searchTerm || undefined,
        includeStockData: true,
      };
      
      const response = await apiService.getInventory(params);
      setInventory(response.products || []);
      setError(null);
    } catch (err) {
      console.error('Error loading inventory:', err);
      setError('Failed to load inventory data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleStockUpdate = (product, type) => {
    setSelectedProduct(product);
    setStockType(type);
    setStockChange('');
    setStockReason('');
    setStockDialog(true);
  };

  const handleStockSave = async () => {
    try {
      const changeAmount = parseInt(stockChange);
      if (!changeAmount || changeAmount <= 0) {
        alert('Please enter a valid quantity');
        return;
      }

      const stockData = {
        movementType: stockType,
        quantity: changeAmount,
        reason: stockReason,
      };

      await apiService.updateStock(selectedProduct.id, stockData);
      setStockDialog(false);
      loadInventory();
    } catch (err) {
      console.error('Error updating stock:', err);
      setError('Failed to update stock. Please try again.');
    }
  };

  const getStockChip = (quantity) => {
    if (quantity === 0) {
      return <Chip label="Out of Stock" color="error" size="small" icon={<WarningIcon />} />;
    } else if (quantity <= 10) {
      return <Chip label="Low Stock" color="warning" size="small" icon={<TrendingDownIcon />} />;
    } else {
      return <Chip label="In Stock" color="success" size="small" />;
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB'
    }).format(price || 0);
  };

  const calculateStockValue = (quantity, price) => {
    return formatPrice((quantity || 0) * (price || 0));
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  const lowStockCount = inventory.filter(item => item.stock_quantity <= 10).length;
  const outOfStockCount = inventory.filter(item => item.stock_quantity === 0).length;
  const totalValue = inventory.reduce((sum, item) => sum + ((item.stock_quantity || 0) * (item.price || 0)), 0);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Inventory Management
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Products
              </Typography>
              <Typography variant="h4" color="primary">
                {inventory.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Low Stock Items
              </Typography>
              <Typography variant="h4" color="warning.main">
                {lowStockCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Out of Stock
              </Typography>
              <Typography variant="h4" color="error.main">
                {outOfStockCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Value
              </Typography>
              <Typography variant="h4" color="success.main">
                {formatPrice(totalValue)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <TextField
            fullWidth
            placeholder="Search products..."
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
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Product</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Current Stock</TableCell>
              <TableCell>Unit Price</TableCell>
              <TableCell>Stock Value</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {inventory.map((product) => (
              <TableRow key={product.id} hover>
                <TableCell>
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      {product.name}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      ID: {product.id}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>{product.category}</TableCell>
                <TableCell>
                  <Typography 
                    variant="h6" 
                    color={product.stock_quantity === 0 ? 'error' : 
                           product.stock_quantity <= 10 ? 'warning.main' : 'text.primary'}
                  >
                    {product.stock_quantity}
                  </Typography>
                </TableCell>
                <TableCell>{formatPrice(product.price)}</TableCell>
                <TableCell>{calculateStockValue(product.stock_quantity, product.price)}</TableCell>
                <TableCell>{getStockChip(product.stock_quantity)}</TableCell>
                <TableCell align="center">
                  {userRole === 'admin' || userRole === 'manager' ? (
                    <Box>
                      <IconButton
                        size="small"
                        color="success"
                        onClick={() => handleStockUpdate(product, 'in')}
                        title="Add Stock"
                      >
                        <AddIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleStockUpdate(product, 'out')}
                        title="Remove Stock"
                        disabled={product.stock_quantity === 0}
                      >
                        <RemoveIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleStockUpdate(product, 'adjustment')}
                        title="Adjust Stock"
                      >
                        <EditIcon />
                      </IconButton>
                    </Box>
                  ) : (
                    <Typography variant="caption" color="textSecondary">
                      View Only
                    </Typography>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Stock Update Dialog */}
      <Dialog open={stockDialog} onClose={() => setStockDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {stockType === 'in' ? 'Add Stock' : 
           stockType === 'out' ? 'Remove Stock' : 'Adjust Stock'}
        </DialogTitle>
        <DialogContent>
          {selectedProduct && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                {selectedProduct.name}
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Current Stock: {selectedProduct.stock_quantity} units
              </Typography>
              
              <TextField
                fullWidth
                label={stockType === 'in' ? 'Quantity to Add' : 
                       stockType === 'out' ? 'Quantity to Remove' : 'New Stock Quantity'}
                type="number"
                value={stockChange}
                onChange={(e) => setStockChange(e.target.value)}
                sx={{ mb: 2, mt: 2 }}
              />
              
              <TextField
                fullWidth
                label="Reason"
                multiline
                rows={3}
                value={stockReason}
                onChange={(e) => setStockReason(e.target.value)}
                placeholder="Enter reason for stock change..."
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStockDialog(false)}>Cancel</Button>
          <Button onClick={handleStockSave} variant="contained">
            Update Stock
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Inventory;
