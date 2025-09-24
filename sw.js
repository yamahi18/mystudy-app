// Offline cache service worker

const CACHE_NAME = 'mystudy-custom-v1';

const ASSETS = [

  './', './index.html', './app.js', './manifest.webmanifest',

  './icons/icon-192.png','./icons/icon-512.png'

];

self.addEventListener('install', e=>{ e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS))); });

self.addEventListener('activate', e=>{ e.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>k!==CACHE_NAME?caches.delete(k):null)))); });

self.addEventListener('fetch', e=>{ e.respondWith(caches.match(e.request).then(r=> r || fetch(e.request))); });

