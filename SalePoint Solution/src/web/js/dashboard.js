// SalePoint Solution - Dashboard Module
class DashboardManager {
    constructor() {
        this.charts = {};
        this.refreshInterval = null;
        this.refreshRate = 30000; // 30 seconds
        this.isLoading = false;
    }

    /**
     * Initialize dashboard
     */
    async init() {
        await this.loadDashboardData();
        this.setupEventListeners();
        this.startAutoRefresh();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Refresh button
        document.getElementById('refreshDashboard')?.addEventListener('click', () => {
            this.loadDashboardData();
        });

        // Date range filter
        document.getElementById('dashboardDateRange')?.addEventListener('change', (e) => {
            this.loadDashboardData({ dateRange: e.target.value });
        });

        // Auto refresh toggle
        document.getElementById('autoRefresh')?.addEventListener('change', (e) => {
            if (e.target.checked) {
                this.startAutoRefresh();
            } else {
                this.stopAutoRefresh();
            }
        });
    }

    /**
     * Load dashboard data
     */
    async loadDashboardData(params = {}) {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.showLoading();

        try {
            const data = await window.api.getDashboardData(params);
            
            await Promise.all([
                this.updateStatCards(data.stats),
                this.updateSalesChart(data.salesChart),
                this.updateProductChart(data.productChart),
                this.updateSalesRepChart(data.salesRepChart),
                this.updateRecentSales(data.recentSales),
                this.updateTopProducts(data.topProducts),
                this.updateTopSalesReps(data.topSalesReps)
            ]);

            this.showSuccess('Dashboard updated successfully');
        } catch (error) {
            console.error('Dashboard load error:', error);
            this.showError('Failed to load dashboard data: ' + error.message);
        } finally {
            this.isLoading = false;
            this.hideLoading();
        }
    }

    /**
     * Update statistics cards
     */
    updateStatCards(stats) {
        if (!stats) return;

        // Total Sales
        const totalSalesElement = document.getElementById('totalSales');
        if (totalSalesElement) {
            totalSalesElement.textContent = window.ConfigHelper.formatCurrency(stats.totalSales || 0);
        }

        // Total Customers
        const totalCustomersElement = document.getElementById('totalCustomers');
        if (totalCustomersElement) {
            totalCustomersElement.textContent = (stats.totalCustomers || 0).toLocaleString();
        }

        // Total Products
        const totalProductsElement = document.getElementById('totalProducts');
        if (totalProductsElement) {
            totalProductsElement.textContent = (stats.totalProducts || 0).toLocaleString();
        }

        // Total Sales Reps
        const totalSalesRepsElement = document.getElementById('totalSalesReps');
        if (totalSalesRepsElement) {
            totalSalesRepsElement.textContent = (stats.totalSalesReps || 0).toLocaleString();
        }

        // Average Sale Amount
        const avgSaleElement = document.getElementById('avgSaleAmount');
        if (avgSaleElement) {
            avgSaleElement.textContent = window.ConfigHelper.formatCurrency(stats.averageSaleAmount || 0);
        }

        // Sales This Month
        const salesThisMonthElement = document.getElementById('salesThisMonth');
        if (salesThisMonthElement) {
            salesThisMonthElement.textContent = window.ConfigHelper.formatCurrency(stats.salesThisMonth || 0);
        }

        // Update trend indicators
        this.updateTrendIndicators(stats.trends);
    }

    /**
     * Update trend indicators
     */
    updateTrendIndicators(trends) {
        if (!trends) return;

        Object.keys(trends).forEach(key => {
            const indicator = document.getElementById(`${key}Trend`);
            if (indicator) {
                const trend = trends[key];
                const isPositive = trend.change >= 0;
                
                indicator.innerHTML = `
                    <i class="fas fa-arrow-${isPositive ? 'up' : 'down'} text-${isPositive ? 'success' : 'danger'}"></i>
                    <span class="text-${isPositive ? 'success' : 'danger'}">${Math.abs(trend.change).toFixed(1)}%</span>
                `;
            }
        });
    }

    /**
     * Update sales chart
     */
    async updateSalesChart(salesData) {
        if (!salesData) return;

        const ctx = document.getElementById('salesChart');
        if (!ctx) return;

        // Destroy existing chart
        if (this.charts.sales) {
            this.charts.sales.destroy();
        }

        this.charts.sales = new Chart(ctx, {
            type: 'line',
            data: {
                labels: salesData.labels || [],
                datasets: [{
                    label: 'Sales Amount',
                    data: salesData.values || [],
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    title: {
                        display: true,
                        text: 'Sales Trend',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return window.ConfigHelper.formatCurrency(value);
                            }
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
    }

    /**
     * Update products chart
     */
    async updateProductChart(productData) {
        if (!productData) return;

        const ctx = document.getElementById('productChart');
        if (!ctx) return;

        // Destroy existing chart
        if (this.charts.products) {
            this.charts.products.destroy();
        }

        this.charts.products = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: productData.labels || [],
                datasets: [{
                    data: productData.values || [],
                    backgroundColor: [
                        '#007bff',
                        '#28a745',
                        '#ffc107',
                        '#dc3545',
                        '#17a2b8',
                        '#6f42c1',
                        '#fd7e14',
                        '#20c997'
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom'
                    },
                    title: {
                        display: true,
                        text: 'Top Products by Sales',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    }
                }
            }
        });
    }

    /**
     * Update sales representatives chart
     */
    async updateSalesRepChart(salesRepData) {
        if (!salesRepData) return;

        const ctx = document.getElementById('salesRepChart');
        if (!ctx) return;

        // Destroy existing chart
        if (this.charts.salesReps) {
            this.charts.salesReps.destroy();
        }

        this.charts.salesReps = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: salesRepData.labels || [],
                datasets: [{
                    label: 'Sales Amount',
                    data: salesRepData.values || [],
                    backgroundColor: 'rgba(0, 123, 255, 0.8)',
                    borderColor: '#007bff',
                    borderWidth: 2,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Top Sales Representatives',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return window.ConfigHelper.formatCurrency(value);
                            }
                        }
                    },
                    x: {
                        ticks: {
                            maxRotation: 45
                        }
                    }
                }
            }
        });
    }

    /**
     * Update recent sales table
     */
    updateRecentSales(recentSales) {
        if (!recentSales) return;

        const tbody = document.querySelector('#recentSalesTable tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        recentSales.forEach(sale => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>#${sale.id}</td>
                <td>${sale.customer_name}</td>
                <td>${sale.sales_rep_name}</td>
                <td>${window.ConfigHelper.formatCurrency(sale.total_amount)}</td>
                <td>${window.ConfigHelper.formatDate(sale.sale_date)}</td>
                <td>
                    <span class="badge badge-${this.getStatusBadgeClass(sale.status)}">
                        ${sale.status}
                    </span>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    /**
     * Update top products table
     */
    updateTopProducts(topProducts) {
        if (!topProducts) return;

        const tbody = document.querySelector('#topProductsTable tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        topProducts.forEach((product, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${product.name}</td>
                <td>${product.category}</td>
                <td>${product.units_sold}</td>
                <td>${window.ConfigHelper.formatCurrency(product.revenue)}</td>
                <td>${window.ConfigHelper.formatCurrency(product.price)}</td>
            `;
            tbody.appendChild(row);
        });
    }

    /**
     * Update top sales reps table
     */
    updateTopSalesReps(topSalesReps) {
        if (!topSalesReps) return;

        const tbody = document.querySelector('#topSalesRepsTable tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        topSalesReps.forEach((rep, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${rep.name}</td>
                <td>${rep.email}</td>
                <td>${rep.total_sales}</td>
                <td>${window.ConfigHelper.formatCurrency(rep.revenue)}</td>
                <td>${rep.customers_count}</td>
            `;
            tbody.appendChild(row);
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
     * Start auto refresh
     */
    startAutoRefresh() {
        this.stopAutoRefresh(); // Clear any existing interval
        
        this.refreshInterval = setInterval(() => {
            if (!this.isLoading) {
                this.loadDashboardData();
            }
        }, this.refreshRate);

        // Update refresh indicator
        const indicator = document.getElementById('refreshIndicator');
        if (indicator) {
            indicator.classList.add('text-success');
            indicator.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Auto-refresh enabled';
        }
    }

    /**
     * Stop auto refresh
     */
    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }

        // Update refresh indicator
        const indicator = document.getElementById('refreshIndicator');
        if (indicator) {
            indicator.classList.remove('text-success');
            indicator.innerHTML = '<i class="fas fa-pause"></i> Auto-refresh disabled';
        }
    }

    /**
     * Show loading state
     */
    showLoading() {
        const loadingElement = document.getElementById('dashboardLoading');
        if (loadingElement) {
            loadingElement.style.display = 'block';
        }

        const refreshBtn = document.getElementById('refreshDashboard');
        if (refreshBtn) {
            refreshBtn.disabled = true;
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
        }
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        const loadingElement = document.getElementById('dashboardLoading');
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }

        const refreshBtn = document.getElementById('refreshDashboard');
        if (refreshBtn) {
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
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
        // Remove existing alerts
        const existingAlerts = document.querySelectorAll('.dashboard-alert');
        existingAlerts.forEach(alert => alert.remove());

        // Create new alert
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show dashboard-alert`;
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        // Insert at top of dashboard
        const dashboard = document.getElementById('dashboard');
        if (dashboard) {
            dashboard.insertBefore(alert, dashboard.firstChild);
        }

        // Auto dismiss after 5 seconds
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 5000);
    }

    /**
     * Export dashboard data
     */
    async exportData(format = 'json') {
        try {
            const data = await window.api.getDashboardData();
            
            let content, filename, mimeType;

            switch (format) {
                case 'json':
                    content = JSON.stringify(data, null, 2);
                    filename = `dashboard-data-${new Date().toISOString().split('T')[0]}.json`;
                    mimeType = 'application/json';
                    break;
                case 'csv':
                    content = this.convertToCSV(data);
                    filename = `dashboard-data-${new Date().toISOString().split('T')[0]}.csv`;
                    mimeType = 'text/csv';
                    break;
                default:
                    throw new Error('Unsupported export format');
            }

            // Create and download file
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showSuccess(`Data exported successfully as ${filename}`);
        } catch (error) {
            console.error('Export error:', error);
            this.showError('Failed to export data: ' + error.message);
        }
    }

    /**
     * Convert data to CSV format
     */
    convertToCSV(data) {
        // Simple CSV conversion for stats
        const stats = data.stats || {};
        const rows = [
            ['Metric', 'Value'],
            ['Total Sales', stats.totalSales || 0],
            ['Total Customers', stats.totalCustomers || 0],
            ['Total Products', stats.totalProducts || 0],
            ['Total Sales Reps', stats.totalSalesReps || 0],
            ['Average Sale Amount', stats.averageSaleAmount || 0],
            ['Sales This Month', stats.salesThisMonth || 0]
        ];

        return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    }

    /**
     * Cleanup dashboard
     */
    destroy() {
        this.stopAutoRefresh();
        
        // Destroy all charts
        Object.values(this.charts).forEach(chart => {
            if (chart) {
                chart.destroy();
            }
        });
        
        this.charts = {};
    }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DashboardManager;
} else if (typeof window !== 'undefined') {
    window.DashboardManager = DashboardManager;
}
