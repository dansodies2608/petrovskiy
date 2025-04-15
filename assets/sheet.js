const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyWW-ROmCPEXiPt3r8B1cSBjbwTn4Xb7r9WH8Z8g-PyBagEX3Rk_h-jKUTH8hcQSHw6/exec';
const SECRET_KEY = 'YOUR_SECRET';

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
  setupTabHandlers();
  fetchDataFromGoogleSheet();
});

// Настройка обработчиков вкладок
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

// Загрузка данных из Google Sheets
async function fetchDataFromGoogleSheet() {
  try {
    showLoadingIndicator(true);
    
    const response = await fetch(`${SCRIPT_URL}?key=${SECRET_KEY}`);
    if (!response.ok) throw new Error(`Ошибка HTTP: ${response.status}`);
    
    const data = await response.json();
    if (data.status !== 'success') throw new Error(data.message);
    
    updateDashboard(data.currentData, data.prevData, data.prevYearData);
    updateMonthHeader(data.currentMonth);
    
  } catch (error) {
    console.error('Ошибка:', error);
    showErrorNotification('Не удалось загрузить данные. Пожалуйста, попробуйте позже.');
  } finally {
    showLoadingIndicator(false);
  }
}

// Обработка и преобразование данных
function processData(currentData, prevData, prevYearData) {
  const processDataForPeriod = (data) => {
    const result = {
      Софийская: { brands: {}, total: 0, jok: 0 },
      Руставели: { brands: {}, total: 0, jok: 0 },
      Кашира: { brands: {}, total: 0, jok: 0 }
    };

    (data || []).forEach(item => {
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
    previous: processDataForPeriod(prevData),
    prevYear: processDataForPeriod(prevYearData)
  };
}

// Обновление всего дашборда
function updateDashboard(currentData, prevData, prevYearData) {
  const processed = processData(currentData, prevData, prevYearData);
  updateNewCarsTab(processed.current, processed.previous, processed.prevYear);
  updateUsedCarsTab(processed.current, processed.previous, processed.prevYear);
}

// Обновление вкладки "Новые авто"
function updateNewCarsTab(currentData, prevData, prevYearData) {
  updateNewCarCard(currentData['Софийская'], prevData['Софийская'], prevYearData['Софийская'], 1);
  updateNewCarCard(currentData['Руставели'], prevData['Руставели'], prevYearData['Руставели'], 2);
  updateNewCarCard(currentData['Кашира'], prevData['Кашира'], prevYearData['Кашира'], 3);
}

// Обновление карточки новых авто
function updateNewCarCard(currentPointData, prevPointData, prevYearPointData, cardIndex) {
  if (!currentPointData) return;
  
  const card = document.querySelector(`.cards-container .card:nth-child(${cardIndex})`);
  if (!card) return;

  // Обновляем основные показатели
  card.querySelector('.stat-row:nth-child(2) span:last-child').textContent = currentPointData.total;
  card.querySelector('.stat-row:nth-child(4) span:last-child').textContent = formatNumber(currentPointData.jok);
  card.querySelector('.stat-row:nth-child(5) span:last-child').textContent = currentPointData.total > 0 
    ? formatNumber(currentPointData.jok / currentPointData.total) 
    : '0';

  // Обновляем таблицу динамики
  const tableBody = card.querySelector('.sales-dynamics-table tbody');
  if (!tableBody) return;

  // Очищаем старые строки (кроме заголовков)
  tableBody.querySelectorAll('tr:not(:first-child)').forEach(row => row.remove());

  // Добавляем данные по брендам с динамикой
  for (const brand in currentPointData.brands) {
    const currentBrandData = currentPointData.brands[brand];
    const prevBrandData = prevPointData?.brands?.[brand] || { count: 0 };
    const prevYearBrandData = prevYearPointData?.brands?.[brand] || { count: 0 };
    
    const growthPrevMonth = calculateGrowth(currentBrandData.count, prevBrandData.count);
    const growthPrevYear = calculateGrowth(currentBrandData.count, prevYearBrandData.count);
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="fixed-column">${brand}</td>
      <td>${currentBrandData.count}</td>
      <td>${prevBrandData.count || 0}</td>
      <td>${prevYearBrandData.count || 0}</td>
      <td class="${growthPrevMonth >= 0 ? 'positive' : 'negative'}">
        ${formatGrowth(growthPrevMonth)}
      </td>
      <td class="${growthPrevYear >= 0 ? 'positive' : 'negative'}">
        ${formatGrowth(growthPrevYear)}
      </td>
    `;
    tableBody.appendChild(row);
  }
}

// Обновление вкладки "Авто с пробегом" (аналогично новым авто)
function updateUsedCarsTab(currentData, prevData, prevYearData) {
  // Реализация аналогична updateNewCarsTab
  // ...
}

// Вспомогательные функции
function calculateGrowth(current, previous) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
}

function formatGrowth(value) {
  if (value === 0) return '0%';
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function formatNumber(num) {
  return Math.round(num).toLocaleString('ru-RU');
}

function updateMonthHeader(monthYear) {
  const header = document.querySelector('.header h1');
  if (header) {
    header.textContent = `Новые автомобили - ${monthYear.replace('.', '/')}`;
  }
}

function showLoadingIndicator(show) {
  const loader = document.getElementById('loading-indicator') || createLoadingIndicator();
  loader.style.display = show ? 'block' : 'none';
}

function createLoadingIndicator() {
  const loader = document.createElement('div');
  loader.id = 'loading-indicator';
  loader.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    display: none;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  `;
  loader.innerHTML = '<div style="color: white; font-size: 24px;">Загрузка данных...</div>';
  document.body.appendChild(loader);
  return loader;
}

function showErrorNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'error-notification';
  notification.textContent = message;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 5000);
}
