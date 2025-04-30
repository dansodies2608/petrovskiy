importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-messaging.js');

firebase.initializeApp({
  apiKey: "AIzaSyAW2SdDTCpt25PVoB7ROt-tiVrFuabwE4I",
  authDomain: "petrovkiy-v1.firebaseapp.com",
  projectId: "petrovkiy-v1",
  storageBucket: "petrovkiy-v1.appspot.com",
  messagingSenderId: "146966889113",
  appId: "1:146966889113:web:e0c92825038949959dae08"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('Получено фоновое сообщение', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: 'p-192.png'
  };
  return self.registration.showNotification(notificationTitle, notificationOptions);
});
