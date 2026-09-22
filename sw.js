const CACHE = 'ahali-almusayyib-v41';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // نخزن كل ملف بشكل مستقل: فشل أيقونة مثلاً لا يمنع تخزين index.html.
    await Promise.allSettled(APP_SHELL.map(async url => {
      const req = new Request(url, { cache: 'reload' });
      const res = await fetch(req);
      if (res && res.ok) await cache.put(url, res.clone());
    }));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

async function offlineAppShell() {
  const cache = await caches.open(CACHE);
  return (await cache.match('./index.html')) ||
         (await cache.match('./')) ||
         new Response('Offline app shell unavailable', {
           status: 503,
           headers: { 'Content-Type': 'text/plain; charset=utf-8' }
         });
}

async function navigationRequest(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req, { cache: 'no-store' });
    if (res && res.ok) {
      // أي صفحة تشغيل ناجحة تحدّث نسخة التطبيق الأوفلاين القياسية.
      await cache.put('./index.html', res.clone());
      return res;
    }
    return await offlineAppShell();
  } catch (_) {
    return await offlineAppShell();
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res && res.ok) await cache.put(req, res.clone());
    return res;
  } catch (_) {
    return Response.error();
  }
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const u = new URL(event.request.url);

  if (event.request.mode === 'navigate') {
    event.respondWith(navigationRequest(event.request));
    return;
  }

  const cacheable = u.origin === self.location.origin ||
    u.hostname === 'fonts.googleapis.com' ||
    u.hostname === 'fonts.gstatic.com' ||
    u.hostname === 'cdnjs.cloudflare.com' ||
    u.hostname === 'cdn.jsdelivr.net';

  if (cacheable) event.respondWith(cacheFirst(event.request));
});
