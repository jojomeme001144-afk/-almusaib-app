const CACHE_VERSION = 'ahali-almusaib-v1-20260916-push-v3';
const CORE_CACHE = `${CACHE_VERSION}-core`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CORE_CACHE)
      .then(cache => Promise.all(
        CORE_ASSETS.map(asset =>
          cache.add(asset).catch(err => console.warn('Cache skipped:', asset, err))
        )
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => !key.startsWith(CACHE_VERSION))
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// إشعارات النظام (Android / iPhone PWA / Desktop)
self.addEventListener('push', event => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    data = { body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'فريق أهالي المسيب التطوعي';
  const options = {
    body: data.body || 'يوجد تغيير جديد في البرنامج.',
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    tag: data.tag || `ahali-${Date.now()}`,
    renotify: true,
    silent: false,
    vibrate: [180, 80, 180],
    dir: 'rtl',
    lang: 'ar',
    data: {
      auditId: data.auditId || '',
      action: data.action || '',
      url: data.url || './'
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const data = event.notification.data || {};
  const targetUrl = new URL(data.url || './', self.registration.scope).href;

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find(c => c.url.startsWith(self.registration.scope));
    if (existing) {
      await existing.focus();
      existing.postMessage({ type: 'PUSH_NOTIFICATION_OPEN', auditId: data.auditId || '' });
      return;
    }
    if (self.clients.openWindow) await self.clients.openWindow(targetUrl);
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Supabase requests must always use the network so local offline-sync logic stays authoritative.
  if (url.hostname.endsWith('supabase.co')) return;

  // Page navigation: prefer fresh GitHub version, fall back to cached app offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CORE_CACHE).then(cache => cache.put('./index.html', copy));
          return response;
        })
        .catch(async () =>
          (await caches.match(request)) ||
          (await caches.match('./index.html'))
        )
    );
    return;
  }

  // Static/CDN assets: cache-first, then save a copy for future offline use.
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (!response || response.status >= 400) return response;
        const copy = response.clone();
        caches.open(RUNTIME_CACHE).then(cache => cache.put(request, copy));
        return response;
      });
    })
  );
});
