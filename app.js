// app.js

let deferredPrompt; // To store the BeforeInstallPromptEvent
const pwaPrompts = document.getElementById('pwa-prompts');
const installButton = document.getElementById('install-button');
const notificationButton = document.getElementById('notification-button');
const closePromptsButton = document.getElementById('close-prompts');
const offlineStatus = document.getElementById('offline-status');
const productGrid = document.getElementById('product-grid');
const cartCountSpan = document.getElementById('cart-count');

let cartItems = []; // Simple in-memory cart for demonstration

// Helper function to display messages (used for notifications and cart feedback)
const showMessage = (element, message, type = 'info') => {
    element.textContent = message;
    // Apply Tailwind classes based on message type
    element.className = `fixed bottom-4 left-1/2 -translate-x-1/2 p-3 rounded-lg shadow-lg 
                         ${type === 'error' ? 'bg-red-500' : type === 'success' ? 'bg-green-500' : 'bg-blue-500'} 
                         text-white z-50 transition-all duration-300 transform scale-100 opacity-100`;
    element.classList.remove('hidden'); // Show the message
    setTimeout(() => {
        // Fade out and hide the message after a delay
        element.classList.add('opacity-0', 'scale-95');
        element.addEventListener('transitionend', () => {
            element.classList.add('hidden');
            element.classList.remove('opacity-0', 'scale-95'); // Reset for next use
        }, { once: true });
    }, 3000);
};

// Function to update cart count in the header
const updateCartCount = () => {
    cartCountSpan.textContent = cartItems.length;
};

// Mock product data with more varied and representative placeholder images
const products = [
    { id: 1, name: 'Premium Noise-Cancelling Headphones', price: 249.99, image: 'https://picsum.photos/id/237/300/200?blur=1', description: 'Immersive sound experience with active noise cancellation.' },
    { id: 2, name: 'Advanced Fitness Smartwatch', price: 199.99, image: 'https://picsum.photos/id/250/300/200?grayscale', description: 'Track your health and fitness with precision.' },
    { id: 3, name: 'Compact Portable Bluetooth Speaker', price: 79.99, image: 'https://picsum.photos/id/260/300/200', description: 'Rich sound on the go, perfect for any adventure.' },
    { id: 4, name: 'Ultra-Thin E-Reader', price: 129.99, image: 'https://picsum.photos/id/270/300/200?blur=2', description: 'Read comfortably for hours with no glare.' },
    { id: 5, name: 'Ergonomic RGB Gaming Mouse', price: 49.99, image: 'https://picsum.photos/id/280/300/200', description: 'Precision and comfort for serious gamers.' },
    { id: 6, name: 'Customizable Mechanical Keyboard', price: 119.99, image: 'https://picsum.photos/id/290/300/200?grayscale', description: 'Tactile feedback and customizable backlighting.' },
    { id: 7, name: 'Multi-Port USB-C Hub', price: 39.99, image: 'https://picsum.photos/id/300/300/200', description: 'Expand your laptop\'s connectivity with ease.' },
    { id: 8, name: 'Adjustable Laptop Stand', price: 59.99, image: 'https://picsum.photos/id/310/300/200?blur=1', description: 'Improve your posture and cooling with this sleek stand.' }
];

// Function to render products dynamically into the product grid
const renderProducts = () => {
    productGrid.innerHTML = ''; // Clear existing products
    products.forEach(product => {
        const productCard = `
            <div class="bg-white rounded-lg shadow-md overflow-hidden transform hover:scale-105 transition duration-300">
                <img src="${product.image}" alt="${product.name}" class="w-full h-48 object-cover">
                <div class="p-4">
                    <h3 class="text-xl font-semibold mb-2 text-gray-900 truncate">${product.name}</h3>
                    <p class="text-gray-600 text-sm mb-3 h-12 overflow-hidden">${product.description}</p>
                    <p class="text-gray-700 text-lg font-bold mb-4">$${product.price.toFixed(2)}</p>
                    <button data-product-id="${product.id}" class="add-to-cart-btn bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-md w-full transition duration-300 transform hover:scale-100">
                        Add to Cart <i class="fas fa-cart-plus ml-2"></i>
                    </button>
                </div>
            </div>
        `;
        productGrid.innerHTML += productCard;
    });

    // Add event listeners to "Add to Cart" buttons after they are rendered
    document.querySelectorAll('.add-to-cart-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const productId = parseInt(event.target.dataset.productId);
            const productToAdd = products.find(p => p.id === productId);
            if (productToAdd) {
                cartItems.push(productToAdd); // Add product to cart
                updateCartCount(); // Update cart count in UI
                showMessage(offlineStatus, `${productToAdd.name} added to cart!`, 'success'); // Show confirmation
                console.log('Cart:', cartItems);
            }
        });
    });
};


// Service Worker Registration: Registers the service worker when the page loads
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(reg => {
                console.log('Service Worker registered! Scope:', reg.scope);
            })
            .catch(err => {
                console.error('Service Worker registration failed:', err);
            });
    });
}

// PWA Install Prompt: Listens for the browser's install prompt event
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // Prevent the default browser prompt
    deferredPrompt = e; // Store the event for later use
    pwaPrompts.classList.remove('hidden'); // Show the custom installation prompt UI
    console.log('beforeinstallprompt fired');
});

// Event listener for the custom install button
installButton.addEventListener('click', () => {
    pwaPrompts.classList.add('hidden'); // Hide the custom prompt
    if (deferredPrompt) {
        deferredPrompt.prompt(); // Trigger the browser's install prompt
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                showMessage(offlineStatus, 'App installed successfully!', 'success');
                console.log('User accepted the A2HS prompt');
            } else {
                showMessage(offlineStatus, 'App installation cancelled.', 'error');
                console.log('User dismissed the A2HS prompt');
            }
            deferredPrompt = null; // Reset deferredPrompt
        });
    }
});

// Event listener for the close button on the PWA prompts section
closePromptsButton.addEventListener('click', () => {
    pwaPrompts.classList.add('hidden');
});

// Push Notification Subscription: Handles requesting permission and subscribing
notificationButton.addEventListener('click', () => {
    // Check if browser supports notifications and service workers
    if ('Notification' in window && 'serviceWorker' in navigator) {
        Notification.requestPermission().then((permission) => {
            if (permission === 'granted') {
                console.log('Notification permission granted.');
                subscribeUserToPush(); // Proceed to subscribe the user
            } else {
                showMessage(offlineStatus, 'Notification permission denied.', 'error');
                console.log('Notification permission denied.');
            }
        });
    } else {
        showMessage(offlineStatus, 'Push notifications not supported by your browser.', 'error');
        console.warn('Push notifications not supported.');
    }
});

// Function to actually subscribe the user to push notifications
function subscribeUserToPush() {
    navigator.serviceWorker.ready.then(async (registration) => {
        // IMPORTANT: Replace 'YOUR_VAPID_PUBLIC_KEY_HERE' with your actual VAPID public key
        // This key is generated on your backend server.
        const applicationServerKey = urlBase64ToUint8Array('YOUR_VAPID_PUBLIC_KEY_HERE'); 
        try {
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true, // Indicates that notifications are always visible to the user
                applicationServerKey: applicationServerKey
            });
            console.log('User is subscribed:', subscription);
            showMessage(offlineStatus, 'Subscribed for push notifications!', 'success');
            // In a real application, you would send this 'subscription' object to your backend server
            // for it to store and use to send push messages later.
            // Example: sendSubscriptionToServer(subscription);
        } catch (err) {
            showMessage(offlineStatus, 'Failed to subscribe to push notifications.', 'error');
            console.error('Failed to subscribe the user: ', err);
        }
    });
}

// Helper function to convert a Base64 URL string to a Uint8Array
// This is necessary for handling VAPID public keys.
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

// Online/Offline Status Detection: Updates UI based on network connectivity
window.addEventListener('online', () => {
    offlineStatus.classList.add('hidden'); // Hide offline message
    showMessage(offlineStatus, 'You are back online!', 'success');
});

window.addEventListener('offline', () => {
    offlineStatus.classList.remove('hidden'); // Show offline message
    showMessage(offlineStatus, 'You are currently offline! Limited functionality.', 'error');
});

// Initial setup when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    renderProducts(); // Render product cards
    updateCartCount(); // Initialize cart count
});

// Example of how to simulate a push notification from client-side for testing
// In a real application, push notifications are sent from a server
// (e.g., when a new order is placed, a product is back in stock, or a special offer).
/*
if ('serviceWorker' in navigator && Notification.permission === 'granted') {
    setTimeout(() => {
        navigator.serviceWorker.ready.then(reg => {
            reg.showNotification('AwesomeShop Flash Sale!', {
                body: 'Limited time offer! Get 20% off all headphones. Shop now!',
                icon: '/images/icons/icon-192x192.png',
                badge: '/images/icons/icon-72x72.png',
                data: {
                    url: '/products/headphones' // Example URL to open on notification click
                }
            });
        });
    }, 15000); // Show a simulated notification after 15 seconds for testing
}
*/
