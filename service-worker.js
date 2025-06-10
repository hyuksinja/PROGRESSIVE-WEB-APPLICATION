// service-worker.js

const CACHE_NAME = 'ecommerce-pwa-cache-v1';
const DYNAMIC_CACHE_NAME = 'ecommerce-dynamic-cache-v1';

// Files to cache for the App Shell (critical assets for offline functionality)
const urlsToCache = [
    '/',
    '/index.html',
    '/app.js',
    '/manifest.json',
    '/offline.html',
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css',
    '/images/icons/icon-72x72.png',
    '/images/icons/icon-96x96.png',
    '/images/icons/icon-128x128.png',
    '/images/icons/icon-144x144.png',
    '/images/icons/icon-152x152.png',
    '/images/icons/icon-192x192.png',
    '/images/icons/icon-384x384.png',
    '/images/icons/icon-512x512.png'
];

// Helper function to limit cache size
const limitCacheSize = (name, size) => {
    caches.open(name).then(cache => {
        cache.keys().then(keys => {
            if (keys.length > size) {
                cache.delete(keys[0]).then(limitCacheSize(name, size));
            }
        });
    });
};

// Install event: Caches the App Shell
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing Service Worker ...', event);
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Caching app shell');
                // Using addAll to cache all specified URLs
                return cache.addAll(urlsToCache);
            })
            .catch(err => console.error('[Service Worker] Failed to cache during install:', err))
    );
});

// Activate event: Cleans up old caches
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating Service Worker ....', event);
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME && key !== DYNAMIC_CACHE_NAME) {
                    console.log('[Service Worker] Removing old cache', key);
                    return caches.delete(key);
                }
            }));
        })
    );
    // Ensures the service worker takes control of the page immediately
    return self.clients.claim();
});

// Fetch event: Intercepts network requests and serves from cache or network
self.addEventListener('fetch', (event) => {
    // Check if the request is for an image (e.g., product images)
    const isImageRequest = event.request.url.match(/\.(jpeg|jpg|png|gif|webp)$/i);

    // Cache-First strategy for app shell and static assets
    if (urlsToCache.some(url => event.request.url.includes(url)) || isImageRequest) {
        event.respondWith(
            caches.match(event.request).then((response) => {
                if (response) {
                    console.log('[Service Worker] Serving from cache:', event.request.url);
                    return response;
                }
                // If not in cache, fetch from network and add to dynamic cache
                return fetch(event.request)
                    .then(networkResponse => {
                        return caches.open(DYNAMIC_CACHE_NAME).then(cache => {
                            // Only cache successful responses
                            if (networkResponse.ok) {
                                cache.put(event.request.url, networkResponse.clone());
                                limitCacheSize(DYNAMIC_CACHE_NAME, 20); // Limit dynamic cache to 20 items
                            }
                            return networkResponse;
                        });
                    })
                    .catch(() => {
                        // If both cache and network fail, and it's a navigation request, serve offline page
                        if (event.request.mode === 'navigate') {
                            return caches.match('/offline.html');
                        }
                        // For other types of requests (e.g., images), return a generic error or fallback
                        console.error('[Service Worker] Fetch failed for:', event.request.url);
                        return new Response('Network error or content not found', {
                            status: 404,
                            statusText: 'Not Found'
                        });
                    });
            })
        );
    } else {
        // Network-First with Cache-Fallback for other requests (e.g., API calls for products)
        event.respondWith(
            fetch(event.request)
                .then((networkResponse) => {
                    // Cache successful network responses for dynamic content
                    return caches.open(DYNAMIC_CACHE_NAME).then(cache => {
                        if (networkResponse.ok) {
                            cache.put(event.request.url, networkResponse.clone());
                            limitCacheSize(DYNAMIC_CACHE_NAME, 20); // Limit dynamic cache to 20 items
                        }
                        return networkResponse;
                    });
                })
                .catch(() => {
                    // If network fails, try to serve from cache
                    return caches.match(event.request).then(cachedResponse => {
                        if (cachedResponse) {
                            console.log('[Service Worker] Network failed, serving from cache:', event.request.url);
                            return cachedResponse;
                        }
                        // If no cache and network fails, and it's a navigation request, serve offline page
                        if (event.request.mode === 'navigate') {
                            return caches.match('/offline.html');
                        }
                        console.error('[Service Worker] Network and cache failed for:', event.request.url);
                        return new Response('Network error or content not found', {
                            status: 404,
                            statusText: 'Not Found'
                        });
                    });
                })
        );
    }
});

// Push event: Handles incoming push notifications
self.addEventListener('push', (event) => {
    console.log('[Service Worker] Push Received.');
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'AwesomeShop Notification';
    const options = {
        body: data.body || 'You have a new update from AwesomeShop!',
        icon: data.icon || '/images/icons/icon-192x192.png',
        badge: data.badge || '/images/icons/icon-72x72.png',
        data: {
            url: data.url || '/' // URL to open when notification is clicked
        }
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// Notification click event: Handles clicks on notifications
self.addEventListener('notificationclick', (event) => {
    console.log('[Service Worker] Notification click Received.');
    event.notification.close(); // Close the notification

    const targetUrl = event.notification.data && event.notification.data.url ? event.notification.data.url : '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // If there's already an open window, focus it and navigate
                for (let i = 0; i < clientList.length; i++) {
                    const client = clientList[i];
                    if (client.url === targetUrl && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Otherwise, open a new window
                if (clients.openWindow) {
                    return clients.openWindow(targetUrl);
                }
            })
    );
});