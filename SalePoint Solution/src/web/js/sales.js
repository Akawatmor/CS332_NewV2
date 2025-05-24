/**
 * SalePoint Solution - Sales Management JavaScript
 * 
 * This file handles the functionality for the sales.html page, including:
 * - Creating new sales
 * - Managing the sales cart (adding, removing, updating products)
 * - Searching and displaying product information
 * - Submitting sales to the backend
 * - Viewing and managing sales history
 * - Updating sale status
 */

// API endpoint base URL - to be replaced with actual API Gateway URL in production
// API Base URL - Get from main.js config
const API_BASE_URL = API_CONFIG ? API_CONFIG.baseUrl : 'https://your-api-gateway-id.execute-api.us-east-1.amazonaws.com/prod';

// Store for the current sale being created
let currentSale = {
    customer: null,
    salesRep: null,
    products: [],
    notes: ''
};

// Cache for customers and sales reps data
let customersCache = [];
let salesRepsCache = [];

// Cache for products search results
let productSearchResults = [];

// Document ready function
$(document).ready(function() {
    // Initialize the page
    initializePage();
    
    // Set up event listeners
    setupEventListeners();
    
    // Load initial data
    loadSalesHistory();
    loadCustomersAndSalesReps();
});

/**
 * Initialize the page and set up UI components
 */
function initializePage() {
    // Show loading spinner (will be hidden once data is loaded)
    $('#sales-table-body').html(`
        <tr>
            <td colspan="7" class="text-center">
                <div class="spinner-border text-primary" role="status">
                    <span class="sr-only">Loading...</span>
                </div>
            </td>
        </tr>
    `);
    
    // Initialize tooltips and popovers if used
    $('[data-toggle="tooltip"]').tooltip();
    $('[data-toggle="popover"]').popover();
}

/**
 * Set up all event listeners for the page
 */
function setupEventListeners() {
    // Customer and Sales Rep selection change events
    $('#customer-select').on('change', updateSaleSummary);
    $('#sales-rep-select').on('change', updateSaleSummary);
    
    // Product search
    $('#product-search-btn').on('click', searchProducts);
    $('#product-search').on('keypress', function(e) {
        if (e.which === 13) { // Enter key
            searchProducts();
            e.preventDefault();
        }
    });
    
    // Sale submission
    $('#submit-sale-btn').on('click', submitSale);
    
    // Sales history filters
    $('#sales-filter').on('change', loadSalesHistory);
    $('#date-filter').on('change', loadSalesHistory);
    $('#sales-search').on('keyup', function() {
        // Debounce the search to avoid too many queries
        clearTimeout($(this).data('timeout'));
        $(this).data('timeout', setTimeout(function() {
            loadSalesHistory();
        }, 500));
    });
    
    // Sale details modal events
    $('#update-sale-status-btn').on('click', updateSaleStatus);
    $('#save-sale-notes-btn').on('click', saveSaleNotes);
    $('#delete-sale-btn').on('click', deleteSale);
    
    // Sale notes field
    $('#sale-notes').on('change', function() {
        currentSale.notes = $(this).val();
    });
}

/**
 * Load customers and sales representatives data
 */
function loadCustomersAndSalesReps() {
    // Load customers from real API
    makeApiCall('GET', '/customers', null)
        .then(data => {
            if (data && Array.isArray(data)) {
                customersCache = data;
                populateCustomerSelect(data);
            } else {
                throw new Error('Invalid customers data received');
            }
        })
        .catch(error => {
            console.error('Error loading customers:', error);
            showNotification('Failed to load customers. Please check your connection.', 'danger');
        });
    
    // Load sales reps from real API
    makeApiCall('GET', '/salesreps', null)
        .then(data => {
            if (data && Array.isArray(data)) {
                salesRepsCache = data;
                populateSalesRepSelect(data);
            } else {
                throw new Error('Invalid sales representatives data received');
            }
        })
        .catch(error => {
            console.error('Error loading sales reps:', error);
            showNotification('Failed to load sales representatives. Please check your connection.', 'danger');
        });
}

/**
 * Populate the customer select dropdown
 */
function populateCustomerSelect(customers) {
    const $select = $('#customer-select');
    $select.find('option:not(:first)').remove();
    
    customers.forEach(customer => {
        $select.append(`<option value="${customer.id}">${customer.name}</option>`);
    });
}

/**
 * Populate the sales rep select dropdown
 */
function populateSalesRepSelect(salesReps) {
    const $select = $('#sales-rep-select');
    $select.find('option:not(:first)').remove();
    
    salesReps.forEach(rep => {
        $select.append(`<option value="${rep.id}">${rep.name}</option>`);
    });
}

/**
 * Update the sale summary section when selections change
 */
function updateSaleSummary() {
    const customerId = $('#customer-select').val();
    const salesRepId = $('#sales-rep-select').val();
    
    // Update customer info
    if (customerId) {
        const customer = customersCache.find(c => c.id === customerId);
        currentSale.customer = customer;
        $('#summary-customer').text(customer.name);
    } else {
        currentSale.customer = null;
        $('#summary-customer').text('Not selected');
    }
    
    // Update sales rep info
    if (salesRepId) {
        const salesRep = salesRepsCache.find(r => r.id === salesRepId);
        currentSale.salesRep = salesRep;
        $('#summary-sales-rep').text(salesRep.name);
    } else {
        currentSale.salesRep = null;
        $('#summary-sales-rep').text('Not selected');
    }
    
    // Update product count and total
    $('#summary-product-count').text(currentSale.products.length);
    const totalAmount = calculateTotal();
    $('#summary-total').text(formatCurrency(totalAmount));
}

/**
 * Calculate the total amount of the current sale
 */
function calculateTotal() {
    return currentSale.products.reduce((total, product) => {
        return total + (product.price * product.quantity);
    }, 0);
}

/**
 * Format currency value for display
 */
function formatCurrency(value) {
    return '$' + parseFloat(value).toFixed(2);
}

/**
 * Search for products based on the search input
 */
function searchProducts() {
    const searchTerm = $('#product-search').val().trim();
    
    if (!searchTerm) {
        showNotification('Please enter a search term', 'warning');
        return;
    }
    
    // Show loading state
    $('#product-search-btn').html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>');
    
    // Use real API for product search
    makeApiCall('GET', `/products?search=${encodeURIComponent(searchTerm)}`, null)
        .then(data => {
            if (data && Array.isArray(data)) {
                productSearchResults = data;
                displayProductSearchResults(data);
            } else {
                throw new Error('Invalid product data received');
            }
        })
        .catch(error => {
            console.error('Error searching products:', error);
            showNotification('Failed to search products. Please check your connection.', 'danger');
            $('#product-results-body').html('<tr><td colspan="5" class="text-center text-danger">Error loading products</td></tr>');
        })
        .finally(() => {
            // Restore button text
            $('#product-search-btn').html('Search');
        });
}

/**
 * Display product search results
 */
function displayProductSearchResults(products) {
    const $resultsBody = $('#product-results-body');
    $resultsBody.empty();
    
    if (products.length === 0) {
        $resultsBody.html('<tr><td colspan="5" class="text-center">No products found</td></tr>');
    } else {
        products.forEach(product => {
            const stockClass = product.stock < 5 ? 'text-danger' : '';
            
            $resultsBody.append(`
                <tr>
                    <td>${product.id}</td>
                    <td>${product.name}</td>
                    <td>${formatCurrency(product.price)}</td>
                    <td class="${stockClass}">${product.stock}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" 
                                onclick="addProductToCart('${product.id}')"
                                ${product.stock <= 0 ? 'disabled' : ''}>
                            Add
                        </button>
                    </td>
                </tr>
            `);
        });
    }
    
    // Show the results container
    $('#product-search-results').show();
}

/**
 * Add a product to the current sale cart
 */
function addProductToCart(productId) {
    const product = productSearchResults.find(p => p.id === productId);
    
    if (!product) {
        return;
    }
    
    // Check if product is already in the cart
    const existingProduct = currentSale.products.find(p => p.productId === product.id);
    
    if (existingProduct) {
        // Increment quantity if stock allows
        if (existingProduct.quantity < product.stock) {
            existingProduct.quantity += 1;
            updateCartDisplay();
            showNotification(`Increased quantity of ${product.name}`, 'success');
        } else {
            showNotification(`Maximum available stock for ${product.name} reached`, 'warning');
        }
    } else {
        // Add new product to cart
        currentSale.products.push({
            productId: product.id,
            name: product.name,
            price: product.price,
            quantity: 1,
            maxStock: product.stock
        });
        
        updateCartDisplay();
        showNotification(`${product.name} added to cart`, 'success');
    }
    
    // Update the sale summary
    updateSaleSummary();
}

/**
 * Update the display of the cart with selected products
 */
function updateCartDisplay() {
    const $cartBody = $('#selected-products-body');
    
    if (currentSale.products.length === 0) {
        $cartBody.html('<tr id="empty-cart-row"><td colspan="6" class="text-center">No products selected</td></tr>');
    } else {
        $cartBody.find('#empty-cart-row').remove();
        
        // Clear and rebuild the cart
        $cartBody.empty();
        
        currentSale.products.forEach((product, index) => {
            const total = product.price * product.quantity;
            
            $cartBody.append(`
                <tr>
                    <td>${product.productId}</td>
                    <td>${product.name}</td>
                    <td>${formatCurrency(product.price)}</td>
                    <td>
                        <div class="input-group input-group-sm">
                            <div class="input-group-prepend">
                                <button class="btn btn-outline-secondary" type="button" 
                                        onclick="decrementQuantity(${index})"
                                        ${product.quantity <= 1 ? 'disabled' : ''}>
                                    -
                                </button>
                            </div>
                            <input type="text" class="form-control text-center" value="${product.quantity}" 
                                   onchange="updateQuantity(${index}, this.value)" style="max-width: 60px;">
                            <div class="input-group-append">
                                <button class="btn btn-outline-secondary" type="button" 
                                        onclick="incrementQuantity(${index})"
                                        ${product.quantity >= product.maxStock ? 'disabled' : ''}>
                                    +
                                </button>
                            </div>
                        </div>
                    </td>
                    <td>${formatCurrency(total)}</td>
                    <td>
                        <button class="btn btn-sm btn-danger" onclick="removeProduct(${index})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `);
        });
    }
    
    // Update total
    const totalAmount = calculateTotal();
    $('#total-amount').text(formatCurrency(totalAmount));
}

/**
 * Increment the quantity of a product in the cart
 */
function incrementQuantity(index) {
    const product = currentSale.products[index];
    
    if (product && product.quantity < product.maxStock) {
        product.quantity += 1;
        updateCartDisplay();
        updateSaleSummary();
    }
}

/**
 * Decrement the quantity of a product in the cart
 */
function decrementQuantity(index) {
    const product = currentSale.products[index];
    
    if (product && product.quantity > 1) {
        product.quantity -= 1;
        updateCartDisplay();
        updateSaleSummary();
    }
}

/**
 * Update the quantity of a product in the cart
 */
function updateQuantity(index, value) {
    const product = currentSale.products[index];
    const newQuantity = parseInt(value, 10);
    
    if (isNaN(newQuantity) || newQuantity < 1) {
        // Reset to previous value if invalid
        updateCartDisplay();
        return;
    }
    
    if (newQuantity > product.maxStock) {
        showNotification(`Maximum available stock for ${product.name} is ${product.maxStock}`, 'warning');
        product.quantity = product.maxStock;
    } else {
        product.quantity = newQuantity;
    }
    
    updateCartDisplay();
    updateSaleSummary();
}

/**
 * Remove a product from the cart
 */
function removeProduct(index) {
    const product = currentSale.products[index];
    const name = product.name;
    
    currentSale.products.splice(index, 1);
    updateCartDisplay();
    updateSaleSummary();
    
    showNotification(`${name} removed from cart`, 'info');
}

/**
 * Submit the current sale to the backend
 */
function submitSale() {
    // Validate required fields
    if (!currentSale.customer) {
        showNotification('Please select a customer', 'warning');
        return;
    }
    
    if (!currentSale.salesRep) {
        showNotification('Please select a sales representative', 'warning');
        return;
    }
    
    if (currentSale.products.length === 0) {
        showNotification('Please add at least one product', 'warning');
        return;
    }
    
    // Disable submit button and show loading state
    const $submitBtn = $('#submit-sale-btn');
    $submitBtn.prop('disabled', true).html(`
        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        Processing...
    `);
    
    // Prepare sale data
    const saleData = {
        customerId: currentSale.customer.id,
        customerName: currentSale.customer.name,
        salesRepId: currentSale.salesRep.id,
        salesRepName: currentSale.salesRep.name,
        products: currentSale.products.map(p => ({
            productId: p.productId,
            name: p.name,
            price: p.price,
            quantity: p.quantity
        })),
        totalAmount: calculateTotal(),
        notes: currentSale.notes
    };
      // Submit to real API
    makeApiCall('POST', '/sales', saleData)
        .then(response => {
            if (response && (response.saleId || response.SaleID)) {
                showNotification('Sale successfully created!', 'success');
                
                // Reset the form
                resetSaleForm();
                
                // Refresh sales history
                loadSalesHistory();
                
                // Show sale details if ID available
                const saleId = response.saleId || response.SaleID;
                if (saleId) {
                    setTimeout(() => viewSaleDetails(saleId), 1000);
                }
            } else {
                throw new Error('Invalid response from server');
            }
        })
        .catch(error => {
            console.error('Error submitting sale:', error);
            showNotification('Failed to create sale. Please check your connection and try again.', 'danger');
        })
        .finally(() => {
            // Re-enable submit button
            $submitBtn.prop('disabled', false).text('Complete Sale');
        });
}

/**
 * Reset the sale form after submission
 */
function resetSaleForm() {
    // Reset select dropdowns
    $('#customer-select').val('');
    $('#sales-rep-select').val('');
    
    // Clear notes
    $('#sale-notes').val('');
    
    // Reset current sale object
    currentSale = {
        customer: null,
        salesRep: null,
        products: [],
        notes: ''
    };
    
    // Reset the cart display
    updateCartDisplay();
    
    // Reset the summary
    updateSaleSummary();
    
    // Hide product search results
    $('#product-search-results').hide();
    $('#product-search').val('');
}

/**
 * Load sales history data
 */
function loadSalesHistory() {
    const statusFilter = $('#sales-filter').val();
    const dateFilter = $('#date-filter').val();
    const searchTerm = $('#sales-search').val().trim();
    
    // Show loading state
    $('#sales-table-body').html(`
        <tr>
            <td colspan="7" class="text-center">
                <div class="spinner-border text-primary" role="status">
                    <span class="sr-only">Loading...</span>
                </div>
            </td>
        </tr>
    `);
    
    // Build query parameters
    let queryParams = '';
    if (statusFilter) queryParams += `status=${encodeURIComponent(statusFilter)}&`;
    if (dateFilter) queryParams += `dateRange=${encodeURIComponent(dateFilter)}&`;
    if (searchTerm) queryParams += `search=${encodeURIComponent(searchTerm)}&`;
    
    // Remove trailing & if it exists
    if (queryParams.endsWith('&')) {
        queryParams = queryParams.slice(0, -1);
    }
      // Load sales history from real API
    makeApiCall('GET', `/sales${queryParams ? '?' + queryParams : ''}`, null)
        .then(data => {
            if (data && Array.isArray(data)) {
                displaySalesHistory(data);
            } else if (data && (data.items || data.sales)) {
                // Handle different response formats
                const salesData = data.items || data.sales || [];
                displaySalesHistory(salesData);
            } else {
                throw new Error('Invalid sales data received');
            }
        })
        .catch(error => {
            console.error('Error loading sales history:', error);
            showNotification('Failed to load sales history. Please check your connection.', 'danger');
            
            // Show error in table
            $('#sales-table-body').html(`
                <tr>
                    <td colspan="7" class="text-center text-danger">
                        Failed to load sales data. Please check your connection and try again.
                    </td>
                </tr>
            `);
        });
}

/**
 * Display sales history data
 */
function displaySalesHistory(sales) {
    const $tableBody = $('#sales-table-body');
    $tableBody.empty();
    
    if (!sales || sales.length === 0) {
        $tableBody.html('<tr><td colspan="7" class="text-center">No sales found</td></tr>');
        return;
    }
    
    sales.forEach(sale => {
        // Format date
        const saleDate = new Date(sale.Timestamp);
        const formattedDate = saleDate.toLocaleDateString() + ' ' + saleDate.toLocaleTimeString();
        
        // Determine status badge class
        let statusClass = 'badge-secondary';
        if (sale.Status === 'Completed') statusClass = 'badge-success';
        else if (sale.Status === 'Pending') statusClass = 'badge-warning';
        else if (sale.Status === 'Cancelled') statusClass = 'badge-danger';
        
        $tableBody.append(`
            <tr>
                <td>${sale.SaleID}</td>
                <td>${formattedDate}</td>
                <td>${sale.CustomerName}</td>
                <td>${sale.SalesRepName}</td>
                <td>${formatCurrency(sale.TotalAmount)}</td>
                <td><span class="badge ${statusClass}">${sale.Status}</span></td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="viewSaleDetails('${sale.SaleID}')">
                        <i class="fas fa-eye"></i> View
                    </button>
                </td>
            </tr>
        `);
    });
}

/**
 * View sale details in modal
 */
function viewSaleDetails(saleId) {
    // Show loading in modal
    $('#detail-sale-id').text('Loading...');
    $('#detail-date').text('Loading...');
    $('#detail-customer').text('Loading...');
    $('#detail-sales-rep').text('Loading...');
    $('#detail-status').text('Loading...').removeClass().addClass('badge');
    $('#sale-products-table').html('<tr><td colspan="5" class="text-center">Loading...</td></tr>');
    $('#sale-detail-total').text('$0.00');
    $('#sale-detail-notes').val('');
    
    // Store the current sale ID in the modal for reference
    $('#saleDetailsModal').data('saleId', saleId);
    
    // Show the modal
    $('#saleDetailsModal').modal('show');
      // Load sale details from real API
    makeApiCall('GET', `/sales/${saleId}`, null)
        .then(sale => {
            if (sale && sale.SaleID) {
                populateSaleDetailsModal(sale);
            } else {
                throw new Error('Invalid sale data received');
            }
        })
        .catch(error => {
            console.error('Error loading sale details:', error);
            showNotification('Failed to load sale details. Please check your connection.', 'danger');
            
            // Hide the modal
            $('#saleDetailsModal').modal('hide');
        });
}

/**
 * Populate the sale details modal with data
 */
function populateSaleDetailsModal(sale) {
    // Format date
    const saleDate = new Date(sale.Timestamp);
    const formattedDate = saleDate.toLocaleDateString() + ' ' + saleDate.toLocaleTimeString();
    
    // Update modal title
    $('#saleDetailsTitle').text(`Sale Details - ${sale.SaleID}`);
    
    // Populate basic info
    $('#detail-sale-id').text(sale.SaleID);
    $('#detail-date').text(formattedDate);
    $('#detail-customer').text(sale.CustomerName);
    $('#detail-sales-rep').text(sale.SalesRepName);
    
    // Set status and badge color
    let statusClass = 'badge-secondary';
    if (sale.Status === 'Completed') statusClass = 'badge-success';
    else if (sale.Status === 'Pending') statusClass = 'badge-warning';
    else if (sale.Status === 'Cancelled') statusClass = 'badge-danger';
    
    $('#detail-status').text(sale.Status).removeClass().addClass(`badge ${statusClass}`);
    
    // Set the select dropdown to match current status
    $('#update-sale-status').val(sale.Status);
    
    // Set notes
    $('#sale-detail-notes').val(sale.Notes || '');
    
    // Populate products table
    const $productsTable = $('#sale-products-table');
    $productsTable.empty();
    
    if (!sale.Products || sale.Products.length === 0) {
        $productsTable.html('<tr><td colspan="5" class="text-center">No products in this sale</td></tr>');
    } else {
        let totalAmount = 0;
        
        sale.Products.forEach(product => {
            const total = product.price * product.quantity;
            totalAmount += total;
            
            $productsTable.append(`
                <tr>
                    <td>${product.productId}</td>
                    <td>${product.name}</td>
                    <td>${formatCurrency(product.price)}</td>
                    <td>${product.quantity}</td>
                    <td>${formatCurrency(total)}</td>
                </tr>
            `);
        });
        
        // Update total
        $('#sale-detail-total').text(formatCurrency(totalAmount));
    }
    
    // Enable/disable buttons based on status
    const isCancelled = sale.Status === 'Cancelled';
    $('#update-sale-status').prop('disabled', isCancelled);
    $('#update-sale-status-btn').prop('disabled', isCancelled);
    
    // Disable delete button if completed
    const isCompleted = sale.Status === 'Completed';
    $('#delete-sale-btn').prop('disabled', isCompleted);
}

/**
 * Update sale status
 */
function updateSaleStatus() {
    const saleId = $('#saleDetailsModal').data('saleId');
    const newStatus = $('#update-sale-status').val();
    const notes = $('#sale-detail-notes').val();
    
    if (!saleId || !newStatus) {
        return;
    }
    
    // Disable button and show loading state
    const $btn = $('#update-sale-status-btn');
    $btn.prop('disabled', true).html(`
        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        Updating...
    `);
      // Update sale status via real API
    makeApiCall('PUT', `/sales/${saleId}`, { status: newStatus, notes: notes })
        .then(response => {
            if (response) {
                showNotification('Sale status updated successfully', 'success');
                
                // Refresh the details modal
                viewSaleDetails(saleId);
                
                // Refresh sales history
                loadSalesHistory();
            } else {
                throw new Error('Invalid response from server');
            }
        })
        .catch(error => {
            console.error('Error updating sale status:', error);
            showNotification('Failed to update sale status. Please check your connection.', 'danger');
        })
        .finally(() => {
            // Re-enable button
            $btn.prop('disabled', false).text('Update Status');
        });
}

/**
 * Save sale notes
 */
function saveSaleNotes() {
    const saleId = $('#saleDetailsModal').data('saleId');
    const notes = $('#sale-detail-notes').val();
    
    if (!saleId) {
        return;
    }
    
    // Disable button and show loading state
    const $btn = $('#save-sale-notes-btn');
    $btn.prop('disabled', true).html(`
        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        Saving...
    `);
      // Save sale notes via real API
    makeApiCall('PUT', `/sales/${saleId}/notes`, { notes: notes })
        .then(response => {
            if (response) {
                showNotification('Notes saved successfully', 'success');
            } else {
                throw new Error('Invalid response from server');
            }
        })
        .catch(error => {
            console.error('Error saving notes:', error);
            showNotification('Failed to save notes. Please check your connection.', 'danger');
        })
        .finally(() => {
            // Re-enable button
            $btn.prop('disabled', false).text('Save Notes');
        });
}

/**
 * Delete a sale
 */
function deleteSale() {
    const saleId = $('#saleDetailsModal').data('saleId');
    
    if (!saleId) {
        return;
    }
    
    // Confirm deletion
    if (!confirm('Are you sure you want to delete this sale? This action cannot be undone.')) {
        return;
    }
    
    // Disable button and show loading state
    const $btn = $('#delete-sale-btn');
    $btn.prop('disabled', true).html(`
        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        Deleting...
    `);
      // Delete sale via real API
    makeApiCall('DELETE', `/sales/${saleId}`, null)
        .then(response => {
            if (response) {
                showNotification('Sale deleted successfully', 'success');
                
                // Hide the modal
                $('#saleDetailsModal').modal('hide');
                
                // Refresh sales history
                loadSalesHistory();
            } else {
                throw new Error('Invalid response from server');
            }
        })
        .catch(error => {
            console.error('Error deleting sale:', error);
            showNotification('Failed to delete sale. Please check your connection.', 'danger');
        })
        .finally(() => {
            // Re-enable button
            $btn.prop('disabled', false).text('Delete Sale');
        });
}

/**
 * Display a notification to the user
 */
function showNotification(message, type = 'info') {
    // If the web app uses a notification system
    // This is a simple implementation that could be enhanced
    
    // Create notification element
    const notification = $(`
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                <span aria-hidden="true">&times;</span>
            </button>
        </div>
    `);
    
    // Append to notification area (create if doesn't exist)
    if ($('#notification-area').length === 0) {
        $('body').append('<div id="notification-area" style="position: fixed; top: 20px; right: 20px; z-index: 9999;"></div>');
    }
    
    $('#notification-area').append(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        notification.alert('close');
    }, 5000);
}

/**
 * Make API call - use only real API endpoints
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
 * @param {string} endpoint - API endpoint
 * @param {object} data - Request data for POST/PUT
 * @returns {Promise} - Promise resolving to the response data
 */
function makeApiCall(method, endpoint, data) {
    // Use the apiRequest function from main.js if available
    if (typeof apiRequest === 'function') {
        return apiRequest(endpoint, method, data);
    }
    
    // Fallback to direct fetch if apiRequest not available
    const url = `${API_BASE_URL}${endpoint}`;
    
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json'
        }
    };
    
    if (data && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(data);
    }
    
    return fetch(url, options)
        .then(response => {
            if (!response.ok) {
                throw new Error(`API error: ${response.status} - ${response.statusText}`);
            }
            return response.json();
        })
        .catch(error => {
            console.error('API Request Error:', error);
            throw error; // Re-throw error instead of falling back to mock data
        });
}

// End of sales.js - All functions use real API endpoints only
