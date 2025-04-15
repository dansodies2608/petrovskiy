const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyWW-ROmCPEXiPt3r8B1cSBjbwTn4Xb7r9WH8Z8g-PyBagEX3Rk_h-jKUTH8hcQSHw6/exec';
const SECRET_KEY = 'YOUR_SECRET';

document.addEventListener('DOMContentLoaded', function() {
  fetchDataFromGoogleSheet();
  setupTabHandlers();
});

async function fetchDataFromGoogleSheet() {
  try {
    const response = await fetch(`${SCRIPT_URL}?key=${SECRET_KEY}`);
    if (!response.ok) throw new Error(`Ошибка HTTP: ${response.status}`);
    
    const data = await response.json();
    if (data.status !== 'success') throw new Error(data.message);
    
    console.log('Данные за текущий месяц:', data.currentData);
    console.log('Данные за прошлый месяц:', data.prevData);
    
    updateDashboard(data.currentData, data.prevData);
    updateMonthHeader(data.currentMonth);
    
  } catch (error) {
    console.error('Ошибка:', error);
    showErrorNotification('Не удалось загрузить данные. Попробуйте позже.');
  }
}

function processData(currentData, prevData) {
  const processDataForPeriod = (data) => {
    const result = {
      Софийская: { brands: {}, total: 0, jok: 0 },
      Руставели: { brands: {}, total: 0, jok: 0 },
      Кашира: { brands: {}, total: 0, jok: 0 }
    };

    data.forEach(item => {
      const salesPoint = item.salesPoint === 'Каширское ш.' ? 'Кашира' : item.salesPoint;
      if (!result[salesPoint]) return;

      if (item.category === 'Retail' || item.category === 'Fleet') {
        const brand = item.brand || 'Другие';
        result[salesPoint].brands[brand] = result[salesPoint].brands[brand] || { count: 0, jok: 0 };
        result[salesPoint].brands[brand].count += item.soldCount;
        result[salesPoint].brands[brand].jok += item.jok;
        result[salesPoint].total += item.soldCount;
        result[salesPoint].jok += item.jok;
      }
    });

    return result;
  };

  return {
    current: processDataForPeriod(currentData),
    previous: processDataForPeriod(prevData)
  };
}

function updateDashboard(currentData, prevData) {
  const processed = processData(currentData, prevData);
  
  // Обновляем вкладку "Новые авто"
  updateNewCarsTab(processed.current, processed.previous);
  
  // Обновляем вкладку "Авто с пробегом"
  updateUsedCarsTab(currentData, prevData);
}

function updateNewCarsTab(currentData, prevData) {
  updateNewCarCard(currentData['Софийская'], prevData['Софийская'], 1);
  updateNewCarCard(currentData['Руставели'], prevData['Руставели'], 2);
  updateNewCarCard(currentData['Кашира'], prevData['Кашира'], 3);
}

function updateNewCarCard(currentPointData, prevPointData, cardIndex) {
  if (!currentPointData) return;
  
  const card = document.querySelector(`.cards-container .card:nth-child(${cardIndex})`);
  if (!card) return;

  // Основные показатели
  card.querySelector('.stat-row:nth-child(2) span:last-child').textContent = currentPointData.total;
  card.querySelector('.stat-row:nth-child(4) span:last-child').textContent = formatNumber(currentPointData.jok);
  card.querySelector('.stat-row:nth-child(5) span:last-child').textContent = currentPointData.total > 0 
    ? formatNumber(currentPointData.jok / currentPointData.total) 
    : '0';

  // Таблица динамики
  const tableBody = card.querySelector('.sales-dynamics-table tbody');
  if (!tableBody) return;

  // Очищаем старые строки (кроме заголовков)
  tableBody.querySelectorAll('tr:not(:first-child)').forEach(row => row.remove());

  // Добавляем данные по брендам с динамикой
  for (const brand in currentPointData.brands) {
    const currentBrandData = currentPointData.brands[brand];
    const prevBrandData = prevPointData?.brands?.[brand] || { count: 0 };
    
    const growthPrevMonth = prevBrandData.count > 0 
      ? ((currentBrandData.count - prevBrandData.count) / prevBrandData.count * 100).toFixed(1)
      : 0;
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="fixed-column">${brand}</td>
      <td>${currentBrandData.count}</td>
      <td>${prevBrandData.count || 0}</td>
      <td>0</td> <!-- АППГ - можно добавить при наличии данных -->
      <td class="${growthPrevMonth >= 0 ? 'positive' : 'negative'}">
        ${growthPrevMonth >= 0 ? '+' : ''}${growthPrevMonth}%
      </td>
      <td class="positive">+0%</td> <!-- Заглушка для АППГ -->
    `;
    tableBody.appendChild(row);
  }
}

// Аналогичные функции для usedCars и других вкладок...

function formatNumber(num) {
  return Math.round(num).toLocaleString('ru-RU');
}

function updateMonthHeader(monthYear) {
  const header = document.querySelector('.header h1');
  if (header) {
    header.textContent = `Новые автомобили - ${monthYear}`;
  }
}

function showErrorNotification(message) {
  // Реализация уведомления об ошибке
  const notification = document.createElement('div');
  notification.className = 'error-notification';
  notification.textContent = message;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 5000);
}
