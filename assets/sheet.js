const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyWW-ROmCPEXiPt3r8B1cSBjbwTn4Xb7r9WH8Z8g-PyBagEX3Rk_h-jKUTH8hcQSHw6/exec';
const SECRET_KEY = 'YOUR_SECRET'; // Должен совпадать с ключом в Apps Script

// Функция для запроса данных
async function fetchDataFromGoogleSheet() {
  try {
    console.log('Отправка запроса к Google Apps Script...');
    
    // Добавляем параметр key для авторизации
    const response = await fetch(`${SCRIPT_URL}?key=${SECRET_KEY}`);
    
    if (!response.ok) {
      throw new Error(`Ошибка HTTP: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Вывод в консоль
    console.log('Успешный ответ:', {
      month: data.month
    });
    
    updateDashboard(data.data);
  } catch (error) {
    console.error('Ошибка при запросе:', error);
  }
}

document.addEventListener('DOMContentLoaded', function() {
  const salesData = fetchDataFromGoogleSheet();
  function processData(data) {
    const result = {
      newCars: {
        Софийская: { brands: {}, total: 0, jok: 0 },
        Руставели: { brands: {}, total: 0, jok: 0 },
        Каширка: { brands: {}, total: 0, jok: 0 }
      },
      usedCars: {
        Софийская: { total: 0, jok: 0 },
        Руставели: { total: 0, jok: 0 },
        Каширка: { total: 0, jok: 0 }
      }
    };

    data.forEach(item => {
      if (item.category === 'Retail' || item.category === 'Fleet') {
        // Новые авто
        const point = item.salesPoint === 'Каширское ш.' ? 'Каширка' : item.salesPoint;
        if (!result.newCars[point].brands[item.brand]) {
          result.newCars[point].brands[item.brand] = { count: 0, jok: 0 };
        }
        result.newCars[point].brands[item.brand].count += item.soldCount;
        result.newCars[point].brands[item.brand].jok += item.jok;
        result.newCars[point].total += item.soldCount;
        result.newCars[point].jok += item.jok;
      } else if (item.category === 'Ам с пробегом') {
        // Авто с пробегом
        const point = item.salesPoint === 'Каширское ш.' ? 'Каширка' : item.salesPoint;
        result.usedCars[point].total += item.soldCount;
        result.usedCars[point].jok += item.jok;
      }
    });

    return result;
  }

  function updateDashboard(data) {
    const processed = processData(data);
    updateNewCarsTab(processed.newCars);
    updateUsedCarsTab(processed.usedCars);
  }

  function updateNewCarsTab(data) {
    // Софийская
    const sofiyskaya = data['Софийская'];
    document.querySelector('.card:nth-child(1) .stat-row:nth-child(2) span:last-child').textContent = sofiyskaya.total;
    document.querySelector('.card:nth-child(1) .stat-row:nth-child(4) span:last-child').textContent = Math.round(sofiyskaya.jok).toLocaleString();
    document.querySelector('.card:nth-child(1) .stat-row:nth-child(5) span:last-child').textContent = Math.round(sofiyskaya.jok / sofiyskaya.total).toLocaleString();
    
    // Руставели
    const rustaveli = data['Руставели'];
    document.querySelector('.card:nth-child(2) .stat-row:nth-child(2) span:last-child').textContent = rustaveli.total;
    document.querySelector('.card:nth-child(2) .stat-row:nth-child(4) span:last-child').textContent = Math.round(rustaveli.jok).toLocaleString();
    document.querySelector('.card:nth-child(2) .stat-row:nth-child(5) span:last-child').textContent = Math.round(rustaveli.jok / rustaveli.total).toLocaleString();
    
    // Каширка
    const kashirka = data['Каширка'];
    document.querySelector('.card:nth-child(3) .stat-row:nth-child(2) span:last-child').textContent = kashirka.total;
    document.querySelector('.card:nth-child(3) .stat-row:nth-child(4) span:last-child').textContent = Math.round(kashirka.jok).toLocaleString();
    document.querySelector('.card:nth-child(3) .stat-row:nth-child(5) span:last-child').textContent = Math.round(kashirka.jok / kashirka.total).toLocaleString();
  }

  function updateUsedCarsTab(data) {
    // Софийская
    const sofiyskaya = data['Софийская'];
    document.querySelector('#used-cars-tab .card:nth-child(1) .stat-row:nth-child(2) span:last-child').textContent = sofiyskaya.total;
    document.querySelector('#used-cars-tab .card:nth-child(1) .stat-row:nth-child(4) span:last-child').textContent = Math.round(sofiyskaya.jok).toLocaleString();
    document.querySelector('#used-cars-tab .card:nth-child(1) .stat-row:nth-child(5) span:last-child').textContent = Math.round(sofiyskaya.jok / sofiyskaya.total).toLocaleString();
    
    // Руставели
    const rustaveli = data['Руставели'];
    document.querySelector('#used-cars-tab .card:nth-child(2) .stat-row:nth-child(2) span:last-child').textContent = rustaveli.total;
    document.querySelector('#used-cars-tab .card:nth-child(2) .stat-row:nth-child(4) span:last-child').textContent = Math.round(rustaveli.jok).toLocaleString();
    document.querySelector('#used-cars-tab .card:nth-child(2) .stat-row:nth-child(5) span:last-child').textContent = Math.round(rustaveli.jok / rustaveli.total).toLocaleString();
    
    // Каширка
    const kashirka = data['Каширка'];
    document.querySelector('#used-cars-tab .card:nth-child(3) .stat-row:nth-child(2) span:last-child').textContent = kashirka.total;
    document.querySelector('#used-cars-tab .card:nth-child(3) .stat-row:nth-child(4) span:last-child').textContent = Math.round(kashirka.jok).toLocaleString();
    document.querySelector('#used-cars-tab .card:nth-child(3) .stat-row:nth-child(5) span:last-child').textContent = Math.round(kashirka.jok / kashirka.total).toLocaleString();
  }

  // Инициализация
  updateDashboard(salesData);

  // Обработчики для вкладок
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
      });
      
      let tabId = '';
      switch(this.dataset.count) {
        case '0': tabId = 'new-cars-tab'; break;
        case '1': tabId = 'used-cars-tab'; break;
        case '2': tabId = 'service-tab'; break;
        case '3': tabId = 'balance-tab'; break;
      }
      document.getElementById(tabId).classList.add('active');
    });
  });
});
