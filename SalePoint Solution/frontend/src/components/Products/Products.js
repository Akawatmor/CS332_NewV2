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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  SwapVert as SwapVertIcon,
} from '@mui/icons-material';
import { apiService } from '../../services/apiService';
import { createErrorForDisplay } from '../../utils/errorHandler';

function Products({ userRole }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('name'); // New sorting state
  const [sortOrder, setSortOrder] = useState('asc'); // New sort order state
  const [categories, setCategories] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState('view'); // 'view', 'add', 'edit'

  const pageSize = 20;

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, [page, searchTerm, selectedCategory]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: pageSize,
        search: searchTerm || undefined,
        category: selectedCategory || undefined,
      };
      
      const response = await apiService.getProducts(params);
      // Handle DynamoDB response format
      const productsData = response.products || response || [];
      setProducts(Array.isArray(productsData) ? productsData : []);
      setTotalPages(Math.ceil((response.count || productsData.length || 0) / pageSize));
      setError(null);
    } catch (err) {
      console.error('Error loading products:', err);
      const errorDisplay = createErrorForDisplay(err.message || 'Failed to load products. Please try again.');
      setError(errorDisplay.message);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await apiService.getProducts({ groupBy: 'category' });
      // Handle DynamoDB response format
      const productsData = response.products || response || [];
      const uniqueCategories = [...new Set(productsData.map(p => p.category).filter(Boolean) || [])];
      setCategories(uniqueCategories);
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  };

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
    setPage(1);
  };

  const handleCategoryFilter = (event) => {
    setSelectedCategory(event.target.value);
    setPage(1);
  };

  const handleSortChange = (event) => {
    setSortBy(event.target.value);
  };

  const handleSortOrderToggle = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  // Filter and sort products
  const getFilteredAndSortedProducts = () => {
    let filtered = products.filter(product => {
      const matchesSearch = product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           product.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !selectedCategory || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    // Sort products
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name?.toLowerCase() || '';
          bValue = b.name?.toLowerCase() || '';
          break;
        case 'category':
          aValue = a.category?.toLowerCase() || '';
          bValue = b.category?.toLowerCase() || '';
          break;
        case 'price':
          aValue = parseFloat(a.price) || 0;
          bValue = parseFloat(b.price) || 0;
          break;
        case 'stock':
          aValue = parseInt(a.stock_quantity || a.stock) || 0;
          bValue = parseInt(b.stock_quantity || b.stock) || 0;
          break;
        default:
          return 0;
      }

      if (sortBy === 'price' || sortBy === 'stock') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      } else {
        if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      }
    });

    return filtered;
  };

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  const handleProductClick = (product, mode = 'view') => {
    setSelectedProduct(product);
    setDialogMode(mode);
    setDialogOpen(true);
  };

  const handleAddProduct = () => {
    setSelectedProduct({
      name: '',
      description: '',
      price: '',
      category: '',
      stock_quantity: '',
      specifications: {},
    });
    setDialogMode('add');
    setDialogOpen(true);
  };

  const handleSaveProduct = async () => {
    try {
      if (dialogMode === 'add') {
        await apiService.createProduct(selectedProduct);
      } else if (dialogMode === 'edit') {
        // Use productId for DynamoDB
        const productId = selectedProduct.productId || selectedProduct.id;
        await apiService.updateProduct(productId, selectedProduct);
      }
      setDialogOpen(false);
      loadProducts();
    } catch (err) {
      console.error('Error saving product:', err);
      const errorDisplay = createErrorForDisplay(err.message || 'Failed to save product. Please try again.');
      setError(errorDisplay.message);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await apiService.deleteProduct(productId);
        loadProducts();
      } catch (err) {
        console.error('Error deleting product:', err);
        const errorDisplay = createErrorForDisplay(err.message || 'Failed to delete product. Please try again.');
        setError(errorDisplay.message);
      }
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedProduct(null);
  };

  const handleInputChange = (field, value) => {
    setSelectedProduct(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getStockChip = (quantity) => {
    if (quantity === 0) {
      return <Chip label="Out of Stock" color="error" size="small" />;
    } else if (quantity <= 10) {
      return <Chip label="Low Stock" color="warning" size="small" />;
    } else {
      return <Chip label="In Stock" color="success" size="small" />;
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB'
    }).format(price);
  };

  if (loading && products.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Products</Typography>
        {(userRole === 'admin' || userRole === 'manager') && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddProduct}
          >
            Add Product
          </Button>
        )}
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
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={selectedCategory}
                  label="Category"
                  onChange={handleCategoryFilter}
                >
                  <MenuItem value="">All Categories</MenuItem>
                  {categories.map((category) => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Sort By</InputLabel>
                <Select
                  value={sortBy}
                  label="Sort By"
                  onChange={handleSortChange}
                  startAdornment={<SortIcon sx={{ mr: 1, color: 'action.active' }} />}
                >
                  <MenuItem value="name">Name</MenuItem>
                  <MenuItem value="category">Category</MenuItem>
                  <MenuItem value="price">Price</MenuItem>
                  <MenuItem value="stock">Stock</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<SwapVertIcon />}
                onClick={handleSortOrderToggle}
                sx={{ height: '56px' }}
              >
                {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
              </Button>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<FilterIcon />}
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('');
                  setSortBy('name');
                  setSortOrder('asc');
                  setPage(1);
                }}
                sx={{ height: '56px' }}
              >
                Clear
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Products Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Stock</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {getFilteredAndSortedProducts().map((product) => (
              <TableRow key={product.id} hover>
                <TableCell>
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      {product.name}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {product.description?.substring(0, 50)}
                      {product.description?.length > 50 ? '...' : ''}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>{product.category}</TableCell>
                <TableCell>{formatPrice(product.price)}</TableCell>
                <TableCell>{product.stock_quantity}</TableCell>
                <TableCell>{getStockChip(product.stock_quantity)}</TableCell>
                <TableCell align="center">
                  <IconButton
                    size="small"
                    onClick={() => handleProductClick(product, 'view')}
                  >
                    <ViewIcon />
                  </IconButton>
                  {(userRole === 'admin' || userRole === 'manager') && (
                    <>
                      <IconButton
                        size="small"
                        onClick={() => handleProductClick(product, 'edit')}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteProduct(product.productId || product.id)}
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

      {/* Product Dialog */}
      <Dialog open={dialogOpen} onClose={handleDialogClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {dialogMode === 'add' ? 'Add Product' : 
           dialogMode === 'edit' ? 'Edit Product' : 'Product Details'}
        </DialogTitle>
        <DialogContent>
          {selectedProduct && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Product Name"
                  value={selectedProduct.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  disabled={dialogMode === 'view'}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Category"
                  value={selectedProduct.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  disabled={dialogMode === 'view'}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Price"
                  type="number"
                  value={selectedProduct.price}
                  onChange={(e) => handleInputChange('price', e.target.value)}
                  disabled={dialogMode === 'view'}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Stock Quantity"
                  type="number"
                  value={selectedProduct.stock_quantity}
                  onChange={(e) => handleInputChange('stock_quantity', e.target.value)}
                  disabled={dialogMode === 'view'}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={3}
                  value={selectedProduct.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  disabled={dialogMode === 'view'}
                />
              </Grid>
              {dialogMode === 'view' && selectedProduct.specifications && (
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Specifications
                  </Typography>
                  <Box>
                    {Object.entries(selectedProduct.specifications || {}).map(([key, value]) => (
                      <Typography key={key} variant="body2">
                        <strong>{key}:</strong> {value}
                      </Typography>
                    ))}
                  </Box>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>
            {dialogMode === 'view' ? 'Close' : 'Cancel'}
          </Button>
          {dialogMode !== 'view' && (
            <Button onClick={handleSaveProduct} variant="contained">
              {dialogMode === 'add' ? 'Add Product' : 'Save Changes'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Products;
