const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwsZbfzaUUCQ1fUaEM3_xyBbsgM_MbUVO8MorXsAoXjR0h7haSfG4-PfwIIhhdoIcj3/exec";
const SECRET_KEY = "YOUR_SECRET_KEY";

let dashboardData = null;

document.addEventListener("DOMContentLoaded", function () {
  initDashboard();
});

function initDashboard() {
    createLoadingIndicator(); // Сначала создаем
    showLoading(true);       // Потом показываем
    setupTabHandlers();
    setupDateSelector();
    loadData(true);
}

function setupTabHandlers() {
  const tabs = document.querySelectorAll(".tab-btn");
  tabs.forEach((tab) => {
    tab.addEventListener("click", function () {
      tabs.forEach((t) => t.classList.remove("active"));
      this.classList.add("active");

      document.querySelectorAll(".tab-content").forEach((content) => {
        content.classList.remove("active");
      });

      const tabId = getTabId(this.dataset.count);
      document.getElementById(tabId).classList.add("active");

      updateHeader();

      if (dashboardData) {
        refreshTabData(tabId);
      }
    });
  });
}

function getTabId(count) {
  const tabs = {
    0: "new-cars-tab",
    1: "used-cars-tab",
    2: "service-tab",
    3: "balance-tab",
  };
  return tabs[count] || "new-cars-tab";
}

function setupDateSelector() {
    const monthSelect = document.getElementById('month-select');
    const yearSelect = document.getElementById('year-select');
    const applyBtn = document.getElementById('apply-date');
    
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    
    // Устанавливаем текущий месяц и год
    monthSelect.value = currentMonth;
    
    // Очищаем и заполняем список годов
    yearSelect.innerHTML = '';
    for (let year = currentYear - 2; year <= currentYear; year++) {
      const option = document.createElement('option');
      option.value = year;
      option.textContent = year;
      yearSelect.appendChild(option);
    }
    
    // Устанавливаем текущий год как выбранный
    yearSelect.value = currentYear;
    
    applyBtn.addEventListener('click', () => {
      showLoading(true);
      loadData(false);
    });
  }

async function loadData(isInitialLoad) {
  try {
    const monthSelect = document.getElementById("month-select");
    const yearSelect = document.getElementById("year-select");
    const month = parseInt(monthSelect.value);
    const year = parseInt(yearSelect.value);
    const today = new Date();

    if (
      year > today.getFullYear() ||
      (year === today.getFullYear() && month > today.getMonth() + 1)
    ) {
      showError("Нельзя выбрать будущую дату");
      return;
    }

    const salesUrl = `${SCRIPT_URL}?key=${SECRET_KEY}&month=${month}&year=${year}&type=sales`;
    const salesResponse = await fetch(salesUrl);
    if (!salesResponse.ok)
      throw new Error(`Ошибка HTTP: ${salesResponse.status}`);

    const salesData = await salesResponse.json();
    if (salesData.status !== "success") throw new Error(salesData.message);

    const serviceUrl = `${SCRIPT_URL}?key=${SECRET_KEY}&month=${month}&year=${year}&type=service`;
    const serviceResponse = await fetch(serviceUrl);
    const serviceData = await serviceResponse.json();

    const balanceUrl = `${SCRIPT_URL}?key=${SECRET_KEY}&type=balance`;
    const balanceResponse = await fetch(balanceUrl);
    const balanceData = await balanceResponse.json();

    dashboardData = {
      ...salesData,
      serviceData: serviceData.data,
      balanceData: balanceData.data,
      currentMonth: salesData.currentMonth,
      selectedMonth: salesData.selectedMonth,
      selectedYear: salesData.selectedYear,
    };

    processAndDisplayData(dashboardData);
  } catch (error) {
    console.error("Ошибка загрузки данных:", error);
    showError("Не удалось загрузить данные. Пожалуйста, попробуйте позже.");
  } finally {
    showLoading(false);
  }
}

function processAndDisplayData(data) {
  dashboardData = data;
  updateHeader();

  if (data.newCars && data.usedCars) {
    const processedNewCars = processSalesData(
      data.newCars.currentData,
      data.newCars.prevData,
      data.newCars.prevYearData
    );
    const processedUsedCars = processSalesData(
      data.usedCars.currentData,
      data.usedCars.prevData,
      data.usedCars.prevYearData
    );

    updateNewCarsTab(processedNewCars);
    updateUsedCarsTab(processedUsedCars);
  }

  if (data.serviceData) {
    updateServiceTab(data.serviceData);
  }

  if (data.balanceData) {
    updateBalanceTab(data.balanceData);
  }
}

function processSalesData(currentData, prevData, prevYearData) {
  const result = {};
  const allPoints = new Set();

  currentData.concat(prevData, prevYearData).forEach((item) => {
    if (item.salesPoint) {
      allPoints.add(
        item.salesPoint === "Каширское ш." ? "Кашира" : item.salesPoint
      );
    }
  });

  allPoints.forEach((point) => {
    result[point] = {
      current: processPeriodData(currentData, point),
      prevMonth: processPeriodData(prevData, point),
      prevYear: processPeriodData(prevYearData, point),
    };
  });

  return result;
}

function processPeriodData(data, point) {
  const filtered = data.filter((item) => {
    const salesPoint =
      item.salesPoint === "Каширское ш." ? "Кашира" : item.salesPoint;
    return salesPoint === point;
  });

  const result = {
    brands: {},
    total: 0,
    jok: 0,
  };

  filtered.forEach((item) => {
    const brand = item.brand || "Другие";
    result.brands[brand] = result.brands[brand] || { count: 0, jok: 0 };
    result.brands[brand].count += item.soldCount || 0;
    result.brands[brand].jok += item.jok || 0;
    result.total += item.soldCount || 0;
    result.jok += item.jok || 0;
  });

  return result;
}

function updateNewCarsTab(data) {
  const container = document.querySelector("#new-cars-tab .cards-container");
  if (!container) return;

  container.innerHTML = "";

  for (const point in data) {
    const card = createSalesCard(point, data[point], "new");
    container.appendChild(card);
  }
}

function updateUsedCarsTab(data) {
  const container = document.querySelector("#used-cars-tab .cards-container");
  if (!container) return;

  container.innerHTML = "";

  for (const point in data) {
    const card = createSalesCard(point, data[point], "used");
    container.appendChild(card);
  }
}

function createSalesCard(point, pointData, type) {
  const { current, prevMonth, prevYear } = pointData;
  const plan = type === "new" ? getSalesPlan(point) : getUsedCarPlan(point);

  const card = document.createElement("div");
  card.className = "card";

  card.innerHTML = `
    <h2>${point}</h2>
    <div class="stats">
      <div class="stat-row">
        <span class="stat-label">План (шт.):</span>
        <span>${plan}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Факт (шт.):</span>
        <span>${current.total}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Откл. (%):</span>
        <span class="${getDeviationClass(
          calculateDeviation(current.total, plan)
        )}">
          ${formatDeviation(calculateDeviation(current.total, plan))}
        </span>
      </div>
      <div class="stat-row">
        <span class="stat-label">ЖОК (руб.):</span>
        <span>${formatNumber(current.jok)}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">ЖОК / ед.:</span>
        <span>${
          current.total > 0 ? formatNumber(current.jok / current.total) : "0.00"
        }</span>
      </div>
    </div>
    <h2 style="margin-top: 30px;">Динамика продаж</h2>
    <div class="scrollable-table">
      <table class="sales-dynamics-table">
        <thead>
          <tr>
            <th class="fixed-column"></th>
            <th>Тек.мес.</th>
            <th>Пр.мес.</th>
            <th>АППГ</th>
            <th>Тек./Пр.</th>
            <th>Тек./АППГ</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </div>
  `;

  updateSalesTable(card, current, prevMonth, prevYear);
  return card;
}

function updateSalesTable(card, current, prevMonth, prevYear) {
  const tableBody = card.querySelector(".sales-dynamics-table tbody");
  if (!tableBody) return;

  tableBody.innerHTML = "";

  const growthMonthTotal = calculateGrowth(current.total, prevMonth.total);
  const growthYearTotal = calculateGrowth(current.total, prevYear.total);

  const totalRow = document.createElement("tr");
  totalRow.innerHTML = `
    <td class="fixed-column">Итого</td>
    <td>${current.total}</td>
    <td>${prevMonth.total || 0}</td>
    <td>${prevYear.total > 0 ? prevYear.total : "N/A"}</td>
    <td class="${getGrowthClass(growthMonthTotal)}">${formatGrowth(
    growthMonthTotal
  )}</td>
    <td class="${getGrowthClass(growthYearTotal)}">
      ${prevYear.total > 0 ? formatGrowth(growthYearTotal) : "N/A"}
    </td>
  `;
  tableBody.appendChild(totalRow);

  for (const brand in current.brands) {
    const currentBrand = current.brands[brand];
    const prevBrand = prevMonth.brands[brand] || { count: 0 };
    const prevYearBrand = prevYear.brands[brand] || { count: 0 };

    const growthMonth = calculateGrowth(currentBrand.count, prevBrand.count);
    const growthYear = calculateGrowth(currentBrand.count, prevYearBrand.count);

    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="fixed-column">${brand}</td>
      <td>${currentBrand.count}</td>
      <td>${prevBrand.count || 0}</td>
      <td>${prevYearBrand.count > 0 ? prevYearBrand.count : "N/A"}</td>
      <td class="${getGrowthClass(growthMonth)}">${formatGrowth(
      growthMonth
    )}</td>
      <td class="${getGrowthClass(growthYear)}">
        ${prevYear.total > 0 ? formatGrowth(growthYear) : "N/A"}
      </td>
    `;
    tableBody.appendChild(row);
  }
}

function updateServiceTab(data) {
  const container = document.getElementById("service-tab");
  if (!container) return;

  container.innerHTML = "";

  for (const point in data) {
    const pointData = data[point];

    const card = document.createElement("div");
    card.className = "service-card";

    card.innerHTML = `
      <h3>${point}</h3>
      <div class="service-stats">
        <div class="service-stat">
          <div class="service-stat-label">Нормо-часы (план/факт)</div>
          <div class="service-stat-value">${formatNumber(
            pointData.nh.plan
          )} / ${formatNumber(pointData.nh.fact)}</div>
          <div class="service-stat-label">Отклонение</div>
          <div class="service-stat-value ${getDeviationClass(
            pointData.nh.deviation
          )}">
            ${formatDeviation(pointData.nh.deviation)}
          </div>
        </div>
        <div class="service-stat">
          <div class="service-stat-label">GM-1 (план/факт)</div>
          <div class="service-stat-value">${formatNumber(
            pointData.gm1.plan
          )} / ${formatNumber(pointData.gm1.fact)}</div>
          <div class="service-stat-label">Отклонение</div>
          <div class="service-stat-value ${getDeviationClass(
            pointData.gm1.deviation
          )}">
            ${formatDeviation(pointData.gm1.deviation)}
          </div>
        </div>
      </div>
    `;

    container.appendChild(card);
  }
}

function updateBalanceTab(data) {
  const container = document.getElementById("balance-tab");
  if (!container) return;

  container.innerHTML = "";

  const cardsContainer = document.createElement("div");
  cardsContainer.className = "cards-container";
  container.appendChild(cardsContainer);

  const assetsCard = document.createElement("div");
  assetsCard.className = "card";
  assetsCard.innerHTML = `
    <h2>Активы</h2>
    <div class="stats">
      <div class="stat-row">
        <span class="stat-label">Денежные средства:</span>
        <span>${formatNumber(data.assets.cash)} руб.</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Складские остатки:</span>
        <span>${formatNumber(data.assets.warehouses)} руб.</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Новые автомобили:</span>
        <span>${formatNumber(data.assets.newCars)} руб.</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Автомобили с пробегом:</span>
        <span>${formatNumber(data.assets.usedCars)} руб.</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Запчасти:</span>
        <span>${formatNumber(data.assets.parts)} руб.</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Дебиторская задолженность:</span>
        <span>${formatNumber(data.assets.receivables)} руб.</span>
      </div>
      <div class="stat-row" style="margin-top: 15px; font-weight: 600;">
        <span class="stat-label">Итого активы:</span>
        <span>${formatNumber(data.assets.total)} руб.</span>
      </div>
    </div>
  `;
  cardsContainer.appendChild(assetsCard);

  const liabilitiesCard = document.createElement("div");
  liabilitiesCard.className = "card";
  liabilitiesCard.innerHTML = `
    <h2>Пассивы</h2>
    <div class="stats">
      <div class="stat-row">
        <span class="stat-label">Кредитные линии:</span>
        <span>${formatNumber(
          data.liabilities.vtb + data.liabilities.rnBank
        )} руб.</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Факторинг:</span>
        <span>${formatNumber(data.liabilities.factoring)} руб.</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Прочие кредиты и займы:</span>
        <span>${formatNumber(data.liabilities.loan)} руб.</span>
      </div>
      <div class="stat-row" style="margin-top: 15px; font-weight: 600;">
        <span class="stat-label">Итого пассивы:</span>
        <span>${formatNumber(data.liabilities.total)} руб.</span>
      </div>
      <div class="stat-row" style="margin-top: 20px; font-weight: 600;">
        <span class="stat-label">Операционные чистые активы:</span>
        <span>${formatNumber(data.netAssets)} руб.</span>
      </div>
    </div>
  `;
  cardsContainer.appendChild(liabilitiesCard);

  // const updateInfo = document.createElement("div");
  // updateInfo.className = "update-info";
  // updateInfo.style.marginTop = "20px";
  // updateInfo.style.fontSize = "14px";
  // updateInfo.style.color = "#666";
  // updateInfo.textContent = `Данные обновлены: ${
  //   data.lastUpdated || "неизвестно"
  // }`;
  // container.appendChild(updateInfo);
}

function updateHeader() {
  const header = document.querySelector(".header h1");
  if (!header || !dashboardData) return;

  const activeTab = document.querySelector(".tab-btn.active");
  const tabName = activeTab ? activeTab.textContent.trim() : "Новые автомобили";
  const monthYear = dashboardData.currentMonth.replace(".", "/");

  header.textContent = `${tabName} - ${monthYear}`;
}

function refreshTabData(tabId) {
  if (!dashboardData) return;

  if (tabId === "new-cars-tab") {
    const processedData = processSalesData(
      dashboardData.newCars.currentData,
      dashboardData.newCars.prevData,
      dashboardData.newCars.prevYearData
    );
    updateNewCarsTab(processedData);
  } else if (tabId === "used-cars-tab") {
    const processedData = processSalesData(
      dashboardData.usedCars.currentData,
      dashboardData.usedCars.prevData,
      dashboardData.usedCars.prevYearData
    );
    updateUsedCarsTab(processedData);
  } else if (tabId === "service-tab") {
    updateServiceTab(dashboardData.serviceData);
  } else if (tabId === "balance-tab") {
    updateBalanceTab(dashboardData.balanceData);
  }
}

function getSalesPlan(point) {
  const plans = {
    Софийская: 120,
    Руставели: 30,
    Кашира: 3,
  };
  return plans[point] || 0;
}

function getUsedCarPlan(point) {
  const plans = {
    Софийская: 60,
    Руставели: 15,
    Кашира: 2,
  };
  return plans[point] || 0;
}

function createLoadingIndicator() {
  const loader = document.createElement("div");
  loader.id = "loading-indicator";
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
  const loader = document.getElementById("loading-indicator");
  if (loader) loader.style.display = show ? "flex" : "none";
}

function showError(message) {
  const errorDiv = document.createElement("div");
  errorDiv.className = "error-notification";
  errorDiv.textContent = message;
  document.body.appendChild(errorDiv);
  setTimeout(() => errorDiv.remove(), 5000);
}

function calculateDeviation(fact, plan) {
  if (plan === 0) return fact === 0 ? 0 : Infinity;
  return ((fact - plan) / plan) * 100;
}

function formatDeviation(value) {
  if (value === Infinity) return "+∞%";
  if (value === -Infinity) return "-∞%";
  if (isNaN(value)) return "N/A";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function getDeviationClass(value) {
  if (value >= 0) return "positive";
  return "negative";
}

function calculateGrowth(current, previous) {
  if (previous === 0) return current === 0 ? 0 : Infinity;
  return ((current - previous) / previous) * 100;
}

function formatGrowth(value) {
  if (value === Infinity) return "+∞%";
  if (value === -Infinity) return "-∞%";
  if (isNaN(value)) return "N/A";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function getGrowthClass(value) {
  if (value === Infinity || value > 0) return "positive";
  if (value === -Infinity || value < 0) return "negative";
  return "neutral";
}

function formatNumber(num, decimals = 2) {
  if (typeof num !== "number") {
    num = parseFloat(num.toString().replace(/\s/g, "")) || 0;
  }
  const rounded = num.toFixed(decimals);
  const parts = rounded.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return parts.join(".");
}
