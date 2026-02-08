/* ============================================
   SIMPLE PWA - MAIN APPLICATION SCRIPT
   ============================================ */

let db; // Zmienna dla bazy danych IndexedDB

document.addEventListener('DOMContentLoaded', () => {
    log('Initializing...');
    
    // Inicjalizacja bazy danych dla galerii
    initDatabase();
    
    // Register Service Worker
    registerServiceWorker();
    
    // Listen for messages from Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', (event) => {
            log(`Message from Service Worker: ${JSON.stringify(event.data)}`);
            
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
    
    log('Ready');
});

/* ============================================
   NEW: INDEXEDDB LOGIC FOR GALLERY
   ============================================ */

function initDatabase() {
    const request = indexedDB.open("PWA_Gallery_DB", 1);

    request.onupgradeneeded = (e) => {
        db = e.target.result;
        if (!db.objectStoreNames.contains("photos")) {
            db.createObjectStore("photos", { autoIncrement: true });
        }
    };

    request.onsuccess = (e) => {
        db = e.target.result;
        log('Database initialized');
        renderGallery();
    };

    request.onerror = (e) => {
        logError('Database error: ' + e.target.errorCode);
    };
}

function savePhotoToDB(base64Data) {
    if (!db) {
        logError('Database not ready');
        return;
    }
    const transaction = db.transaction(["photos"], "readwrite");
    const store = transaction.objectStore("photos");
    const request = store.add(base64Data);

    request.onsuccess = () => {
        log('Photo saved to IndexedDB');
        renderGallery();
    };
}

function renderGallery() {
    const grid = document.getElementById('galleryGrid');
    const emptyMsg = document.getElementById('galleryEmpty');
    if (!grid || !db) return;

    grid.innerHTML = '';
    const transaction = db.transaction(["photos"], "readonly");
    const store = transaction.objectStore("photos");
    let count = 0;

    store.openCursor().onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
            count++;
            const container = document.createElement('div');
            container.className = 'gallery-item';
            container.innerHTML = `
                <img src="${cursor.value}" loading="lazy">
                <button class="delete-btn" onclick="deletePhoto(${cursor.key})" title="Delete photo">✕</button>
            `;
            grid.appendChild(container);
            cursor.continue();
        }
        if (emptyMsg) {
            emptyMsg.style.display = count > 0 ? 'none' : 'block';
        }
    };
}

function deletePhoto(id) {
    if (!confirm('Are you sure you want to delete this photo?')) return;
    const transaction = db.transaction(["photos"], "readwrite");
    transaction.objectStore("photos").delete(id);
    transaction.oncomplete = () => {
        log('Photo deleted');
        renderGallery();
    };
}

/* ============================================
   VIEW NAVIGATION
   ============================================ */

function showView(viewId) {
    log(`Switching to view: ${viewId}`);
    
    const views = document.querySelectorAll('.view');
    views.forEach(view => {
        view.classList.remove('active');
    });
    
    const targetView = document.getElementById(viewId);
    if (targetView) {
        targetView.classList.add('active');
        window.scrollTo(0, 0);
        
        if (viewId === 'galleryView') {
            renderGallery();
        }
    } else {
        logError(`View not found: ${viewId}`);
    }
}

/* ============================================
   GEOLOCATION
   ============================================ */

function getLocation() {
    log('Getting location...');
    const statusBox = document.getElementById('locationStatus');
    const resultBox = document.getElementById('locationResult');
    
    statusBox.textContent = 'Requesting permission and locating...';
    statusBox.classList.remove('hidden');
    resultBox.classList.add('hidden');

    if (!navigator.geolocation) {
        statusBox.textContent = '❌ Geolocation not supported';
        return;
    }

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            
            log(`Coordinates found: ${lat}, ${lon}`);

            try {
                // Pobieranie nazwy miejscowości z darmowego API OpenStreetMap
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`);
                const data = await response.json();
                
                // Wyciągamy miasto, wieś lub osadę
                const city = data.address.city || data.address.town || data.address.village || data.address.suburb || "Unknown location";
                const country = data.address.country;

                // Wyświetlamy nazwę zamiast samych cyfr
                document.getElementById('latitude').textContent = city; 
                document.getElementById('longitude').textContent = country;
                
                // Zmieniamy etykiety w HTML, żeby pasowały
                document.querySelector('#locationResult p:nth-child(1) strong').textContent = "City: ";
                document.querySelector('#locationResult p:nth-child(2) strong').textContent = "Country: ";

                statusBox.classList.add('hidden');
                resultBox.classList.remove('hidden');
                log(`Location resolved to: ${city}, ${country}`);

            } catch (error) {
                logError("Geocoding failed: " + error);
                // Jeśli API zawiedzie, pokaż chociaż cyfry
                document.getElementById('latitude').textContent = lat.toFixed(4);
                document.getElementById('longitude').textContent = lon.toFixed(4);
                statusBox.classList.add('hidden');
                resultBox.classList.remove('hidden');
            }
        },
        (error) => {
            logError(`Error: ${error.message}`);
            statusBox.textContent = '❌ Error getting location';
        }
    );
}

/* ============================================
   CAMERA
   ============================================ */

function openCamera() {
    log('Opening camera interface...');
    const cameraInput = document.getElementById('cameraInput');
    const resultBox = document.getElementById('cameraResult');
    const capturedImage = document.getElementById('capturedImage');
    
    if (!cameraInput) {
        logError('Camera input element not found');
        return;
    }

    cameraInput.onchange = (event) => {
        const file = event.target.files[0];
        if (file) {
            log(`File selected: ${file.name} (${file.size} bytes)`);
            
            const reader = new FileReader();
            reader.onload = (e) => {
                const imageData = e.target.result;
                capturedImage.src = imageData;
                resultBox.classList.remove('hidden');
                
                // Automatyczny zapis do galerii
                savePhotoToDB(imageData);
                
                capturedImage.scrollIntoView({ behavior: 'smooth' });
            };
            reader.readAsDataURL(file);
        }
    };
    
    cameraInput.click();
}

/* ============================================
   VIBRATION
   ============================================ */

function testVibration() {
    if ('vibrate' in navigator) {
        log('Triggering vibration pattern');
        navigator.vibrate([200, 100, 200, 100, 200]);
        
        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = '📳 Vibrating...';
        btn.disabled = true;
        
        setTimeout(() => {
            btn.textContent = originalText;
            btn.disabled = false;
        }, 1000);
    } else {
        logError('Vibration API not supported');
        alert('Vibration API is not supported on this device/browser');
    }
}

/* ============================================
   NOTIFICATIONS
   ============================================ */

function sendNotification() {
    log('Preparing notification...');
    const statusBox = document.getElementById('notificationStatus');
    
    if (!('Notification' in window)) {
        logError('Notifications not supported');
        alert('This browser does not support desktop notifications');
        return;
    }

    Notification.requestPermission().then(permission => {
        log(`Notification permission: ${permission}`);
        
        if (permission === 'granted') {
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.ready.then(registration => {
                    registration.showNotification('Simple PWA', {
                        body: 'This is a test notification from the Simple PWA!',
                        icon: './assets/icon-192.png',
                        badge: './assets/icon-192.png',
                        vibrate: [200, 100, 200],
                        data: { url: window.location.href }
                    });
                });
            } else {
                const notification = new Notification('Simple PWA', {
                    body: 'Test notification!',
                    icon: './assets/icon-192.png'
                });
            }
            
            statusBox.textContent = '✓ Notification sent successfully!';
            statusBox.classList.remove('hidden');
            setTimeout(() => statusBox.classList.add('hidden'), 5000);
        }
    });
}

/* ============================================
   SYSTEM FUNCTIONS (SW & OFFLINE)
   ============================================ */

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./service-worker.js')
                .then(reg => log('Service Worker registered'))
                .catch(err => logError('SW Registration failed: ' + err));
        });
    }
}

function setupOfflineDetection() {
    const indicator = document.getElementById('offlineIndicator');
    
    const updateStatus = () => {
        if (navigator.onLine) {
            log('Device is online');
            indicator.classList.add('hidden');
        } else {
            log('Device is offline');
            indicator.classList.remove('hidden');
        }
    };

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    updateStatus();
}

function log(msg) { console.log(`[App] ${msg}`); }
function logError(msg) { console.error(`[App] ${msg}`); }
