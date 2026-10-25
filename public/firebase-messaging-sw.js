importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCtUiot3vsNNoG43g3g6x74Ch9BzbW7VmE",
  authDomain: "urukundo-be23f.firebaseapp.com",
  projectId: "urukundo-be23f",
  storageBucket: "urukundo-be23f.firebasestorage.app",
  messagingSenderId: "358576720523",
  appId: "1:358576720523:web:3a37ea5f4aba8d5718a28e",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};
  const title = payload.notification?.title || data.title || 'Urukundo';
  const body = payload.notification?.body || data.body || '';

  // Appel entrant : reste à l'écran jusqu'à ce qu'on y touche, vibre longtemps,
  // et a le même "tag" que l'appel manqué qui viendra le remplacer.
  if (data.kind === 'call') {
    return self.registration.showNotification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: `call-${data.callId}`,
      renotify: true,
      requireInteraction: true,
      vibrate: [800, 400, 800, 400, 800, 400, 800, 400, 800],
      actions: [{ action: 'answer', title: '📞 Répondre' }],
      data: { url: '/' },
    });
  }
  if (data.kind === 'missed-call') {
    return self.registration.showNotification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: `call-${data.callId}`,
      renotify: true,
      data: { url: '/' },
    });
  }

  self.registration.showNotification(title, {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
  });
});

// Ouvre l'app (ou la ramène au premier plan si elle est déjà ouverte) : l'écran
// d'appel entrant s'affiche alors tout seul tant que l'appel sonne encore.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find(w => new URL(w.url).origin === self.location.origin);
    if (existing) return existing.focus();
    return self.clients.openWindow(url);
  })());
});
