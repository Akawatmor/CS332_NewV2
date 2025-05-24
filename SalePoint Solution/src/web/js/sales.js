// SalePoint Solution - Sales Module
class SalesManager {
    constructor() {
        this.sales = [];
        this.filteredSales = [];
        this.customers = [];
        this.products = [];
        this.salesReps = [];
        this.currentPage = 1;
        this.pageSize = 10;
        this.totalPages = 0;
        this.sortColumn = 'id';
        this.sortDirection = 'desc';
        this.searchTerm = '';
        this.statusFilter = '';
        this.dateRangeFilter = '';
        this.salesRepFilter = '';
        this.isLoading = false;
        this.saleItems = [];
    }

    /**
     * Initialize sales module
     */
    async init() {
        await Promise.all([
            this.loadSales(),
            this.loadCustomers(),
            this.loadProducts(),
            this.loadSalesReps()
        ]);
        this.setupEventListeners();
        this.setupValidation();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Add Sale button
        document.getElementById('addSaleBtn')?.addEventListener('click', () => {
            this.showSaleModal();
        });

        // Search input
        document.getElementById('saleSearch')?.addEventListener('input', (e) => {
            this.searchTerm = e.target.value;
            this.applyFilters();
        });

        // Status filter
        document.getElementById('statusFilter')?.addEventListener('change', (e) => {
            this.statusFilter = e.target.value;
            this.applyFilters();
        });

        // Date range filter
        document.getElementById('dateRangeFilter')?.addEventListener('change', (e) => {
            this.dateRangeFilter = e.target.value;
            this.applyFilters();
        });

        // Sales rep filter
        document.getElementById('salesRepFilter')?.addEventListener('change', (e) => {
            this.salesRepFilter = e.target.value;
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
        document.getElementById('refreshSales')?.addEventListener('click', () => {
            this.loadSales();
        });

        // Bulk delete button
        document.getElementById('bulkDeleteBtn')?.addEventListener('click', () => {
            this.handleBulkDelete();
        });

        // Select all checkbox
        document.getElementById('selectAllSales')?.addEventListener('change', (e) => {
            this.handleSelectAll(e.target.checked);
        });

        // Sale form submission
        document.getElementById('saleForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSaleSubmit();
        });

        // Add item button
        document.getElementById('addItemBtn')?.addEventListener('click', () => {
            this.addSaleItem();
        });

        // Export button
        document.getElementById('exportSales')?.addEventListener('click', () => {
            this.exportSales();
        });

        // Customer selection change
        document.getElementById('customer_id')?.addEventListener('change', (e) => {
            this.handleCustomerChange(e.target.value);
        });
    }

    /**
     * Setup form validation
     */
    setupValidation() {
        const form = document.getElementById('saleForm');
        if (!form) return;

        const inputs = form.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearFieldError(input));
        });
    }

    /**
     * Load sales from API
     */
    async loadSales() {
        if (this.isLoading) return;

        this.isLoading = true;
        this.showLoading();

        try {
            const response = await window.api.getSales({
                page: this.currentPage,
                pageSize: this.pageSize,
                search: this.searchTerm,
                status: this.statusFilter,
                dateRange: this.dateRangeFilter,
                salesRep: this.salesRepFilter,
                sortColumn: this.sortColumn,
                sortDirection: this.sortDirection
            });

            this.sales = response.sales || [];
            this.totalPages = response.totalPages || 1;
            this.applyFilters();
            this.showSuccess('Sales loaded successfully');
        } catch (error) {
            console.error('Sales load error:', error);
            this.showError('Failed to load sales: ' + error.message);
        } finally {
            this.isLoading = false;
            this.hideLoading();
        }
    }

    /**
     * Load customers
     */
    async loadCustomers() {
        try {
            const response = await window.api.getCustomers();
            this.customers = response.customers || [];
            this.populateCustomerDropdown();
        } catch (error) {
            console.error('Customers load error:', error);
        }
    }

    /**
     * Load products
     */
    async loadProducts() {
        try {
            const response = await window.api.getProducts();
            this.products = response.products || [];
        } catch (error) {
            console.error('Products load error:', error);
        }
    }

    /**
     * Load sales representatives
     */
    async loadSalesReps() {
        try {
            const response = await window.api.getSalesReps();
            this.salesReps = response.salesReps || [];
            this.populateSalesRepDropdown();
            this.populateSalesRepFilter();
        } catch (error) {
            console.error('Sales reps load error:', error);
        }
    }

    /**
     * Populate customer dropdown
     */
    populateCustomerDropdown() {
        const select = document.getElementById('customer_id');
        if (!select) return;

        select.innerHTML = '<option value="">Select Customer</option>';
        this.customers.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.id;
            option.textContent = `${customer.name} (${customer.email})`;
            select.appendChild(option);
        });
    }

    /**
     * Populate sales rep dropdown
     */
    populateSalesRepDropdown() {
        const select = document.getElementById('sales_rep_id');
        if (!select) return;

        select.innerHTML = '<option value="">Select Sales Representative</option>';
        this.salesReps.forEach(rep => {
            const option = document.createElement('option');
            option.value = rep.id;
            option.textContent = `${rep.name} (${rep.email})`;
            select.appendChild(option);
        });
    }

    /**
     * Populate sales rep filter
     */
    populateSalesRepFilter() {
        const select = document.getElementById('salesRepFilter');
        if (!select) return;

        select.innerHTML = '<option value="">All Sales Reps</option>';
        this.salesReps.forEach(rep => {
            const option = document.createElement('option');
            option.value = rep.id;
            option.textContent = rep.name;
            select.appendChild(option);
        });
    }

    /**
     * Handle customer selection change
     */
    async handleCustomerChange(customerId) {
        if (!customerId) return;

        try {
            // Get customer's assigned sales rep
            const assignments = await window.api.getCustomerSalesRepAssignments({ customer_id: customerId });
            if (assignments.assignments && assignments.assignments.length > 0) {
                const assignment = assignments.assignments[0];
                const salesRepSelect = document.getElementById('sales_rep_id');
                if (salesRepSelect) {
                    salesRepSelect.value = assignment.sales_rep_id;
                }
            }
        } catch (error) {
            console.error('Customer assignment load error:', error);
        }
    }

    /**
     * Apply filters to sales
     */
    applyFilters() {
        let filtered = [...this.sales];

        // Apply search filter
        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            filtered = filtered.filter(sale => 
                sale.id.toString().includes(term) ||
                sale.customer_name.toLowerCase().includes(term) ||
                sale.sales_rep_name.toLowerCase().includes(term)
            );
        }

        // Apply status filter
        if (this.statusFilter) {
            filtered = filtered.filter(sale => sale.status === this.statusFilter);
        }

        // Apply date range filter
        if (this.dateRangeFilter) {
            const today = new Date();
            let startDate;

            switch (this.dateRangeFilter) {
                case 'today':
                    startDate = new Date(today.setHours(0, 0, 0, 0));
                    break;
                case 'week':
                    startDate = new Date(today.setDate(today.getDate() - 7));
                    break;
                case 'month':
                    startDate = new Date(today.setMonth(today.getMonth() - 1));
                    break;
                case 'quarter':
                    startDate = new Date(today.setMonth(today.getMonth() - 3));
                    break;
                case 'year':
                    startDate = new Date(today.setFullYear(today.getFullYear() - 1));
                    break;
            }

            if (startDate) {
                filtered = filtered.filter(sale => new Date(sale.sale_date) >= startDate);
            }
        }

        // Apply sales rep filter
        if (this.salesRepFilter) {
            filtered = filtered.filter(sale => sale.sales_rep_id == this.salesRepFilter);
        }

        this.filteredSales = filtered;
        this.currentPage = 1;
        this.totalPages = Math.ceil(filtered.length / this.pageSize);
        
        this.renderTable();
        this.renderPagination();
        this.updateResultsCount();
    }

    /**
     * Sort sales by column
     */
    sortSales(column) {
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }

        this.filteredSales.sort((a, b) => {
            let aValue = a[column];
            let bValue = b[column];

            // Handle different data types
            if (column === 'id' || column === 'sales_rep_id') {
                aValue = parseInt(aValue);
                bValue = parseInt(bValue);
            } else if (column === 'total_amount') {
                aValue = parseFloat(aValue);
                bValue = parseFloat(bValue);
            } else if (column === 'sale_date') {
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
     * Render sales table
     */
    renderTable() {
        const tbody = document.querySelector('#salesTable tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        const pageSales = this.filteredSales.slice(startIndex, endIndex);

        if (pageSales.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-muted py-4">
                        No sales found
                    </td>
                </tr>
            `;
            return;
        }

        pageSales.forEach(sale => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <input type="checkbox" class="form-check-input sale-checkbox" 
                           value="${sale.id}" data-sale-id="${sale.id}">
                </td>
                <td>#${sale.id}</td>
                <td>${this.escapeHtml(sale.customer_name)}</td>
                <td>${this.escapeHtml(sale.sales_rep_name || 'N/A')}</td>
                <td>${window.ConfigHelper.formatCurrency(sale.total_amount)}</td>
                <td>${window.ConfigHelper.formatDate(sale.sale_date)}</td>
                <td>
                    <span class="badge badge-${this.getStatusBadgeClass(sale.status)}">
                        ${sale.status}
                    </span>
                </td>
                <td>
                    <button type="button" class="btn btn-sm btn-primary me-1" 
                            onclick="salesManager.showSaleModal(${sale.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-info me-1" 
                            onclick="salesManager.viewSale(${sale.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-success me-1" 
                            onclick="salesManager.printInvoice(${sale.id})">
                        <i class="fas fa-print"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-danger" 
                            onclick="salesManager.deleteSale(${sale.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);

            // Add click event for checkbox change
            const checkbox = row.querySelector('.sale-checkbox');
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
                this.sortSales(header.dataset.sort);
            });
        });
    }

    /**
     * Render pagination
     */
    renderPagination() {
        const pagination = document.getElementById('salesPagination');
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
        const countElement = document.getElementById('salesCount');
        if (countElement) {
            const startIndex = (this.currentPage - 1) * this.pageSize + 1;
            const endIndex = Math.min(this.currentPage * this.pageSize, this.filteredSales.length);
            countElement.textContent = `Showing ${startIndex}-${endIndex} of ${this.filteredSales.length} sales`;
        }
    }

    /**
     * Show sale modal for add/edit
     */
    showSaleModal(saleId = null) {
        const modal = new bootstrap.Modal(document.getElementById('saleModal'));
        const form = document.getElementById('saleForm');
        const title = document.getElementById('saleModalLabel');

        this.saleItems = [];

        if (saleId) {
            // Edit mode
            const sale = this.sales.find(s => s.id === saleId);
            if (sale) {
                title.textContent = 'Edit Sale';
                this.populateSaleForm(sale);
                this.loadSaleItems(saleId);
            }
        } else {
            // Add mode
            title.textContent = 'Create New Sale';
            form.reset();
            this.clearFormErrors();
            this.renderSaleItems();
        }

        modal.show();
    }

    /**
     * Load sale items for editing
     */
    async loadSaleItems(saleId) {
        try {
            const sale = await window.api.getSale(saleId);
            this.saleItems = sale.items || [];
            this.renderSaleItems();
        } catch (error) {
            console.error('Sale items load error:', error);
            this.saleItems = [];
            this.renderSaleItems();
        }
    }

    /**
     * Populate sale form with data
     */
    populateSaleForm(sale) {
        const form = document.getElementById('saleForm');
        if (!form) return;

        form.sale_id.value = sale.id || '';
        form.customer_id.value = sale.customer_id || '';
        form.sales_rep_id.value = sale.sales_rep_id || '';
        form.sale_date.value = sale.sale_date ? sale.sale_date.split('T')[0] : '';
        form.status.value = sale.status || 'pending';
        form.notes.value = sale.notes || '';
    }

    /**
     * Add sale item
     */
    addSaleItem() {
        const productSelect = document.getElementById('productSelect');
        const quantityInput = document.getElementById('itemQuantity');
        const priceInput = document.getElementById('itemPrice');

        const productId = productSelect.value;
        const quantity = parseInt(quantityInput.value);
        const price = parseFloat(priceInput.value);

        if (!productId || !quantity || !price) {
            this.showError('Please fill in all item fields');
            return;
        }

        const product = this.products.find(p => p.id == productId);
        if (!product) {
            this.showError('Selected product not found');
            return;
        }

        // Check if item already exists
        const existingIndex = this.saleItems.findIndex(item => item.product_id == productId);
        if (existingIndex >= 0) {
            // Update existing item
            this.saleItems[existingIndex].quantity += quantity;
            this.saleItems[existingIndex].price = price;
        } else {
            // Add new item
            this.saleItems.push({
                product_id: productId,
                product_name: product.name,
                quantity: quantity,
                price: price
            });
        }

        // Clear inputs
        productSelect.value = '';
        quantityInput.value = '';
        priceInput.value = '';

        this.renderSaleItems();
    }

    /**
     * Render sale items table
     */
    renderSaleItems() {
        const tbody = document.querySelector('#saleItemsTable tbody');
        const totalElement = document.getElementById('saleTotal');
        
        if (!tbody) return;

        tbody.innerHTML = '';
        let total = 0;

        if (this.saleItems.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted py-3">
                        No items added yet
                    </td>
                </tr>
            `;
        } else {
            this.saleItems.forEach((item, index) => {
                const subtotal = item.quantity * item.price;
                total += subtotal;

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${this.escapeHtml(item.product_name)}</td>
                    <td>${item.quantity}</td>
                    <td>${window.ConfigHelper.formatCurrency(item.price)}</td>
                    <td>${window.ConfigHelper.formatCurrency(subtotal)}</td>
                    <td>
                        <button type="button" class="btn btn-sm btn-danger" 
                                onclick="salesManager.removeSaleItem(${index})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        }

        if (totalElement) {
            totalElement.textContent = window.ConfigHelper.formatCurrency(total);
        }

        // Populate product dropdown for adding items
        this.populateProductDropdown();
    }

    /**
     * Populate product dropdown for adding items
     */
    populateProductDropdown() {
        const select = document.getElementById('productSelect');
        if (!select) return;

        select.innerHTML = '<option value="">Select Product</option>';
        this.products.forEach(product => {
            const option = document.createElement('option');
            option.value = product.id;
            option.textContent = `${product.name} - ${window.ConfigHelper.formatCurrency(product.price)}`;
            option.dataset.price = product.price;
            select.appendChild(option);
        });

        // Auto-fill price when product is selected
        select.addEventListener('change', (e) => {
            const priceInput = document.getElementById('itemPrice');
            if (priceInput && e.target.selectedOptions[0]) {
                priceInput.value = e.target.selectedOptions[0].dataset.price || '';
            }
        });
    }

    /**
     * Remove sale item
     */
    removeSaleItem(index) {
        this.saleItems.splice(index, 1);
        this.renderSaleItems();
    }

    /**
     * Handle sale form submission
     */
    async handleSaleSubmit() {
        const form = document.getElementById('saleForm');
        if (!form || !this.validateForm()) return;

        if (this.saleItems.length === 0) {
            this.showError('Please add at least one item to the sale');
            return;
        }

        const formData = new FormData(form);
        const saleData = {
            customer_id: parseInt(formData.get('customer_id')),
            sales_rep_id: parseInt(formData.get('sales_rep_id')),
            sale_date: formData.get('sale_date'),
            status: formData.get('status'),
            notes: formData.get('notes'),
            items: this.saleItems.map(item => ({
                product_id: item.product_id,
                quantity: item.quantity,
                price: item.price
            }))
        };

        const saleId = formData.get('sale_id');
        const isEdit = saleId && saleId !== '';

        try {
            let response;
            if (isEdit) {
                response = await window.api.updateSale(saleId, saleData);
                this.showSuccess('Sale updated successfully');
            } else {
                response = await window.api.createSale(saleData);
                this.showSuccess('Sale created successfully');
            }

            // Close modal and refresh data
            const modal = bootstrap.Modal.getInstance(document.getElementById('saleModal'));
            modal.hide();
            await this.loadSales();

        } catch (error) {
            console.error('Sale save error:', error);
            this.showError('Failed to save sale: ' + error.message);
        }
    }

    /**
     * View sale details
     */
    async viewSale(saleId) {
        try {
            const sale = await window.api.getSale(saleId);
            const modal = new bootstrap.Modal(document.getElementById('saleViewModal'));
            const content = document.getElementById('saleViewContent');
            const title = document.getElementById('saleViewTitle');

            title.textContent = `Sale Details - #${sale.id}`;

            let itemsHtml = '';
            let total = 0;

            if (sale.items && sale.items.length > 0) {
                itemsHtml = `
                    <table class="table table-striped">
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>Quantity</th>
                                <th>Unit Price</th>
                                <th>Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                `;

                sale.items.forEach(item => {
                    const subtotal = item.quantity * item.price;
                    total += subtotal;
                    itemsHtml += `
                        <tr>
                            <td>${this.escapeHtml(item.product_name)}</td>
                            <td>${item.quantity}</td>
                            <td>${window.ConfigHelper.formatCurrency(item.price)}</td>
                            <td>${window.ConfigHelper.formatCurrency(subtotal)}</td>
                        </tr>
                    `;
                });

                itemsHtml += `
                        </tbody>
                        <tfoot>
                            <tr class="table-info">
                                <th colspan="3">Total</th>
                                <th>${window.ConfigHelper.formatCurrency(total)}</th>
                            </tr>
                        </tfoot>
                    </table>
                `;
            } else {
                itemsHtml = '<p class="text-muted">No items found for this sale.</p>';
            }

            content.innerHTML = `
                <div class="row">
                    <div class="col-md-6">
                        <h6>Sale Information</h6>
                        <table class="table table-borderless">
                            <tr><td><strong>Sale ID:</strong></td><td>#${sale.id}</td></tr>
                            <tr><td><strong>Customer:</strong></td><td>${this.escapeHtml(sale.customer_name)}</td></tr>
                            <tr><td><strong>Sales Rep:</strong></td><td>${this.escapeHtml(sale.sales_rep_name || 'N/A')}</td></tr>
                            <tr><td><strong>Date:</strong></td><td>${window.ConfigHelper.formatDate(sale.sale_date)}</td></tr>
                            <tr><td><strong>Status:</strong></td><td>
                                <span class="badge badge-${this.getStatusBadgeClass(sale.status)}">
                                    ${sale.status}
                                </span>
                            </td></tr>
                            <tr><td><strong>Total Amount:</strong></td><td><strong>${window.ConfigHelper.formatCurrency(sale.total_amount)}</strong></td></tr>
                        </table>
                    </div>
                    <div class="col-md-6">
                        <h6>Notes</h6>
                        <p>${this.escapeHtml(sale.notes || 'No notes')}</p>
                    </div>
                </div>
                <div class="row mt-3">
                    <div class="col-12">
                        <h6>Sale Items</h6>
                        ${itemsHtml}
                    </div>
                </div>
            `;

            modal.show();
        } catch (error) {
            console.error('Sale details error:', error);
            this.showError('Failed to load sale details: ' + error.message);
        }
    }

    /**
     * Print invoice
     */
    async printInvoice(saleId) {
        try {
            const sale = await window.api.getSale(saleId);
            
            // Create a new window for printing
            const printWindow = window.open('', '_blank');
            
            let itemsHtml = '';
            let total = 0;

            if (sale.items && sale.items.length > 0) {
                sale.items.forEach(item => {
                    const subtotal = item.quantity * item.price;
                    total += subtotal;
                    itemsHtml += `
                        <tr>
                            <td>${this.escapeHtml(item.product_name)}</td>
                            <td style="text-align: center;">${item.quantity}</td>
                            <td style="text-align: right;">${window.ConfigHelper.formatCurrency(item.price)}</td>
                            <td style="text-align: right;">${window.ConfigHelper.formatCurrency(subtotal)}</td>
                        </tr>
                    `;
                });
            }

            const invoiceHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Invoice #${sale.id}</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        .header { text-align: center; margin-bottom: 30px; }
                        .company-name { font-size: 24px; font-weight: bold; }
                        .invoice-info { margin: 20px 0; }
                        .customer-info { margin: 20px 0; }
                        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                        th, td { border: 1px solid #ddd; padding: 8px; }
                        th { background-color: #f2f2f2; }
                        .total-row { font-weight: bold; background-color: #f8f9fa; }
                        .text-right { text-align: right; }
                        @media print { body { margin: 0; } }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="company-name">SalePoint Solution</div>
                        <div>Sales Management System</div>
                    </div>
                    
                    <div class="invoice-info">
                        <h3>Invoice #${sale.id}</h3>
                        <p><strong>Date:</strong> ${window.ConfigHelper.formatDate(sale.sale_date)}</p>
                        <p><strong>Status:</strong> ${sale.status}</p>
                    </div>
                    
                    <div class="customer-info">
                        <h4>Bill To:</h4>
                        <p><strong>${this.escapeHtml(sale.customer_name)}</strong></p>
                        <p>Sales Representative: ${this.escapeHtml(sale.sales_rep_name || 'N/A')}</p>
                    </div>
                    
                    <table>
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th style="text-align: center;">Quantity</th>
                                <th style="text-align: right;">Unit Price</th>
                                <th style="text-align: right;">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                            <tr class="total-row">
                                <td colspan="3" class="text-right">Total:</td>
                                <td class="text-right">${window.ConfigHelper.formatCurrency(sale.total_amount)}</td>
                            </tr>
                        </tbody>
                    </table>
                    
                    ${sale.notes ? `<div><strong>Notes:</strong><br>${this.escapeHtml(sale.notes)}</div>` : ''}
                    
                    <div style="margin-top: 40px; text-align: center; color: #666;">
                        Thank you for your business!
                    </div>
                </body>
                </html>
            `;

            printWindow.document.write(invoiceHtml);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
            
        } catch (error) {
            console.error('Print invoice error:', error);
            this.showError('Failed to generate invoice: ' + error.message);
        }
    }

    /**
     * Delete sale
     */
    async deleteSale(saleId) {
        const sale = this.sales.find(s => s.id === saleId);
        if (!sale) return;

        const confirmed = confirm(`Are you sure you want to delete sale #${sale.id}?`);
        if (!confirmed) return;

        try {
            await window.api.deleteSale(saleId);
            this.showSuccess('Sale deleted successfully');
            await this.loadSales();
        } catch (error) {
            console.error('Sale delete error:', error);
            this.showError('Failed to delete sale: ' + error.message);
        }
    }

    /**
     * Handle select all checkbox
     */
    handleSelectAll(checked) {
        const checkboxes = document.querySelectorAll('.sale-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
        });
        this.updateBulkActionButtons();
    }

    /**
     * Handle bulk delete
     */
    async handleBulkDelete() {
        const selectedIds = this.getSelectedSaleIds();
        if (selectedIds.length === 0) {
            this.showError('Please select sales to delete');
            return;
        }

        const confirmed = confirm(`Are you sure you want to delete ${selectedIds.length} selected sales?`);
        if (!confirmed) return;

        try {
            await Promise.all(selectedIds.map(id => window.api.deleteSale(id)));
            this.showSuccess(`${selectedIds.length} sales deleted successfully`);
            await this.loadSales();
        } catch (error) {
            console.error('Bulk delete error:', error);
            this.showError('Failed to delete sales: ' + error.message);
        }
    }

    /**
     * Get selected sale IDs
     */
    getSelectedSaleIds() {
        const checkboxes = document.querySelectorAll('.sale-checkbox:checked');
        return Array.from(checkboxes).map(cb => parseInt(cb.value));
    }

    /**
     * Update bulk action buttons
     */
    updateBulkActionButtons() {
        const selectedCount = this.getSelectedSaleIds().length;
        const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
        
        if (bulkDeleteBtn) {
            bulkDeleteBtn.style.display = selectedCount > 0 ? 'inline-block' : 'none';
            bulkDeleteBtn.textContent = `Delete Selected (${selectedCount})`;
        }
    }

    /**
     * Export sales
     */
    async exportSales() {
        try {
            const data = this.filteredSales.map(sale => ({
                'Sale ID': sale.id,
                'Customer': sale.customer_name,
                'Sales Rep': sale.sales_rep_name || 'N/A',
                'Total Amount': sale.total_amount,
                'Sale Date': window.ConfigHelper.formatDate(sale.sale_date),
                'Status': sale.status,
                'Notes': sale.notes || ''
            }));

            const csv = this.convertToCSV(data);
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `sales-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showSuccess('Sales exported successfully');
        } catch (error) {
            console.error('Export error:', error);
            this.showError('Failed to export sales: ' + error.message);
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
        const form = document.getElementById('saleForm');
        if (!form) return false;

        let isValid = true;
        const fields = ['customer_id', 'sales_rep_id', 'sale_date'];

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
            case 'customer_id':
                isValid = value !== '';
                message = isValid ? '' : 'Customer is required';
                break;
            case 'sales_rep_id':
                isValid = value !== '';
                message = isValid ? '' : 'Sales representative is required';
                break;
            case 'sale_date':
                isValid = value !== '';
                message = isValid ? '' : 'Sale date is required';
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
        const form = document.getElementById('saleForm');
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
     * Get status badge class
     */
    getStatusBadgeClass(status) {
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
        const loadingElement = document.getElementById('salesLoading');
        if (loadingElement) {
            loadingElement.style.display = 'block';
        }
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        const loadingElement = document.getElementById('salesLoading');
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
        const existingAlerts = document.querySelectorAll('.sales-alert');
        existingAlerts.forEach(alert => alert.remove());

        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show sales-alert`;
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        const salesSection = document.getElementById('sales');
        if (salesSection) {
            salesSection.insertBefore(alert, salesSection.firstChild);
        }

        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 5000);
    }
}

// Create global instance
const salesManager = new SalesManager();

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SalesManager;
} else if (typeof window !== 'undefined') {
    window.SalesManager = SalesManager;
    window.salesManager = salesManager;
}
