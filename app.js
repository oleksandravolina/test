/* ============================================
   SIMPLE PWA - PEŁNY SKRYPT (TWOJE FUNKCJE + GALERIA)
   ============================================ */

let db;

document.addEventListener('DOMContentLoaded', () => {
    console.log('[App] Initializing...');
    
    // 1. Inicjalizacja bazy danych IndexedDB (dla Galerii)
    initDatabase();
    
    // 2. Rejestracja Service Workera
    registerServiceWorker();
    
    // 3. Nasłuchiwanie wiadomości z Service Workera
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'NOTIFICATION_CLICKED') {
                const statusBox = document.getElementById('notificationStatus');
                if (statusBox) {
                    statusBox.textContent = 'Notification clicked on device!';
                    statusBox.classList.remove('hidden');
                }
            }
        });
    }
    
    // 4. Wykrywanie trybu offline
    setupOfflineDetection();
    
    console.log('[App] Ready');
});

/* ============================================
   LOGIKA BAZY DANYCH I GALERII
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
        renderGallery();
    };
}

function savePhotoToDB(base64Data) {
    if (!db) return;
    const transaction = db.transaction(["photos"], "readwrite");
    const store = transaction.objectStore("photos");
    store.add(base64Data);
    transaction.oncomplete = () => {
        console.log("Photo saved to gallery");
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
                <img src="${cursor.value}">
                <button class="delete-btn" onclick="deletePhoto(${cursor.key})">✕</button>
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
    const transaction = db.transaction(["photos"], "readwrite");
    transaction.objectStore("photos").delete(id);
    transaction.oncomplete = () => renderGallery();
}

/* ============================================
   NAWIGACJA
   ============================================ */

function showView(viewId) {
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    
    const targetView = document.getElementById(viewId);
    if (targetView) {
        targetView.classList.add('active');
        window.scrollTo(0, 0);
        
        // Odśwież galerię przy wejściu
        if (viewId === 'galleryView') {
            renderGallery();
        }
    }
}

/* ============================================
   TWOJE ORYGINALNE FUNKCJE
   ============================================ */

function getLocation() {
    const statusBox = document.getElementById('locationStatus');
    const resultBox = document.getElementById('locationResult');
    
    statusBox.textContent = 'Locating...';
    statusBox.classList.remove('hidden');
    resultBox.classList.add('hidden');

    if (!navigator.geolocation) {
        statusBox.textContent = 'Geolocation not supported';
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            document.getElementById('latitude').textContent = position.coords.latitude.toFixed(4);
            document.getElementById('longitude').textContent = position.coords.longitude.toFixed(4);
            statusBox.classList.add('hidden');
            resultBox.classList.remove('hidden');
        },
        (error) => {
            statusBox.textContent = `Error: ${error.message}`;
        }
    );
}

function openCamera() {
    const cameraInput = document.getElementById('cameraInput');
    const resultBox = document.getElementById('cameraResult');
    
    cameraInput.onchange = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const imageData = e.target.result;
                document.getElementById('capturedImage').src = imageData;
                resultBox.classList.remove('hidden');
                
                // AUTOMATYCZNY ZAPIS DO GALERII
                savePhotoToDB(imageData);
            };
            reader.readAsDataURL(file);
        }
    };
    cameraInput.click();
}

function testVibration() {
    if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
    } else {
        alert('Vibration API not supported');
    }
}

function sendNotification() {
    const statusBox = document.getElementById('notificationStatus');
    
    if (!('Notification' in window)) {
        alert('Notifications not supported');
        return;
    }

    Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.ready.then(registration => {
                    registration.showNotification('Simple PWA', {
                        body: 'Powiadomienie z Twojej aplikacji!',
                        icon: './assets/icon-192.png'
                    });
                });
            } else {
                new Notification('Simple PWA', { body: 'Powiadomienie!' });
            }
            statusBox.textContent = '✓ Sent!';
            statusBox.classList.remove('hidden');
        }
    });
}

/* ============================================
   SYSTEMOWE
   ============================================ */

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./service-worker.js')
            .catch(err => console.error('[SW] Error:', err));
    }
}

function setupOfflineDetection() {
    const indicator = document.getElementById('offlineIndicator');
    const update = () => {
        if (navigator.onLine) indicator.classList.add('hidden');
        else indicator.classList.remove('hidden');
    };
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    update();
}
