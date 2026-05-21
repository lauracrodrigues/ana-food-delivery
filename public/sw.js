// v1.8.0 — Cache bump v10 + sem duplicação de handlers
const CACHE_NAME = 'anafood-v10';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  const req = e.request;

  // Ignora cross-origin (Supabase, APIs externas)
  if (url.origin !== self.location.origin) return;

  // NÃO cachear: APIs, webhooks, auth, próprio SW
  if (url.pathname.startsWith('/api/') ||
      url.pathname.startsWith('/v1/') ||
      url.pathname.startsWith('/billing') ||
      url.pathname.startsWith('/admin') ||
      url.pathname.startsWith('/webhook') ||
      url.pathname.startsWith('/auth') ||
      url.pathname === '/sw.js' ||
      url.pathname === '/manifest.json' ||
      url.pathname === '/manifest-entregador.json') {
    return; // browser handle normal
  }

  // JS/CSS hashed (Vite gera hash no nome) — cache-first IMUTÁVEL
  // Hash novo = arquivo novo = sem conflito. Hash velho = serve cache.
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
          // Sem rede e sem cache → falha (browser mostra erro padrão)
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

  // HTML / SPA navigate — SEMPRE network-first (deploy novo aparece no próximo F5)
  if (req.mode === 'navigate' || url.pathname.endsWith('.html')) {
    e.respondWith(
      fetch(req).then((res) => {
        // Cache cópia pra offline
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

  // Resto: comportamento normal (rede direta)
});

// ─── PUSH NOTIFICATIONS (1 handler único — v1.8.0 fix duplicação) ───────────
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
      // Foca aba já aberta na mesma URL
      for (const c of clients) {
        if (c.url.includes(targetUrl) && 'focus' in c) return c.focus();
      }
      // Senão foca primeira + navega
      for (const c of clients) {
        if ('focus' in c) {
          c.focus();
          if ('navigate' in c) {
            try { c.navigate(targetUrl); } catch { /* */ }
          }
          return;
        }
      }
      // Sem aba: abre nova
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});

// Subscription expirou — renova best-effort + avisa app
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager.subscribe(event.oldSubscription?.options)
      .then((newSub) =>
        self.clients.matchAll().then((cs) =>
          cs.forEach((c) => c.postMessage({ type: 'pushSubscriptionRenewed', subscription: newSub }))
        )
      )
      .catch(() => {})
  );
});

// Mensagens do app (skipWaiting on-demand)
self.addEventListener('message', (e) => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
