/* Sales dashboard functionality for SalePoint application */

// API Endpoint
const API_URL = API_CONFIG.baseUrl;

// Chart objects
let salesChart, productsChart, salesRepChart, categoryChart;

// Initialize on page load
$(document).ready(function() {
    // Load dashboard data
    loadDashboardData();
    
    // Set up event listeners
    $('#refresh-dashboard-btn').click(loadDashboardData);
    $('#time-range, #sales-rep-filter, #product-category-filter').change(function() {
        // Only reload when user clicks refresh button
        // This prevents excessive API calls
    });
});

// Load dashboard data from API
function loadDashboardData() {
    const timeRange = $('#time-range').val();
    const salesRepId = $('#sales-rep-filter').val();
    const productCategory = $('#product-category-filter').val();
    
    // Show loading spinners
    $('#total-sales-count').html('<div class="spinner-border spinner-border-sm text-white" role="status"><span class="sr-only">Loading...</span></div>');
    $('#total-revenue').html('<div class="spinner-border spinner-border-sm text-white" role="status"><span class="sr-only">Loading...</span></div>');
    $('#avg-sale-value').html('<div class="spinner-border spinner-border-sm text-white" role="status"><span class="sr-only">Loading...</span></div>');
    $('#pending-sales').html('<div class="spinner-border spinner-border-sm text-white" role="status"><span class="sr-only">Loading...</span></div>');
    
    // In a real implementation, these would be API calls
    // For demonstration, using setTimeout to simulate API delay
    
    // Load summary data
    setTimeout(() => {
        const summaryData = {
            totalSales: 142,
            totalRevenue: 52638.75,
            avgSaleValue: 370.70,
            pendingSales: 23
        };
        
        $('#total-sales-count').text(summaryData.totalSales);
        $('#total-revenue').text(formatCurrency(summaryData.totalRevenue));
        $('#avg-sale-value').text(formatCurrency(summaryData.avgSaleValue));
        $('#pending-sales').text(summaryData.pendingSales);
    }, 800);
    
    // Load chart data
    setTimeout(() => {
        // Sample data for charts
        const salesTimeData = {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            sales: [12, 19, 15, 25, 32, 39],
            revenue: [4200, 6500, 5100, 9200, 11800, 15800]
        };
        
        const topProductsData = {
            products: ['Laptop Computer', 'Smart TV 55"', 'Wireless Headphones', 'Office Chair', 'Coffee Maker'],
            quantities: [28, 22, 19, 15, 12]
        };
        
        const salesRepData = {
            reps: ['Emily Johnson', 'David Lee', 'Maria Garcia', 'James Wilson', 'Linda Chen'],
            sales: [45, 32, 28, 21, 16],
            revenue: [18500, 12800, 10500, 7300, 3500]
        };
        
        const categoryData = {
            categories: ['Electronics', 'Furniture', 'Appliances', 'Clothing', 'Other'],
            sales: [72, 35, 20, 10, 5]
        };
        
        // Render charts
        renderSalesChart(salesTimeData);
        renderProductsChart(topProductsData);
        renderSalesRepChart(salesRepData);
        renderCategoryChart(categoryData);
    }, 1000);
    
    // Load recent sales
    setTimeout(() => {
        const recentSales = [
            { saleId: 'SALE-125478', date: '2025-05-19T14:35:00', customer: 'John Smith', salesRep: 'Emily Johnson', amount: 1899.98, status: 'Completed' },
            { saleId: 'SALE-125477', date: '2025-05-19T11:22:00', customer: 'Jane Doe', salesRep: 'Maria Garcia', amount: 599.99, status: 'Completed' },
            { saleId: 'SALE-125476', date: '2025-05-18T16:45:00', customer: 'Bob Johnson', salesRep: 'James Wilson', amount: 289.97, status: 'Pending' },
            { saleId: 'SALE-125475', date: '2025-05-18T10:15:00', customer: 'Sarah Williams', salesRep: 'David Lee', amount: 1349.98, status: 'Completed' },
            { saleId: 'SALE-125474', date: '2025-05-17T15:30:00', customer: 'Michael Brown', salesRep: 'Linda Chen', amount: 749.96, status: 'Pending' }
        ];
        
        let salesHtml = '';
        recentSales.forEach(sale => {
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
                    <td>${sale.customer}</td>
                    <td>${sale.salesRep}</td>
                    <td>${formatCurrency(sale.amount)}</td>
                    <td><span class="badge ${statusClass}">${sale.status}</span></td>
                </tr>
            `;
        });
        
        $('#recent-sales-table').html(salesHtml);
    }, 900);
    
    // Load low inventory products
    setTimeout(() => {
        const lowInventoryProducts = [
            { productId: 'PROD004', name: 'Smart TV 55"', category: 'Electronics', stock: 8, reorderLevel: 10, status: 'Low' },
            { productId: 'PROD007', name: 'Bluetooth Speaker', category: 'Electronics', stock: 5, reorderLevel: 15, status: 'Critical' },
            { productId: 'PROD012', name: 'Desk Organizer', category: 'Office Supplies', stock: 7, reorderLevel: 10, status: 'Low' },
            { productId: 'PROD015', name: 'Gaming Mouse', category: 'Electronics', stock: 3, reorderLevel: 12, status: 'Critical' },
            { productId: 'PROD022', name: 'Water Kettle', category: 'Appliances', stock: 9, reorderLevel: 10, status: 'Low' }
        ];
        
        let inventoryHtml = '';
        lowInventoryProducts.forEach(product => {
            let statusClass = '';
            switch(product.status) {
                case 'Low':
                    statusClass = 'badge-warning';
                    break;
                case 'Critical':
                    statusClass = 'badge-danger';
                    break;
                default:
                    statusClass = 'badge-secondary';
            }
            
            inventoryHtml += `
                <tr>
                    <td>${product.productId}</td>
                    <td>${product.name}</td>
                    <td>${product.category}</td>
                    <td>${product.stock}</td>
                    <td>${product.reorderLevel}</td>
                    <td><span class="badge ${statusClass}">${product.status}</span></td>
                </tr>
            `;
        });
        
        $('#low-inventory-table').html(inventoryHtml);
    }, 1100);
    
    // Load sales rep filter options
    setTimeout(() => {
        const salesReps = [
            { id: 'SR001', name: 'Emily Johnson' },
            { id: 'SR002', name: 'David Lee' },
            { id: 'SR003', name: 'Maria Garcia' },
            { id: 'SR004', name: 'James Wilson' },
            { id: 'SR005', name: 'Linda Chen' }
        ];
        
        let salesRepOptions = '<option value="">All Sales Reps</option>';
        salesReps.forEach(rep => {
            salesRepOptions += `<option value="${rep.id}">${rep.name}</option>`;
        });
        
        $('#sales-rep-filter').html(salesRepOptions);
    }, 500);
}

// Render sales over time chart
function renderSalesChart(data) {
    const ctx = document.getElementById('sales-chart').getContext('2d');
    
    // Destroy existing chart if it exists
    if (salesChart) {
        salesChart.destroy();
    }
    
    salesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [
                {
                    label: 'Sales Count',
                    data: data.sales,
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 2,
                    tension: 0.3,
                    yAxisID: 'y'
                },
                {
                    label: 'Revenue',
                    data: data.revenue,
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 2,
                    tension: 0.3,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Sales Count'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Revenue ($)'
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });
}

// Render top selling products chart
function renderProductsChart(data) {
    const ctx = document.getElementById('products-chart').getContext('2d');
    
    // Destroy existing chart if it exists
    if (productsChart) {
        productsChart.destroy();
    }
    
    productsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.products,
            datasets: [{
                label: 'Units Sold',
                data: data.quantities,
                backgroundColor: [
                    'rgba(255, 99, 132, 0.7)',
                    'rgba(54, 162, 235, 0.7)',
                    'rgba(255, 206, 86, 0.7)',
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(153, 102, 255, 0.7)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Units Sold'
                    }
                }
            }
        }
    });
}

// Render sales rep performance chart
function renderSalesRepChart(data) {
    const ctx = document.getElementById('sales-rep-chart').getContext('2d');
    
    // Destroy existing chart if it exists
    if (salesRepChart) {
        salesRepChart.destroy();
    }
    
    salesRepChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.reps,
            datasets: [{
                label: 'Sales Count',
                data: data.sales,
                backgroundColor: 'rgba(54, 162, 235, 0.7)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1,
                yAxisID: 'y'
            },
            {
                label: 'Revenue ($)',
                data: data.revenue,
                backgroundColor: 'rgba(255, 159, 64, 0.7)',
                borderColor: 'rgba(255, 159, 64, 1)',
                borderWidth: 1,
                yAxisID: 'y1'
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Sales Count'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Revenue ($)'
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });
}

// Render category distribution chart
function renderCategoryChart(data) {
    const ctx = document.getElementById('category-chart').getContext('2d');
    
    // Destroy existing chart if it exists
    if (categoryChart) {
        categoryChart.destroy();
    }
    
    categoryChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: data.categories,
            datasets: [{
                data: data.sales,
                backgroundColor: [
                    'rgba(255, 99, 132, 0.7)',
                    'rgba(54, 162, 235, 0.7)',
                    'rgba(255, 206, 86, 0.7)',
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(153, 102, 255, 0.7)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}
