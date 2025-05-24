/**
 * Sales Representatives Management Module
 * Handles CRUD operations for sales representatives
 */

class SalesRepresentatives {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = CONFIG.pagination.itemsPerPage;
        this.totalItems = 0;
        this.currentSort = { field: 'name', direction: 'asc' };
        this.currentFilters = {};
        this.selectedItems = new Set();
        this.initializeEventListeners();
    }

    /**
     * Initialize event listeners
     */
    initializeEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('salesRepSearch');
        if (searchInput) {
            searchInput.addEventListener('input', debounce((e) => {
                this.currentFilters.search = e.target.value;
                this.currentPage = 1;
                this.loadSalesReps();
            }, 300));
        }

        // Filter functionality
        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.currentFilters.status = e.target.value;
                this.currentPage = 1;
                this.loadSalesReps();
            });
        }

        const departmentFilter = document.getElementById('departmentFilter');
        if (departmentFilter) {
            departmentFilter.addEventListener('change', (e) => {
                this.currentFilters.department = e.target.value;
                this.currentPage = 1;
                this.loadSalesReps();
            });
        }

        // Bulk operations
        const selectAllCheckbox = document.getElementById('selectAllSalesReps');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => {
                this.toggleSelectAll(e.target.checked);
            });
        }

        // Add new sales rep button
        const addSalesRepBtn = document.getElementById('addSalesRepBtn');
        if (addSalesRepBtn) {
            addSalesRepBtn.addEventListener('click', () => {
                this.showSalesRepModal();
            });
        }

        // Export button
        const exportBtn = document.getElementById('exportSalesRepsBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportToCSV();
            });
        }

        // Bulk actions
        const bulkDeleteBtn = document.getElementById('bulkDeleteSalesRepsBtn');
        if (bulkDeleteBtn) {
            bulkDeleteBtn.addEventListener('click', () => {
                this.bulkDelete();
            });
        }

        const bulkActivateBtn = document.getElementById('bulkActivateBtn');
        if (bulkActivateBtn) {
            bulkActivateBtn.addEventListener('click', () => {
                this.bulkUpdateStatus('active');
            });
        }

        const bulkDeactivateBtn = document.getElementById('bulkDeactivateBtn');
        if (bulkDeactivateBtn) {
            bulkDeactivateBtn.addEventListener('click', () => {
                this.bulkUpdateStatus('inactive');
            });
        }
    }

    /**
     * Load and display sales representatives
     */
    async loadSalesReps() {
        try {
            showLoadingState('salesRepsTableBody');
            
            const params = {
                page: this.currentPage,
                limit: this.itemsPerPage,
                sortBy: this.currentSort.field,
                sortOrder: this.currentSort.direction,
                ...this.currentFilters
            };

            const response = await api.getAllSalesReps(params);
            
            if (response.success) {
                this.displaySalesReps(response.data.salesReps);
                this.totalItems = response.data.total;
                this.updatePagination();
                this.updateBulkActionButtons();
            } else {
                throw new Error(response.error || 'Failed to load sales representatives');
            }
        } catch (error) {
            console.error('Error loading sales reps:', error);
            showErrorMessage('Failed to load sales representatives');
            document.getElementById('salesRepsTableBody').innerHTML = 
                '<tr><td colspan="8" class="text-center text-danger">Failed to load data</td></tr>';
        }
    }

    /**
     * Display sales representatives in table
     */
    displaySalesReps(salesReps) {
        const tbody = document.getElementById('salesRepsTableBody');
        if (!tbody) return;

        if (!salesReps || salesReps.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No sales representatives found</td></tr>';
            return;
        }

        tbody.innerHTML = salesReps.map(rep => `
            <tr class="${this.selectedItems.has(rep.id) ? 'table-active' : ''}">
                <td>
                    <input type="checkbox" class="form-check-input row-checkbox" 
                           value="${rep.id}" ${this.selectedItems.has(rep.id) ? 'checked' : ''}>
                </td>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="avatar-circle me-2">
                            ${rep.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div class="fw-semibold">${escapeHtml(rep.name)}</div>
                            <small class="text-muted">${escapeHtml(rep.email)}</small>
                        </div>
                    </div>
                </td>
                <td>${escapeHtml(rep.department || 'N/A')}</td>
                <td>${escapeHtml(rep.phone || 'N/A')}</td>
                <td>
                    <span class="badge ${rep.status === 'active' ? 'bg-success' : 'bg-secondary'}">
                        ${rep.status || 'unknown'}
                    </span>
                </td>
                <td>${rep.total_customers || 0}</td>
                <td>${formatCurrency(rep.total_sales || 0)}</td>
                <td>
                    <div class="btn-group btn-group-sm" role="group">
                        <button type="button" class="btn btn-outline-primary" 
                                onclick="salesRepsManager.viewSalesRep(${rep.id})" 
                                title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button type="button" class="btn btn-outline-secondary" 
                                onclick="salesRepsManager.editSalesRep(${rep.id})" 
                                title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button type="button" class="btn btn-outline-danger" 
                                onclick="salesRepsManager.deleteSalesRep(${rep.id})" 
                                title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        // Add event listeners for row checkboxes
        tbody.querySelectorAll('.row-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const repId = parseInt(e.target.value);
                if (e.target.checked) {
                    this.selectedItems.add(repId);
                } else {
                    this.selectedItems.delete(repId);
                }
                this.updateBulkActionButtons();
                this.updateSelectAllCheckbox();
            });
        });
    }

    /**
     * Show sales rep modal for create/edit
     */
    async showSalesRepModal(repId = null) {
        try {
            const modal = document.getElementById('salesRepModal');
            const form = document.getElementById('salesRepForm');
            const modalTitle = modal.querySelector('.modal-title');
            
            if (!modal || !form) return;

            // Reset form
            form.reset();
            form.classList.remove('was-validated');
            this.clearFormErrors();

            if (repId) {
                modalTitle.textContent = 'Edit Sales Representative';
                
                showLoadingState('salesRepModalBody');
                const response = await api.getSalesRep(repId);
                
                if (response.success) {
                    this.populateForm(response.data);
                } else {
                    throw new Error(response.error || 'Failed to load sales representative');
                }
            } else {
                modalTitle.textContent = 'Add New Sales Representative';
            }

            new bootstrap.Modal(modal).show();
        } catch (error) {
            console.error('Error showing sales rep modal:', error);
            showErrorMessage('Failed to load sales representative data');
        }
    }

    /**
     * Populate form with sales rep data
     */
    populateForm(rep) {
        const form = document.getElementById('salesRepForm');
        if (!form) return;

        form.repId.value = rep.id || '';
        form.name.value = rep.name || '';
        form.email.value = rep.email || '';
        form.phone.value = rep.phone || '';
        form.department.value = rep.department || '';
        form.status.value = rep.status || 'active';
        form.hire_date.value = rep.hire_date ? rep.hire_date.split('T')[0] : '';
        form.commission_rate.value = rep.commission_rate || '';
        form.notes.value = rep.notes || '';
    }

    /**
     * Save sales representative
     */
    async saveSalesRep(formData) {
        try {
            const repId = formData.get('repId');
            let response;

            const repData = {
                name: formData.get('name'),
                email: formData.get('email'),
                phone: formData.get('phone'),
                department: formData.get('department'),
                status: formData.get('status'),
                hire_date: formData.get('hire_date'),
                commission_rate: parseFloat(formData.get('commission_rate')) || 0,
                notes: formData.get('notes')
            };

            if (repId) {
                response = await api.updateSalesRep(repId, repData);
            } else {
                response = await api.createSalesRep(repData);
            }

            if (response.success) {
                showSuccessMessage(repId ? 'Sales representative updated successfully' : 'Sales representative created successfully');
                bootstrap.Modal.getInstance(document.getElementById('salesRepModal')).hide();
                this.loadSalesReps();
            } else {
                throw new Error(response.error || 'Failed to save sales representative');
            }
        } catch (error) {
            console.error('Error saving sales rep:', error);
            this.displayFormErrors(error.details || {});
            showErrorMessage('Failed to save sales representative');
        }
    }

    /**
     * View sales representative details
     */
    async viewSalesRep(repId) {
        try {
            const response = await api.getSalesRep(repId);
            
            if (response.success) {
                this.showSalesRepDetailsModal(response.data);
            } else {
                throw new Error(response.error || 'Failed to load sales representative');
            }
        } catch (error) {
            console.error('Error viewing sales rep:', error);
            showErrorMessage('Failed to load sales representative details');
        }
    }

    /**
     * Show sales rep details modal
     */
    showSalesRepDetailsModal(rep) {
        const modal = document.getElementById('salesRepDetailsModal');
        if (!modal) return;

        // Populate details
        modal.querySelector('#detailName').textContent = rep.name || 'N/A';
        modal.querySelector('#detailEmail').textContent = rep.email || 'N/A';
        modal.querySelector('#detailPhone').textContent = rep.phone || 'N/A';
        modal.querySelector('#detailDepartment').textContent = rep.department || 'N/A';
        modal.querySelector('#detailStatus').innerHTML = 
            `<span class="badge ${rep.status === 'active' ? 'bg-success' : 'bg-secondary'}">${rep.status || 'unknown'}</span>`;
        modal.querySelector('#detailHireDate').textContent = rep.hire_date ? formatDate(rep.hire_date) : 'N/A';
        modal.querySelector('#detailCommissionRate').textContent = rep.commission_rate ? `${rep.commission_rate}%` : 'N/A';
        modal.querySelector('#detailTotalCustomers').textContent = rep.total_customers || 0;
        modal.querySelector('#detailTotalSales').textContent = formatCurrency(rep.total_sales || 0);
        modal.querySelector('#detailNotes').textContent = rep.notes || 'No notes available';

        new bootstrap.Modal(modal).show();
    }

    /**
     * Edit sales representative
     */
    editSalesRep(repId) {
        this.showSalesRepModal(repId);
    }

    /**
     * Delete sales representative
     */
    async deleteSalesRep(repId) {
        if (!confirm('Are you sure you want to delete this sales representative?')) {
            return;
        }

        try {
            const response = await api.deleteSalesRep(repId);
            
            if (response.success) {
                showSuccessMessage('Sales representative deleted successfully');
                this.selectedItems.delete(repId);
                this.loadSalesReps();
            } else {
                throw new Error(response.error || 'Failed to delete sales representative');
            }
        } catch (error) {
            console.error('Error deleting sales rep:', error);
            showErrorMessage('Failed to delete sales representative');
        }
    }

    /**
     * Toggle select all
     */
    toggleSelectAll(checked) {
        const checkboxes = document.querySelectorAll('#salesRepsTableBody .row-checkbox');
        
        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
            const repId = parseInt(checkbox.value);
            
            if (checked) {
                this.selectedItems.add(repId);
            } else {
                this.selectedItems.delete(repId);
            }
        });

        this.updateBulkActionButtons();
    }

    /**
     * Update select all checkbox state
     */
    updateSelectAllCheckbox() {
        const selectAllCheckbox = document.getElementById('selectAllSalesReps');
        const checkboxes = document.querySelectorAll('#salesRepsTableBody .row-checkbox');
        
        if (selectAllCheckbox && checkboxes.length > 0) {
            const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
            selectAllCheckbox.checked = checkedCount === checkboxes.length;
            selectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < checkboxes.length;
        }
    }

    /**
     * Update bulk action buttons
     */
    updateBulkActionButtons() {
        const bulkActions = document.querySelectorAll('.bulk-action-btn');
        const hasSelected = this.selectedItems.size > 0;
        
        bulkActions.forEach(btn => {
            btn.disabled = !hasSelected;
        });

        // Update selected count
        const selectedCount = document.getElementById('selectedCount');
        if (selectedCount) {
            selectedCount.textContent = this.selectedItems.size;
        }
    }

    /**
     * Bulk delete
     */
    async bulkDelete() {
        if (this.selectedItems.size === 0) return;

        if (!confirm(`Are you sure you want to delete ${this.selectedItems.size} selected sales representatives?`)) {
            return;
        }

        try {
            const response = await api.bulkDeleteSalesReps(Array.from(this.selectedItems));
            
            if (response.success) {
                showSuccessMessage(`${this.selectedItems.size} sales representatives deleted successfully`);
                this.selectedItems.clear();
                this.loadSalesReps();
            } else {
                throw new Error(response.error || 'Failed to delete sales representatives');
            }
        } catch (error) {
            console.error('Error in bulk delete:', error);
            showErrorMessage('Failed to delete selected sales representatives');
        }
    }

    /**
     * Bulk update status
     */
    async bulkUpdateStatus(status) {
        if (this.selectedItems.size === 0) return;

        try {
            const response = await api.bulkUpdateSalesRepStatus(Array.from(this.selectedItems), status);
            
            if (response.success) {
                showSuccessMessage(`${this.selectedItems.size} sales representatives updated successfully`);
                this.selectedItems.clear();
                this.loadSalesReps();
            } else {
                throw new Error(response.error || 'Failed to update sales representatives');
            }
        } catch (error) {
            console.error('Error in bulk update:', error);
            showErrorMessage('Failed to update selected sales representatives');
        }
    }

    /**
     * Sort table
     */
    sortTable(field) {
        if (this.currentSort.field === field) {
            this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.currentSort.field = field;
            this.currentSort.direction = 'asc';
        }

        this.updateSortIndicators();
        this.loadSalesReps();
    }

    /**
     * Update sort indicators
     */
    updateSortIndicators() {
        document.querySelectorAll('.sortable').forEach(header => {
            header.classList.remove('sorted-asc', 'sorted-desc');
        });

        const activeHeader = document.querySelector(`[data-sort="${this.currentSort.field}"]`);
        if (activeHeader) {
            activeHeader.classList.add(this.currentSort.direction === 'asc' ? 'sorted-asc' : 'sorted-desc');
        }
    }

    /**
     * Update pagination
     */
    updatePagination() {
        const totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
        updatePaginationControls('salesRepsPagination', this.currentPage, totalPages, (page) => {
            this.currentPage = page;
            this.loadSalesReps();
        });

        // Update pagination info
        const paginationInfo = document.getElementById('salesRepsPaginationInfo');
        if (paginationInfo) {
            const start = (this.currentPage - 1) * this.itemsPerPage + 1;
            const end = Math.min(this.currentPage * this.itemsPerPage, this.totalItems);
            paginationInfo.textContent = `Showing ${start}-${end} of ${this.totalItems} sales representatives`;
        }
    }

    /**
     * Export to CSV
     */
    async exportToCSV() {
        try {
            const response = await api.getAllSalesReps({ ...this.currentFilters, export: true });
            
            if (response.success) {
                const csvContent = this.generateCSV(response.data.salesReps);
                downloadCSV(csvContent, 'sales_representatives.csv');
                showSuccessMessage('Sales representatives exported successfully');
            } else {
                throw new Error(response.error || 'Failed to export data');
            }
        } catch (error) {
            console.error('Error exporting:', error);
            showErrorMessage('Failed to export sales representatives');
        }
    }

    /**
     * Generate CSV content
     */
    generateCSV(salesReps) {
        const headers = ['ID', 'Name', 'Email', 'Phone', 'Department', 'Status', 'Hire Date', 'Commission Rate', 'Total Customers', 'Total Sales', 'Notes'];
        
        const rows = salesReps.map(rep => [
            rep.id,
            rep.name,
            rep.email,
            rep.phone || '',
            rep.department || '',
            rep.status || '',
            rep.hire_date ? formatDate(rep.hire_date) : '',
            rep.commission_rate || '',
            rep.total_customers || 0,
            rep.total_sales || 0,
            rep.notes || ''
        ]);

        return [headers, ...rows].map(row => 
            row.map(field => `"${field.toString().replace(/"/g, '""')}"`).join(',')
        ).join('\n');
    }

    /**
     * Clear form errors
     */
    clearFormErrors() {
        document.querySelectorAll('.invalid-feedback').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    }

    /**
     * Display form errors
     */
    displayFormErrors(errors) {
        Object.keys(errors).forEach(field => {
            const input = document.querySelector(`[name="${field}"]`);
            const feedback = document.querySelector(`[data-field="${field}"]`);
            
            if (input && feedback) {
                input.classList.add('is-invalid');
                feedback.textContent = errors[field];
                feedback.style.display = 'block';
            }
        });
    }

    /**
     * Initialize the module
     */
    init() {
        this.loadSalesReps();
        
        // Initialize form submission
        const form = document.getElementById('salesRepForm');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                if (form.checkValidity()) {
                    const formData = new FormData(form);
                    await this.saveSalesRep(formData);
                }
                
                form.classList.add('was-validated');
            });
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('salesRepsPage')) {
        window.salesRepsManager = new SalesRepresentatives();
        salesRepsManager.init();
    }
});
