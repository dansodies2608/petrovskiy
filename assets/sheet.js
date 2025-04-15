const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwsZbfzaUUCQ1fUaEM3_xyBbsgM_MbUVO8MorXsAoXjR0h7haSfG4-PfwIIhhdoIcj3/exec';
const SECRET_KEY = 'YOUR_SECRET_KEY';

// Главная функция инициализации
document.addEventListener('DOMContentLoaded', function() {
  initDashboard();
});

function initDashboard() {
  setupTabHandlers();
  loadData();
  createLoadingIndicator();
}

// Настройка вкладок
function setupTabHandlers() {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', function() {
      // Удаляем активный класс у всех вкладок
      tabs.forEach(t => t.classList.remove('active'));
      // Добавляем активный класс текущей вкладке
      this.classList.add('active');
      
      // Скрываем все содержимое вкладок
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
      });
      
      // Показываем соответствующее содержимое
      const tabId = getTabId(this.dataset.count);
      document.getElementById(tabId).classList.add('active');
    });
  });
}

function getTabId(count) {
  const tabs = {
    '0': 'new-cars-tab',
    '1': 'used-cars-tab', 
    '2': 'service-tab',
    '3': 'balance-tab'
  };
  return tabs[count] || 'new-cars-tab';
}

// Загрузка данных
async function loadData() {
  try {
    showLoading(true);
    
    const response = await fetch(`${SCRIPT_URL}?key=${SECRET_KEY}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const data = await response.json();
    if (data.status !== 'success') throw new Error(data.message);
    
    processAndDisplayData(data);
    
  } catch (error) {
    console.error('Ошибка загрузки данных:', error);
    showError('Не удалось загрузить данные. Пожалуйста, попробуйте позже.');
  } finally {
    showLoading(false);
  }
}

// Обработка и отображение данных
function processAndDisplayData(data) {
  console.log('Получены данные:', data);
  
  // Обновляем заголовок с месяцем
  updateHeader(data.currentMonth);
  
  // Обрабатываем данные для всех точек продаж
  const processedData = processData(data.currentData, data.prevData, data.prevYearData);
  
  // Обновляем UI
  updateNewCarsTab(processedData);
  updateUsedCarsTab(processedData);
}

function processData(currentData, prevData, prevYearData) {
  const points = ['Софийская', 'Руставели', 'Кашира'];
  const result = {};
  
  points.forEach(point => {
    result[point] = {
      current: processPeriodData(currentData, point),
      prevMonth: processPeriodData(prevData, point),
      prevYear: processPeriodData(prevYearData, point)
    };
  });
  
  return result;
}

function processPeriodData(data, point) {
  const filtered = data.filter(item => {
    const salesPoint = item.salesPoint === 'Каширское ш.' ? 'Кашира' : item.salesPoint;
    return salesPoint === point && (item.category === 'Retail' || item.category === 'Fleet');
  });
  
  const result = {
    brands: {},
    total: 0,
    jok: 0
  };
  
  filtered.forEach(item => {
    const brand = item.brand || 'Другие';
    result.brands[brand] = result.brands[brand] || { count: 0, jok: 0 };
    result.brands[brand].count += item.soldCount;
    result.brands[brand].jok += item.jok;
    result.total += item.soldCount;
    result.jok += item.jok;
  });
  
  return result;
}

// Обновление вкладки "Новые авто"
function updateNewCarsTab(data) {
  updateCard(data['Софийская'], 1);
  updateCard(data['Руставели'], 2);
  updateCard(data['Кашира'], 3);
}

function updateCard(pointData, cardIndex) {
  const card = document.querySelector(`.cards-container .card:nth-child(${cardIndex})`);
  if (!card) return;

  const { current, prevMonth, prevYear } = pointData;
  
  // Основные показатели
  card.querySelector('.stat-row:nth-child(2) span:last-child').textContent = current.total;
  card.querySelector('.stat-row:nth-child(4) span:last-child').textContent = formatNumber(current.jok);
  card.querySelector('.stat-row:nth-child(5) span:last-child').textContent = current.total > 0 
    ? formatNumber(current.jok / current.total) 
    : '0';

  // Таблица динамики
  const tableBody = card.querySelector('.sales-dynamics-table tbody');
  if (!tableBody) return;

  // Очистка старых данных
  tableBody.querySelectorAll('tr:not(:first-child)').forEach(row => row.remove());

  // Добавление новых данных
  for (const brand in current.brands) {
    const currentBrand = current.brands[brand];
    const prevBrand = prevMonth.brands[brand] || { count: 0 };
    const prevYearBrand = prevYear.brands[brand] || { count: 0 };

    const growthMonth = calculateGrowth(currentBrand.count, prevBrand.count);
    const growthYear = calculateGrowth(currentBrand.count, prevYearBrand.count);

    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="fixed-column">${brand}</td>
      <td>${currentBrand.count}</td>
      <td>${prevBrand.count || 0}</td>
      <td>${prevYearBrand.count > 0 ? prevYearBrand.count : 'N/A'}</td>
      <td class="${getGrowthClass(growthMonth)}">${formatGrowth(growthMonth)}</td>
      <td class="${getGrowthClass(growthYear)}">
        ${prevYear.total > 0 ? formatGrowth(growthYear) : 'N/A'}
      </td>
    `;
    tableBody.appendChild(row);
  }
}

// Вспомогательные функции
function calculateGrowth(current, previous) {
  if (previous === 0) return current === 0 ? 0 : Infinity;
  return ((current - previous) / previous) * 100;
}

function formatGrowth(value) {
  if (value === Infinity) return '+∞%';
  if (value === -Infinity) return '-∞%';
  if (isNaN(value)) return 'N/A';
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function getGrowthClass(value) {
  if (value === Infinity || value > 0) return 'positive';
  if (value === -Infinity || value < 0) return 'negative';
  return 'neutral';
}

function formatNumber(num) {
  return Math.round(num).toLocaleString('ru-RU');
}

function updateHeader(monthYear) {
  const header = document.querySelector('.header h1');
  if (header) {
    header.textContent = `Новые автомобили - ${monthYear.replace('.', '/')}`;
  }
}

// UI элементы
function createLoadingIndicator() {
  const loader = document.createElement('div');
  loader.id = 'loading-indicator';
  loader.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.7);
    display: none;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    color: white;
    font-size: 24px;
  `;
  loader.innerHTML = '<div class="spinner"></div><div>Загрузка данных...</div>';
  document.body.appendChild(loader);
}

function showLoading(show) {
  const loader = document.getElementById('loading-indicator');
  if (loader) loader.style.display = show ? 'flex' : 'none';
}

function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-notification';
  errorDiv.textContent = message;
  document.body.appendChild(errorDiv);
  setTimeout(() => errorDiv.remove(), 5000);
}

// Обновление других вкладок
function updateUsedCarsTab(data) {
  // Аналогичная реализация для авто с пробегом
  // ...
}
