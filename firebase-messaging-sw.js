importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-messaging.js');

firebase.initializeApp({
  apiKey: "AIzaSyAW2SdDTCpt25PVoB7ROt-tiVrFuabwE4I",
  projectId: "petrovkiy-v1",
  messagingSenderId: "146966889113",
  appId: "1:146966889113:web:e0c92825038949959dae08"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[Service Worker] Received background message', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/petrovskiy/p-192.png'
  };
  return self.registration.showNotification(notificationTitle, notificationOptions);
});
