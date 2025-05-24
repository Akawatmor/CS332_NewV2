/**
 * Main Application Module
 * Handles application initialization, routing, and global functionality
 */

class SalePointApp {
    constructor() {
        this.currentPage = 'dashboard';
        this.modules = {};
        this.isInitialized = false;
        this.navigationHistory = [];
        this.autoRefreshInterval = null;
        this.notifications = [];
        
        this.init();
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            // Show loading screen
            this.showLoadingScreen();

            // Initialize configuration
            await this.initializeConfig();

            // Setup global error handling
            this.setupGlobalErrorHandling();

            // Initialize navigation
            this.initializeNavigation();

            // Initialize global event listeners
            this.initializeGlobalEventListeners();

            // Initialize modules
            await this.initializeModules();

            // Setup auto-refresh for dashboard
            this.setupAutoRefresh();

            // Initialize notifications
            this.initializeNotifications();

            // Load initial page
            await this.loadInitialPage();

            // Hide loading screen
            this.hideLoadingScreen();

            this.isInitialized = true;
            console.log('SalePoint application initialized successfully');

        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.showInitializationError(error);
        }
    }

    /**
     * Initialize configuration
     */
    async initializeConfig() {
        try {
            // Validate required configuration
            if (!CONFIG.api.baseURL) {
                throw new Error('API base URL not configured');
            }

            // Test API connectivity
            const healthCheck = await api.healthCheck();
            if (!healthCheck.success) {
                console.warn('API health check failed, but continuing...');
            }

        } catch (error) {
            console.error('Configuration initialization failed:', error);
            throw error;
        }
    }

    /**
     * Setup global error handling
     */
    setupGlobalErrorHandling() {
        // Handle uncaught errors
        window.addEventListener('error', (event) => {
            console.error('Uncaught error:', event.error);
            this.handleGlobalError(event.error);
        });

        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.handleGlobalError(event.reason);
        });

        // Handle API errors globally
        window.addEventListener('apiError', (event) => {
            this.handleApiError(event.detail);
        });
    }

    /**
     * Initialize navigation
     */
    initializeNavigation() {
        // Handle navigation links
        document.querySelectorAll('[data-page]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.currentTarget.getAttribute('data-page');
                this.navigateToPage(page);
            });
        });

        // Handle browser back/forward
        window.addEventListener('popstate', (event) => {
            if (event.state && event.state.page) {
                this.navigateToPage(event.state.page, false);
            }
        });

        // Handle logo click - go to dashboard
        const logo = document.querySelector('.navbar-brand');
        if (logo) {
            logo.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateToPage('dashboard');
            });
        }
    }

    /**
     * Initialize global event listeners
     */
    initializeGlobalEventListeners() {
        // Handle logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }

        // Handle settings
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                this.showSettings();
            });
        }

        // Handle refresh button
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshCurrentPage();
            });
        }

        // Handle search (global)
        const globalSearch = document.getElementById('globalSearch');
        if (globalSearch) {
            globalSearch.addEventListener('input', debounce((e) => {
                this.performGlobalSearch(e.target.value);
            }, 300));
        }

        // Handle keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        // Handle window resize
        window.addEventListener('resize', debounce(() => {
            this.handleWindowResize();
        }, 250));

        // Handle online/offline status
        window.addEventListener('online', () => {
            this.handleConnectivityChange(true);
        });

        window.addEventListener('offline', () => {
            this.handleConnectivityChange(false);
        });
    }

    /**
     * Initialize modules
     */
    async initializeModules() {
        try {
            // Initialize each module
            this.modules = {
                dashboard: new Dashboard(),
                products: new Products(),
                customers: new Customers(),
                sales: new Sales(),
                salesReps: new SalesRepresentatives()
            };

            console.log('All modules initialized successfully');
        } catch (error) {
            console.error('Module initialization failed:', error);
            throw error;
        }
    }

    /**
     * Setup auto-refresh
     */
    setupAutoRefresh() {
        if (CONFIG.dashboard.autoRefresh) {
            this.autoRefreshInterval = setInterval(() => {
                if (this.currentPage === 'dashboard' && document.visibilityState === 'visible') {
                    this.modules.dashboard?.refreshData();
                }
            }, CONFIG.dashboard.refreshInterval);
        }
    }

    /**
     * Initialize notifications
     */
    initializeNotifications() {
        // Request notification permission if supported
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        // Setup notification container
        if (!document.getElementById('notificationContainer')) {
            const container = document.createElement('div');
            container.id = 'notificationContainer';
            container.className = 'notification-container';
            document.body.appendChild(container);
        }
    }

    /**
     * Load initial page
     */
    async loadInitialPage() {
        // Get initial page from URL hash or default to dashboard
        const hash = window.location.hash.substring(1);
        const initialPage = hash || 'dashboard';
        
        await this.navigateToPage(initialPage, false);
    }

    /**
     * Navigate to page
     */
    async navigateToPage(page, updateHistory = true) {
        try {
            // Validate page
            if (!this.modules[page]) {
                console.warn(`Unknown page: ${page}, redirecting to dashboard`);
                page = 'dashboard';
            }

            // Update navigation history
            if (updateHistory) {
                this.navigationHistory.push(this.currentPage);
                window.history.pushState({ page }, '', `#${page}`);
            }

            // Hide all pages
            document.querySelectorAll('.page-content').forEach(pageEl => {
                pageEl.style.display = 'none';
            });

            // Show target page
            const targetPage = document.getElementById(`${page}Page`);
            if (targetPage) {
                targetPage.style.display = 'block';
            }

            // Update navigation active state
            this.updateNavigationState(page);

            // Update current page
            const previousPage = this.currentPage;
            this.currentPage = page;

            // Initialize/refresh page module
            if (this.modules[page]) {
                if (typeof this.modules[page].init === 'function') {
                    await this.modules[page].init();
                } else if (typeof this.modules[page].loadData === 'function') {
                    await this.modules[page].loadData();
                }
            }

            // Update page title
            this.updatePageTitle(page);

            // Trigger page change event
            window.dispatchEvent(new CustomEvent('pageChanged', {
                detail: { from: previousPage, to: page }
            }));

        } catch (error) {
            console.error(`Error navigating to page ${page}:`, error);
            this.showError('Failed to load page');
        }
    }

    /**
     * Update navigation state
     */
    updateNavigationState(activePage) {
        // Update sidebar navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-page') === activePage) {
                link.classList.add('active');
            }
        });

        // Update breadcrumb if exists
        const breadcrumb = document.getElementById('breadcrumb');
        if (breadcrumb) {
            const pageTitle = this.getPageTitle(activePage);
            breadcrumb.innerHTML = `
                <li class="breadcrumb-item"><a href="#dashboard">Dashboard</a></li>
                ${activePage !== 'dashboard' ? `<li class="breadcrumb-item active">${pageTitle}</li>` : ''}
            `;
        }
    }

    /**
     * Update page title
     */
    updatePageTitle(page) {
        const pageTitle = this.getPageTitle(page);
        document.title = `${pageTitle} - SalePoint`;
        
        const pageHeader = document.getElementById('pageHeader');
        if (pageHeader) {
            pageHeader.textContent = pageTitle;
        }
    }

    /**
     * Get page title
     */
    getPageTitle(page) {
        const titles = {
            dashboard: 'Dashboard',
            products: 'Products',
            customers: 'Customers',
            sales: 'Sales',
            salesReps: 'Sales Representatives'
        };
        return titles[page] || 'SalePoint';
    }

    /**
     * Refresh current page
     */
    async refreshCurrentPage() {
        try {
            const refreshBtn = document.getElementById('refreshBtn');
            if (refreshBtn) {
                refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                refreshBtn.disabled = true;
            }

            if (this.modules[this.currentPage]) {
                if (typeof this.modules[this.currentPage].loadData === 'function') {
                    await this.modules[this.currentPage].loadData();
                } else if (typeof this.modules[this.currentPage].refresh === 'function') {
                    await this.modules[this.currentPage].refresh();
                }
            }

            this.showNotification('Page refreshed successfully', 'success');

        } catch (error) {
            console.error('Error refreshing page:', error);
            this.showError('Failed to refresh page');
        } finally {
            const refreshBtn = document.getElementById('refreshBtn');
            if (refreshBtn) {
                refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
                refreshBtn.disabled = false;
            }
        }
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcuts(event) {
        // Ctrl/Cmd + R - Refresh page
        if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
            event.preventDefault();
            this.refreshCurrentPage();
        }

        // Ctrl/Cmd + 1-5 - Navigate to pages
        if ((event.ctrlKey || event.metaKey) && event.key >= '1' && event.key <= '5') {
            event.preventDefault();
            const pages = ['dashboard', 'products', 'customers', 'sales', 'salesReps'];
            const pageIndex = parseInt(event.key) - 1;
            if (pages[pageIndex]) {
                this.navigateToPage(pages[pageIndex]);
            }
        }

        // Escape - Close modals
        if (event.key === 'Escape') {
            const openModals = document.querySelectorAll('.modal.show');
            openModals.forEach(modal => {
                const modalInstance = bootstrap.Modal.getInstance(modal);
                if (modalInstance) {
                    modalInstance.hide();
                }
            });
        }
    }

    /**
     * Handle window resize
     */
    handleWindowResize() {
        // Update charts if dashboard is active
        if (this.currentPage === 'dashboard' && this.modules.dashboard) {
            if (typeof this.modules.dashboard.resizeCharts === 'function') {
                this.modules.dashboard.resizeCharts();
            }
        }

        // Update responsive elements
        this.updateResponsiveElements();
    }

    /**
     * Handle connectivity change
     */
    handleConnectivityChange(isOnline) {
        if (isOnline) {
            this.showNotification('Connection restored', 'success');
            // Refresh current page data
            this.refreshCurrentPage();
        } else {
            this.showNotification('Connection lost. Some features may not work.', 'warning', 5000);
        }
    }

    /**
     * Update responsive elements
     */
    updateResponsiveElements() {
        const isMobile = window.innerWidth < 768;
        
        // Toggle mobile-specific features
        document.body.classList.toggle('mobile-view', isMobile);
        
        // Update table responsiveness
        document.querySelectorAll('.table-responsive').forEach(table => {
            if (isMobile) {
                table.classList.add('table-sm');
            } else {
                table.classList.remove('table-sm');
            }
        });
    }

    /**
     * Perform global search
     */
    async performGlobalSearch(query) {
        if (!query || query.length < 2) {
            this.hideSearchResults();
            return;
        }

        try {
            // Show search loading
            this.showSearchLoading();

            // Perform search across all modules
            const results = await Promise.allSettled([
                api.searchProducts({ search: query, limit: 3 }),
                api.searchCustomers({ search: query, limit: 3 }),
                api.searchSales({ search: query, limit: 3 }),
                api.searchSalesReps({ search: query, limit: 3 })
            ]);

            const searchResults = {
                products: results[0].status === 'fulfilled' ? results[0].value.data?.products || [] : [],
                customers: results[1].status === 'fulfilled' ? results[1].value.data?.customers || [] : [],
                sales: results[2].status === 'fulfilled' ? results[2].value.data?.sales || [] : [],
                salesReps: results[3].status === 'fulfilled' ? results[3].value.data?.salesReps || [] : []
            };

            this.displaySearchResults(searchResults, query);

        } catch (error) {
            console.error('Global search error:', error);
            this.hideSearchResults();
        }
    }

    /**
     * Display search results
     */
    displaySearchResults(results, query) {
        const container = document.getElementById('searchResults');
        if (!container) return;

        const totalResults = Object.values(results).reduce((sum, arr) => sum + arr.length, 0);

        if (totalResults === 0) {
            container.innerHTML = `
                <div class="search-no-results">
                    <i class="fas fa-search text-muted"></i>
                    <p>No results found for "${escapeHtml(query)}"</p>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="search-results-header">
                    <h6>Search Results for "${escapeHtml(query)}"</h6>
                </div>
                ${this.renderSearchCategory('Products', results.products, 'products')}
                ${this.renderSearchCategory('Customers', results.customers, 'customers')}
                ${this.renderSearchCategory('Sales', results.sales, 'sales')}
                ${this.renderSearchCategory('Sales Reps', results.salesReps, 'salesReps')}
            `;
        }

        container.style.display = 'block';
    }

    /**
     * Render search category
     */
    renderSearchCategory(title, items, page) {
        if (items.length === 0) return '';

        return `
            <div class="search-category">
                <h6 class="search-category-title">${title}</h6>
                ${items.map(item => `
                    <div class="search-result-item" onclick="app.navigateToItemDetail('${page}', ${item.id})">
                        <div class="search-result-title">${escapeHtml(item.name || item.customer_name || `Sale #${item.id}`)}</div>
                        <div class="search-result-description">${this.getItemDescription(item, page)}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    /**
     * Get item description for search results
     */
    getItemDescription(item, page) {
        switch (page) {
            case 'products':
                return `$${item.price} - ${item.category || 'No category'}`;
            case 'customers':
                return item.email || 'No email';
            case 'sales':
                return `${formatCurrency(item.total_amount)} - ${formatDate(item.sale_date)}`;
            case 'salesReps':
                return item.department || 'No department';
            default:
                return '';
        }
    }

    /**
     * Navigate to item detail
     */
    navigateToItemDetail(page, itemId) {
        this.hideSearchResults();
        this.navigateToPage(page);
        
        // After navigation, show item details
        setTimeout(() => {
            const module = this.modules[page];
            if (module && typeof module.viewItem === 'function') {
                module.viewItem(itemId);
            }
        }, 100);
    }

    /**
     * Show/hide search results
     */
    showSearchLoading() {
        const container = document.getElementById('searchResults');
        if (container) {
            container.innerHTML = '<div class="search-loading"><i class="fas fa-spinner fa-spin"></i> Searching...</div>';
            container.style.display = 'block';
        }
    }

    hideSearchResults() {
        const container = document.getElementById('searchResults');
        if (container) {
            container.style.display = 'none';
        }
    }

    /**
     * Show settings modal
     */
    showSettings() {
        const modal = document.getElementById('settingsModal');
        if (modal) {
            new bootstrap.Modal(modal).show();
        }
    }

    /**
     * Handle logout
     */
    logout() {
        if (confirm('Are you sure you want to logout?')) {
            // Clear any stored data
            localStorage.removeItem('salepoint_session');
            sessionStorage.clear();
            
            // Clear auto-refresh
            if (this.autoRefreshInterval) {
                clearInterval(this.autoRefreshInterval);
            }
            
            // Redirect to login page or reload
            window.location.reload();
        }
    }

    /**
     * Show loading screen
     */
    showLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.display = 'flex';
        }
    }

    /**
     * Hide loading screen
     */
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
    }

    /**
     * Show initialization error
     */
    showInitializationError(error) {
        const errorScreen = document.getElementById('errorScreen');
        if (errorScreen) {
            errorScreen.querySelector('.error-message').textContent = 
                error.message || 'Failed to initialize application';
            errorScreen.style.display = 'flex';
        }
        this.hideLoadingScreen();
    }

    /**
     * Handle global errors
     */
    handleGlobalError(error) {
        console.error('Global error:', error);
        
        // Don't show notifications for network errors in background
        if (error.name === 'NetworkError' && document.visibilityState === 'hidden') {
            return;
        }
        
        this.showNotification('An unexpected error occurred', 'error');
    }

    /**
     * Handle API errors
     */
    handleApiError(error) {
        if (error.status === 401) {
            this.showNotification('Session expired. Please login again.', 'warning');
            setTimeout(() => this.logout(), 2000);
        } else if (error.status === 403) {
            this.showNotification('Access denied', 'error');
        } else if (error.status >= 500) {
            this.showNotification('Server error. Please try again later.', 'error');
        }
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info', duration = 3000) {
        const notification = {
            id: Date.now(),
            message,
            type,
            timestamp: new Date()
        };

        this.notifications.push(notification);
        this.renderNotification(notification);

        if (duration > 0) {
            setTimeout(() => {
                this.removeNotification(notification.id);
            }, duration);
        }

        // Show browser notification for important messages
        if (type === 'error' && 'Notification' in window && Notification.permission === 'granted') {
            new Notification('SalePoint', {
                body: message,
                icon: '/favicon.ico'
            });
        }
    }

    /**
     * Render notification
     */
    renderNotification(notification) {
        const container = document.getElementById('notificationContainer');
        if (!container) return;

        const notificationEl = document.createElement('div');
        notificationEl.className = `notification notification-${notification.type}`;
        notificationEl.setAttribute('data-notification-id', notification.id);
        notificationEl.innerHTML = `
            <div class="notification-content">
                <i class="fas ${this.getNotificationIcon(notification.type)}"></i>
                <span>${escapeHtml(notification.message)}</span>
            </div>
            <button type="button" class="notification-close" onclick="app.removeNotification(${notification.id})">
                <i class="fas fa-times"></i>
            </button>
        `;

        container.appendChild(notificationEl);

        // Animate in
        setTimeout(() => notificationEl.classList.add('show'), 10);
    }

    /**
     * Remove notification
     */
    removeNotification(id) {
        const notificationEl = document.querySelector(`[data-notification-id="${id}"]`);
        if (notificationEl) {
            notificationEl.classList.remove('show');
            setTimeout(() => notificationEl.remove(), 300);
        }

        this.notifications = this.notifications.filter(n => n.id !== id);
    }

    /**
     * Get notification icon
     */
    getNotificationIcon(type) {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        return icons[type] || icons.info;
    }

    /**
     * Show error message (alias for showNotification)
     */
    showError(message) {
        this.showNotification(message, 'error');
    }

    /**
     * Show success message (alias for showNotification)
     */
    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    /**
     * Get application status
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            currentPage: this.currentPage,
            modules: Object.keys(this.modules),
            notifications: this.notifications.length,
            online: navigator.onLine
        };
    }
}

// Global utility functions
window.showErrorMessage = (message) => {
    if (window.app) {
        window.app.showError(message);
    } else {
        console.error(message);
    }
};

window.showSuccessMessage = (message) => {
    if (window.app) {
        window.app.showSuccess(message);
    } else {
        console.log(message);
    }
};

window.showLoadingState = (elementId) => {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = '<div class="text-center"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
    }
};

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new SalePointApp();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SalePointApp;
}
