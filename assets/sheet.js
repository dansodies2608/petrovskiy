const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwsZbfzaUUCQ1fUaEM3_xyBbsgM_MbUVO8MorXsAoXjR0h7haSfG4-PfwIIhhdoIcj3/exec';
const SECRET_KEY = 'YOUR_SECRET_KEY';

// Планы продаж по точкам
const SALES_PLANS = {
  'Софийская': 50,
  'Руставели': 50,
  'Кашира': 50
};

document.addEventListener('DOMContentLoaded', function() {
  initDashboard();
  showLoading(true);
});

function initDashboard() {
  setupTabHandlers();
  setupDateSelector();
  // Загружаем данные сразу при инициализации
  loadData(true);
  createLoadingIndicator();
}

function setupTabHandlers() {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', function() {
      tabs.forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
      });
      
      const tabId = getTabId(this.dataset.count);
      document.getElementById(tabId).classList.add('active');
      updateHeaderTitle(this.textContent.trim());
    });
  });
}

function setupDateSelector() {
  const monthSelect = document.getElementById('month-select');
  const yearSelect = document.getElementById('year-select');
  const applyBtn = document.getElementById('apply-date');
  
  // Устанавливаем текущий месяц и год
  const currentDate = new Date();
  monthSelect.value = currentDate.getMonth() + 1;
  
  // Заполняем годы (последние 5 лет + текущий)
  const currentYear = currentDate.getFullYear();
  for (let year = currentYear - 5; year <= currentYear; year++) {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = year;
    yearSelect.appendChild(option);
  }
  yearSelect.value = currentYear;
  
  // Удаляем сохранение в localStorage
  applyBtn.addEventListener('click', () => {
    showLoading(true);
    loadData(false); // false - не начальная загрузка
  });
}

async function loadData(isInitialLoad) {
  try {
    const monthSelect = document.getElementById('month-select');
    const yearSelect = document.getElementById('year-select');
    
    // Для начальной загрузки используем предыдущий месяц
    if (isInitialLoad) {
      const currentDate = new Date();
      currentDate.setMonth(currentDate.getMonth() - 1); // Предыдущий месяц
      monthSelect.value = currentDate.getMonth() + 1;
      yearSelect.value = currentDate.getFullYear();
    }
    
    const month = monthSelect.value;
    const year = yearSelect.value;
    
    // Проверка на будущую дату
    const currentDate = new Date();
    if (year > currentDate.getFullYear() || 
        (year == currentDate.getFullYear() && month > currentDate.getMonth() + 1)) {
      showError('Нельзя выбрать будущую дату');
      return;
    }
    
    const response = await fetch(`${SCRIPT_URL}?key=${SECRET_KEY}&month=${month}&year=${year}`);
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

function processAndDisplayData(data) {
  updateHeader(data.currentMonth);
  
  const processedNewCars = processData(data.newCars.currentData, data.newCars.prevData, data.newCars.prevYearData);
  const processedUsedCars = processData(data.usedCars.currentData, data.usedCars.prevData, data.usedCars.prevYearData);
  
  updateNewCarsTab(processedNewCars);
  updateUsedCarsTab(processedUsedCars);
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
    return salesPoint === point;
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

function updateNewCarsTab(data) {
  updateCard(data['Софийская'], 1, 'Софийская');
  updateCard(data['Руставели'], 2, 'Руставели');
  updateCard(data['Кашира'], 3, 'Кашира');
}

function updateCard(pointData, cardIndex, pointName) {
  const card = document.querySelector(`.cards-container .card:nth-child(${cardIndex})`);
  if (!card) return;

  const { current, prevMonth, prevYear } = pointData;
  const plan = SALES_PLANS[pointName] || 0;
  
  // Обновление основных показателей
  card.querySelector('.stat-row:nth-child(1) span:last-child').textContent = plan;
  card.querySelector('.stat-row:nth-child(2) span:last-child').textContent = current.total;
  
  // Расчет отклонения
  const deviation = calculateDeviation(current.total, plan);
  const deviationElement = card.querySelector('.stat-row:nth-child(3) span:last-child');
  deviationElement.textContent = formatDeviation(deviation);
  deviationElement.className = getDeviationClass(deviation);
  
  // ЖОК и ЖОК/ед.
  card.querySelector('.stat-row:nth-child(4) span:last-child').textContent = formatNumber(current.jok);
  
  const jokPerUnitElement = card.querySelector('.stat-row:nth-child(5) span:last-child');
  if (current.total > 0 && current.jok !== undefined) {
    jokPerUnitElement.textContent = formatNumber(current.jok / current.total);
  } else {
    jokPerUnitElement.textContent = '0.00';
  }

  // Обновление таблицы динамики
  updateSalesTable(card, current, prevMonth, prevYear);
}

function updateSalesTable(card, current, prevMonth, prevYear) {
  const tableBody = card.querySelector('.sales-dynamics-table tbody');
  if (!tableBody) return;

  tableBody.innerHTML = '';

  // Добавляем строку с итогами
  const growthMonthTotal = calculateGrowth(current.total, prevMonth.total);
  const growthYearTotal = calculateGrowth(current.total, prevYear.total);

  const totalRow = document.createElement('tr');
  totalRow.innerHTML = `
    <td class="fixed-column">Итого</td>
    <td>${current.total}</td>
    <td>${prevMonth.total || 0}</td>
    <td>${prevYear.total > 0 ? prevYear.total : 'N/A'}</td>
    <td class="${getGrowthClass(growthMonthTotal)}">${formatGrowth(growthMonthTotal)}</td>
    <td class="${getGrowthClass(growthYearTotal)}">
      ${prevYear.total > 0 ? formatGrowth(growthYearTotal) : 'N/A'}
    </td>
  `;
  tableBody.appendChild(totalRow);

  // Добавляем данные по брендам
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

function updateUsedCarsTab(data) {
  const points = ['Софийская', 'Руставели', 'Кашира'];
  
  points.forEach((point, index) => {
    const cardIndex = index + 1;
    const card = document.querySelector(`#used-cars-tab .card:nth-child(${cardIndex})`);
    if (!card) return;

    const { current } = data[point];
    const plan = SALES_PLANS[point] || 0;
    
    card.querySelector('.stat-row:nth-child(1) span:last-child').textContent = plan;
    card.querySelector('.stat-row:nth-child(2) span:last-child').textContent = current.total;
    
    const deviation = calculateDeviation(current.total, plan);
    const deviationElement = card.querySelector('.stat-row:nth-child(3) span:last-child');
    deviationElement.textContent = formatDeviation(deviation);
    deviationElement.className = getDeviationClass(deviation);
    
    card.querySelector('.stat-row:nth-child(4) span:last-child').textContent = formatNumber(current.jok);
    
    const jokPerUnitElement = card.querySelector('.stat-row:nth-child(5) span:last-child');
    if (current.total > 0 && current.jok !== undefined) {
      jokPerUnitElement.textContent = formatNumber(current.jok / current.total);
    } else {
      jokPerUnitElement.textContent = '0.00';
    }
  });
}

// Вспомогательные функции
function calculateDeviation(fact, plan) {
  if (plan === 0) return fact === 0 ? 0 : Infinity;
  return ((fact - plan) / plan) * 100;
}

function formatDeviation(value) {
  if (value === Infinity) return '+∞%';
  if (value === -Infinity) return '-∞%';
  if (isNaN(value)) return 'N/A';
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function getDeviationClass(value) {
  if (value >= 0) return 'positive';
  return 'negative';
}

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

function formatNumber(num, decimals = 2) {
  const rounded = typeof num === 'number' ? num.toFixed(decimals) : '0.00';
  const parts = rounded.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return parts.join('.');
}

function updateHeader(monthYear) {
  const header = document.querySelector('.header h1');
  if (header) {
    const activeTab = document.querySelector('.tab-btn.active');
    const tabName = activeTab ? activeTab.textContent.trim() : 'Новые автомобили';
    header.textContent = `${tabName} - ${monthYear.replace('.', '/')}`;
  }
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
