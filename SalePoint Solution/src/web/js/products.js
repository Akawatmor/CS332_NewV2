// SalePoint Solution - Products Module
class ProductsManager {
    constructor() {
        this.products = [];
        this.filteredProducts = [];
        this.currentPage = 1;
        this.pageSize = 10;
        this.totalPages = 0;
        this.sortColumn = 'id';
        this.sortDirection = 'asc';
        this.searchTerm = '';
        this.categoryFilter = '';
        this.priceRangeFilter = '';
        this.isLoading = false;
    }

    /**
     * Initialize products module
     */
    async init() {
        await this.loadProducts();
        this.setupEventListeners();
        this.setupValidation();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Add Product button
        document.getElementById('addProductBtn')?.addEventListener('click', () => {
            this.showProductModal();
        });

        // Search input
        document.getElementById('productSearch')?.addEventListener('input', (e) => {
            this.searchTerm = e.target.value;
            this.applyFilters();
        });

        // Category filter
        document.getElementById('categoryFilter')?.addEventListener('change', (e) => {
            this.categoryFilter = e.target.value;
            this.applyFilters();
        });

        // Price range filter
        document.getElementById('priceRangeFilter')?.addEventListener('change', (e) => {
            this.priceRangeFilter = e.target.value;
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
        document.getElementById('refreshProducts')?.addEventListener('click', () => {
            this.loadProducts();
        });

        // Bulk delete button
        document.getElementById('bulkDeleteBtn')?.addEventListener('click', () => {
            this.handleBulkDelete();
        });

        // Select all checkbox
        document.getElementById('selectAllProducts')?.addEventListener('change', (e) => {
            this.handleSelectAll(e.target.checked);
        });

        // Product form submission
        document.getElementById('productForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleProductSubmit();
        });

        // Export button
        document.getElementById('exportProducts')?.addEventListener('click', () => {
            this.exportProducts();
        });
    }

    /**
     * Setup form validation
     */
    setupValidation() {
        const form = document.getElementById('productForm');
        if (!form) return;

        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearFieldError(input));
        });
    }

    /**
     * Load products from API
     */
    async loadProducts() {
        if (this.isLoading) return;

        this.isLoading = true;
        this.showLoading();

        try {
            const response = await window.api.getProducts({
                page: this.currentPage,
                pageSize: this.pageSize,
                search: this.searchTerm,
                category: this.categoryFilter,
                priceRange: this.priceRangeFilter,
                sortColumn: this.sortColumn,
                sortDirection: this.sortDirection
            });

            this.products = response.products || [];
            this.totalPages = response.totalPages || 1;
            this.applyFilters();
            this.showSuccess('Products loaded successfully');
        } catch (error) {
            console.error('Products load error:', error);
            this.showError('Failed to load products: ' + error.message);
        } finally {
            this.isLoading = false;
            this.hideLoading();
        }
    }

    /**
     * Apply filters to products
     */
    applyFilters() {
        let filtered = [...this.products];

        // Apply search filter
        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            filtered = filtered.filter(product => 
                product.name.toLowerCase().includes(term) ||
                product.description.toLowerCase().includes(term) ||
                product.category.toLowerCase().includes(term)
            );
        }

        // Apply category filter
        if (this.categoryFilter) {
            filtered = filtered.filter(product => 
                product.category === this.categoryFilter
            );
        }

        // Apply price range filter
        if (this.priceRangeFilter) {
            const [min, max] = this.priceRangeFilter.split('-').map(Number);
            filtered = filtered.filter(product => {
                const price = parseFloat(product.price);
                return price >= min && (max ? price <= max : true);
            });
        }

        this.filteredProducts = filtered;
        this.currentPage = 1;
        this.totalPages = Math.ceil(filtered.length / this.pageSize);
        
        this.renderTable();
        this.renderPagination();
        this.updateResultsCount();
    }

    /**
     * Sort products by column
     */
    sortProducts(column) {
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }

        this.filteredProducts.sort((a, b) => {
            let aValue = a[column];
            let bValue = b[column];

            // Handle different data types
            if (column === 'price') {
                aValue = parseFloat(aValue);
                bValue = parseFloat(bValue);
            } else if (column === 'stock_quantity') {
                aValue = parseInt(aValue);
                bValue = parseInt(bValue);
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
     * Render products table
     */
    renderTable() {
        const tbody = document.querySelector('#productsTable tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        const pageProducts = this.filteredProducts.slice(startIndex, endIndex);

        if (pageProducts.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-muted py-4">
                        No products found
                    </td>
                </tr>
            `;
            return;
        }

        pageProducts.forEach(product => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <input type="checkbox" class="form-check-input product-checkbox" 
                           value="${product.id}" data-product-id="${product.id}">
                </td>
                <td>${product.id}</td>
                <td>${this.escapeHtml(product.name)}</td>
                <td>${this.escapeHtml(product.category)}</td>
                <td>${window.ConfigHelper.formatCurrency(product.price)}</td>
                <td>
                    <span class="badge badge-${this.getStockBadgeClass(product.stock_quantity)}">
                        ${product.stock_quantity}
                    </span>
                </td>
                <td>
                    <span class="badge badge-${product.status === 'active' ? 'success' : 'secondary'}">
                        ${product.status}
                    </span>
                </td>
                <td>
                    <button type="button" class="btn btn-sm btn-primary me-1" 
                            onclick="productsManager.showProductModal(${product.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-info me-1" 
                            onclick="productsManager.viewProduct(${product.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-danger" 
                            onclick="productsManager.deleteProduct(${product.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
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
                this.sortProducts(header.dataset.sort);
            });
        });
    }

    /**
     * Render pagination
     */
    renderPagination() {
        const pagination = document.getElementById('productsPagination');
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
        const countElement = document.getElementById('productsCount');
        if (countElement) {
            const startIndex = (this.currentPage - 1) * this.pageSize + 1;
            const endIndex = Math.min(this.currentPage * this.pageSize, this.filteredProducts.length);
            countElement.textContent = `Showing ${startIndex}-${endIndex} of ${this.filteredProducts.length} products`;
        }
    }

    /**
     * Show product modal for add/edit
     */
    showProductModal(productId = null) {
        const modal = new bootstrap.Modal(document.getElementById('productModal'));
        const form = document.getElementById('productForm');
        const title = document.getElementById('productModalLabel');

        if (productId) {
            // Edit mode
            const product = this.products.find(p => p.id === productId);
            if (product) {
                title.textContent = 'Edit Product';
                this.populateProductForm(product);
            }
        } else {
            // Add mode
            title.textContent = 'Add New Product';
            form.reset();
            this.clearFormErrors();
        }

        modal.show();
    }

    /**
     * Populate product form with data
     */
    populateProductForm(product) {
        const form = document.getElementById('productForm');
        if (!form) return;

        form.product_id.value = product.id || '';
        form.product_name.value = product.name || '';
        form.description.value = product.description || '';
        form.category.value = product.category || '';
        form.price.value = product.price || '';
        form.stock_quantity.value = product.stock_quantity || '';
        form.status.value = product.status || 'active';
    }

    /**
     * Handle product form submission
     */
    async handleProductSubmit() {
        const form = document.getElementById('productForm');
        if (!form || !this.validateForm()) return;

        const formData = new FormData(form);
        const productData = {
            name: formData.get('product_name'),
            description: formData.get('description'),
            category: formData.get('category'),
            price: parseFloat(formData.get('price')),
            stock_quantity: parseInt(formData.get('stock_quantity')),
            status: formData.get('status')
        };

        const productId = formData.get('product_id');
        const isEdit = productId && productId !== '';

        try {
            let response;
            if (isEdit) {
                response = await window.api.updateProduct(productId, productData);
                this.showSuccess('Product updated successfully');
            } else {
                response = await window.api.createProduct(productData);
                this.showSuccess('Product created successfully');
            }

            // Close modal and refresh data
            const modal = bootstrap.Modal.getInstance(document.getElementById('productModal'));
            modal.hide();
            await this.loadProducts();

        } catch (error) {
            console.error('Product save error:', error);
            this.showError('Failed to save product: ' + error.message);
        }
    }

    /**
     * View product details
     */
    viewProduct(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        const modal = new bootstrap.Modal(document.getElementById('productViewModal'));
        const content = document.getElementById('productViewContent');

        content.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <h6>Basic Information</h6>
                    <table class="table table-borderless">
                        <tr><td><strong>ID:</strong></td><td>${product.id}</td></tr>
                        <tr><td><strong>Name:</strong></td><td>${this.escapeHtml(product.name)}</td></tr>
                        <tr><td><strong>Category:</strong></td><td>${this.escapeHtml(product.category)}</td></tr>
                        <tr><td><strong>Price:</strong></td><td>${window.ConfigHelper.formatCurrency(product.price)}</td></tr>
                        <tr><td><strong>Stock:</strong></td><td>${product.stock_quantity}</td></tr>
                        <tr><td><strong>Status:</strong></td><td>
                            <span class="badge badge-${product.status === 'active' ? 'success' : 'secondary'}">
                                ${product.status}
                            </span>
                        </td></tr>
                    </table>
                </div>
                <div class="col-md-6">
                    <h6>Description</h6>
                    <p>${this.escapeHtml(product.description || 'No description available')}</p>
                </div>
            </div>
        `;

        modal.show();
    }

    /**
     * Delete product
     */
    async deleteProduct(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        const confirmed = confirm(`Are you sure you want to delete "${product.name}"?`);
        if (!confirmed) return;

        try {
            await window.api.deleteProduct(productId);
            this.showSuccess('Product deleted successfully');
            await this.loadProducts();
        } catch (error) {
            console.error('Product delete error:', error);
            this.showError('Failed to delete product: ' + error.message);
        }
    }

    /**
     * Handle select all checkbox
     */
    handleSelectAll(checked) {
        const checkboxes = document.querySelectorAll('.product-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
        });
        this.updateBulkActionButtons();
    }

    /**
     * Handle bulk delete
     */
    async handleBulkDelete() {
        const selectedIds = this.getSelectedProductIds();
        if (selectedIds.length === 0) {
            this.showError('Please select products to delete');
            return;
        }

        const confirmed = confirm(`Are you sure you want to delete ${selectedIds.length} selected products?`);
        if (!confirmed) return;

        try {
            await Promise.all(selectedIds.map(id => window.api.deleteProduct(id)));
            this.showSuccess(`${selectedIds.length} products deleted successfully`);
            await this.loadProducts();
        } catch (error) {
            console.error('Bulk delete error:', error);
            this.showError('Failed to delete products: ' + error.message);
        }
    }

    /**
     * Get selected product IDs
     */
    getSelectedProductIds() {
        const checkboxes = document.querySelectorAll('.product-checkbox:checked');
        return Array.from(checkboxes).map(cb => parseInt(cb.value));
    }

    /**
     * Update bulk action buttons
     */
    updateBulkActionButtons() {
        const selectedCount = this.getSelectedProductIds().length;
        const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
        
        if (bulkDeleteBtn) {
            bulkDeleteBtn.style.display = selectedCount > 0 ? 'inline-block' : 'none';
            bulkDeleteBtn.textContent = `Delete Selected (${selectedCount})`;
        }
    }

    /**
     * Export products
     */
    async exportProducts() {
        try {
            const data = this.filteredProducts.map(product => ({
                ID: product.id,
                Name: product.name,
                Category: product.category,
                Price: product.price,
                Stock: product.stock_quantity,
                Status: product.status,
                Description: product.description
            }));

            const csv = this.convertToCSV(data);
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `products-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showSuccess('Products exported successfully');
        } catch (error) {
            console.error('Export error:', error);
            this.showError('Failed to export products: ' + error.message);
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
        const form = document.getElementById('productForm');
        if (!form) return false;

        let isValid = true;
        const fields = ['product_name', 'category', 'price', 'stock_quantity'];

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
            case 'product_name':
                const nameValidation = window.ConfigHelper.validate('name', value);
                isValid = nameValidation.isValid;
                message = nameValidation.message;
                break;
            case 'price':
                const priceValidation = window.ConfigHelper.validate('price', value);
                isValid = priceValidation.isValid;
                message = priceValidation.message;
                break;
            case 'stock_quantity':
                const quantityValidation = window.ConfigHelper.validate('quantity', value);
                isValid = quantityValidation.isValid;
                message = quantityValidation.message;
                break;
            case 'category':
                isValid = value.length > 0;
                message = isValid ? '' : 'Category is required';
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
        const form = document.getElementById('productForm');
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
     * Get stock badge class based on quantity
     */
    getStockBadgeClass(quantity) {
        if (quantity <= 10) return 'danger';
        if (quantity <= 50) return 'warning';
        return 'success';
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
        const loadingElement = document.getElementById('productsLoading');
        if (loadingElement) {
            loadingElement.style.display = 'block';
        }
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        const loadingElement = document.getElementById('productsLoading');
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
        // Implementation similar to dashboard alerts
        const existingAlerts = document.querySelectorAll('.products-alert');
        existingAlerts.forEach(alert => alert.remove());

        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show products-alert`;
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        const productsSection = document.getElementById('products');
        if (productsSection) {
            productsSection.insertBefore(alert, productsSection.firstChild);
        }

        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 5000);
    }
}

// Create global instance
const productsManager = new ProductsManager();

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProductsManager;
} else if (typeof window !== 'undefined') {
    window.ProductsManager = ProductsManager;
    window.productsManager = productsManager;
}
