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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Search as SearchIcon,
  Warning as WarningIcon,
  TrendingDown as TrendingDownIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Edit as EditIcon,
  Clear as ClearIcon,
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
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState(''); // all, low, out, normal
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    loadInventory();
  }, [searchTerm]);

  const loadInventory = async () => {
    try {
      setLoading(true);
      // Fetch products data to use as inventory
      const response = await apiService.getProducts();
      
      // Extract products from the API response
      const products = response.products || response.data || response || [];
      
      // Transform products into inventory items with additional inventory-specific data
      const inventoryItems = products.map(product => ({
        ...product,
        // Use existing stock data or set defaults
        currentStock: product.stock || 0,
        reorderLevel: Math.max(5, Math.floor((product.stock || 0) * 0.2)), // 20% of current stock or minimum 5
        maxStock: Math.floor((product.stock || 0) * 1.5) || 50, // 150% of current stock
        lastUpdated: product.updatedAt || product.lastUpdated || new Date().toISOString(),
        // Add mock movement history
        recentMovements: generateMockMovements(product),
        // Calculate stock status
        stockStatus: getStockStatus(product.stock || 0),
        // Add cost data for inventory valuation
        unitCost: product.price ? (product.price * 0.6) : 0, // Assume 60% cost ratio
        totalValue: (product.stock || 0) * (product.price ? (product.price * 0.6) : 0)
      }));
      
      // Extract unique categories
      const uniqueCategories = [...new Set(inventoryItems.map(item => item.category).filter(Boolean))];
      setCategories(uniqueCategories);
      
      setInventory(inventoryItems);
      setError(null);
    } catch (err) {
      console.error('Error loading inventory:', err);
      setError('Failed to load inventory data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateMockMovements = (product) => {
    const movements = [];
    const stockQty = product.stock || 0;
    
    // Generate 3-5 recent movements
    for (let i = 0; i < Math.min(5, Math.max(3, Math.floor(stockQty / 10))); i++) {
      const daysAgo = Math.floor(Math.random() * 30) + 1;
      const isInbound = Math.random() > 0.4; // 60% chance of inbound movement
      const quantity = Math.floor(Math.random() * 20) + 1;
      
      movements.push({
        id: `mov_${product.productId || product.id}_${i}`,
        date: new Date(Date.now() - (daysAgo * 24 * 60 * 60 * 1000)).toISOString(),
        type: isInbound ? 'in' : 'out',
        quantity: quantity,
        reason: isInbound ? 
          ['Purchase Order', 'Return', 'Transfer In', 'Adjustment'][Math.floor(Math.random() * 4)] :
          ['Sale', 'Transfer Out', 'Damage', 'Sample'][Math.floor(Math.random() * 4)],
        reference: `REF-${Math.random().toString(36).substr(2, 6).toUpperCase()}`
      });
    }
    
    return movements.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const getStockStatus = (quantity) => {
    if (quantity === 0) return 'out';
    if (quantity <= 10) return 'low';
    if (quantity <= 5) return 'critical';
    return 'normal';
  };

  const getFilteredInventory = () => {
    let filtered = inventory.filter(item => {
      const matchesSearch = item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.id?.toString().includes(searchTerm);
      
      const matchesCategory = !categoryFilter || item.category === categoryFilter;
      
      const matchesStockStatus = !stockStatusFilter || getStockStatus(item.currentStock) === stockStatusFilter;
      
      return matchesSearch && matchesCategory && matchesStockStatus;
    });
    
    return filtered;
  };

  const clearFilters = () => {
    setCategoryFilter('');
    setStockStatusFilter('');
    setSearchTerm('');
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

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  const lowStockCount = inventory.filter(item => item.currentStock <= 10).length;
  const outOfStockCount = inventory.filter(item => item.currentStock === 0).length;
  const totalValue = inventory.reduce((sum, item) => sum + ((item.currentStock || 0) * (item.unitCost || 0)), 0);
  const filteredInventory = getFilteredInventory();

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

      {/* Inventory Insights */}
      {filteredInventory.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Inventory Insights
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="textSecondary">
                  Products Requiring Reorder
                </Typography>
                <Typography variant="h6" color="warning.main">
                  {filteredInventory.filter(item => item.currentStock <= item.reorderLevel).length}
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="textSecondary">
                  Average Stock Level
                </Typography>
                <Typography variant="h6">
                  {Math.round(filteredInventory.reduce((sum, item) => sum + item.currentStock, 0) / filteredInventory.length)} units
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="textSecondary">
                  Total SKUs Filtered
                </Typography>
                <Typography variant="h6" color="primary">
                  {filteredInventory.length}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Search and Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
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
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={categoryFilter}
                  label="Category"
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <MenuItem value="">All Categories</MenuItem>
                  {categories.map(category => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Stock Status</InputLabel>
                <Select
                  value={stockStatusFilter}
                  label="Stock Status"
                  onChange={(e) => setStockStatusFilter(e.target.value)}
                >
                  <MenuItem value="">All Status</MenuItem>
                  <MenuItem value="normal">In Stock</MenuItem>
                  <MenuItem value="low">Low Stock</MenuItem>
                  <MenuItem value="out">Out of Stock</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<ClearIcon />}
                onClick={clearFilters}
                disabled={!categoryFilter && !stockStatusFilter && !searchTerm}
              >
                Clear Filters
              </Button>
            </Grid>
          </Grid>
          {(categoryFilter || stockStatusFilter || searchTerm) && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="textSecondary">
                Showing {filteredInventory.length} of {inventory.length} products
                {categoryFilter && ` • Category: ${categoryFilter}`}
                {stockStatusFilter && ` • Status: ${stockStatusFilter}`}
                {searchTerm && ` • Search: "${searchTerm}"`}
              </Typography>
            </Box>
          )}
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
              <TableCell>Reorder Level</TableCell>
              <TableCell>Unit Cost</TableCell>
              <TableCell>Stock Value</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredInventory.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography variant="body2" color="textSecondary" sx={{ py: 4 }}>
                    {inventory.length === 0 ? 'No products in inventory' : 'No products match your filters'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredInventory.map((product) => (
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
                      color={product.currentStock === 0 ? 'error' : 
                             product.currentStock <= 10 ? 'warning.main' : 'text.primary'}
                    >
                      {product.currentStock}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="textSecondary">
                      {product.reorderLevel}
                    </Typography>
                  </TableCell>
                  <TableCell>{formatPrice(product.unitCost)}</TableCell>
                  <TableCell>{formatPrice(product.totalValue)}</TableCell>
                  <TableCell>{getStockChip(product.currentStock)}</TableCell>
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
                          disabled={product.currentStock === 0}
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
              ))
            )}
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
                Current Stock: {selectedProduct.currentStock} units
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
