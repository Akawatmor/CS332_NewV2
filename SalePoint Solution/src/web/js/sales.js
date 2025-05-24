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
    // In a real implementation, this would fetch from the API
    // For demonstration, we'll use simulated data first
    
    // Simulate API call to get customers
    makeApiCall('GET', '/customers', null)
        .then(data => {
            customersCache = data;
            populateCustomerSelect(data);
        })
        .catch(error => {
            console.error('Error loading customers:', error);
            showNotification('Error loading customers data', 'danger');
        });
    
    // Simulate API call to get sales reps
    makeApiCall('GET', '/salesreps', null)
        .then(data => {
            salesRepsCache = data;
            populateSalesRepSelect(data);
        })
        .catch(error => {
            console.error('Error loading sales reps:', error);
            showNotification('Error loading sales representatives data', 'danger');
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
    
    // In a real implementation, this would search via the API
    makeApiCall('GET', `/products?search=${encodeURIComponent(searchTerm)}`, null)
        .then(data => {
            productSearchResults = data;
            displayProductSearchResults(data);
        })
        .catch(error => {
            console.error('Error searching products:', error);
            showNotification('Error searching for products', 'danger');
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
    
    // In a real implementation, this would submit to the API
    makeApiCall('POST', '/sales', saleData)
        .then(response => {
            showNotification('Sale successfully created!', 'success');
            
            // Reset the form
            resetSaleForm();
            
            // Refresh sales history
            loadSalesHistory();
            
            // Optional: Show sale details
            viewSaleDetails(response.saleId);
        })
        .catch(error => {
            console.error('Error submitting sale:', error);
            showNotification('Error creating sale. Please try again.', 'danger');
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
    
    // In a real implementation, this would fetch from the API
    makeApiCall('GET', `/sales${queryParams ? '?' + queryParams : ''}`, null)
        .then(data => {
            displaySalesHistory(data);
        })
        .catch(error => {
            console.error('Error loading sales history:', error);
            showNotification('Error loading sales history', 'danger');
            
            // Show error in table
            $('#sales-table-body').html(`
                <tr>
                    <td colspan="7" class="text-center text-danger">
                        Error loading sales data. Please try again.
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
    
    // In a real implementation, this would fetch from the API
    makeApiCall('GET', `/sales/${saleId}`, null)
        .then(sale => {
            populateSaleDetailsModal(sale);
        })
        .catch(error => {
            console.error('Error loading sale details:', error);
            showNotification('Error loading sale details', 'danger');
            
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
    
    // In a real implementation, this would call the API
    makeApiCall('PUT', `/sales/${saleId}`, { status: newStatus, notes: notes })
        .then(() => {
            showNotification('Sale status updated successfully', 'success');
            
            // Refresh the details modal
            viewSaleDetails(saleId);
            
            // Refresh sales history
            loadSalesHistory();
        })
        .catch(error => {
            console.error('Error updating sale status:', error);
            showNotification('Error updating sale status', 'danger');
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
    
    // In a real implementation, this would call the API
    makeApiCall('PUT', `/sales/${saleId}/notes`, { notes: notes })
        .then(() => {
            showNotification('Notes saved successfully', 'success');
        })
        .catch(error => {
            console.error('Error saving notes:', error);
            showNotification('Error saving notes', 'danger');
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
    
    // In a real implementation, this would call the API
    makeApiCall('DELETE', `/sales/${saleId}`, null)
        .then(() => {
            showNotification('Sale deleted successfully', 'success');
            
            // Hide the modal
            $('#saleDetailsModal').modal('hide');
            
            // Refresh sales history
            loadSalesHistory();
        })
        .catch(error => {
            console.error('Error deleting sale:', error);
            showNotification('Error deleting sale', 'danger');
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
 * Make API call - use real API instead of simulation
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
                throw new Error(`API error: ${response.status}`);
            }
            return response.json();
        })
        .catch(error => {
            console.error('API Request Error:', error);
            // Fallback to mock data for demo
            return getMockData(method, endpoint, data);
        });
}

/**
 * Get mock data based on endpoint and method for fallback
 */
function getMockData(method, endpoint, data) {
    // Simulate API delay
    return new Promise((resolve) => {
        setTimeout(() => {
            if (endpoint.includes('/customers')) {
                resolve(getMockCustomers());
            } else if (endpoint.includes('/salesreps')) {
                resolve(getMockSalesReps());
            } else if (endpoint.includes('/products')) {
                resolve(getMockProducts(endpoint));
            } else if (endpoint.includes('/sales')) {
                if (method === 'POST') {
                    // Return success response for new sale
                    resolve({ 
                        success: true, 
                        saleId: 'SALE-' + Date.now(),
                        message: 'Sale created successfully (mock)'
                    });
                } else if (endpoint.includes('/sales/') && !endpoint.endsWith('/sales')) {
                    // Get specific sale by ID
                    const saleId = endpoint.split('/sales/')[1].split('?')[0];
                    resolve(getMockSaleById(saleId));
                } else {
                    // Get all sales
                    resolve(getMockSales(endpoint));
                }
            } else {
                resolve({ error: 'Endpoint not found (mock)' });
            }
        }, 500);
    });
}

// Mock data functions - in production, these would be removed
// and replaced with actual API calls

/**
 * Get mock customers data
 */
function getMockCustomers() {
    return [
        { id: 'CUST-1001', name: 'Acme Corporation', email: 'orders@acme.com', phone: '555-123-4567' },
        { id: 'CUST-1002', name: 'TechNova Solutions', email: 'info@technova.com', phone: '555-987-6543' },
        { id: 'CUST-1003', name: 'Global Industries', email: 'purchasing@globalind.com', phone: '555-456-7890' },
        { id: 'CUST-1004', name: 'Infinite Systems', email: 'sales@infinitesys.com', phone: '555-789-0123' },
        { id: 'CUST-1005', name: 'Peak Performance Inc', email: 'orders@peakperf.com', phone: '555-234-5678' }
    ];
}

/**
 * Get mock sales reps data
 */
function getMockSalesReps() {
    return [
        { id: 'SR-101', name: 'John Smith', email: 'john.smith@salepoint.com', phone: '555-111-2222' },
        { id: 'SR-102', name: 'Sarah Johnson', email: 'sarah.johnson@salepoint.com', phone: '555-222-3333' },
        { id: 'SR-103', name: 'Michael Brown', email: 'michael.brown@salepoint.com', phone: '555-333-4444' },
        { id: 'SR-104', name: 'Emily Davis', email: 'emily.davis@salepoint.com', phone: '555-444-5555' }
    ];
}

/**
 * Get mock products based on search query
 */
function getMockProducts(endpoint) {
    const allProducts = [
        { id: 'PROD-2001', name: 'Enterprise Server', price: 4999.99, stock: 12 },
        { id: 'PROD-2002', name: 'Business Laptop Pro', price: 1499.99, stock: 32 },
        { id: 'PROD-2003', name: 'Network Security Suite', price: 2499.99, stock: 8 },
        { id: 'PROD-2004', name: '4K Monitor', price: 599.99, stock: 45 },
        { id: 'PROD-2005', name: 'Cloud Storage Plan (1TB)', price: 99.99, stock: 100 },
        { id: 'PROD-2006', name: 'Wireless Keyboard and Mouse', price: 79.99, stock: 67 },
        { id: 'PROD-2007', name: 'Office Software Suite', price: 299.99, stock: 53 },
        { id: 'PROD-2008', name: 'Virtual Meeting License', price: 149.99, stock: 200 },
        { id: 'PROD-2009', name: 'Data Backup Solution', price: 399.99, stock: 28 },
        { id: 'PROD-2010', name: 'UPS Battery Backup', price: 249.99, stock: 15 },
        { id: 'PROD-2011', name: 'Smartphone Business Edition', price: 899.99, stock: 42 },
        { id: 'PROD-2012', name: 'Enterprise Router', price: 349.99, stock: 0 }
    ];
    
    // If there's a search parameter, filter the products
    if (endpoint.includes('?search=')) {
        const searchTerm = decodeURIComponent(endpoint.split('?search=')[1].toLowerCase());
        return allProducts.filter(product => 
            product.id.toLowerCase().includes(searchTerm) || 
            product.name.toLowerCase().includes(searchTerm)
        );
    }
    
    return allProducts;
}

/**
 * Get mock sales data
 */
function getMockSales(endpoint) {
    const allSales = [
        {
            SaleID: 'SALE-1001',
            Timestamp: '2025-02-01T10:30:00Z',
            CustomerID: 'CUST-1001',
            CustomerName: 'Acme Corporation',
            SalesRepID: 'SR-101',
            SalesRepName: 'John Smith',
            Products: [
                { productId: 'PROD-2001', name: 'Enterprise Server', price: 4999.99, quantity: 1 },
                { productId: 'PROD-2003', name: 'Network Security Suite', price: 2499.99, quantity: 1 }
            ],
            TotalAmount: 7499.98,
            Status: 'Completed',
            Notes: 'Priority shipping requested'
        },
        {
            SaleID: 'SALE-1002',
            Timestamp: '2025-02-05T14:15:00Z',
            CustomerID: 'CUST-1002',
            CustomerName: 'TechNova Solutions',
            SalesRepID: 'SR-102',
            SalesRepName: 'Sarah Johnson',
            Products: [
                { productId: 'PROD-2002', name: 'Business Laptop Pro', price: 1499.99, quantity: 5 },
                { productId: 'PROD-2007', name: 'Office Software Suite', price: 299.99, quantity: 5 }
            ],
            TotalAmount: 8999.90,
            Status: 'Pending',
            Notes: 'Waiting for final approval'
        },
        {
            SaleID: 'SALE-1003',
            Timestamp: '2025-02-10T09:45:00Z',
            CustomerID: 'CUST-1004',
            CustomerName: 'Infinite Systems',
            SalesRepID: 'SR-103',
            SalesRepName: 'Michael Brown',
            Products: [
                { productId: 'PROD-2005', name: 'Cloud Storage Plan (1TB)', price: 99.99, quantity: 10 },
                { productId: 'PROD-2008', name: 'Virtual Meeting License', price: 149.99, quantity: 10 }
            ],
            TotalAmount: 2499.80,
            Status: 'Cancelled',
            Notes: 'Customer decided to go with different solution'
        },
        {
            SaleID: 'SALE-1004',
            Timestamp: '2025-02-12T16:20:00Z',
            CustomerID: 'CUST-1003',
            CustomerName: 'Global Industries',
            SalesRepID: 'SR-104',
            SalesRepName: 'Emily Davis',
            Products: [
                { productId: 'PROD-2004', name: '4K Monitor', price: 599.99, quantity: 8 },
                { productId: 'PROD-2006', name: 'Wireless Keyboard and Mouse', price: 79.99, quantity: 8 }
            ],
            TotalAmount: 5439.84,
            Status: 'Completed',
            Notes: ''
        },
        {
            SaleID: 'SALE-1005',
            Timestamp: '2025-02-15T11:30:00Z',
            CustomerID: 'CUST-1005',
            CustomerName: 'Peak Performance Inc',
            SalesRepID: 'SR-101',
            SalesRepName: 'John Smith',
            Products: [
                { productId: 'PROD-2009', name: 'Data Backup Solution', price: 399.99, quantity: 1 },
                { productId: 'PROD-2010', name: 'UPS Battery Backup', price: 249.99, quantity: 2 }
            ],
            TotalAmount: 899.97,
            Status: 'Pending',
            Notes: 'Installation requested'
        }
    ];
    
    // Handle filtering
    if (endpoint.includes('?')) {
        const params = new URLSearchParams(endpoint.split('?')[1]);
        
        let filteredSales = [...allSales];
        
        // Filter by status
        if (params.has('status')) {
            const status = params.get('status');
            filteredSales = filteredSales.filter(sale => sale.Status === status);
        }
        
        // Filter by date range
        if (params.has('dateRange')) {
            const dateRange = params.get('dateRange');
            const now = new Date();
            
            if (dateRange === 'today') {
                // Filter for today
                const today = new Date().toISOString().split('T')[0];
                filteredSales = filteredSales.filter(sale => 
                    sale.Timestamp.startsWith(today)
                );
            } else if (dateRange === 'week') {
                // Filter for this week
                const weekStart = new Date(now.setDate(now.getDate() - now.getDay())).toISOString();
                filteredSales = filteredSales.filter(sale => 
                    sale.Timestamp >= weekStart
                );
            } else if (dateRange === 'month') {
                // Filter for this month
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
                filteredSales = filteredSales.filter(sale => 
                    sale.Timestamp >= monthStart
                );
            }
        }
        
        // Filter by search term
        if (params.has('search')) {
            const searchTerm = params.get('search').toLowerCase();
            filteredSales = filteredSales.filter(sale => 
                sale.SaleID.toLowerCase().includes(searchTerm) || 
                sale.CustomerName.toLowerCase().includes(searchTerm) ||
                sale.SalesRepName.toLowerCase().includes(searchTerm)
            );
        }
        
        return filteredSales;
    }
    
    return allSales;
}

/**
 * Get a specific mock sale by ID
 */
function getMockSaleById(saleId) {
    const allSales = getMockSales('');
    return allSales.find(sale => sale.SaleID === saleId) || null;
}
