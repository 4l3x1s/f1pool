const CACHE = 'f1pool-v3';
const ASSETS = ['/', '/index.html', '/manifest.json', '/icon.svg'];

// ---- Install ----
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

// ---- Activate ----
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ---- Fetch (cache-first for app shell, network for API) ----
self.addEventListener('fetch', event => {
  const url = event.request.url;
  if (url.includes('jolpi.ca') || url.includes('fonts.') || url.includes('/api/')) return;
  event.respondWith(
    caches.match(event.request).then(r => r || fetch(event.request).then(response => {
      if (response.ok) {
        const clone = response.clone();
        caches.open(CACHE).then(c => c.put(event.request, clone));
      }
      return response;
    }))
  );
});

// ---- Push Notification received ----
self.addEventListener('push', event => {
  let data = { title: '🏁 F1 2026 Pool', body: 'Race results updated!', url: '/' };
  try { if (event.data) data = { ...data, ...event.data.json() }; } catch(e) {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon.svg',
      badge: '/icon.svg',
      data: { url: data.url },
      vibrate: [200, 100, 200, 100, 200],
      tag: 'f1-race-result',
      renotify: true,
      requireInteraction: false
    })
  );
});

// ---- Notification click ----
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
