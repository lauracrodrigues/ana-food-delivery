// v1.9.0 — Cache Supabase storage + REST GET reads (Fase 3A ecossistema)
// Network-first pra HTML/SPA, cache-first pra assets hashed,
// stale-while-revalidate pra Supabase storage + reads idempotentes
const CACHE_NAME = 'anafood-v11';
const SUPABASE_CACHE = 'supabase-data-v1';
const STORAGE_CACHE = 'supabase-storage-v1';
const SUPABASE_HOST = 'jgdyklzrxygvwuhlnbat.supabase.co';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => ![CACHE_NAME, SUPABASE_CACHE, STORAGE_CACHE].includes(k))
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  const req = e.request;

  // ── CROSS-ORIGIN: Supabase storage (logos/banners/produtos) — cache-first
  if (url.host === SUPABASE_HOST && url.pathname.startsWith('/storage/v1/object/public/')) {
    e.respondWith(
      caches.open(STORAGE_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) return cached;
        try {
          const fresh = await fetch(req);
          if (fresh.ok) cache.put(req, fresh.clone());
          return fresh;
        } catch (err) {
          throw err;
        }
      })
    );
    return;
  }

  // ── CROSS-ORIGIN: Supabase REST GET — stale-while-revalidate (operacionais)
  // POST/PATCH/DELETE NUNCA cacheia
  if (url.host === SUPABASE_HOST && url.pathname.startsWith('/rest/v1/') && req.method === 'GET') {
    // Skip auth-sensitive (settings de billing, admin, profiles do user)
    if (url.pathname.includes('/billing') || url.pathname.includes('/admin')) {
      return; // browser handle
    }
    e.respondWith(
      caches.open(SUPABASE_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        const fetchPromise = fetch(req).then((res) => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        }).catch(() => cached); // offline → retorna cache
        // Stale-while-revalidate: serve cache imediato + atualiza em background
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Ignora outras cross-origin
  if (url.origin !== self.location.origin) return;

  // NÃO cachear: APIs próprias, webhooks, auth, próprio SW
  if (url.pathname.startsWith('/api/') ||
      url.pathname.startsWith('/v1/') ||
      url.pathname.startsWith('/billing') ||
      url.pathname.startsWith('/admin') ||
      url.pathname.startsWith('/webhook') ||
      url.pathname.startsWith('/auth') ||
      url.pathname === '/sw.js' ||
      url.pathname === '/manifest.json' ||
      url.pathname === '/manifest-entregador.json') {
    return;
  }

  // JS/CSS hashed (Vite gera hash) — cache-first IMUTÁVEL
  if (url.pathname.match(/\/assets\/.+\.(js|css|woff2|woff)$/)) {
    e.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) return cached;
        try {
          const fresh = await fetch(req);
          if (fresh.ok) cache.put(req, fresh.clone());
          return fresh;
        } catch (err) {
          throw err;
        }
      })
    );
    return;
  }

  // Imagens/fontes: cache-first
  if (req.destination === 'image' || req.destination === 'font') {
    e.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) return cached;
        try {
          const fresh = await fetch(req);
          if (fresh.ok) cache.put(req, fresh.clone());
          return fresh;
        } catch (err) {
          if (cached) return cached;
          throw err;
        }
      })
    );
    return;
  }

  // HTML/SPA navigate — network-first (deploy novo aparece F5)
  if (req.mode === 'navigate' || url.pathname.endsWith('.html')) {
    e.respondWith(
      fetch(req).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put('/', clone));
        }
        return res;
      }).catch(async () => {
        const cached = await caches.match('/');
        return cached || new Response('Offline', { status: 503 });
      })
    );
    return;
  }
});

// ─── PUSH NOTIFICATIONS ───────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data?.json() || {};
  } catch {
    data = { title: 'Ana Food', body: event.data?.text() || 'Atualização' };
  }

  const title = data.title || 'Ana Food';
  const options = {
    body: data.body || '',
    icon: data.icon || '/icons/icon-192.png',
    badge: data.badge || '/icons/icon-192.png',
    tag: data.tag || 'anafood',
    renotify: true,
    vibrate: [200, 100, 200],
    requireInteraction: false,
    data: data.data || { url: data.url || '/' },
    actions: data.actions || undefined,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const targetUrl = data.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const c of clients) {
        if (c.url.includes(targetUrl) && 'focus' in c) return c.focus();
      }
      for (const c of clients) {
        if ('focus' in c) {
          c.focus();
          if ('navigate' in c) {
            try { c.navigate(targetUrl); } catch { /* noop */ }
          }
          return;
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});

self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager.subscribe(event.oldSubscription?.options)
      .then((newSub) =>
        self.clients.matchAll().then((cs) =>
          cs.forEach((c) => c.postMessage({ type: 'pushSubscriptionRenewed', subscription: newSub }))
        )
      )
      .catch(() => { /* noop */ })
  );
});

self.addEventListener('message', (e) => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
