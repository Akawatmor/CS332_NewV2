// SalePoint Solution - Customers Module
class CustomersManager {
    constructor() {
        this.customers = [];
        this.filteredCustomers = [];
        this.currentPage = 1;
        this.pageSize = 10;
        this.totalPages = 0;
        this.sortColumn = 'id';
        this.sortDirection = 'asc';
        this.searchTerm = '';
        this.statusFilter = '';
        this.isLoading = false;
    }

    /**
     * Initialize customers module
     */
    async init() {
        await this.loadCustomers();
        this.setupEventListeners();
        this.setupValidation();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Add Customer button
        document.getElementById('addCustomerBtn')?.addEventListener('click', () => {
            this.showCustomerModal();
        });

        // Search input
        document.getElementById('customerSearch')?.addEventListener('input', (e) => {
            this.searchTerm = e.target.value;
            this.applyFilters();
        });

        // Status filter
        document.getElementById('statusFilter')?.addEventListener('change', (e) => {
            this.statusFilter = e.target.value;
            this.applyFilters();
        });

        // Page size selector
        document.getElementById('pageSize')?.addEventListener('change', (e) => {
            this.pageSize = parseInt(e.target.value);
            this.currentPage = 1;
            this.renderTable();
            this.renderPagination();
        });

        // Refresh button
        document.getElementById('refreshCustomers')?.addEventListener('click', () => {
            this.loadCustomers();
        });

        // Bulk delete button
        document.getElementById('bulkDeleteBtn')?.addEventListener('click', () => {
            this.handleBulkDelete();
        });

        // Select all checkbox
        document.getElementById('selectAllCustomers')?.addEventListener('change', (e) => {
            this.handleSelectAll(e.target.checked);
        });

        // Customer form submission
        document.getElementById('customerForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCustomerSubmit();
        });

        // Export button
        document.getElementById('exportCustomers')?.addEventListener('click', () => {
            this.exportCustomers();
        });

        // Assign sales rep button
        document.getElementById('assignSalesRepBtn')?.addEventListener('click', () => {
            this.showAssignSalesRepModal();
        });
    }

    /**
     * Setup form validation
     */
    setupValidation() {
        const form = document.getElementById('customerForm');
        if (!form) return;

        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearFieldError(input));
        });
    }

    /**
     * Load customers from API
     */
    async loadCustomers() {
        if (this.isLoading) return;

        this.isLoading = true;
        this.showLoading();

        try {
            const response = await window.api.getCustomers({
                page: this.currentPage,
                pageSize: this.pageSize,
                search: this.searchTerm,
                status: this.statusFilter,
                sortColumn: this.sortColumn,
                sortDirection: this.sortDirection
            });

            this.customers = response.customers || [];
            this.totalPages = response.totalPages || 1;
            this.applyFilters();
            this.showSuccess('Customers loaded successfully');
        } catch (error) {
            console.error('Customers load error:', error);
            this.showError('Failed to load customers: ' + error.message);
        } finally {
            this.isLoading = false;
            this.hideLoading();
        }
    }

    /**
     * Apply filters to customers
     */
    applyFilters() {
        let filtered = [...this.customers];

        // Apply search filter
        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            filtered = filtered.filter(customer => 
                customer.name.toLowerCase().includes(term) ||
                customer.email.toLowerCase().includes(term) ||
                customer.phone.toLowerCase().includes(term) ||
                customer.company.toLowerCase().includes(term)
            );
        }

        // Apply status filter
        if (this.statusFilter) {
            filtered = filtered.filter(customer => 
                customer.status === this.statusFilter
            );
        }

        this.filteredCustomers = filtered;
        this.currentPage = 1;
        this.totalPages = Math.ceil(filtered.length / this.pageSize);
        
        this.renderTable();
        this.renderPagination();
        this.updateResultsCount();
    }

    /**
     * Sort customers by column
     */
    sortCustomers(column) {
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }

        this.filteredCustomers.sort((a, b) => {
            let aValue = a[column];
            let bValue = b[column];

            // Handle different data types
            if (column === 'id') {
                aValue = parseInt(aValue);
                bValue = parseInt(bValue);
            } else if (column === 'created_at') {
                aValue = new Date(aValue);
                bValue = new Date(bValue);
            } else {
                aValue = String(aValue).toLowerCase();
                bValue = String(bValue).toLowerCase();
            }

            if (aValue < bValue) return this.sortDirection === 'asc' ? -1 : 1;
            if (aValue > bValue) return this.sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        this.renderTable();
        this.updateSortIndicators();
    }

    /**
     * Update sort indicators in table headers
     */
    updateSortIndicators() {
        const headers = document.querySelectorAll('[data-sort]');
        headers.forEach(header => {
            header.classList.remove('sort-asc', 'sort-desc');
            if (header.dataset.sort === this.sortColumn) {
                header.classList.add(`sort-${this.sortDirection}`);
            }
        });
    }

    /**
     * Render customers table
     */
    renderTable() {
        const tbody = document.querySelector('#customersTable tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        const pageCustomers = this.filteredCustomers.slice(startIndex, endIndex);

        if (pageCustomers.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-muted py-4">
                        No customers found
                    </td>
                </tr>
            `;
            return;
        }

        pageCustomers.forEach(customer => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <input type="checkbox" class="form-check-input customer-checkbox" 
                           value="${customer.id}" data-customer-id="${customer.id}">
                </td>
                <td>${customer.id}</td>
                <td>${this.escapeHtml(customer.name)}</td>
                <td>${this.escapeHtml(customer.email)}</td>
                <td>${this.escapeHtml(customer.phone)}</td>
                <td>${this.escapeHtml(customer.company || 'N/A')}</td>
                <td>
                    <span class="badge badge-${customer.status === 'active' ? 'success' : 'secondary'}">
                        ${customer.status}
                    </span>
                </td>
                <td>
                    <button type="button" class="btn btn-sm btn-primary me-1" 
                            onclick="customersManager.showCustomerModal(${customer.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-info me-1" 
                            onclick="customersManager.viewCustomer(${customer.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-warning me-1" 
                            onclick="customersManager.showSalesHistory(${customer.id})">
                        <i class="fas fa-shopping-cart"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-danger" 
                            onclick="customersManager.deleteCustomer(${customer.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);

            // Add click event for checkbox change
            const checkbox = row.querySelector('.customer-checkbox');
            checkbox.addEventListener('change', () => {
                this.updateBulkActionButtons();
            });
        });

        // Setup sorting for table headers
        this.setupTableSorting();
    }

    /**
     * Setup table sorting
     */
    setupTableSorting() {
        const headers = document.querySelectorAll('[data-sort]');
        headers.forEach(header => {
            header.style.cursor = 'pointer';
            header.addEventListener('click', () => {
                this.sortCustomers(header.dataset.sort);
            });
        });
    }

    /**
     * Render pagination
     */
    renderPagination() {
        const pagination = document.getElementById('customersPagination');
        if (!pagination) return;

        pagination.innerHTML = '';

        if (this.totalPages <= 1) return;

        // Previous button
        const prevBtn = document.createElement('li');
        prevBtn.className = `page-item ${this.currentPage === 1 ? 'disabled' : ''}`;
        prevBtn.innerHTML = `
            <a class="page-link" href="#" data-page="${this.currentPage - 1}">
                <i class="fas fa-chevron-left"></i>
            </a>
        `;
        pagination.appendChild(prevBtn);

        // Page numbers
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(this.totalPages, this.currentPage + 2);

        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('li');
            pageBtn.className = `page-item ${this.currentPage === i ? 'active' : ''}`;
            pageBtn.innerHTML = `<a class="page-link" href="#" data-page="${i}">${i}</a>`;
            pagination.appendChild(pageBtn);
        }

        // Next button
        const nextBtn = document.createElement('li');
        nextBtn.className = `page-item ${this.currentPage === this.totalPages ? 'disabled' : ''}`;
        nextBtn.innerHTML = `
            <a class="page-link" href="#" data-page="${this.currentPage + 1}">
                <i class="fas fa-chevron-right"></i>
            </a>
        `;
        pagination.appendChild(nextBtn);

        // Add click event listeners
        pagination.addEventListener('click', (e) => {
            e.preventDefault();
            if (e.target.closest('.page-link')) {
                const page = parseInt(e.target.closest('.page-link').dataset.page);
                if (page && page !== this.currentPage && page >= 1 && page <= this.totalPages) {
                    this.currentPage = page;
                    this.renderTable();
                    this.renderPagination();
                }
            }
        });
    }

    /**
     * Update results count display
     */
    updateResultsCount() {
        const countElement = document.getElementById('customersCount');
        if (countElement) {
            const startIndex = (this.currentPage - 1) * this.pageSize + 1;
            const endIndex = Math.min(this.currentPage * this.pageSize, this.filteredCustomers.length);
            countElement.textContent = `Showing ${startIndex}-${endIndex} of ${this.filteredCustomers.length} customers`;
        }
    }

    /**
     * Show customer modal for add/edit
     */
    showCustomerModal(customerId = null) {
        const modal = new bootstrap.Modal(document.getElementById('customerModal'));
        const form = document.getElementById('customerForm');
        const title = document.getElementById('customerModalLabel');

        if (customerId) {
            // Edit mode
            const customer = this.customers.find(c => c.id === customerId);
            if (customer) {
                title.textContent = 'Edit Customer';
                this.populateCustomerForm(customer);
            }
        } else {
            // Add mode
            title.textContent = 'Add New Customer';
            form.reset();
            this.clearFormErrors();
        }

        modal.show();
    }

    /**
     * Populate customer form with data
     */
    populateCustomerForm(customer) {
        const form = document.getElementById('customerForm');
        if (!form) return;

        form.customer_id.value = customer.id || '';
        form.customer_name.value = customer.name || '';
        form.email.value = customer.email || '';
        form.phone.value = customer.phone || '';
        form.company.value = customer.company || '';
        form.address.value = customer.address || '';
        form.city.value = customer.city || '';
        form.state.value = customer.state || '';
        form.zip_code.value = customer.zip_code || '';
        form.status.value = customer.status || 'active';
    }

    /**
     * Handle customer form submission
     */
    async handleCustomerSubmit() {
        const form = document.getElementById('customerForm');
        if (!form || !this.validateForm()) return;

        const formData = new FormData(form);
        const customerData = {
            name: formData.get('customer_name'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            company: formData.get('company'),
            address: formData.get('address'),
            city: formData.get('city'),
            state: formData.get('state'),
            zip_code: formData.get('zip_code'),
            status: formData.get('status')
        };

        const customerId = formData.get('customer_id');
        const isEdit = customerId && customerId !== '';

        try {
            let response;
            if (isEdit) {
                response = await window.api.updateCustomer(customerId, customerData);
                this.showSuccess('Customer updated successfully');
            } else {
                response = await window.api.createCustomer(customerData);
                this.showSuccess('Customer created successfully');
            }

            // Close modal and refresh data
            const modal = bootstrap.Modal.getInstance(document.getElementById('customerModal'));
            modal.hide();
            await this.loadCustomers();

        } catch (error) {
            console.error('Customer save error:', error);
            this.showError('Failed to save customer: ' + error.message);
        }
    }

    /**
     * View customer details
     */
    viewCustomer(customerId) {
        const customer = this.customers.find(c => c.id === customerId);
        if (!customer) return;

        const modal = new bootstrap.Modal(document.getElementById('customerViewModal'));
        const content = document.getElementById('customerViewContent');

        content.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <h6>Contact Information</h6>
                    <table class="table table-borderless">
                        <tr><td><strong>ID:</strong></td><td>${customer.id}</td></tr>
                        <tr><td><strong>Name:</strong></td><td>${this.escapeHtml(customer.name)}</td></tr>
                        <tr><td><strong>Email:</strong></td><td>${this.escapeHtml(customer.email)}</td></tr>
                        <tr><td><strong>Phone:</strong></td><td>${this.escapeHtml(customer.phone)}</td></tr>
                        <tr><td><strong>Company:</strong></td><td>${this.escapeHtml(customer.company || 'N/A')}</td></tr>
                        <tr><td><strong>Status:</strong></td><td>
                            <span class="badge badge-${customer.status === 'active' ? 'success' : 'secondary'}">
                                ${customer.status}
                            </span>
                        </td></tr>
                    </table>
                </div>
                <div class="col-md-6">
                    <h6>Address Information</h6>
                    <table class="table table-borderless">
                        <tr><td><strong>Address:</strong></td><td>${this.escapeHtml(customer.address || 'N/A')}</td></tr>
                        <tr><td><strong>City:</strong></td><td>${this.escapeHtml(customer.city || 'N/A')}</td></tr>
                        <tr><td><strong>State:</strong></td><td>${this.escapeHtml(customer.state || 'N/A')}</td></tr>
                        <tr><td><strong>ZIP Code:</strong></td><td>${this.escapeHtml(customer.zip_code || 'N/A')}</td></tr>
                        <tr><td><strong>Created:</strong></td><td>${window.ConfigHelper.formatDate(customer.created_at)}</td></tr>
                    </table>
                </div>
            </div>
        `;

        modal.show();
    }

    /**
     * Show sales history for customer
     */
    async showSalesHistory(customerId) {
        const customer = this.customers.find(c => c.id === customerId);
        if (!customer) return;

        try {
            const salesData = await window.api.getSales({ customer_id: customerId });
            const modal = new bootstrap.Modal(document.getElementById('salesHistoryModal'));
            const content = document.getElementById('salesHistoryContent');
            const title = document.getElementById('salesHistoryTitle');

            title.textContent = `Sales History - ${customer.name}`;

            if (salesData.sales && salesData.sales.length > 0) {
                let tableHtml = `
                    <table class="table table-striped">
                        <thead>
                            <tr>
                                <th>Sale ID</th>
                                <th>Date</th>
                                <th>Total Amount</th>
                                <th>Status</th>
                                <th>Sales Rep</th>
                            </tr>
                        </thead>
                        <tbody>
                `;

                salesData.sales.forEach(sale => {
                    tableHtml += `
                        <tr>
                            <td>#${sale.id}</td>
                            <td>${window.ConfigHelper.formatDate(sale.sale_date)}</td>
                            <td>${window.ConfigHelper.formatCurrency(sale.total_amount)}</td>
                            <td>
                                <span class="badge badge-${this.getSaleStatusBadgeClass(sale.status)}">
                                    ${sale.status}
                                </span>
                            </td>
                            <td>${sale.sales_rep_name || 'N/A'}</td>
                        </tr>
                    `;
                });

                tableHtml += '</tbody></table>';
                content.innerHTML = tableHtml;
            } else {
                content.innerHTML = '<p class="text-muted text-center py-4">No sales history found for this customer.</p>';
            }

            modal.show();
        } catch (error) {
            console.error('Sales history error:', error);
            this.showError('Failed to load sales history: ' + error.message);
        }
    }

    /**
     * Show assign sales rep modal
     */
    async showAssignSalesRepModal() {
        const selectedIds = this.getSelectedCustomerIds();
        if (selectedIds.length === 0) {
            this.showError('Please select customers to assign');
            return;
        }

        try {
            // Load sales representatives
            const salesRepsData = await window.api.getSalesReps();
            const modal = new bootstrap.Modal(document.getElementById('assignSalesRepModal'));
            const select = document.getElementById('salesRepSelect');

            // Populate sales reps dropdown
            select.innerHTML = '<option value="">Select Sales Representative</option>';
            salesRepsData.salesReps.forEach(rep => {
                const option = document.createElement('option');
                option.value = rep.id;
                option.textContent = `${rep.name} (${rep.email})`;
                select.appendChild(option);
            });

            // Update modal title
            const title = document.getElementById('assignSalesRepTitle');
            title.textContent = `Assign Sales Rep to ${selectedIds.length} Customer(s)`;

            modal.show();
        } catch (error) {
            console.error('Load sales reps error:', error);
            this.showError('Failed to load sales representatives: ' + error.message);
        }
    }

    /**
     * Handle sales rep assignment
     */
    async handleSalesRepAssignment() {
        const selectedCustomerIds = this.getSelectedCustomerIds();
        const salesRepId = document.getElementById('salesRepSelect').value;

        if (!salesRepId) {
            this.showError('Please select a sales representative');
            return;
        }

        try {
            await Promise.all(selectedCustomerIds.map(customerId => 
                window.api.assignCustomerToSalesRep({
                    customer_id: customerId,
                    sales_rep_id: salesRepId
                })
            ));

            this.showSuccess(`${selectedCustomerIds.length} customers assigned successfully`);
            
            // Close modal and refresh data
            const modal = bootstrap.Modal.getInstance(document.getElementById('assignSalesRepModal'));
            modal.hide();
            await this.loadCustomers();
        } catch (error) {
            console.error('Assignment error:', error);
            this.showError('Failed to assign sales representative: ' + error.message);
        }
    }

    /**
     * Delete customer
     */
    async deleteCustomer(customerId) {
        const customer = this.customers.find(c => c.id === customerId);
        if (!customer) return;

        const confirmed = confirm(`Are you sure you want to delete "${customer.name}"?`);
        if (!confirmed) return;

        try {
            await window.api.deleteCustomer(customerId);
            this.showSuccess('Customer deleted successfully');
            await this.loadCustomers();
        } catch (error) {
            console.error('Customer delete error:', error);
            this.showError('Failed to delete customer: ' + error.message);
        }
    }

    /**
     * Handle select all checkbox
     */
    handleSelectAll(checked) {
        const checkboxes = document.querySelectorAll('.customer-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
        });
        this.updateBulkActionButtons();
    }

    /**
     * Handle bulk delete
     */
    async handleBulkDelete() {
        const selectedIds = this.getSelectedCustomerIds();
        if (selectedIds.length === 0) {
            this.showError('Please select customers to delete');
            return;
        }

        const confirmed = confirm(`Are you sure you want to delete ${selectedIds.length} selected customers?`);
        if (!confirmed) return;

        try {
            await Promise.all(selectedIds.map(id => window.api.deleteCustomer(id)));
            this.showSuccess(`${selectedIds.length} customers deleted successfully`);
            await this.loadCustomers();
        } catch (error) {
            console.error('Bulk delete error:', error);
            this.showError('Failed to delete customers: ' + error.message);
        }
    }

    /**
     * Get selected customer IDs
     */
    getSelectedCustomerIds() {
        const checkboxes = document.querySelectorAll('.customer-checkbox:checked');
        return Array.from(checkboxes).map(cb => parseInt(cb.value));
    }

    /**
     * Update bulk action buttons
     */
    updateBulkActionButtons() {
        const selectedCount = this.getSelectedCustomerIds().length;
        const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
        const assignSalesRepBtn = document.getElementById('assignSalesRepBtn');
        
        if (bulkDeleteBtn) {
            bulkDeleteBtn.style.display = selectedCount > 0 ? 'inline-block' : 'none';
            bulkDeleteBtn.textContent = `Delete Selected (${selectedCount})`;
        }

        if (assignSalesRepBtn) {
            assignSalesRepBtn.style.display = selectedCount > 0 ? 'inline-block' : 'none';
            assignSalesRepBtn.textContent = `Assign Sales Rep (${selectedCount})`;
        }
    }

    /**
     * Export customers
     */
    async exportCustomers() {
        try {
            const data = this.filteredCustomers.map(customer => ({
                ID: customer.id,
                Name: customer.name,
                Email: customer.email,
                Phone: customer.phone,
                Company: customer.company || '',
                Address: customer.address || '',
                City: customer.city || '',
                State: customer.state || '',
                'ZIP Code': customer.zip_code || '',
                Status: customer.status,
                'Created Date': window.ConfigHelper.formatDate(customer.created_at)
            }));

            const csv = this.convertToCSV(data);
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `customers-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showSuccess('Customers exported successfully');
        } catch (error) {
            console.error('Export error:', error);
            this.showError('Failed to export customers: ' + error.message);
        }
    }

    /**
     * Convert array to CSV
     */
    convertToCSV(data) {
        if (data.length === 0) return '';

        const headers = Object.keys(data[0]);
        const csvRows = [headers.join(',')];

        data.forEach(row => {
            const values = headers.map(header => {
                const value = row[header];
                return `"${String(value).replace(/"/g, '""')}"`;
            });
            csvRows.push(values.join(','));
        });

        return csvRows.join('\n');
    }

    /**
     * Validate form
     */
    validateForm() {
        const form = document.getElementById('customerForm');
        if (!form) return false;

        let isValid = true;
        const fields = ['customer_name', 'email', 'phone'];

        fields.forEach(fieldName => {
            const field = form[fieldName];
            if (!this.validateField(field)) {
                isValid = false;
            }
        });

        return isValid;
    }

    /**
     * Validate individual field
     */
    validateField(field) {
        if (!field) return true;

        const value = field.value.trim();
        let isValid = true;
        let message = '';

        switch (field.name) {
            case 'customer_name':
                const nameValidation = window.ConfigHelper.validate('name', value);
                isValid = nameValidation.isValid;
                message = nameValidation.message;
                break;
            case 'email':
                const emailValidation = window.ConfigHelper.validate('email', value);
                isValid = emailValidation.isValid;
                message = emailValidation.message;
                break;
            case 'phone':
                const phoneValidation = window.ConfigHelper.validate('phone', value);
                isValid = phoneValidation.isValid;
                message = phoneValidation.message;
                break;
        }

        this.showFieldValidation(field, isValid, message);
        return isValid;
    }

    /**
     * Show field validation state
     */
    showFieldValidation(field, isValid, message) {
        field.classList.remove('is-valid', 'is-invalid');
        field.classList.add(isValid ? 'is-valid' : 'is-invalid');

        const feedback = field.parentNode.querySelector('.invalid-feedback');
        if (feedback) {
            feedback.textContent = message;
        }
    }

    /**
     * Clear field error
     */
    clearFieldError(field) {
        field.classList.remove('is-invalid');
        const feedback = field.parentNode.querySelector('.invalid-feedback');
        if (feedback) {
            feedback.textContent = '';
        }
    }

    /**
     * Clear all form errors
     */
    clearFormErrors() {
        const form = document.getElementById('customerForm');
        if (!form) return;

        const fields = form.querySelectorAll('.is-invalid, .is-valid');
        fields.forEach(field => {
            field.classList.remove('is-invalid', 'is-valid');
        });

        const feedbacks = form.querySelectorAll('.invalid-feedback');
        feedbacks.forEach(feedback => {
            feedback.textContent = '';
        });
    }

    /**
     * Get sale status badge class
     */
    getSaleStatusBadgeClass(status) {
        switch (status?.toLowerCase()) {
            case 'completed':
                return 'success';
            case 'pending':
                return 'warning';
            case 'cancelled':
                return 'danger';
            case 'processing':
                return 'info';
            default:
                return 'secondary';
        }
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Show loading state
     */
    showLoading() {
        const loadingElement = document.getElementById('customersLoading');
        if (loadingElement) {
            loadingElement.style.display = 'block';
        }
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        const loadingElement = document.getElementById('customersLoading');
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        this.showAlert(message, 'success');
    }

    /**
     * Show error message
     */
    showError(message) {
        this.showAlert(message, 'danger');
    }

    /**
     * Show alert message
     */
    showAlert(message, type = 'info') {
        const existingAlerts = document.querySelectorAll('.customers-alert');
        existingAlerts.forEach(alert => alert.remove());

        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show customers-alert`;
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        const customersSection = document.getElementById('customers');
        if (customersSection) {
            customersSection.insertBefore(alert, customersSection.firstChild);
        }

        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 5000);
    }
}

// Create global instance
const customersManager = new CustomersManager();

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CustomersManager;
} else if (typeof window !== 'undefined') {
    window.CustomersManager = CustomersManager;
    window.customersManager = customersManager;
}
