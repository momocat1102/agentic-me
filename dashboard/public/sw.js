const CACHE_NAME = 'cc-app-shell-v2';

const APP_SHELL_URLS = [
  '/',
];

// Install: precache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL_URLS))
  );
  self.skipWaiting();
});

// Activate: clean old caches + claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch handler
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API requests: network only, never cache
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/api')) {
    return;
  }

  // Navigation requests: network first, fallback to cached app shell
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match('/').then((response) => {
          if (response) return response;
          return new Response(
            '<!DOCTYPE html><html lang="zh-TW"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Central Command</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,-apple-system,sans-serif;background:#1a1a2e;color:#e0e0e0;display:flex;align-items:center;justify-content:center;min-height:100vh}.container{text-align:center;padding:2rem}.icon{font-size:3rem;margin-bottom:1rem;animation:pulse 2s infinite}@keyframes pulse{0%,100%{opacity:.5}50%{opacity:1}}h1{font-size:1.5rem;margin-bottom:.5rem;color:#4fc3f7}p{color:#999;margin-bottom:1.5rem}.dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#4fc3f7;margin:0 3px;animation:bounce 1.4s infinite ease-in-out}.dot:nth-child(1){animation-delay:-.32s}.dot:nth-child(2){animation-delay:-.16s}@keyframes bounce{0%,80%,100%{transform:scale(0)}40%{transform:scale(1)}}</style></head><body><div class="container"><div class="icon">📡</div><h1>Central Command</h1><p>等待伺服器連線...</p><div><span class="dot"></span><span class="dot"></span><span class="dot"></span></div></div><script>setInterval(()=>{fetch("/api/agents").then(r=>{if(r.ok)location.reload()}).catch(()=>{})},3000)</script></body></html>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        })
      )
    );
    return;
  }

  // Static assets (JS/CSS/images): cache first
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.woff2')
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }
});
