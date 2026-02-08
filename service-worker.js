/* ============================================
   SIMPLE PWA - SERVICE WORKER
   ============================================
   
   This Service Worker handles:
   1. Caching static assets (HTML, CSS, JS, images)
   2. Offline functionality using Cache First strategy
   3. Network requests with fallback to cache
*/

// Cache version - increment this when updating assets
const CACHE_VERSION = 'v1';
const CACHE_NAME = `simple-pwa-${CACHE_VERSION}`;

// List of assets to cache on install
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json',
    './assets/icon-192.png',
    './assets/icon-512.png',
    './assets/icon-maskable-192.png',
    './assets/icon-maskable-512.png'
];

/* ============================================
   INSTALL EVENT
   ============================================
   
   Triggered when the Service Worker is first registered.
   Caches all essential assets for offline access.
*/
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log(`[Service Worker] Caching ${ASSETS_TO_CACHE.length} assets`);
            return cache.addAll(ASSETS_TO_CACHE).catch((error) => {
                console.warn('[Service Worker] Cache addAll error:', error);
                // Continue even if some assets fail to cache
                return Promise.resolve();
            });
        })
    );
    
    // Force the new Service Worker to activate immediately
    self.skipWaiting();
});

/* ============================================
   ACTIVATE EVENT
   ============================================
   
   Triggered when the Service Worker becomes active.
   Cleans up old cache versions.
*/
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating...');
    
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // Delete old cache versions
                    if (cacheName !== CACHE_NAME) {
                        console.log(`[Service Worker] Deleting old cache: ${cacheName}`);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    
    // Claim all clients immediately
    self.clients.claim();
});

/* ============================================
   FETCH EVENT
   ============================================
   
   Triggered for every network request.
   Implements Cache First strategy:
   1. Check cache first
   2. If not in cache, fetch from network
   3. If network fails, show offline message
*/
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip external requests (different origin)
    if (url.origin !== self.location.origin) {
        return;
    }
    
    // Cache First strategy for static assets
    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            // Return cached response if available
            if (cachedResponse) {
                console.log(`[Service Worker] Serving from cache: ${request.url}`);
                return cachedResponse;
            }
            
            // If not in cache, try to fetch from network
            return fetch(request)
                .then((networkResponse) => {
                    // Cache successful responses
                    if (networkResponse && networkResponse.status === 200) {
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, responseToCache);
                        });
                    }
                    return networkResponse;
                })
                .catch((error) => {
                    console.warn(`[Service Worker] Fetch failed for ${request.url}:`, error);
                    
                    // Return offline page or cached fallback
                    if (request.destination === 'document') {
                        return caches.match('./index.html');
                    }
                    
                    // Return a generic offline response for other requests
                    return new Response('Offline - Resource not available', {
                        status: 503,
                        statusText: 'Service Unavailable',
                        headers: new Headers({
                            'Content-Type': 'text/plain'
                        })
                    });
                });
        })
    );
});

/* ============================================
   MESSAGE EVENT
   ============================================
   
   Allows communication between the app and Service Worker.
   Can be used to trigger cache updates or other actions.
*/
self.addEventListener('message', (event) => {
    console.log('[Service Worker] Message received:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
/* ============================================
   NOTIFICATION CLICK EVENT
   ============================================
   
   Handles click events on notifications shown by the
   Service Worker (e.g., from registration.showNotification).
   Focuses an open client or opens a new window and sends
   a message back to the page so it can show test content.
*/
self.addEventListener('notificationclick', (event) => {
    console.log('[Service Worker] Notification click received:', event.notification);
    
    event.notification.close();
    
    const targetUrl = (event.notification.data && event.notification.data.url) || './?notification=test';
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // If a client is already open, focus it and send a message
            for (const client of clientList) {
                if ('focus' in client) {
                    client.postMessage({
                        type: 'NOTIFICATION_CLICKED',
                        url: targetUrl
                    });
                    return client.focus();
                }
            }
            
            // Otherwise open a new window
            return clients.openWindow(targetUrl);
        })
    );
});

console.log('[Service Worker] Script loaded');
