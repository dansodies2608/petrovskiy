const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyWW-ROmCPEXiPt3r8B1cSBjbwTn4Xb7r9WH8Z8g-PyBagEX3Rk_h-jKUTH8hcQSHw6/exec';
const SECRET_KEY = 'YOUR_SECRET'; // Должен совпадать с ключом в Apps Script

document.addEventListener('DOMContentLoaded', function() {
  // Инициализация при загрузке
  fetchDataFromGoogleSheet();
  
  // Обработчики для вкладок
  setupTabHandlers();
});

async function fetchDataFromGoogleSheet() {
  try {
    console.log('Отправка запроса к Google Apps Script...');
    
    const response = await fetch(`${SCRIPT_URL}?key=${SECRET_KEY}`);
    
    if (!response.ok) {
      throw new Error(`Ошибка HTTP: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Получены данные:', data);
    
    // Обновляем дашборд
    updateDashboard(data.data);
    
    // Обновляем месяц (если есть в ответе)
    if (data.month) {
      document.querySelector('.header h1').textContent += ` - ${data.month}`;
    }
  } catch (error) {
    console.error('Ошибка при запросе:', error);
    showErrorNotification('Не удалось загрузить данные. Пожалуйста, попробуйте позже.');
  }
}

function setupTabHandlers() {
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
}

function updateDashboard(data) {
  if (!data || !Array.isArray(data)) {
    console.error('Некорректные данные:', data);
    return;
  }

  const processed = processData(data);
  updateNewCarsTab(processed.newCars);
  updateUsedCarsTab(processed.usedCars);
}

function processData(data) {
  const result = {
    newCars: {
      Софийская: { brands: {}, total: 0, jok: 0 },
      Руставели: { brands: {}, total: 0, jok: 0 },
      Кашира: { brands: {}, total: 0, jok: 0 }
    },
    usedCars: {
      Софийская: { total: 0, jok: 0 },
      Руставели: { total: 0, jok: 0 },
      Кашира: { total: 0, jok: 0 }
    }
  };

  data.forEach(item => {
    // Приводим названия точек продаж к единому формату
    let salesPoint = item.salesPoint;
    if (salesPoint === 'Каширское ш.') salesPoint = 'Кашира';
    
    if (item.category === 'Retail' || item.category === 'Fleet') {
      // Новые авто
      if (!result.newCars[salesPoint]) {
        console.warn(`Неизвестная точка продаж: ${item.salesPoint}`);
        return;
      }
      
      const brand = item.brand || 'Другие'; // На случай если бренд не указан
      if (!result.newCars[salesPoint].brands[brand]) {
        result.newCars[salesPoint].brands[brand] = { count: 0, jok: 0 };
      }
      result.newCars[salesPoint].brands[brand].count += item.soldCount;
      result.newCars[salesPoint].brands[brand].jok += item.jok;
      result.newCars[salesPoint].total += item.soldCount;
      result.newCars[salesPoint].jok += item.jok;
    } else if (item.category === 'Ам с пробегом') {
      // Авто с пробегом
      if (!result.usedCars[salesPoint]) {
        console.warn(`Неизвестная точка продаж: ${item.salesPoint}`);
        return;
      }
      result.usedCars[salesPoint].total += item.soldCount;
      result.usedCars[salesPoint].jok += item.jok;
    }
  });

  return result;
}

function updateNewCarsTab(data) {
  // Софийская
  updateNewCarCard(data['Софийская'], 1);
  
  // Руставели
  updateNewCarCard(data['Руставели'], 2);
  
  // Кашира
  updateNewCarCard(data['Кашира'], 3);
}

function updateNewCarCard(pointData, cardIndex) {
  if (!pointData) return;

  const card = document.querySelector(`.cards-container .card:nth-child(${cardIndex})`);
  if (!card) return;

  // Обновляем основные показатели
  card.querySelector('.stat-row:nth-child(2) span:last-child').textContent = pointData.total;
  card.querySelector('.stat-row:nth-child(4) span:last-child').textContent = formatNumber(pointData.jok);
  card.querySelector('.stat-row:nth-child(5) span:last-child').textContent = pointData.total > 0 
    ? formatNumber(pointData.jok / pointData.total) 
    : '0';

  // Обновляем таблицу динамики
  const tableBody = card.querySelector('.sales-dynamics-table tbody');
  if (!tableBody) return;

  // Очищаем существующие строки (кроме первой)
  const rows = tableBody.querySelectorAll('tr:not(:first-child)');
  rows.forEach(row => row.remove());

  // Добавляем данные по брендам
  for (const brand in pointData.brands) {
    const brandData = pointData.brands[brand];
    const row = document.createElement('tr');
    
    // Здесь можно добавить логику для сравнения с предыдущими периодами
    // Пока просто выводим текущие данные
    row.innerHTML = `
      <td class="fixed-column">${brand}</td>
      <td>${brandData.count}</td>
      <td>0</td>
      <td>0</td>
      <td class="positive">+0%</td>
      <td class="positive">+0%</td>
    `;
    tableBody.appendChild(row);
  }
}

function updateUsedCarsTab(data) {
  // Софийская
  updateUsedCarCard(data['Софийская'], 1);
  
  // Руставели
  updateUsedCarCard(data['Руставели'], 2);
  
  // Кашира
  updateUsedCarCard(data['Кашира'], 3);
}

function updateUsedCarCard(pointData, cardIndex) {
  if (!pointData) return;

  const card = document.querySelector(`#used-cars-tab .card:nth-child(${cardIndex})`);
  if (!card) return;

  // Обновляем основные показатели
  card.querySelector('.stat-row:nth-child(2) span:last-child').textContent = pointData.total;
  card.querySelector('.stat-row:nth-child(4) span:last-child').textContent = formatNumber(pointData.jok);
  card.querySelector('.stat-row:nth-child(5) span:last-child').textContent = pointData.total > 0 
    ? formatNumber(pointData.jok / pointData.total) 
    : '0';
}

function formatNumber(num) {
  return Math.round(num).toLocaleString('ru-RU');
}

function showErrorNotification(message) {
  // Можно реализовать красивое уведомление
  alert(message);
}
