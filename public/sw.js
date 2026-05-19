// v1.6.0 — Cache bump v8
const CACHE_NAME = 'anafood-v8';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Não cachear API calls
  if (url.pathname.startsWith('/billing') || url.pathname.startsWith('/admin') ||
      url.pathname.startsWith('/webhook') || url.pathname.startsWith('/auth')) {
    return;
  }

  // Stale-while-revalidate para JS/CSS hashed
  // Hash no nome do arquivo torna cache imutável — serve do cache imediato
  // e atualiza em background pra próximo load (zero flash de carregamento)
  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        const networkFetch = fetch(e.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          }
          return response;
        }).catch(() => cached); // offline fallback
        return cached || networkFetch;
      })
    );
    return;
  }

  // Cache-first apenas para imagens/fonts
  if (e.request.destination === 'image' || e.request.destination === 'font') {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        if (cached) return cached;
        return fetch(e.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Network-first para HTML
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('/'))
    );
  }
});

// === PUSH NOTIFICATIONS ===

// Recebe push do servidor (Edge Function send-push)
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'AnaFood', body: event.data ? event.data.text() : 'Atualização do pedido' };
  }

  const title = data.title || 'AnaFood';
  const options = {
    body: data.body || 'Você tem uma atualização do pedido',
    icon: data.icon || '/icons/icon-192.png',
    badge: data.badge || '/icons/icon-192.png',
    tag: data.tag || 'order-update',
    renotify: true,
    data: {
      url: data.url || '/',
      orderId: data.orderId,
      subdomain: data.subdomain,
    },
    actions: data.actions || [
      { action: 'view', title: 'Ver pedido' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Click na notificação: abre/foca cardápio + tracking do pedido
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const targetUrl = data.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Se já tem aba aberta, foca e navega
      for (const client of clients) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client && data.orderId) {
            try { client.navigate(targetUrl); } catch { /* navigate falhou */ }
          }
          return;
        }
      }
      // Sem aba aberta: abre nova
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Subscription expirada/cancelada — tenta renovar (best-effort)
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager.subscribe(event.oldSubscription.options)
      .then((newSub) => {
        // Envia nova subscription ao app via postMessage
        return self.clients.matchAll().then((clients) => {
          clients.forEach((c) => c.postMessage({ type: 'pushSubscriptionRenewed', subscription: newSub }));
        });
      })
      .catch((err) => console.warn('Renovação de push falhou', err))
  );
});
