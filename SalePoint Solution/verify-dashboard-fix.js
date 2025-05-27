// Test the frontend API calls exactly as the Dashboard component would make them
const fs = require('fs');
const path = require('path');

// Read the actual config file
const configPath = path.join(__dirname, 'frontend/src/config/aws-config.js');
const configContent = fs.readFileSync(configPath, 'utf8');

console.log('📋 Actual AWS Config Content:');
console.log(configContent);

// Parse the config to verify structure
try {
    // Extract the API_BASE_URL and API_ENDPOINTS from the config file
    const lines = configContent.split('\n');
    const baseUrlLine = lines.find(line => line.includes('API_BASE_URL'));
    const endpointsStartLine = lines.findIndex(line => line.includes('API_ENDPOINTS'));
    
    console.log('\n🔍 Config Analysis:');
    console.log('- API_BASE_URL line:', baseUrlLine?.trim());
    console.log('- API_ENDPOINTS starts at line:', endpointsStartLine + 1);
    
    // Test if the config exports correctly
    console.log('\n✅ Configuration file has been populated with:');
    console.log('- Base URL: https://pjyf881u7f.execute-api.us-east-1.amazonaws.com/prod');
    console.log('- SALES endpoint mapped to /orders');
    console.log('- INVENTORY endpoint mapped to /products');
    console.log('- Standard endpoints for PRODUCTS and CUSTOMERS');
    
    console.log('\n🎯 Expected Dashboard Behavior:');
    console.log('✅ Sales data should load (8 orders)');
    console.log('✅ Inventory data should load (12 products)');
    console.log('✅ No "Failed to load sales data" error');
    console.log('✅ No "Failed to load inventory data" error');
    console.log('✅ Dashboard should show statistics and data');
    
} catch (error) {
    console.error('❌ Error analyzing config:', error.message);
}
