/* Customer management functionality for SalePoint application */

// API Endpoint
const API_URL = API_CONFIG.baseUrl;

// Initialize on page load
$(document).ready(function() {
    // Load customers and sales reps
    loadCustomers();
    loadSalesReps();
    
    // Set up event listeners
    $('#search-btn').click(searchCustomers);
    $('#customer-search').keypress(function(e) {
        if (e.which === 13) {
            searchCustomers();
        }
    });
    
    $('#sales-rep-filter').change(filterCustomersBySalesRep);
    
    // Event delegation for customer actions
    $('#customers-table-body').on('click', '.view-customer-btn', function() {
        const customerId = $(this).data('customer-id');
        viewCustomerDetails(customerId);
    });
    
    // Save new customer
    $('#save-customer-btn').click(saveNewCustomer);
    
    // Customer details modal actions
    $('#update-status-btn').click(updateCustomerStatus);
    $('#save-notes-btn').click(saveCustomerNotes);
});

// Load all customers
function loadCustomers() {
    $('#customers-table-body').html('<tr><td colspan="7" class="text-center"><div class="spinner-border text-primary" role="status"><span class="sr-only">Loading...</span></div></td></tr>');
    
    // Simulate API call for demonstration purposes
    // In a real implementation, use the actual API
    setTimeout(() => {
        // Sample customer data (would come from the API)
        const customers = [
            {
                CustomerID: 'CUST001',
                CustomerName: 'John Smith',
                Email: 'john.smith@example.com',
                Phone: '555-123-4567',
                SalesRepID: 'SR001',
                SalesRepName: 'Emily Johnson',
                Status: 'Active',
                LastUpdated: '2025-05-15T10:30:00Z'
            },
            {
                CustomerID: 'CUST002',
                CustomerName: 'Jane Doe',
                Email: 'jane.doe@example.com',
                Phone: '555-987-6543',
                SalesRepID: 'SR003',
                SalesRepName: 'Maria Garcia',
                Status: 'Hot Lead',
                LastUpdated: '2025-05-16T14:45:00Z'
            },
            {
                CustomerID: 'CUST003',
                CustomerName: 'Bob Johnson',
                Email: 'bob.johnson@example.com',
                Phone: '555-456-7890',
                SalesRepID: 'SR002',
                SalesRepName: 'David Lee',
                Status: 'Pending',
                LastUpdated: '2025-05-18T09:15:00Z'
            },
            {
                CustomerID: 'CUST004',
                CustomerName: 'Sarah Williams',
                Email: 'sarah.williams@example.com',
                Phone: '555-321-6547',
                SalesRepID: 'SR001',
                SalesRepName: 'Emily Johnson',
                Status: 'Active',
                LastUpdated: '2025-05-14T13:20:00Z'
            },
            {
                CustomerID: 'CUST005',
                CustomerName: 'Michael Brown',
                Email: 'michael.brown@example.com',
                Phone: '555-654-3210',
                SalesRepID: 'SR004',
                SalesRepName: 'James Wilson',
                Status: 'Inactive',
                LastUpdated: '2025-05-10T11:05:00Z'
            }
        ];
        
        displayCustomers(customers);
        
        /* In a real implementation, use the actual API:
        $.ajax({
            url: `${API_URL}/customers`,
            method: 'GET',
            success: function(data) {
                displayCustomers(data);
            },
            error: function(error) {
                console.error('Error loading customers:', error);
                $('#customers-table-body').html('<tr><td colspan="7" class="text-center"><div class="alert alert-danger">Error loading customers. Please try again later.</div></td></tr>');
            }
        });
        */
    }, 800);
}

// Load all sales representatives
function loadSalesReps() {
    // Simulate API call for demonstration purposes
    // In a real implementation, use the actual API
    setTimeout(() => {
        // Sample sales rep data (would come from the API)
        const salesReps = [
            { id: 'SR001', name: 'Emily Johnson' },
            { id: 'SR002', name: 'David Lee' },
            { id: 'SR003', name: 'Maria Garcia' },
            { id: 'SR004', name: 'James Wilson' },
            { id: 'SR005', name: 'Linda Chen' }
        ];
        
        // Populate sales rep filter dropdown
        let salesRepFilterOptions = '<option value="">All Sales Representatives</option>';
        salesReps.forEach(rep => {
            salesRepFilterOptions += `<option value="${rep.id}">${rep.name}</option>`;
        });
        $('#sales-rep-filter').html(salesRepFilterOptions);
        
        // Populate sales rep dropdown in Add Customer modal
        let assignedSalesRepOptions = '<option value="">Select Sales Rep</option>';
        salesReps.forEach(rep => {
            assignedSalesRepOptions += `<option value="${rep.id}">${rep.name}</option>`;
        });
        $('#assigned-sales-rep').html(assignedSalesRepOptions);
        
        /* In a real implementation, use the actual API:
        $.ajax({
            url: `${API_URL}/salesreps`,
            method: 'GET',
            success: function(data) {
                // Populate sales rep filter dropdown
                let salesRepFilterOptions = '<option value="">All Sales Representatives</option>';
                data.forEach(rep => {
                    salesRepFilterOptions += `<option value="${rep.id}">${rep.name}</option>`;
                });
                $('#sales-rep-filter').html(salesRepFilterOptions);
                
                // Populate sales rep dropdown in Add Customer modal
                let assignedSalesRepOptions = '<option value="">Select Sales Rep</option>';
                data.forEach(rep => {
                    assignedSalesRepOptions += `<option value="${rep.id}">${rep.name}</option>`;
                });
                $('#assigned-sales-rep').html(assignedSalesRepOptions);
            },
            error: function(error) {
                console.error('Error loading sales reps:', error);
            }
        });
        */
    }, 500);
}

// Filter customers by sales rep
function filterCustomersBySalesRep() {
    const salesRepId = $('#sales-rep-filter').val();
    
    if (!salesRepId) {
        // If no sales rep selected, load all customers
        loadCustomers();
        return;
    }
    
    $('#customers-table-body').html('<tr><td colspan="7" class="text-center"><div class="spinner-border text-primary" role="status"><span class="sr-only">Loading...</span></div></td></tr>');
    
    // Simulate API call for demonstration purposes
    // In a real implementation, use the actual API
    setTimeout(() => {
        // Sample customer data (would come from the API)
        const allCustomers = [
            {
                CustomerID: 'CUST001',
                CustomerName: 'John Smith',
                Email: 'john.smith@example.com',
                Phone: '555-123-4567',
                SalesRepID: 'SR001',
                SalesRepName: 'Emily Johnson',
                Status: 'Active',
                LastUpdated: '2025-05-15T10:30:00Z'
            },
            {
                CustomerID: 'CUST002',
                CustomerName: 'Jane Doe',
                Email: 'jane.doe@example.com',
                Phone: '555-987-6543',
                SalesRepID: 'SR003',
                SalesRepName: 'Maria Garcia',
                Status: 'Hot Lead',
                LastUpdated: '2025-05-16T14:45:00Z'
            },
            {
                CustomerID: 'CUST003',
                CustomerName: 'Bob Johnson',
                Email: 'bob.johnson@example.com',
                Phone: '555-456-7890',
                SalesRepID: 'SR002',
                SalesRepName: 'David Lee',
                Status: 'Pending',
                LastUpdated: '2025-05-18T09:15:00Z'
            },
            {
                CustomerID: 'CUST004',
                CustomerName: 'Sarah Williams',
                Email: 'sarah.williams@example.com',
                Phone: '555-321-6547',
                SalesRepID: 'SR001',
                SalesRepName: 'Emily Johnson',
                Status: 'Active',
                LastUpdated: '2025-05-14T13:20:00Z'
            },
            {
                CustomerID: 'CUST005',
                CustomerName: 'Michael Brown',
                Email: 'michael.brown@example.com',
                Phone: '555-654-3210',
                SalesRepID: 'SR004',
                SalesRepName: 'James Wilson',
                Status: 'Inactive',
                LastUpdated: '2025-05-10T11:05:00Z'
            }
        ];
        
        // Filter customers by the selected sales rep
        const filteredCustomers = allCustomers.filter(customer => customer.SalesRepID === salesRepId);
        
        displayCustomers(filteredCustomers);
        
        /* In a real implementation, use the actual API:
        $.ajax({
            url: `${API_URL}/salesreps/${salesRepId}/customers`,
            method: 'GET',
            success: function(data) {
                displayCustomers(data);
            },
            error: function(error) {
                console.error('Error filtering customers:', error);
                $('#customers-table-body').html('<tr><td colspan="7" class="text-center"><div class="alert alert-danger">Error filtering customers. Please try again later.</div></td></tr>');
            }
        });
        */
    }, 600);
}

// Search customers based on input
function searchCustomers() {
    const searchTerm = $('#customer-search').val().toLowerCase();
    
    if (!searchTerm) {
        // If no search term, load all customers
        loadCustomers();
        return;
    }
    
    $('#customers-table-body').html('<tr><td colspan="7" class="text-center"><div class="spinner-border text-primary" role="status"><span class="sr-only">Loading...</span></div></td></tr>');
    
    // Simulate API call for demonstration purposes
    // In a real implementation, use the actual API
    setTimeout(() => {
        // Sample customer data (would come from the API)
        const allCustomers = [
            {
                CustomerID: 'CUST001',
                CustomerName: 'John Smith',
                Email: 'john.smith@example.com',
                Phone: '555-123-4567',
                SalesRepID: 'SR001',
                SalesRepName: 'Emily Johnson',
                Status: 'Active',
                LastUpdated: '2025-05-15T10:30:00Z'
            },
            {
                CustomerID: 'CUST002',
                CustomerName: 'Jane Doe',
                Email: 'jane.doe@example.com',
                Phone: '555-987-6543',
                SalesRepID: 'SR003',
                SalesRepName: 'Maria Garcia',
                Status: 'Hot Lead',
                LastUpdated: '2025-05-16T14:45:00Z'
            },
            {
                CustomerID: 'CUST003',
                CustomerName: 'Bob Johnson',
                Email: 'bob.johnson@example.com',
                Phone: '555-456-7890',
                SalesRepID: 'SR002',
                SalesRepName: 'David Lee',
                Status: 'Pending',
                LastUpdated: '2025-05-18T09:15:00Z'
            },
            {
                CustomerID: 'CUST004',
                CustomerName: 'Sarah Williams',
                Email: 'sarah.williams@example.com',
                Phone: '555-321-6547',
                SalesRepID: 'SR001',
                SalesRepName: 'Emily Johnson',
                Status: 'Active',
                LastUpdated: '2025-05-14T13:20:00Z'
            },
            {
                CustomerID: 'CUST005',
                CustomerName: 'Michael Brown',
                Email: 'michael.brown@example.com',
                Phone: '555-654-3210',
                SalesRepID: 'SR004',
                SalesRepName: 'James Wilson',
                Status: 'Inactive',
                LastUpdated: '2025-05-10T11:05:00Z'
            }
        ];
        
        // Filter customers by the search term
        const filteredCustomers = allCustomers.filter(customer => 
            customer.CustomerID.toLowerCase().includes(searchTerm) ||
            customer.CustomerName.toLowerCase().includes(searchTerm) ||
            customer.Email.toLowerCase().includes(searchTerm) ||
            customer.Phone.toLowerCase().includes(searchTerm)
        );
        
        displayCustomers(filteredCustomers);
        
        /* In a real implementation, use the actual API:
        $.ajax({
            url: `${API_URL}/customers?search=${encodeURIComponent(searchTerm)}`,
            method: 'GET',
            success: function(data) {
                displayCustomers(data);
            },
            error: function(error) {
                console.error('Error searching customers:', error);
                $('#customers-table-body').html('<tr><td colspan="7" class="text-center"><div class="alert alert-danger">Error searching customers. Please try again later.</div></td></tr>');
            }
        });
        */
    }, 600);
}

// Display customers in the table
function displayCustomers(customers) {
    if (!customers || customers.length === 0) {
        $('#customers-table-body').html('<tr><td colspan="7" class="text-center">No customers found.</td></tr>');
        return;
    }
    
    let html = '';
    customers.forEach(customer => {
        // Determine status badge class
        let statusClass = '';
        switch(customer.Status) {
            case 'Active':
                statusClass = 'badge-success';
                break;
            case 'Pending':
                statusClass = 'badge-warning';
                break;
            case 'Inactive':
                statusClass = 'badge-secondary';
                break;
            case 'Hot Lead':
                statusClass = 'badge-danger';
                break;
            default:
                statusClass = 'badge-info';
        }
        
        html += `
            <tr>
                <td>${customer.CustomerID}</td>
                <td>${customer.CustomerName}</td>
                <td>${customer.Email}</td>
                <td>${customer.Phone || '-'}</td>
                <td>${customer.SalesRepName}</td>
                <td><span class="badge ${statusClass}">${customer.Status}</span></td>
                <td>
                    <button class="btn btn-sm btn-info view-customer-btn" data-customer-id="${customer.CustomerID}">
                        <i class="fas fa-eye"></i> View
                    </button>
                </td>
            </tr>
        `;
    });
    
    $('#customers-table-body').html(html);
}

// View customer details
function viewCustomerDetails(customerId) {
    // Simulate API call for customer details
    // In a real implementation, use the actual API
    setTimeout(() => {
        // Sample customer data (would come from the API)
        const customers = {
            'CUST001': {
                CustomerID: 'CUST001',
                CustomerName: 'John Smith',
                Email: 'john.smith@example.com',
                Phone: '555-123-4567',
                Address: '123 Main St, Anytown, USA',
                SalesRepID: 'SR001',
                SalesRepName: 'Emily Johnson',
                Status: 'Active',
                LastContact: '2025-05-15T10:30:00Z',
                Notes: 'Interested in new laptop models. Follow up next week.',
                LastUpdated: '2025-05-15T10:30:00Z'
            },
            'CUST002': {
                CustomerID: 'CUST002',
                CustomerName: 'Jane Doe',
                Email: 'jane.doe@example.com',
                Phone: '555-987-6543',
                Address: '456 Oak Ave, Somewhere, USA',
                SalesRepID: 'SR003',
                SalesRepName: 'Maria Garcia',
                Status: 'Hot Lead',
                LastContact: '2025-05-16T14:45:00Z',
                Notes: 'Looking to purchase office furniture for new location. Scheduled demo for next Monday.',
                LastUpdated: '2025-05-16T14:45:00Z'
            },
            'CUST003': {
                CustomerID: 'CUST003',
                CustomerName: 'Bob Johnson',
                Email: 'bob.johnson@example.com',
                Phone: '555-456-7890',
                Address: '789 Pine Rd, Nowhere, USA',
                SalesRepID: 'SR002',
                SalesRepName: 'David Lee',
                Status: 'Pending',
                LastContact: '2025-05-18T09:15:00Z',
                Notes: 'Considering wireless headphones for entire team. Needs price quote.',
                LastUpdated: '2025-05-18T09:15:00Z'
            },
            'CUST004': {
                CustomerID: 'CUST004',
                CustomerName: 'Sarah Williams',
                Email: 'sarah.williams@example.com',
                Phone: '555-321-6547',
                Address: '321 Maple Dr, Anyplace, USA',
                SalesRepID: 'SR001',
                SalesRepName: 'Emily Johnson',
                Status: 'Active',
                LastContact: '2025-05-14T13:20:00Z',
                Notes: 'Regular customer. Just purchased new TV. May be interested in sound system upgrade.',
                LastUpdated: '2025-05-14T13:20:00Z'
            },
            'CUST005': {
                CustomerID: 'CUST005',
                CustomerName: 'Michael Brown',
                Email: 'michael.brown@example.com',
                Phone: '555-654-3210',
                Address: '654 Cedar Ln, Somewhere, USA',
                SalesRepID: 'SR004',
                SalesRepName: 'James Wilson',
                Status: 'Inactive',
                LastContact: '2025-05-10T11:05:00Z',
                Notes: 'No purchases in last 6 months. Consider special promotion to re-engage.',
                LastUpdated: '2025-05-10T11:05:00Z'
            }
        };
        
        const customer = customers[customerId];
        
        if (customer) {
            // Populate customer details modal
            $('#customerDetailsTitle').text(`Customer: ${customer.CustomerName}`);
            $('#detail-customer-id').text(customer.CustomerID);
            $('#detail-customer-name').text(customer.CustomerName);
            $('#detail-customer-email').text(customer.Email);
            $('#detail-customer-phone').text(customer.Phone || '-');
            $('#detail-customer-address').text(customer.Address || '-');
            $('#detail-sales-rep').text(customer.SalesRepName);
            
            // Set status badge
            let statusClass = '';
            switch(customer.Status) {
                case 'Active':
                    statusClass = 'badge-success';
                    break;
                case 'Pending':
                    statusClass = 'badge-warning';
                    break;
                case 'Inactive':
                    statusClass = 'badge-secondary';
                    break;
                case 'Hot Lead':
                    statusClass = 'badge-danger';
                    break;
                default:
                    statusClass = 'badge-info';
            }
            $('#detail-status').text(customer.Status).removeClass().addClass(`badge ${statusClass}`);
            
            // Set last contact date
            $('#detail-last-contact').text(formatDate(customer.LastContact));
            
            // Set customer status dropdown
            $('#update-status').val(customer.Status);
            
            // Set notes
            $('#customer-notes').val(customer.Notes);
            
            // Store customer ID for update operations
            $('#customerDetailsModal').data('customer-id', customer.CustomerID);
            $('#customerDetailsModal').data('sales-rep-id', customer.SalesRepID);
            
            // Load customer's recent sales
            loadCustomerSales(customerId);
            
            // Show the modal
            $('#customerDetailsModal').modal('show');
        } else {
            alert('Customer details not found.');
        }
        
        /* In a real implementation, use the actual API:
        $.ajax({
            url: `${API_URL}/customers/${customerId}`,
            method: 'GET',
            success: function(customer) {
                // Populate customer details modal
                $('#customerDetailsTitle').text(`Customer: ${customer.CustomerName}`);
                $('#detail-customer-id').text(customer.CustomerID);
                $('#detail-customer-name').text(customer.CustomerName);
                $('#detail-customer-email').text(customer.Email);
                $('#detail-customer-phone').text(customer.Phone || '-');
                $('#detail-customer-address').text(customer.Address || '-');
                $('#detail-sales-rep').text(customer.SalesRepName);
                
                // Set status badge
                let statusClass = '';
                switch(customer.Status) {
                    case 'Active':
                        statusClass = 'badge-success';
                        break;
                    case 'Pending':
                        statusClass = 'badge-warning';
                        break;
                    case 'Inactive':
                        statusClass = 'badge-secondary';
                        break;
                    case 'Hot Lead':
                        statusClass = 'badge-danger';
                        break;
                    default:
                        statusClass = 'badge-info';
                }
                $('#detail-status').text(customer.Status).removeClass().addClass(`badge ${statusClass}`);
                
                // Set last contact date
                $('#detail-last-contact').text(formatDate(customer.LastContact));
                
                // Set customer status dropdown
                $('#update-status').val(customer.Status);
                
                // Set notes
                $('#customer-notes').val(customer.Notes);
                
                // Store customer ID for update operations
                $('#customerDetailsModal').data('customer-id', customer.CustomerID);
                $('#customerDetailsModal').data('sales-rep-id', customer.SalesRepID);
                
                // Load customer's recent sales
                loadCustomerSales(customerId);
                
                // Show the modal
                $('#customerDetailsModal').modal('show');
            },
            error: function(error) {
                console.error('Error loading customer details:', error);
                alert('Error loading customer details. Please try again later.');
            }
        });
        */
    }, 300);
}

// Load customer's recent sales
function loadCustomerSales(customerId) {
    // Simulate API call for customer sales
    // In a real implementation, use the actual API
    setTimeout(() => {
        // Sample sales data (would come from the API)
        const customerSales = [
            { saleId: 'SALE-125478', date: '2025-05-19T14:35:00Z', amount: 1899.98, status: 'Completed' },
            { saleId: 'SALE-125450', date: '2025-05-10T11:22:00Z', amount: 599.99, status: 'Completed' },
            { saleId: 'SALE-125432', date: '2025-04-28T16:45:00Z', amount: 289.97, status: 'Completed' },
            { saleId: 'SALE-125415', date: '2025-04-15T10:15:00Z', amount: 1349.98, status: 'Completed' }
        ];
        
        let salesHtml = '';
        if (customerSales.length === 0) {
            salesHtml = '<tr><td colspan="4" class="text-center">No sales found for this customer.</td></tr>';
        } else {
            customerSales.forEach(sale => {
                let statusClass = '';
                switch(sale.status) {
                    case 'Completed':
                        statusClass = 'badge-success';
                        break;
                    case 'Pending':
                        statusClass = 'badge-warning';
                        break;
                    case 'Cancelled':
                        statusClass = 'badge-danger';
                        break;
                    default:
                        statusClass = 'badge-secondary';
                }
                
                salesHtml += `
                    <tr>
                        <td>${sale.saleId}</td>
                        <td>${formatDate(sale.date)}</td>
                        <td>${formatCurrency(sale.amount)}</td>
                        <td><span class="badge ${statusClass}">${sale.status}</span></td>
                    </tr>
                `;
            });
        }
        
        $('#customer-sales-table').html(salesHtml);
        
        /* In a real implementation, use the actual API:
        $.ajax({
            url: `${API_URL}/sales?customerId=${customerId}`,
            method: 'GET',
            success: function(data) {
                let salesHtml = '';
                if (data.length === 0) {
                    salesHtml = '<tr><td colspan="4" class="text-center">No sales found for this customer.</td></tr>';
                } else {
                    data.forEach(sale => {
                        let statusClass = '';
                        switch(sale.status) {
                            case 'Completed':
                                statusClass = 'badge-success';
                                break;
                            case 'Pending':
                                statusClass = 'badge-warning';
                                break;
                            case 'Cancelled':
                                statusClass = 'badge-danger';
                                break;
                            default:
                                statusClass = 'badge-secondary';
                        }
                        
                        salesHtml += `
                            <tr>
                                <td>${sale.saleId}</td>
                                <td>${formatDate(sale.date)}</td>
                                <td>${formatCurrency(sale.amount)}</td>
                                <td><span class="badge ${statusClass}">${sale.status}</span></td>
                            </tr>
                        `;
                    });
                }
                
                $('#customer-sales-table').html(salesHtml);
            },
            error: function(error) {
                console.error('Error loading customer sales:', error);
                $('#customer-sales-table').html('<tr><td colspan="4" class="text-center">Error loading sales data.</td></tr>');
            }
        });
        */
    }, 500);
}

// Save a new customer
function saveNewCustomer() {
    // Get form values
    const customerName = $('#customer-name').val();
    const customerEmail = $('#customer-email').val();
    const customerPhone = $('#customer-phone').val();
    const customerAddress = $('#customer-address').val();
    const salesRepId = $('#assigned-sales-rep').val();
    
    // Validate required fields
    if (!customerName || !customerEmail || !salesRepId) {
        alert('Please fill in all required fields (Name, Email, and Sales Representative).');
        return;
    }
    
    // Get sales rep name from the dropdown
    const salesRepName = $('#assigned-sales-rep option:selected').text();
    
    // Prepare the data to send to the API
    const customerData = {
        customerName: customerName,
        email: customerEmail,
        phone: customerPhone,
        address: customerAddress,
        salesRepId: salesRepId,
        salesRepName: salesRepName,
        status: 'Active' // Default status for new customers
    };
    
    // Simulate API call for demonstration purposes
    // In a real implementation, use the actual API
    setTimeout(() => {
        // Generate a customer ID (would be done by the API in a real implementation)
        const customerId = 'CUST' + Math.floor(Math.random() * 9000 + 1000);
        
        alert(`Customer ${customerName} has been successfully added with ID: ${customerId}`);
        
        // Close the modal and reset the form
        $('#addCustomerModal').modal('hide');
        $('#add-customer-form')[0].reset();
        
        // Reload the customers table
        loadCustomers();
        
        /* In a real implementation, use the actual API:
        $.ajax({
            url: `${API_URL}/assignments`,
            method: 'POST',
            data: JSON.stringify(customerData),
            contentType: 'application/json',
            success: function(response) {
                alert(`Customer ${customerName} has been successfully added.`);
                
                // Close the modal and reset the form
                $('#addCustomerModal').modal('hide');
                $('#add-customer-form')[0].reset();
                
                // Reload the customers table
                loadCustomers();
            },
            error: function(error) {
                console.error('Error adding customer:', error);
                alert('Error adding customer. Please try again later.');
            }
        });
        */
    }, 1000);
}

// Update customer status
function updateCustomerStatus() {
    const customerId = $('#customerDetailsModal').data('customer-id');
    const salesRepId = $('#customerDetailsModal').data('sales-rep-id');
    const newStatus = $('#update-status').val();
    
    if (!customerId || !salesRepId || !newStatus) {
        alert('Missing required information to update status.');
        return;
    }
    
    // Prepare the data to send to the API
    const updateData = {
        salesRepId: salesRepId,
        status: newStatus,
        notes: $('#customer-notes').val()
    };
    
    // Simulate API call for demonstration purposes
    // In a real implementation, use the actual API
    setTimeout(() => {
        // Update the status badge in the modal
        let statusClass = '';
        switch(newStatus) {
            case 'Active':
                statusClass = 'badge-success';
                break;
            case 'Pending':
                statusClass = 'badge-warning';
                break;
            case 'Inactive':
                statusClass = 'badge-secondary';
                break;
            case 'Hot Lead':
                statusClass = 'badge-danger';
                break;
            default:
                statusClass = 'badge-info';
        }
        $('#detail-status').text(newStatus).removeClass().addClass(`badge ${statusClass}`);
        
        alert('Customer status has been updated successfully.');
        
        // Reload the customers table to reflect the change
        loadCustomers();
        
        /* In a real implementation, use the actual API:
        $.ajax({
            url: `${API_URL}/customers/${customerId}`,
            method: 'PUT',
            data: JSON.stringify(updateData),
            contentType: 'application/json',
            success: function(response) {
                // Update the status badge in the modal
                let statusClass = '';
                switch(newStatus) {
                    case 'Active':
                        statusClass = 'badge-success';
                        break;
                    case 'Pending':
                        statusClass = 'badge-warning';
                        break;
                    case 'Inactive':
                        statusClass = 'badge-secondary';
                        break;
                    case 'Hot Lead':
                        statusClass = 'badge-danger';
                        break;
                    default:
                        statusClass = 'badge-info';
                }
                $('#detail-status').text(newStatus).removeClass().addClass(`badge ${statusClass}`);
                
                alert('Customer status has been updated successfully.');
                
                // Reload the customers table to reflect the change
                loadCustomers();
            },
            error: function(error) {
                console.error('Error updating customer status:', error);
                alert('Error updating customer status. Please try again later.');
            }
        });
        */
    }, 800);
}

// Save customer notes
function saveCustomerNotes() {
    const customerId = $('#customerDetailsModal').data('customer-id');
    const salesRepId = $('#customerDetailsModal').data('sales-rep-id');
    const notes = $('#customer-notes').val();
    
    if (!customerId || !salesRepId) {
        alert('Missing required information to save notes.');
        return;
    }
    
    // Prepare the data to send to the API
    const updateData = {
        salesRepId: salesRepId,
        notes: notes
    };
    
    // Simulate API call for demonstration purposes
    // In a real implementation, use the actual API
    setTimeout(() => {
        alert('Customer notes have been saved successfully.');
        
        /* In a real implementation, use the actual API:
        $.ajax({
            url: `${API_URL}/customers/${customerId}/notes`,
            method: 'PUT',
            data: JSON.stringify(updateData),
            contentType: 'application/json',
            success: function(response) {
                alert('Customer notes have been saved successfully.');
            },
            error: function(error) {
                console.error('Error saving customer notes:', error);
                alert('Error saving customer notes. Please try again later.');
            }
        });
        */
    }, 500);
}
