const VERSION = 'v2';
const PRECACHE = 'saq-precache-' + VERSION;
const RUNTIME = 'saq-runtime-' + VERSION;

const APP_SHELL = ['./', './index.html', './manifest.json'];

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
  'https://cdn.jsdelivr.net/npm/ace-builds@1.32.6/src-min-noconflict/ext-searchbox.js',
  'https://cdn.jsdelivr.net/npm/ace-builds@1.32.6/src-min-noconflict/keybinding-vim.js',
  'https://cdn.jsdelivr.net/npm/ace-builds@1.32.6/src-min-noconflict/keybinding-emacs.js',
  'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',
  'https://cdn.jsdelivr.net/npm/marked@4/marked.min.js',
  'https://cdn.jsdelivr.net/npm/sass.js/dist/sass.sync.js',
  'https://cdn.jsdelivr.net/npm/lz-string@1.5.0/libs/lz-string.min.js',
  'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js',
  'https://cdn.jsdelivr.net/npm/typescript@5/lib/typescript.js',
  'https://esm.sh/prettier@3.2.5/standalone'
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
      keys.filter(k => k !== PRECACHE && k !== RUNTIME).map(k => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

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

  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const res = await fetch(req);
      if (res.ok) caches.open(RUNTIME).then(c => c.put(req, res.clone()));
      return res;
    } catch {
      return new Response('Offline', { status: 503 });
    }
  })());
});