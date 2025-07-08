const CACHE_NAME = 'schedule-pwa-cache-v2';
const urlsToCache = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './db.js',
    './master_data_logic.js',
    './master_data_ui.js',
    './manifest.json',
    './offline.html',
    './icon/icon-192x192.png',
    './icon/icon-512x512.png',
    './icon/favicon.ico',
    './attendance_ui.js',
    './schedule_generation_ui.js',
    './share_ui.js',
    './settings_ui.js',
    './payment_logic.js',
    'https://cdn.jsdelivr.net/npm/lucide@latest/dist/umd/lucide.min.js',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(urlsToCache);
            })
            .catch(err => console.error('Failed to cache resources during install:', err))
            .then(() => {
                // 새 서비스 워커가 이전 서비스 워커를 기다리지 않고 즉시 활성화
                return self.skipWaiting();
            })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response;
                }
                return fetch(event.request).then(
                    (networkResponse) => {
                        if(!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                            if (event.request.mode === 'navigate') {
                                return caches.match('offline.html');
                            }
                            return networkResponse;
                        }



                        return networkResponse;
                    }
                ).catch(() => {
                    if (event.request.mode === 'navigate') {
                        return caches.match('offline.html');
                    }
                });
            })
    );
});

self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        Promise.all([
            // 이전 캐시 삭제
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheWhitelist.indexOf(cacheName) === -1) {
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            // 활성화 즉시 모든 클라이언트 제어 시작
            self.clients.claim()
        ])
    );
});
