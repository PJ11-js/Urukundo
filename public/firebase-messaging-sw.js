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
  const title = payload.notification?.title || payload.data?.title || 'Urukundo';
  const body = payload.notification?.body || payload.data?.body || '';
  self.registration.showNotification(title, {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow('/'));
});
