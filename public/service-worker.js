// web-app/public/service-worker.js

self.addEventListener('push', event => {
  const data = event.data.json();
  console.log('Push received:', data);

  const title = data.title || 'New Notification';
  const options = {
    body: data.body || 'You have a new update.',
    icon: '/logo192.png', // Path to your app's icon
    badge: '/badge.png', // Optional: icon shown in notification tray on some platforms
    data: {
      url: data.url || '/', // URL to open when notification is clicked
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close(); // Close the notification

  // Open the URL specified in the notification's data
  const urlToOpen = event.notification.data.url;
  event.waitUntil(
    clients.openWindow(urlToOpen)
  );
});

// This event listener is crucial for PWA installation and caching assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing.');
  // You can add caching logic here if you want your PWA to work offline
  // For example, caching static assets:
  // event.waitUntil(
  //   caches.open('my-app-cache-v1').then((cache) => {
  //     return cache.addAll([
  //       '/',
  //       '/index.html',
  //       '/logo192.png',
  //       // Add other critical assets here
  //     ]);
  //   })
  // );
  self.skipWaiting(); // Activates the new service worker immediately
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating.');
  event.waitUntil(clients.claim()); // Take control of existing clients
});