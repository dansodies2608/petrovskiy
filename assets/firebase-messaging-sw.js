const firebaseConfig = {
  apiKey: "AIzaSyAW2SdDTCpt25PVoB7ROt-tiVrFuabwE4I",
    authDomain: "petrovkiy-v1.firebaseapp.com",
    projectId: "petrovkiy-v1",
    storageBucket: "petrovkiy-v1.firebasestorage.app",
    messagingSenderId: "146966889113",
    appId: "1:146966889113:web:e0c92825038949959dae08"
};

firebase.initializeApp(firebaseConfig);
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

function requestNotificationPermission() {
  Notification.requestPermission().then((permission) => {
    if (permission === 'granted') {
      console.log('Разрешение получено!');
      getFCMToken(); // Получаем токен устройства
    } else {
      console.log('Пользователь отклонил уведомления');
    }
  });
}

// Получение FCM-токена (уникальный ID устройства)
function getFCMToken() {
  messaging.getToken({ vapidKey: 'BHRB-EfAZe9ZpVWLgdrVT-TalYRTwdgZiKmeAph0Me3zIBbvVMTBaSdKGNh3rLmhGIL0AdvBsrRX2z4ITlEIaBY' }).then((token) => {
    console.log('FCM Token:', token);
    // Отправьте этот токен на сервер (Google Apps Script)
    saveTokenToServer(token);
  });
}

// Сохранение токена в Google Sheets или PropertiesService
function saveTokenToServer(token) {
  const url = 'https://script.google.com/macros/s/AKfycbzmiq2x3zkNetsY9DPJym3tVSPkuC4YY8lWa7w270PILhW4XgaaLAjAb0AkHk-pr2GbVw/exec';
  fetch(url, {
    method: 'POST',
    body: JSON.stringify({ action: 'save_token', token: token })
  });
}

requestNotificationPermission()
