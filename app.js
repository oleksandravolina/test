/* ============================================
   SIMPLE PWA - MAIN APPLICATION SCRIPT
   ============================================
   
   This script handles:
   1. Service Worker registration
   2. View navigation
   3. Native device features (Geolocation, Camera, Notifications)
   4. Offline detection
*/

/* ============================================
   INITIALIZATION
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    console.log('[App] Initializing...');
    
    // Register Service Worker
    registerServiceWorker();
    
    // Listen for messages from Service Worker (e.g. notification clicks)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', (event) => {
            console.log('[App] Message from Service Worker:', event.data);
            
            if (event.data && event.data.type === 'NOTIFICATION_CLICKED') {
                const statusBox = document.getElementById('notificationStatus');
                if (statusBox) {
                    statusBox.textContent = 'Notification clicked on device!';
                    statusBox.classList.remove('hidden');
                }
            }
        });
    }
    
    // Set up offline detection
    setupOfflineDetection();
    
    // Initialize app
    console.log('[App] Ready');
});

/* ============================================
   SERVICE WORKER REGISTRATION
   ============================================
   
   Registers the Service Worker for offline support
   and caching functionality.
*/
function registerServiceWorker() {
    // Check if Service Workers are supported
    if (!('serviceWorker' in navigator)) {
        console.warn('[App] Service Workers not supported');
        return;
    }
    
    navigator.serviceWorker.register('./service-worker.js')
        .then((registration) => {
            console.log('[App] Service Worker registered:', registration);
            
            // Check for updates periodically
            setInterval(() => {
                registration.update();
            }, 60000); // Check every 60 seconds
            
            // Handle new Service Worker available
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        console.log('[App] New Service Worker available');
                        // Optionally notify user about update
                    }
                });
            });
        })
        .catch((error) => {
            console.error('[App] Service Worker registration failed:', error);
        });
}

/* ============================================
   OFFLINE DETECTION
   ============================================
   
   Detects when the app goes offline and shows
   an indicator to the user.
*/
function setupOfflineDetection() {
    const offlineIndicator = document.getElementById('offlineIndicator');
    
    // Check initial online status
    updateOnlineStatus();
    
    // Listen for online/offline events
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    function updateOnlineStatus() {
        if (navigator.onLine) {
            console.log('[App] Online');
            offlineIndicator.classList.add('hidden');
        } else {
            console.log('[App] Offline');
            offlineIndicator.classList.remove('hidden');
        }
    }
}

/* ============================================
   VIEW NAVIGATION
   ============================================
   
   Handles switching between different views
   (Home, Features, About) without page reload.
*/
function showView(viewId) {
    console.log(`[App] Showing view: ${viewId}`);
    
    // Get all views
    const views = document.querySelectorAll('.view');
    
    // Hide all views
    views.forEach((view) => {
        view.classList.remove('active');
    });
    
    // Show selected view
    const selectedView = document.getElementById(viewId);
    if (selectedView) {
        selectedView.classList.add('active');
        // Scroll to top
        selectedView.scrollTop = 0;
    }
}

/* ============================================
   GEOLOCATION API
   ============================================
   
   Retrieves the user's current geographic location
   using the Geolocation API. Shows latitude, longitude,
   and accuracy of the position.
*/
function getGeolocation() {
    console.log('[App] Getting geolocation...');
    
    const resultBox = document.getElementById('geolocationResult');
    const errorBox = document.getElementById('geolocationError');
    
    // Hide previous results
    resultBox.classList.add('hidden');
    errorBox.classList.add('hidden');
    
    // Check if Geolocation API is supported
    if (!('geolocation' in navigator)) {
        console.error('[App] Geolocation not supported');
        errorBox.textContent = 'Geolocation is not supported by your browser.';
        errorBox.classList.remove('hidden');
        return;
    }
    
    // Request current position
    navigator.geolocation.getCurrentPosition(
        (position) => {
            // Success callback
            const { latitude, longitude, accuracy } = position.coords;
            
            console.log(`[App] Geolocation success: ${latitude}, ${longitude}`);
            
            // Display results
            document.getElementById('latitude').textContent = latitude.toFixed(6);
            document.getElementById('longitude').textContent = longitude.toFixed(6);
            document.getElementById('accuracy').textContent = accuracy.toFixed(0);
            
            resultBox.classList.remove('hidden');
        },
        (error) => {
            // Error callback
            let errorMessage = 'Unable to retrieve your location.';
            
            switch (error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage = 'Permission denied. Please allow location access in your browser settings.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage = 'Location information is unavailable.';
                    break;
                case error.TIMEOUT:
                    errorMessage = 'The request to get user location timed out.';
                    break;
            }
            
            console.error('[App] Geolocation error:', errorMessage);
            errorBox.textContent = errorMessage;
            errorBox.classList.remove('hidden');
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

/* ============================================
   CAMERA API
   ============================================
   
   Accesses the device camera to capture photos.
   Uses the HTML5 File Input with capture attribute
   to open the device camera interface.
*/
function openCamera() {
    console.log('[App] Opening camera...');
    
    const cameraInput = document.getElementById('cameraInput');
    const resultBox = document.getElementById('cameraResult');
    const errorBox = document.getElementById('cameraError');
    
    // Hide previous results
    resultBox.classList.add('hidden');
    errorBox.classList.add('hidden');
    
    // Check if camera is supported
    if (!cameraInput) {
        console.error('[App] Camera input not found');
        errorBox.textContent = 'Camera is not supported on this device.';
        errorBox.classList.remove('hidden');
        return;
    }
    
    // Set up event listener for file selection
    cameraInput.onchange = (event) => {
        const file = event.target.files[0];
        
        if (!file) {
            console.log('[App] Camera cancelled');
            return;
        }
        
        console.log('[App] Photo captured:', file.name);
        
        // Read the file and display it
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('capturedImage').src = e.target.result;
            resultBox.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    };
    
    // Trigger file input (opens camera on mobile)
    cameraInput.click();
}

/* ============================================
   NOTIFICATIONS API
   ============================================
   
   Sends a browser notification to the user.
   Requires user permission first.
*/
function sendNotification() {
    console.log('[App] Sending notification...');
    
    const statusBox = document.getElementById('notificationStatus');
    statusBox.classList.add('hidden');
    
    // Check if Notifications API is supported
    if (!('Notification' in window)) {
        console.error('[App] Notifications not supported');
        statusBox.textContent = 'Notifications are not supported by your browser.';
        statusBox.classList.remove('hidden');
        return;
    }
    
    // Check current permission status
    if (Notification.permission === 'granted') {
        // Permission already granted, send notification
        showNotification();
    } else if (Notification.permission !== 'denied') {
        // Request permission
        Notification.requestPermission().then((permission) => {
            if (permission === 'granted') {
                showNotification();
            } else {
                console.warn('[App] Notification permission denied');
                statusBox.textContent = 'Notification permission denied.';
                statusBox.classList.remove('hidden');
            }
        });
    } else {
        // Permission previously denied
        console.warn('[App] Notification permission denied');
        statusBox.textContent = 'Notification permission is denied. Please enable it in your browser settings.';
        statusBox.classList.remove('hidden');
    }
    
    function showNotification() {
        // Prefer showing notification via Service Worker so that
        // click events work even when the page is in background.
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready
                .then((registration) => {
                    return registration.showNotification('Simple PWA', {
                        icon: './assets/icon-192.png',
                        badge: './assets/icon-192.png',
                        body: 'This is a test notification from the Simple PWA!',
                        tag: 'simple-pwa-notification',
                        requireInteraction: false,
                        vibrate: [200, 100, 200],
                        data: {
                            url: './?notification=test'
                        }
                    });
                })
                .then(() => {
                    console.log('[App] Notification sent via Service Worker');
                    statusBox.textContent = '✓ Notification sent successfully!';
                    statusBox.classList.remove('hidden');
                })
                .catch((error) => {
                    console.warn('[App] Failed to show notification via Service Worker, falling back:', error);
                    // Fallback to direct Notification if SW showNotification fails
                    if ('Notification' in window) {
                        const notification = new Notification('Simple PWA', {
                            icon: './assets/icon-192.png',
                            badge: './assets/icon-192.png',
                            body: 'This is a test notification from the Simple PWA!',
                            tag: 'simple-pwa-notification',
                            requireInteraction: false,
                            vibrate: [200, 100, 200]
                        });
                        
                        notification.onclick = () => {
                            window.focus();
                            statusBox.textContent = 'Notification clicked!';
                            statusBox.classList.remove('hidden');
                        };
                        
                        console.log('[App] Notification sent (fallback)');
                        statusBox.textContent = '✓ Notification sent successfully!';
                        statusBox.classList.remove('hidden');
                        
                        setTimeout(() => {
                            notification.close();
                        }, 5000);
                    }
                });
        } else {
            // Direct Notification fallback
            const notification = new Notification('Simple PWA', {
                icon: './assets/icon-192.png',
                badge: './assets/icon-192.png',
                body: 'This is a test notification from the Simple PWA!',
                tag: 'simple-pwa-notification',
                requireInteraction: false,
                vibrate: [200, 100, 200]
            });
            
            notification.onclick = () => {
                window.focus();
                statusBox.textContent = 'Notification clicked!';
                statusBox.classList.remove('hidden');
            };
            
            console.log('[App] Notification sent');
            statusBox.textContent = '✓ Notification sent successfully!';
            statusBox.classList.remove('hidden');
            
            setTimeout(() => {
                notification.close();
            }, 5000);
        }
    }
}
/* ============================================
   UTILITY FUNCTIONS
   ============================================ */

/**
 * Logs a message with app prefix
 * @param {string} message - The message to log
 */
function log(message) {
    console.log(`[App] ${message}`);
}

/**
 * Logs an error with app prefix
 * @param {string} message - The error message
 */
function logError(message) {
    console.error(`[App] ${message}`);
}

console.log('[App] Script loaded');
