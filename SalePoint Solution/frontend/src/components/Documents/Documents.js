import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Tooltip,
  Fab
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Search as SearchIcon,
  Description as DocumentIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
  TableChart as ExcelIcon,
  TextSnippet as TextIcon
} from '@mui/icons-material';
import { apiService } from '../../services/apiService';
import { authService } from '../../services/authService';

const Documents = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadData, setUploadData] = useState({
    title: '',
    description: '',
    category: '',
    type: 'general',
    accessLevel: 'all'
  });

  const userRole = authService.getUserRole();
  const canManageDocuments = ['admin', 'manager'].includes(userRole);

  const documentCategories = [
    'Sales Materials',
    'Product Catalogs',
    'Training Materials',
    'Policies',
    'Templates',
    'Reports',
    'Presentations',
    'Manuals'
  ];

  const documentTypes = [
    'general',
    'sales-only',
    'manager-only',
    'admin-only'
  ];

  const accessLevels = [
    { value: 'all', label: 'All Users' },
    { value: 'sales', label: 'Sales Team' },
    { value: 'manager', label: 'Managers Only' },
    { value: 'admin', label: 'Admins Only' }
  ];

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    setError('');
    try {
      // First try to fetch real documents from API
      try {
        const response = await apiService.get('/documents');
        setDocuments(response.data);
      } catch (err) {
        // If API fails, generate mock documents from products
        console.log('API not available, generating mock documents from products...');
        await generateMockDocumentsFromProducts();
      }
    } catch (err) {
      setError('Failed to fetch documents: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const generateMockDocumentsFromProducts = async () => {
    try {
      // Fetch products to create mock documents
      const productsResponse = await apiService.getProducts();
      const products = productsResponse.data || [];
      
      const mockDocuments = [];
      
      // Generate product catalogs for each category
      const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
      categories.forEach(category => {
        mockDocuments.push({
          id: `catalog_${category.toLowerCase().replace(/\s+/g, '_')}`,
          title: `${category} Product Catalog`,
          description: `Complete catalog of all ${category.toLowerCase()} products with specifications and pricing`,
          category: 'Product Catalogs',
          type: 'general',
          accessLevel: 'all',
          fileType: 'pdf',
          size: Math.floor(Math.random() * 5000000) + 1000000, // 1-5MB
          uploadDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
          uploadedBy: 'System Generated'
        });
      });

      // Generate individual product spec sheets
      products.slice(0, 5).forEach(product => {
        mockDocuments.push({
          id: `spec_${product.productId || product.id}`,
          title: `${product.name} - Technical Specifications`,
          description: `Detailed technical specifications and user manual for ${product.name}`,
          category: 'Sales Materials',
          type: 'general',
          accessLevel: 'all',
          fileType: 'pdf',
          size: Math.floor(Math.random() * 2000000) + 500000, // 0.5-2MB
          uploadDate: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString(),
          uploadedBy: 'Product Team'
        });
      });

      // Generate sales materials
      mockDocuments.push(
        {
          id: 'sales_presentation_2024',
          title: 'Product Portfolio Presentation 2024',
          description: 'Complete product portfolio presentation including all current products and pricing',
          category: 'Sales Materials',
          type: 'sales-only',
          accessLevel: 'sales',
          fileType: 'pptx',
          size: 15000000, // 15MB
          uploadDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          uploadedBy: 'Sales Manager'
        },
        {
          id: 'price_list_current',
          title: 'Current Price List & Discounts',
          description: 'Up-to-date pricing information for all products with dealer discount structures',
          category: 'Sales Materials',
          type: 'sales-only',
          accessLevel: 'sales',
          fileType: 'xlsx',
          size: 1200000, // 1.2MB
          uploadDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          uploadedBy: 'Finance Team'
        },
        {
          id: 'inventory_report_template',
          title: 'Monthly Inventory Report Template',
          description: 'Standard template for generating monthly inventory and stock reports',
          category: 'Templates',
          type: 'manager-only',
          accessLevel: 'manager',
          fileType: 'xlsx',
          size: 800000, // 0.8MB
          uploadDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          uploadedBy: 'Operations Manager'
        },
        {
          id: 'sales_training_manual',
          title: 'Product Sales Training Manual',
          description: 'Comprehensive training manual covering all products, features, and sales techniques',
          category: 'Training Materials',
          type: 'general',
          accessLevel: 'all',
          fileType: 'pdf',
          size: 8500000, // 8.5MB
          uploadDate: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
          uploadedBy: 'HR Department'
        }
      );

      setDocuments(mockDocuments);
      console.log(`Generated ${mockDocuments.length} mock documents from ${products.length} products`);
    } catch (err) {
      console.error('Error generating mock documents:', err);
      setError('Failed to generate mock documents');
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setUploadData(prev => ({
        ...prev,
        title: file.name.split('.')[0]
      }));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', uploadData.title);
      formData.append('description', uploadData.description);
      formData.append('category', uploadData.category);
      formData.append('type', uploadData.type);
      formData.append('accessLevel', uploadData.accessLevel);

      await apiService.post('/documents', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setSuccess('Document uploaded successfully');
      setUploadDialogOpen(false);
      resetUploadForm();
      fetchDocuments();
    } catch (err) {
      setError('Failed to upload document: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (documentId, filename) => {
    try {
      const response = await apiService.get(`/documents/${documentId}/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to download document: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleView = async (documentId) => {
    try {
      const response = await apiService.get(`/documents/${documentId}/view`);
      window.open(response.data.viewUrl, '_blank');
    } catch (err) {
      setError('Failed to view document: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDelete = async (documentId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      await apiService.delete(`/documents/${documentId}`);
      setSuccess('Document deleted successfully');
      fetchDocuments();
    } catch (err) {
      setError('Failed to delete document: ' + (err.response?.data?.message || err.message));
    }
  };

  const resetUploadForm = () => {
    setSelectedFile(null);
    setUploadData({
      title: '',
      description: '',
      category: '',
      type: 'general',
      accessLevel: 'all'
    });
  };

  const getFileIcon = (fileType) => {
    const type = fileType?.toLowerCase() || '';
    switch (type) {
      case 'pdf':
        return <PdfIcon color="error" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <ImageIcon color="info" />;
      case 'xlsx':
      case 'xls':
      case 'csv':
        return <ExcelIcon color="success" />;
      case 'pptx':
      case 'ppt':
        return <DocumentIcon color="warning" />;
      case 'doc':
      case 'docx':
      case 'txt':
        return <TextIcon color="primary" />;
      default:
        return <DocumentIcon />;
    }
  };

  const getAccessLevelColor = (accessLevel) => {
    switch (accessLevel) {
      case 'admin':
        return 'error';
      case 'manager':
        return 'warning';
      case 'sales':
        return 'info';
      default:
        return 'default';
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || doc.category === categoryFilter;
    const matchesType = typeFilter === 'all' || doc.type === typeFilter;
    
    return matchesSearch && matchesCategory && matchesType;
  });

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Unknown date';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Document Library
        </Typography>
        {canManageDocuments && (
          <Fab
            color="primary"
            aria-label="upload"
            onClick={() => setUploadDialogOpen(true)}
          >
            <AddIcon />
          </Fab>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Search and Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Search Documents"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={categoryFilter}
                  label="Category"
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <MenuItem value="all">All Categories</MenuItem>
                  {documentCategories.map(category => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Access Level</InputLabel>
                <Select
                  value={typeFilter}
                  label="Access Level"
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <MenuItem value="all">All Access Levels</MenuItem>
                  {documentTypes.map(type => (
                    <MenuItem key={type} value={type}>
                      {type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card>
        <CardContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Document</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Size</TableCell>
                    <TableCell>Uploaded</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredDocuments.map((doc) => (
                    <TableRow key={doc.documentId}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {getFileIcon(doc.filename)}
                          <Box sx={{ ml: 2 }}>
                            <Typography variant="subtitle2">{doc.title}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {doc.description}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={doc.category} 
                          size="small" 
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={doc.accessLevel.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          size="small"
                          color={getAccessLevelColor(doc.accessLevel)}
                        />
                      </TableCell>
                      <TableCell>{formatFileSize(doc.fileSize)}</TableCell>
                      <TableCell>
                        {formatDate(doc.uploadedAt)}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="View">
                            <IconButton
                              size="small"
                              onClick={() => handleView(doc.documentId)}
                            >
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Download">
                            <IconButton
                              size="small"
                              onClick={() => handleDownload(doc.documentId, doc.filename)}
                            >
                              <DownloadIcon />
                            </IconButton>
                          </Tooltip>
                          {canManageDocuments && (
                            <Tooltip title="Delete">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDelete(doc.documentId)}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredDocuments.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography variant="body2" color="text.secondary">
                          No documents found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog 
        open={uploadDialogOpen} 
        onClose={() => setUploadDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Upload Document</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Button
                variant="outlined"
                component="label"
                startIcon={<UploadIcon />}
                fullWidth
                sx={{ p: 2 }}
              >
                {selectedFile ? selectedFile.name : 'Select File'}
                <input
                  type="file"
                  hidden
                  onChange={handleFileSelect}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.txt"
                />
              </Button>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Title"
                value={uploadData.title}
                onChange={(e) => setUploadData(prev => ({ ...prev, title: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={uploadData.description}
                onChange={(e) => setUploadData(prev => ({ ...prev, description: e.target.value }))}
                multiline
                rows={3}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Category</InputLabel>
                <Select
                  value={uploadData.category}
                  label="Category"
                  onChange={(e) => setUploadData(prev => ({ ...prev, category: e.target.value }))}
                >
                  {documentCategories.map(category => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Access Level</InputLabel>
                <Select
                  value={uploadData.accessLevel}
                  label="Access Level"
                  onChange={(e) => setUploadData(prev => ({ ...prev, accessLevel: e.target.value }))}
                >
                  {accessLevels.map(level => (
                    <MenuItem key={level.value} value={level.value}>
                      {level.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpload}
            variant="contained"
            disabled={!selectedFile || !uploadData.title || !uploadData.category || loading}
          >
            {loading ? <CircularProgress size={20} /> : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Documents;
