// Инициализация Firebase
firebase.initializeApp({
  apiKey: "AIzaSyAW2SdDTCpt25PVoB7ROt-tiVrFuabwE4I",
    authDomain: "petrovkiy-v1.firebaseapp.com",
    projectId: "petrovkiy-v1",
    storageBucket: "petrovkiy-v1.firebasestorage.app",
    messagingSenderId: "146966889113",
    appId: "1:146966889113:web:e0c92825038949959dae08"
});

const messaging = firebase.messaging();

// Обработка фоновых уведомлений (когда приложение закрыто)
messaging.onBackgroundMessage((payload) => {
  console.log('Уведомление получено в фоне:', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: 'p-192.png',
    vibrate: [200, 100, 200] // Вибрация на мобильных
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});
