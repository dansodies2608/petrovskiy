// Проверяем, доступен ли importScripts
try {
  importScripts(
    'https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js',
    'https://www.gstatic.com/firebasejs/8.10.0/firebase-messaging.js'
  );

  // Инициализация Firebase в Service Worker
  if (firebase.apps.length === 0) {
    firebase.initializeApp({
      apiKey: "AIzaSyAW2SdDTCpt25PVoB7ROt-tiVrFuabwE4I",
      authDomain: "petrovkiy-v1.firebaseapp.com",
      projectId: "petrovkiy-v1",
      storageBucket: "petrovkiy-v1.appspot.com",
      messagingSenderId: "146966889113",
      appId: "1:146966889113:web:e0c92825038949959dae08"
    });
  }

  const messaging = firebase.messaging();

  // Обработка фоновых сообщений
  messaging.onBackgroundMessage((payload) => {
    console.log('[SW] Получено фоновое сообщение', payload);
    
    const notificationTitle = payload.notification?.title || 'Новое сообщение';
    const notificationOptions = {
      body: payload.notification?.body || '',
      icon: 'p-192.png',
      data: payload.data || {}
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
  });

} catch (e) {
  console.error('Ошибка в Service Worker:', e);
}
