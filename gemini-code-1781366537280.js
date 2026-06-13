const cacheName = 'v1-moje-hra';
// Seznam souborů, které si mobil musí zapamatovat
const cacheFiles = [
    './',
    './index.html',
    './game.js'
];

// Instalace: Uložení souborů do paměti
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(cacheName).then((cache) => {
            return cache.addAll(cacheFiles);
        })
    );
});

// Spuštění offline: Pokud není internet, vezmi soubory z paměti
self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((response) => {
            return response || fetch(e.request);
        })
    );
});