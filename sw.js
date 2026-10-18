/* Pro Playground — Service Worker */
const VERSION = 'v1';
const PRECACHE = 'pg-precache-' + VERSION;
const RUNTIME = 'pg-runtime-' + VERSION;

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json'
];

const CDN_PRECACHE = [
  'https://cdn.jsdelivr.net/npm/ace-builds@1.32.6/src-min-noconflict/ace.js',
  'https://cdn.jsdelivr.net/npm/ace-builds@1.32.6/src-min-noconflict/mode-html.js',
  'https://cdn.jsdelivr.net/npm/ace-builds@1.32.6/src-min-noconflict/mode-css.js',
  'https://cdn.jsdelivr.net/npm/ace-builds@1.32.6/src-min-noconflict/mode-javascript.js',
  'https://cdn.jsdelivr.net/npm/ace-builds@1.32.6/src-min-noconflict/mode-markdown.js',
  'https://cdn.jsdelivr.net/npm/ace-builds@1.32.6/src-min-noconflict/mode-scss.js',
  'https://cdn.jsdelivr.net/npm/ace-builds@1.32.6/src-min-noconflict/mode-typescript.js',
  'https://cdn.jsdelivr.net/npm/ace-builds@1.32.6/src-min-noconflict/theme-tomorrow_night.js',
  'https://cdn.jsdelivr.net/npm/ace-builds@1.32.6/src-min-noconflict/theme-github.js',
  'https://cdn.jsdelivr.net/npm/ace-builds@1.32.6/src-min-noconflict/ext-language_tools.js',
  'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',
  'https://cdn.jsdelivr.net/npm/marked@4/marked.min.js',
  'https://cdn.jsdelivr.net/npm/sass.js/dist/sass.sync.js'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(PRECACHE);
    await cache.addAll(APP_SHELL);
    await Promise.allSettled(
      CDN_PRECACHE.map(url =>
        fetch(url, { mode: 'cors' })
          .then(res => { if (res.ok) return cache.put(url, res); })
          .catch(() => null)
      )
    );
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter(k => k !== PRECACHE && k !== RUNTIME)
          .map(k => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // App shell — cache first
  if (url.origin === self.location.origin) {
    event.respondWith((async () => {
      const cached = await caches.match(req);
      const net = fetch(req).then(res => {
        if (res.ok) caches.open(PRECACHE).then(c => c.put(req, res.clone()));
        return res;
      }).catch(() => null);
      return cached || (await net) || new Response('Offline', { status: 503 });
    })());
    return;
  }

  // CDN — cache first, then network
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const res = await fetch(req);
      if (res.ok && (res.type === 'basic' || res.type === 'cors' || res.type === 'opaque')) {
        const cache = await caches.open(RUNTIME);
        cache.put(req, res.clone());
      }
      return res;
    } catch {
      return new Response('Offline — resource not cached', {
        status: 503, headers: { 'Content-Type': 'text/plain' }
      });
    }
  })());
});