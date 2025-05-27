const axios = require('axios');

const API_BASE_URL = 'https://pjyf881u7f.execute-api.us-east-1.amazonaws.com/prod';

async function testDashboardData() {
    console.log('🧪 Testing Dashboard Data Structure...\n');
    
    try {
        // Test Sales endpoint (maps to orders)
        console.log('📊 Testing Sales Data...');
        const salesResponse = await axios.get(`${API_BASE_URL}/orders`, { params: { limit: 100 } });
        console.log('Sales Response Structure:');
        console.log('- Response data keys:', Object.keys(salesResponse.data));
        if (salesResponse.data.orders) {
            console.log('- Sales count:', salesResponse.data.orders.length);
            console.log('- First sales item:', JSON.stringify(salesResponse.data.orders[0], null, 2));
        }
        
        // Simulate what apiService.getSales() returns
        const transformedSales = {
            sales: salesResponse.data.orders,
            count: salesResponse.data.count || salesResponse.data.orders.length,
            message: salesResponse.data.message
        };
        console.log('- Transformed sales structure:', Object.keys(transformedSales));
        console.log('- Sales array length:', transformedSales.sales?.length || 0);
        
        console.log('\n📦 Testing Inventory Data...');
        const inventoryResponse = await axios.get(`${API_BASE_URL}/products`, { params: { limit: 1000 } });
        console.log('Inventory Response Structure:');
        console.log('- Response data keys:', Object.keys(inventoryResponse.data));
        if (inventoryResponse.data.products) {
            console.log('- Products count:', inventoryResponse.data.products.length);
            console.log('- First product:', JSON.stringify(inventoryResponse.data.products[0], null, 2));
        }
        
        // Simulate what apiService.getInventory() returns
        const products = inventoryResponse.data.products;
        const lowStockProducts = products.filter(p => p.stock <= 10);
        const outOfStockProducts = products.filter(p => p.stock === 0);
        
        const transformedInventory = {
            inventory: products.map(p => ({
                productId: p.productId,
                name: p.name,
                stock: p.stock,
                price: p.price,
                category: p.category,
                status: p.stock === 0 ? 'out-of-stock' : p.stock <= 10 ? 'low-stock' : 'in-stock'
            })),
            lowStockProducts,
            outOfStockProducts,
            totalProducts: products.length,
            lowStockCount: lowStockProducts.length,
            outOfStockCount: outOfStockProducts.length
        };
        
        console.log('- Transformed inventory structure:', Object.keys(transformedInventory));
        console.log('- Low stock products count:', transformedInventory.lowStockCount);
        console.log('- Out of stock products count:', transformedInventory.outOfStockCount);
        
        console.log('\n✅ Dashboard should receive:');
        console.log('- totalSales:', transformedSales.sales?.length || 0);
        console.log('- lowStockProducts:', transformedInventory.lowStockCount);
        console.log('- recentSales: first 5 sales items');
        console.log('- stockAlerts: first 5 low stock items');
        
    } catch (error) {
        console.error('❌ Error testing dashboard data:', error.message);
    }
}

testDashboardData();
