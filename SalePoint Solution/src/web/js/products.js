/* Product page functionality for SalePoint application */

// API Endpoint
const API_URL = API_CONFIG.baseUrl;

// Initialize on page load
$(document).ready(function() {
    // Load products
    loadProducts();
    
    // Set up event listeners
    $('#search-btn').click(searchProducts);
    $('#product-search').keypress(function(e) {
        if (e.which === 13) {
            searchProducts();
        }
    });
    
    $('#category-filter').change(searchProducts);
    
    // Event delegation for product cards
    $('#products-container').on('click', '.product-card', function() {
        const productId = $(this).data('product-id');
        loadProductDetails(productId);
    });
    
    // Add to sale button
    $('#add-to-sale-btn').click(function() {
        // Get product ID from the modal
        const productId = $('#productModal').data('product-id');
        // Add to local storage for the sales page
        addProductToSale(productId);
        // Show confirmation
        alert('Product added to sale!');
    });
});

// Load all products
function loadProducts() {
    $('#products-container').html('<div class="col-12 text-center"><div class="spinner-border text-primary" role="status"><span class="sr-only">Loading...</span></div></div>');
    
    // Simulate API call for demonstration purposes
    // In a real implementation, use the actual API
    setTimeout(() => {
        // Sample product data (would come from the API)
        const products = [
            {
                product_id: 'PROD001',
                product_name: 'Laptop Computer',
                description: 'High-performance laptop with 16GB RAM and 512GB SSD. Perfect for professional use.',
                price: 1299.99,
                stock_quantity: 50,
                category: 'electronics',
                imageUrl: 'https://via.placeholder.com/400x300?text=Laptop'
            },
            {
                product_id: 'PROD002',
                product_name: 'Office Chair',
                description: 'Ergonomic office chair with lumbar support and adjustable height.',
                price: 249.99,
                stock_quantity: 100,
                category: 'furniture',
                imageUrl: 'https://via.placeholder.com/400x300?text=Office+Chair'
            },
            {
                product_id: 'PROD003',
                product_name: 'Wireless Headphones',
                description: 'Noise-cancelling wireless headphones with 30-hour battery life and premium sound quality.',
                price: 199.99,
                stock_quantity: 75,
                category: 'electronics',
                imageUrl: 'https://via.placeholder.com/400x300?text=Headphones'
            },
            {
                product_id: 'PROD004',
                product_name: 'Smart TV 55"',
                description: '4K Ultra HD Smart TV with built-in streaming apps and voice control.',
                price: 599.99,
                stock_quantity: 30,
                category: 'electronics',
                imageUrl: 'https://via.placeholder.com/400x300?text=Smart+TV'
            },
            {
                product_id: 'PROD005',
                product_name: 'Coffee Maker',
                description: 'Programmable coffee maker with 12-cup capacity and auto-shutoff feature.',
                price: 89.99,
                stock_quantity: 45,
                category: 'appliances',
                imageUrl: 'https://via.placeholder.com/400x300?text=Coffee+Maker'
            },
            {
                product_id: 'PROD006',
                product_name: 'Desk Lamp',
                description: 'Adjustable LED desk lamp with multiple brightness settings and USB charging port.',
                price: 49.99,
                stock_quantity: 60,
                category: 'furniture',
                imageUrl: 'https://via.placeholder.com/400x300?text=Desk+Lamp'
            }
        ];
        
        displayProducts(products);
        
        /* In a real implementation, use the actual API:
        $.ajax({
            url: `${API_URL}/products`,
            method: 'GET',
            success: function(data) {
                displayProducts(data);
            },
            error: function(error) {
                console.error('Error loading products:', error);
                $('#products-container').html('<div class="col-12"><div class="alert alert-danger">Error loading products. Please try again later.</div></div>');
            }
        });
        */
    }, 800);
}

// Search products based on input and filters
function searchProducts() {
    const searchTerm = $('#product-search').val().toLowerCase();
    const category = $('#category-filter').val();
    
    $('#products-container').html('<div class="col-12 text-center"><div class="spinner-border text-primary" role="status"><span class="sr-only">Loading...</span></div></div>');
    
    // Simulate API call with search parameters
    setTimeout(() => {
        // Sample product data (would come from the API)
        const allProducts = [
            {
                product_id: 'PROD001',
                product_name: 'Laptop Computer',
                description: 'High-performance laptop with 16GB RAM and 512GB SSD. Perfect for professional use.',
                price: 1299.99,
                stock_quantity: 50,
                category: 'electronics',
                imageUrl: 'https://via.placeholder.com/400x300?text=Laptop'
            },
            {
                product_id: 'PROD002',
                product_name: 'Office Chair',
                description: 'Ergonomic office chair with lumbar support and adjustable height.',
                price: 249.99,
                stock_quantity: 100,
                category: 'furniture',
                imageUrl: 'https://via.placeholder.com/400x300?text=Office+Chair'
            },
            {
                product_id: 'PROD003',
                product_name: 'Wireless Headphones',
                description: 'Noise-cancelling wireless headphones with 30-hour battery life and premium sound quality.',
                price: 199.99,
                stock_quantity: 75,
                category: 'electronics',
                imageUrl: 'https://via.placeholder.com/400x300?text=Headphones'
            },
            {
                product_id: 'PROD004',
                product_name: 'Smart TV 55"',
                description: '4K Ultra HD Smart TV with built-in streaming apps and voice control.',
                price: 599.99,
                stock_quantity: 30,
                category: 'electronics',
                imageUrl: 'https://via.placeholder.com/400x300?text=Smart+TV'
            },
            {
                product_id: 'PROD005',
                product_name: 'Coffee Maker',
                description: 'Programmable coffee maker with 12-cup capacity and auto-shutoff feature.',
                price: 89.99,
                stock_quantity: 45,
                category: 'appliances',
                imageUrl: 'https://via.placeholder.com/400x300?text=Coffee+Maker'
            },
            {
                product_id: 'PROD006',
                product_name: 'Desk Lamp',
                description: 'Adjustable LED desk lamp with multiple brightness settings and USB charging port.',
                price: 49.99,
                stock_quantity: 60,
                category: 'furniture',
                imageUrl: 'https://via.placeholder.com/400x300?text=Desk+Lamp'
            }
        ];
        
        // Filter the products based on search criteria
        let filteredProducts = allProducts;
        
        if (searchTerm) {
            filteredProducts = filteredProducts.filter(p => 
                p.product_name.toLowerCase().includes(searchTerm) || 
                p.description.toLowerCase().includes(searchTerm) ||
                p.product_id.toLowerCase().includes(searchTerm)
            );
        }
        
        if (category) {
            filteredProducts = filteredProducts.filter(p => p.category === category);
        }
        
        displayProducts(filteredProducts);
        
        /* In a real implementation, use the actual API:
        let url = `${API_URL}/products`;
        if (searchTerm || category) {
            url += '?';
            if (searchTerm) {
                url += `search=${encodeURIComponent(searchTerm)}`;
            }
            if (category) {
                url += searchTerm ? `&category=${encodeURIComponent(category)}` : `category=${encodeURIComponent(category)}`;
            }
        }
        
        $.ajax({
            url: url,
            method: 'GET',
            success: function(data) {
                displayProducts(data);
            },
            error: function(error) {
                console.error('Error searching products:', error);
                $('#products-container').html('<div class="col-12"><div class="alert alert-danger">Error searching products. Please try again later.</div></div>');
            }
        });
        */
    }, 500);
}

// Display products in cards
function displayProducts(products) {
    if (!products || products.length === 0) {
        $('#products-container').html('<div class="col-12"><div class="alert alert-info">No products found.</div></div>');
        return;
    }
    
    let html = '';
    products.forEach(product => {
        html += `
            <div class="col-md-4 mb-4">
                <div class="card product-card" data-product-id="${product.product_id}">
                    <img src="${product.imageUrl || 'https://via.placeholder.com/400x300?text=No+Image'}" class="card-img-top" alt="${product.product_name}">
                    <div class="card-body">
                        <h5 class="card-title">${product.product_name}</h5>
                        <p class="card-text">${product.description.substring(0, 100)}...</p>
                        <p class="card-text"><strong>Price:</strong> ${formatCurrency(product.price)}</p>
                        <p class="card-text"><strong>In Stock:</strong> ${product.stock_quantity}</p>
                        <button class="btn btn-primary view-details">View Details</button>
                    </div>
                </div>
            </div>
        `;
    });
    
    $('#products-container').html(html);
}

// Load product details for the modal
function loadProductDetails(productId) {
    // Simulate API call for product details
    setTimeout(() => {
        // Sample product data (would come from the API)
        const products = {
            'PROD001': {
                product_id: 'PROD001',
                product_name: 'Laptop Computer',
                description: 'High-performance laptop with 16GB RAM and 512GB SSD. Perfect for professional use with the latest 11th Gen Intel Core i7 processor and dedicated NVIDIA graphics card. Includes Windows 11 Pro and Microsoft Office.',
                price: 1299.99,
                stock_quantity: 50,
                category: 'electronics',
                imageUrl: 'https://via.placeholder.com/400x300?text=Laptop',
                specUrl: 'https://example.com/specs/laptop.pdf'
            },
            'PROD002': {
                product_id: 'PROD002',
                product_name: 'Office Chair',
                description: 'Ergonomic office chair with lumbar support and adjustable height. Features breathable mesh back, padded seat, and smooth-rolling casters. Supports up to 300 lbs and comes with a 5-year warranty.',
                price: 249.99,
                stock_quantity: 100,
                category: 'furniture',
                imageUrl: 'https://via.placeholder.com/400x300?text=Office+Chair',
                specUrl: 'https://example.com/specs/chair.pdf'
            },
            'PROD003': {
                product_id: 'PROD003',
                product_name: 'Wireless Headphones',
                description: 'Noise-cancelling wireless headphones with 30-hour battery life and premium sound quality. Features Bluetooth 5.0 connectivity, built-in microphone for calls, and foldable design for easy storage and travel.',
                price: 199.99,
                stock_quantity: 75,
                category: 'electronics',
                imageUrl: 'https://via.placeholder.com/400x300?text=Headphones',
                specUrl: 'https://example.com/specs/headphones.pdf'
            },
            'PROD004': {
                product_id: 'PROD004',
                product_name: 'Smart TV 55"',
                description: '4K Ultra HD Smart TV with built-in streaming apps and voice control. Features HDR support, 120Hz refresh rate, and multiple HDMI ports for gaming consoles and media players.',
                price: 599.99,
                stock_quantity: 30,
                category: 'electronics',
                imageUrl: 'https://via.placeholder.com/400x300?text=Smart+TV',
                specUrl: 'https://example.com/specs/tv.pdf'
            },
            'PROD005': {
                product_id: 'PROD005',
                product_name: 'Coffee Maker',
                description: 'Programmable coffee maker with 12-cup capacity and auto-shutoff feature. Includes reusable filter, anti-drip system, and built-in water filter for the perfect cup of coffee every time.',
                price: 89.99,
                stock_quantity: 45,
                category: 'appliances',
                imageUrl: 'https://via.placeholder.com/400x300?text=Coffee+Maker',
                specUrl: 'https://example.com/specs/coffeemaker.pdf'
            },
            'PROD006': {
                product_id: 'PROD006',
                product_name: 'Desk Lamp',
                description: 'Adjustable LED desk lamp with multiple brightness settings and USB charging port. Features touch controls, flexible gooseneck design, and energy-efficient LED bulbs that last up to 50,000 hours.',
                price: 49.99,
                stock_quantity: 60,
                category: 'furniture',
                imageUrl: 'https://via.placeholder.com/400x300?text=Desk+Lamp',
                specUrl: 'https://example.com/specs/lamp.pdf'
            }
        };
        
        const product = products[productId];
        
        if (product) {
            // Populate modal with product details
            $('#productModal').data('product-id', product.product_id);
            $('#productModalTitle').text(product.product_name);
            $('#product-name').text(product.product_name);
            $('#product-description').text(product.description);
            $('#product-price').text(formatCurrency(product.price).replace('$', ''));
            $('#product-stock').text(product.stock_quantity);
            $('#product-category').text(product.category);
            $('#product-image').attr('src', product.imageUrl || 'https://via.placeholder.com/400x300?text=No+Image');
            $('#product-spec-link').attr('href', product.specUrl);
            
            // Show the modal
            $('#productModal').modal('show');
        } else {
            alert('Product details not found.');
        }
        
        /* In a real implementation, use the actual API:
        $.ajax({
            url: `${API_URL}/products/${productId}`,
            method: 'GET',
            success: function(product) {
                // Populate modal with product details
                $('#productModal').data('product-id', product.product_id);
                $('#productModalTitle').text(product.product_name);
                $('#product-name').text(product.product_name);
                $('#product-description').text(product.description);
                $('#product-price').text(formatCurrency(product.price).replace('$', ''));
                $('#product-stock').text(product.stock_quantity);
                $('#product-category').text(product.category);
                $('#product-image').attr('src', product.imageUrl || 'img/no-image.jpg');
                $('#product-spec-link').attr('href', product.specUrl);
                
                // Show the modal
                $('#productModal').modal('show');
            },
            error: function(error) {
                console.error('Error loading product details:', error);
                alert('Error loading product details. Please try again later.');
            }
        });
        */
    }, 300);
}

// Add product to sale (stored in localStorage)
function addProductToSale(productId) {
    // Get current sale items from localStorage
    let saleItems = JSON.parse(localStorage.getItem('saleItems')) || [];
    
    // Check if product already exists in the sale
    const existingItemIndex = saleItems.findIndex(item => item.productId === productId);
    
    if (existingItemIndex >= 0) {
        // Increment quantity if product already in sale
        saleItems[existingItemIndex].quantity += 1;
    } else {
        // Add new product to sale
        // Simulate API call for product details
        // Sample product data (would come from the API)
        const products = {
            'PROD001': {
                product_id: 'PROD001',
                product_name: 'Laptop Computer',
                price: 1299.99
            },
            'PROD002': {
                product_id: 'PROD002',
                product_name: 'Office Chair',
                price: 249.99
            },
            'PROD003': {
                product_id: 'PROD003',
                product_name: 'Wireless Headphones',
                price: 199.99
            },
            'PROD004': {
                product_id: 'PROD004',
                product_name: 'Smart TV 55"',
                price: 599.99
            },
            'PROD005': {
                product_id: 'PROD005',
                product_name: 'Coffee Maker',
                price: 89.99
            },
            'PROD006': {
                product_id: 'PROD006',
                product_name: 'Desk Lamp',
                price: 49.99
            }
        };
        
        const product = products[productId];
        
        saleItems.push({
            productId: product.product_id,
            productName: product.product_name,
            price: product.price,
            quantity: 1
        });
        
        /* In a real implementation, use the actual API:
        $.ajax({
            url: `${API_URL}/products/${productId}`,
            method: 'GET',
            async: false, // Synchronous call to ensure data is available
            success: function(product) {
                saleItems.push({
                    productId: product.product_id,
                    productName: product.product_name,
                    price: product.price,
                    quantity: 1
                });
            },
            error: function(error) {
                console.error('Error fetching product for sale:', error);
                alert('Error adding product to sale. Please try again.');
                return;
            }
        });
        */
    }
    
    // Update localStorage
    localStorage.setItem('saleItems', JSON.stringify(saleItems));
}
