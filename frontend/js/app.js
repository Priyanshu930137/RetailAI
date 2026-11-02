"use strict";

/* =========================================
   RetailAI - Frontend Application
   Dashboard + Inventory + Forecasting
   + Pricing + CSV Sales Upload
========================================= */

/* =========================================
   1. HELPERS AND API CONFIGURATION
========================================= */

const $ = (id) => document.getElementById(id);

const API_BASE_URL =
  window.retailAI?.apiBaseUrl ||
  "http://127.0.0.1:8000";

const money = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(amount);

const number = (value) =>
  new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2
  }).format(value);


/* =========================================
   2. SAMPLE / FALLBACK DATA
========================================= */

let products = [
  {
    id: null,
    name: "Rice",
    stock: 12,
    daily: 8,
    price: 60,
    cost: 45
  },
  {
    id: null,
    name: "Milk",
    stock: 9,
    daily: 12,
    price: 30,
    cost: 23
  },
  {
    id: null,
    name: "Cooking Oil",
    stock: 32,
    daily: 5,
    price: 150,
    cost: 125
  },
  {
    id: null,
    name: "Biscuits",
    stock: 45,
    daily: 10,
    price: 20,
    cost: 14
  },
  {
    id: null,
    name: "Soap",
    stock: 7,
    daily: 4,
    price: 35,
    cost: 25
  }
];

const salesData = {
  labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  revenue: [18500, 21300, 19800, 23700, 22100, 26800, 24850]
};

const demandData = {
  labels: ["Rice", "Milk", "Oil", "Biscuits", "Soap"],
  quantities: [72, 96, 35, 88, 42]
};

/*
  Sample historical demand.
  This can later be replaced with real sales data
  from the SQLite database.
*/
const historicalDemand = {
  "Rice": [7, 8, 9, 7, 8, 9, 8],
  "Milk": [11, 12, 13, 12, 10, 14, 12],
  "Cooking Oil": [4, 5, 6, 4, 5, 6, 5],
  "Biscuits": [9, 10, 12, 8, 11, 10, 10],
  "Soap": [3, 4, 5, 4, 3, 5, 4]
};


/* =========================================
   3. TRANSLATIONS
========================================= */

const translations = {
  en: {
    workspace: "WORKSPACE",
    dashboard: "Dashboard",
    forecast: "Demand Forecast",
    inventory: "Inventory",
    pricing: "Pricing Advisor",
    upload: "Upload Sales Data",
    overview: "RETAIL INTELLIGENCE",
    welcome: "Good evening, Retailer 👋",
    subtitle:
      "Understand demand, control stock, and make smarter pricing decisions.",
    sales: "Sales Revenue",
    units: "Units Sold",
    lowstock: "Low Stock Items",
    forecastaccuracy: "Forecast Accuracy",
    vsweek: "vs last week",
    restock: "Need restocking soon",
    modelpending: "Available after model evaluation",
    salestrend: "Sales Trend",
    salestrenddesc: "Sample revenue over the last 7 days",
    demandchart: "Demand Overview",
    demanddesc: "Sample units sold by product",
    planning: "PLANNING TOOL",
    forecasttitle: "Demand Forecast Preview",
    forecastdesc:
      "See forecasts shaped by sales history, seasonal patterns, festivals, and optional local weather.",
    product: "Product",
    horizon: "Forecast period",
    generate: "Generate Forecast",
    estimateddemand: "Estimated total demand",
    dailyaverage: "Average daily demand",
    forecastdisclaimer:
      "This is a demonstration using sample historical averages, not a trained machine-learning model.",
    inventorytitle: "Inventory Management",
    inventorydesc:
      "Check current stock and identify products that may need replenishment.",
    stock: "Current Stock",
    dailyavg: "Daily Average",
    stockstatus: "Stock Status",
    suggestion: "Suggestion",
    inventorydemo:
      "Illustrative data only. Suggested replenishment is a basic demo calculation.",
    pricingtool: "PRICING TOOL",
    pricingtitle: "Pricing Advisor",
    pricingdesc:
      "Compare a proposed selling price against your cost and minimum margin.",
    cost: "Cost per unit (₹)",
    currentprice: "Current price (₹)",
    proposedprice: "Proposed price (₹)",
    minmargin: "Minimum margin (%)",
    analyzeprice: "Analyze Price",
    currentmargin: "Current gross margin",
    proposedmargin: "Proposed gross margin",
    profitperunit: "Proposed profit per unit",
    pricingdisclaimer:
      "This calculator checks unit economics only. It does not predict customer demand.",
    dataimport: "DATA IMPORT",
    uploadtitle: "Upload Sales Data",
    uploaddesc: "Upload and preview your CSV sales file.",
    choosecsv: "Choose a sales CSV file",
    csvformat:
      "Recommended columns: date, product, quantity, price",
    downloadtemplate: "Download CSV Template",
    csvpreview: "CSV Preview",
    csvdisclaimer:
      "Your data is validated before being sent to the database.",
    footer: "Built for smarter local retail.",
    footerdemo: "Prototype dashboard · Sample data",
    low: "Low stock",
    medium: "Watch stock",
    healthy: "Healthy",
    reorder: "Restock soon",
    monitor: "Monitor stock",
    sufficient: "Stock sufficient",
    forecastnote:
      "Baseline estimate based on the average of recent demand values.",
    invalidforecast:
      "Please select a valid product and forecast period.",
    invalidprice:
      "Enter valid positive prices and costs.",
    belowmargin:
      "Warning: the proposed price does not meet your minimum margin.",
    priceok:
      "The proposed price meets your minimum margin requirement.",
    pricehigh:
      "The proposed price meets the margin requirement, but a higher price may affect sales.",
    csvempty: "The selected file is empty.",
    csvinvalid:
      "Could not read the CSV file. Check its format and try again.",
    csvsuccess: "CSV preview loaded successfully.",
    csvtooLarge:
      "Please choose a CSV file smaller than 2 MB.",
    csvrows: "rows previewed",
    csvmissing:
      "The CSV must contain a header row and at least one data row."
  },

  hi: {
    workspace: "कार्य क्षेत्र",
    dashboard: "डैशबोर्ड",
    forecast: "मांग का अनुमान",
    inventory: "इन्वेंटरी",
    pricing: "मूल्य सलाहकार",
    upload: "बिक्री डेटा अपलोड",
    overview: "रिटेल इंटेलिजेंस",
    welcome: "शुभ संध्या, रिटेलर 👋",
    subtitle:
      "मांग समझें, स्टॉक नियंत्रित करें और बेहतर मूल्य निर्णय लें।",
    sales: "बिक्री राजस्व",
    units: "बेची गई इकाइयाँ",
    lowstock: "कम स्टॉक वाले उत्पाद",
    forecastaccuracy: "अनुमान की सटीकता",
    vsweek: "पिछले सप्ताह की तुलना में",
    restock: "जल्द स्टॉक भरें",
    modelpending: "मॉडल मूल्यांकन के बाद उपलब्ध",
    salestrend: "बिक्री का रुझान",
    salestrenddesc: "पिछले 7 दिनों का नमूना राजस्व",
    demandchart: "मांग का विवरण",
    demanddesc: "उत्पाद के अनुसार नमूना बिक्री",
    planning: "योजना उपकरण",
    forecasttitle: "मांग अनुमान का पूर्वावलोकन",
    forecastdesc:
      "बिक्री इतिहास, मौसमी पैटर्न, त्योहारों और वैकल्पिक स्थानीय मौसम से मांग का अनुमान देखें।",
    product: "उत्पाद",
    horizon: "अनुमान अवधि",
    generate: "अनुमान बनाएँ",
    estimateddemand: "अनुमानित कुल मांग",
    dailyaverage: "औसत दैनिक मांग",
    inventorytitle: "इन्वेंटरी प्रबंधन",
    inventorydesc:
      "स्टॉक देखें और उन उत्पादों की पहचान करें जिन्हें दोबारा भरना पड़ सकता है।",
    stock: "मौजूदा स्टॉक",
    dailyavg: "दैनिक औसत",
    stockstatus: "स्टॉक स्थिति",
    suggestion: "सुझाव",
    pricingtool: "मूल्य उपकरण",
    pricingtitle: "मूल्य सलाहकार",
    pricingdesc:
      "प्रस्तावित बिक्री मूल्य की लागत और न्यूनतम मार्जिन से तुलना करें।",
    cost: "प्रति इकाई लागत (₹)",
    currentprice: "वर्तमान मूल्य (₹)",
    proposedprice: "प्रस्तावित मूल्य (₹)",
    minmargin: "न्यूनतम मार्जिन (%)",
    analyzeprice: "मूल्य का विश्लेषण करें",
    currentmargin: "वर्तमान सकल मार्जिन",
    proposedmargin: "प्रस्तावित सकल मार्जिन",
    profitperunit: "प्रति इकाई प्रस्तावित लाभ",
    dataimport: "डेटा आयात",
    uploadtitle: "बिक्री डेटा अपलोड करें",
    uploaddesc: "CSV फाइल का पूर्वावलोकन करें।",
    choosecsv: "बिक्री CSV फाइल चुनें",
    csvformat:
      "सुझाए गए कॉलम: date, product, quantity, price",
    downloadtemplate: "CSV टेम्पलेट डाउनलोड करें",
    csvpreview: "CSV पूर्वावलोकन",
    footer: "स्थानीय दुकानों के लिए स्मार्ट समाधान।",
    low: "कम स्टॉक",
    medium: "स्टॉक पर ध्यान दें",
    healthy: "पर्याप्त स्टॉक",
    reorder: "जल्द स्टॉक भरें",
    monitor: "स्टॉक पर नज़र रखें",
    sufficient: "स्टॉक पर्याप्त है",
    forecastnote:
      "हाल की मांग के औसत पर आधारित अनुमान।",
    invalidforecast:
      "कृपया सही उत्पाद और अनुमान अवधि चुनें।",
    invalidprice:
      "सही मूल्य और लागत दर्ज करें।",
    belowmargin:
      "चेतावनी: प्रस्तावित मूल्य न्यूनतम मार्जिन पूरा नहीं करता।",
    priceok:
      "प्रस्तावित मूल्य न्यूनतम मार्जिन की शर्त पूरी करता है।",
    pricehigh:
      "अधिक मूल्य बिक्री को प्रभावित कर सकता है।",
    csvempty: "चुनी गई फाइल खाली है।",
    csvinvalid:
      "CSV पढ़ी नहीं जा सकी। प्रारूप जाँचकर पुनः प्रयास करें।",
    csvsuccess:
      "CSV पूर्वावलोकन सफलतापूर्वक लोड हुआ।",
    csvtooLarge:
      "कृपया 2 MB से छोटी CSV फाइल चुनें।",
    csvrows: "पंक्तियों का पूर्वावलोकन",
    csvmissing:
      "CSV में हेडर और कम से कम एक डेटा पंक्ति होनी चाहिए।"
  }
};


/* =========================================
   4. GLOBAL APPLICATION STATE
========================================= */

let currentLanguage = "en";

let salesChart = null;
let demandChart = null;
let forecastChart = null;

/*
  Stores validated CSV records temporarily.
  Records are cleared after a successful upload.
*/
let parsedSalesRecords = [];


/* =========================================
   5. LANGUAGE FUNCTIONS
========================================= */

function t(key) {
  return (
    translations[currentLanguage][key] ??
    translations.en[key] ??
    key
  );
}

function applyLanguage(language) {
  currentLanguage =
    language === "hi" ? "hi" : "en";

  document.documentElement.lang =
    currentLanguage;

  document
    .querySelectorAll("[data-i18n]")
    .forEach((element) => {
      const key = element.dataset.i18n;

      if (translations[currentLanguage][key]) {
        element.textContent =
          translations[currentLanguage][key];
      }
    });

  const todayDate = $("todayDate");

  if (todayDate) {
    todayDate.textContent =
      new Date().toLocaleDateString(
        currentLanguage === "hi"
          ? "hi-IN"
          : "en-IN",
        {
          day: "numeric",
          month: "short",
          year: "numeric"
        }
      );
  }

  const inventorySearch =
    $("inventorySearch");

  if (inventorySearch) {
    inventorySearch.placeholder =
      currentLanguage === "hi"
        ? "उत्पाद खोजें..."
        : "Search products...";
  }

  renderInventory(
    inventorySearch?.value || ""
  );

  renderCharts();
  updateForecast();
  analyzePricing();
}

const languageSelect =
  $("languageSelect");

if (languageSelect) {
  languageSelect.addEventListener(
    "change",
    (event) => {
      applyLanguage(
        event.target.value
      );
    }
  );
}


/* =========================================
   6. CHARTS
========================================= */

function chartOptions(prefix = "") {
  return {
    responsive: true,
    maintainAspectRatio: false,

    interaction: {
      intersect: false,
      mode: "index"
    },

    plugins: {
      legend: {
        display: false
      },

      tooltip: {
        callbacks: {
          label: (context) =>
            prefix +
            number(
              context.parsed.y ??
              context.parsed
            )
        }
      }
    },

    scales: {
      x: {
        grid: {
          display: false
        },

        ticks: {
          color: "#85899b",
          font: {
            size: 10
          }
        },

        border: {
          display: false
        }
      },

      y: {
        beginAtZero: true,

        grid: {
          color: "#eff0f5"
        },

        ticks: {
          color: "#85899b",
          font: {
            size: 10
          },

          callback: (value) =>
            prefix + number(value)
        },

        border: {
          display: false
        }
      }
    }
  };
}

function renderCharts() {
  if (typeof Chart === "undefined") {
    console.warn(
      "Chart.js was not loaded."
    );

    return;
  }

  const salesCanvas =
    $("salesChart");

  const demandCanvas =
    $("demandChart");

  if (!salesCanvas || !demandCanvas) {
    return;
  }

  if (salesChart) {
    salesChart.destroy();
  }

  if (demandChart) {
    demandChart.destroy();
  }

  salesChart = new Chart(
    salesCanvas,
    {
      type: "line",

      data: {
        labels: salesData.labels,

        datasets: [
          {
            label:
              currentLanguage === "hi"
                ? "राजस्व (₹)"
                : "Revenue (₹)",

            data:
              salesData.revenue,

            borderColor: "#6654e8",

            backgroundColor:
              "rgba(102, 84, 232, 0.10)",

            fill: true,
            tension: 0.38,
            borderWidth: 2.5,
            pointRadius: 3,
            pointHoverRadius: 5
          }
        ]
      },

      options:
        chartOptions("₹")
    }
  );

  demandChart = new Chart(
    demandCanvas,
    {
      type: "bar",

      data: {
        labels: demandData.labels,

        datasets: [
          {
            label:
              currentLanguage === "hi"
                ? "इकाइयाँ"
                : "Units sold",

            data:
              demandData.quantities,

            backgroundColor: [
              "#6654e8",
              "#5e8ee8",
              "#48b7a5",
              "#f1b45d",
              "#e98598"
            ],

            borderRadius: 5,
            maxBarThickness: 35
          }
        ]
      },

      options:
        chartOptions()
    }
  );
}


/* =========================================
   7. INVENTORY
========================================= */

function getStockStatus(product) {
  if (
    product.stock <
    product.daily * 2
  ) {
    return "low";
  }

  if (
    product.stock <
    product.daily * 5
  ) {
    return "medium";
  }

  return "healthy";
}

function renderInventory(
  searchTerm = ""
) {
  const body =
    $("inventoryBody");

  if (!body) {
    return;
  }

  body.replaceChildren();

  const query =
    searchTerm
      .trim()
      .toLowerCase();

  const filtered =
    products.filter((product) =>
      product.name
        .toLowerCase()
        .includes(query)
    );

  let lowCount = 0;

  products.forEach((product) => {
    if (
      getStockStatus(product) ===
      "low"
    ) {
      lowCount++;
    }
  });

  const lowStockValue =
    $("lowStockValue");

  if (lowStockValue) {
    lowStockValue.textContent =
      number(lowCount);
  }

  if (filtered.length === 0) {
    const row =
      document.createElement("tr");

    const cell =
      document.createElement("td");

    cell.colSpan = 5;

    cell.textContent =
      currentLanguage === "hi"
        ? "कोई उत्पाद नहीं मिला।"
        : "No products found.";

    row.appendChild(cell);
    body.appendChild(row);

    return;
  }

  filtered.forEach((product) => {
    const status =
      getStockStatus(product);

    const daysLeft =
      product.daily > 0
        ? product.stock /
          product.daily
        : 0;

    const targetStock =
      product.daily * 7;

    const reorder =
      Math.max(
        0,
        Math.ceil(
          targetStock -
          product.stock
        )
      );

    const row =
      document.createElement("tr");

    const values = [
      product.name,
      `${number(product.stock)} units`,
      `${number(product.daily)} units`,
      null,
      null
    ];

    values.forEach(
      (value, index) => {
        const cell =
          document.createElement("td");

        if (index === 0) {
          cell.textContent = value;
          cell.className =
            "product-cell";
        }

        else if (index === 3) {
          const badge =
            document.createElement(
              "span"
            );

          badge.className =
            `stock-badge ${status}`;

          const labelKey =
            status === "low"
              ? "low"
              : status === "medium"
                ? "medium"
                : "healthy";

          badge.textContent =
            t(labelKey);

          cell.appendChild(badge);
        }

        else if (index === 4) {
          if (status === "low") {
            cell.textContent =
              `${t("reorder")}: ${reorder} units`;
          }

          else if (
            status === "medium"
          ) {
            cell.textContent =
              t("monitor");
          }

          else {
            cell.textContent =
              t("sufficient");
          }
        }

        else {
          cell.textContent = value;
        }

        row.appendChild(cell);
      }
    );

    if (daysLeft < 2) {
      row.title =
        "Stock may need immediate replenishment.";
    }

    body.appendChild(row);
  });
}

const inventorySearch =
  $("inventorySearch");

if (inventorySearch) {
  inventorySearch.addEventListener(
    "input",
    (event) => {
      renderInventory(
        event.target.value
      );
    }
  );
}


/* =========================================
   8. DEMAND FORECAST
========================================= */

function buildLocalForecast(product, history, days, temperature, rain) {
  const base = history.length
    ? history.reduce((sum, value) => sum + value, 0) / history.length
    : product.daily;
  let weatherFactor = 1;
  if (temperature !== "" && Number(temperature) >= 32) weatherFactor *= 1.08;
  if (temperature !== "" && Number(temperature) <= 10) weatherFactor *= 0.95;
  if (rain !== "" && Number(rain) >= 10) weatherFactor *= 0.94;
  const today = new Date();
  const festivals = [
    { month: 0, day: 14, name: "Makar Sankranti", factor: 1.18 },
    { month: 2, day: 14, name: "Holi", factor: 1.20 },
    { month: 7, day: 15, name: "Independence Day", factor: 1.08 },
    { month: 9, day: 20, name: "Diwali season", factor: 1.30 },
    { month: 10, day: 14, name: "Festive season", factor: 1.12 },
    { month: 11, day: 25, name: "Christmas", factor: 1.16 }
  ];
  const seasonFactor = (month) => [2, 3, 4, 5].includes(month) ? 1.03
    : [6, 7, 8].includes(month) ? 0.98
      : [9, 10].includes(month) ? 1.04 : 1;
  const seasonName = (month) => [2, 3, 4, 5].includes(month) ? "Summer"
    : [6, 7, 8].includes(month) ? "Monsoon"
      : [9, 10].includes(month) ? "Festive season" : "Winter";
  const events = new Set();
  const seasons = new Set();
  const forecast = Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index + 1);
    const event = festivals.find((item) => item.month === date.getMonth() && Math.abs(item.day - date.getDate()) <= 7);
    if (event) events.add(event.name);
    seasons.add(seasonName(date.getMonth()));
    return {
      date: date.toISOString().slice(0, 10),
      units: Number((base * weatherFactor * seasonFactor(date.getMonth()) * (event?.factor || 1)).toFixed(2))
    };
  });
  const total = forecast.reduce((sum, point) => sum + point.units, 0);
  const target = Math.ceil(total * 1.1);
  const cover = product.stock / Math.max(base, 0.1);
  const stockout = Math.min(100, Math.max(0, Math.round(100 * (1 - cover / days))));
  const overstock = Math.min(100, Math.max(0, Math.round(100 * (product.stock - target) / Math.max(target, 1))));
  const demandFactor = (total / days) / Math.max(base, 0.1);
  const suggestedPrice = Math.max(product.cost * 1.05, product.price * (1 + Math.min(0.08, Math.max(-0.05, (demandFactor - 1) * 0.35))));
  const explanation = [history.length ? "Baseline uses the recent local demand profile" : "No sales loaded; baseline uses the product daily-demand estimate"];
  if (events.size) explanation.push("Festival uplift: " + [...events].join(", "));
  if (temperature !== "" || rain !== "") explanation.push("Weather heuristic uses the manually entered temperature and rainfall");
  return {
    daily_average: total / days,
    total_demand: total,
    forecast,
    festival_events: [...events],
    seasonal_context: [...seasons],
    stock_risk: { score: stockout, level: stockout >= 70 ? "high" : stockout >= 35 ? "medium" : "low", days_of_cover: Number(cover.toFixed(1)) },
    overstock_risk: { score: overstock, excess_units: Math.max(0, product.stock - target) },
    recommended_replenishment: Math.max(0, target - product.stock),
    pricing: { suggested_price: Number(suggestedPrice.toFixed(2)), gross_margin: Number((((suggestedPrice - product.cost) / Math.max(suggestedPrice, 0.01)) * 100).toFixed(1)) },
    explanation,
    confidence: "low · local estimate",
    method: "transparent local heuristic"
  };
}

async function updateForecast() {
  const productSelect =
    $("forecastProduct");

  const daysSelect =
    $("forecastDays");

  if (
    !productSelect ||
    !daysSelect
  ) {
    return;
  }

  const productName =
    productSelect.value;

  const days =
    Number(daysSelect.value);

  const history = historicalDemand[productName] || [];
  const productRecord = products.find((item) => item.name === productName);
  if (!productRecord) return;
  let apiForecast = null;
  const temperature = $("forecastTemperature")?.value;
  const rain = $("forecastRain")?.value;
  const params = new URLSearchParams({ days: String(days) });
  if (temperature !== "") params.set("temperature_c", temperature);
  if (rain !== "") params.set("rain_mm", rain);
  if (productRecord.id) {
    try {
      const response = await fetch(API_BASE_URL + "/api/forecast/" + productRecord.id + "?" + params);
      if (response.ok) apiForecast = await response.json();
    } catch (error) {
      console.info("Forecast API unavailable; using local estimate.", error);
    }
  }
  if (!apiForecast) {
    apiForecast = buildLocalForecast(productRecord, history, days, temperature, rain);
  }

  const forecastTotal =
    $("forecastTotal");

  const forecastAverage =
    $("forecastAverage");

  const forecastNote =
    $("forecastNote");

  if (
    ![7, 14, 30].includes(days)
  ) {
    if (forecastTotal) {
      forecastTotal.textContent =
        "--";
    }

    if (forecastAverage) {
      forecastAverage.textContent =
        "--";
    }

    if (forecastNote) {
      forecastNote.textContent =
        t("invalidforecast");
    }

    return;
  }

  const average = apiForecast.daily_average;

  const total = apiForecast.total_demand;

  if (forecastTotal) {
    forecastTotal.textContent =
      `${number(total)} units`;
  }

  if (forecastAverage) {
    forecastAverage.textContent =
      `${number(average)} units`;
  }

  if (forecastNote) {
    forecastNote.textContent = "Confidence: " + apiForecast.confidence + ". " + apiForecast.method + ".";
  }

  if (apiForecast) {
    $("stockRiskValue").textContent = "Stockout " + apiForecast.stock_risk.score + "/100 · Overstock " + apiForecast.overstock_risk.score + "/100";
    $("stockRiskNote").textContent = apiForecast.stock_risk.days_of_cover + " days cover · " + apiForecast.overstock_risk.excess_units + " excess units vs target";
    $("replenishmentValue").textContent = number(apiForecast.recommended_replenishment) + " units";
    $("suggestedPriceValue").textContent = money(apiForecast.pricing.suggested_price);
    $("priceReason").textContent = apiForecast.pricing.gross_margin + "% gross margin · demand signal considered · cost floor applied.";
    $("forecastExplanation").textContent = apiForecast.explanation.concat((apiForecast.seasonal_context || []).map((name) => "Season: " + name), apiForecast.festival_events.map((name) => "Festival window: " + name)).join(". ");
    const seasonalNames = apiForecast.seasonal_context || [];
    const calendarSignals = seasonalNames.concat(apiForecast.festival_events);
    $("festivalSummary").textContent = calendarSignals.length
      ? [...new Set(calendarSignals)].join(" · ") + " forecast signals"
      : "No seasonal or festival signal in this window";
    $("weatherSummary").textContent = temperature !== "" || rain !== ""
      ? (temperature !== "" ? temperature + "°C" : "Temperature not set") + " · " + (rain !== "" ? rain + " mm rain" : "rain not set")
      : "Add local conditions in the demand advisor";
    $("riskSummary").textContent = "Stockout " + apiForecast.stock_risk.level + " · Overstock " + apiForecast.overstock_risk.level;
    $("riskSummaryNote").textContent = apiForecast.stock_risk.days_of_cover + " days cover for " + productName + "; replenish " + apiForecast.recommended_replenishment + " units";
  }

  const forecastCanvas =
    $("forecastChart");

  if (
    typeof Chart === "undefined" ||
    !forecastCanvas
  ) {
    return;
  }

  if (forecastChart) {
    forecastChart.destroy();
  }

  const labels =
    Array.from(
      { length: days },
      (_, index) =>
        currentLanguage === "hi"
          ? `दिन ${index + 1}`
          : `Day ${index + 1}`
    );

  forecastChart =
    new Chart(
      forecastCanvas,
      {
        type: "line",

        data: {
          labels,

          datasets: [
            {
              label:
                currentLanguage === "hi"
                  ? "अनुमानित दैनिक मांग"
                  : "Estimated daily demand",

              data: apiForecast.forecast.map((point) => point.units),

              borderColor:
                "#6654e8",

              backgroundColor:
                "rgba(102, 84, 232, 0.10)",

              fill: true,
              tension: 0.2,
              borderWidth: 2,
              pointRadius:
                days <= 14
                  ? 3
                  : 0
            }
          ]
        },

        options:
          chartOptions()
      }
    );
}

$("forecastBtn")
  ?.addEventListener(
    "click",
    updateForecast
  );

$("forecastProduct")
  ?.addEventListener(
    "change",
    updateForecast
  );

$("forecastDays")
  ?.addEventListener(
    "change",
    updateForecast
  );

$("forecastTemperature")?.addEventListener("change", updateForecast);
$("forecastRain")?.addEventListener("change", updateForecast);


/* =========================================
   9. PRICING CALCULATOR
========================================= */

function readNumber(id) {
  const input = $(id);

  if (
    !input ||
    input.value.trim() === ""
  ) {
    return NaN;
  }

  return Number(input.value);
}

function calculateMargin(
  cost,
  price
) {
  if (price <= 0) {
    return NaN;
  }

  return (
    (price - cost) /
    price
  ) * 100;
}

function analyzePricing() {
  const cost =
    readNumber("productCost");

  const current =
    readNumber("currentPrice");

  const proposed =
    readNumber("proposedPrice");

  const minimumMargin =
    readNumber("minimumMargin");

  const advice =
    $("pricingAdvice");

  if (!advice) {
    return;
  }

  advice.className =
    "price-advice";

  const valid =
    Number.isFinite(cost) &&
    Number.isFinite(current) &&
    Number.isFinite(proposed) &&
    Number.isFinite(minimumMargin) &&
    cost > 0 &&
    current > 0 &&
    proposed > 0 &&
    minimumMargin >= 0 &&
    minimumMargin <= 99;

  if (!valid) {
    $("currentMarginResult") &&
      ($("currentMarginResult").textContent =
        "--");

    $("proposedMarginResult") &&
      ($("proposedMarginResult").textContent =
        "--");

    $("profitResult") &&
      ($("profitResult").textContent =
        "--");

    advice.classList.add(
      "error"
    );

    advice.textContent =
      t("invalidprice");

    return;
  }

  const currentMargin =
    calculateMargin(
      cost,
      current
    );

  const proposedMargin =
    calculateMargin(
      cost,
      proposed
    );

  const profit =
    proposed - cost;

  $("currentMarginResult") &&
    ($("currentMarginResult").textContent =
      `${number(currentMargin)}%`);

  $("proposedMarginResult") &&
    ($("proposedMarginResult").textContent =
      `${number(proposedMargin)}%`);

  $("profitResult") &&
    ($("profitResult").textContent =
      money(profit));

  if (
    proposedMargin <
    minimumMargin
  ) {
    advice.classList.add(
      "bad"
    );

    advice.textContent =
      t("belowmargin");
  }

  else if (
    proposed < current
  ) {
    advice.classList.add(
      "good"
    );

    advice.textContent =
      t("priceok");
  }

  else {
    advice.classList.add(
      "good"
    );

    advice.textContent =
      t("pricehigh");
  }
}

$("pricingBtn")
  ?.addEventListener(
    "click",
    analyzePricing
  );


/* =========================================
   10. CSV PARSER
========================================= */

function parseCSV(text) {
  const rows = [];

  let row = [];
  let cell = "";
  let inQuotes = false;

  const source =
    text.replace(
      /^\uFEFF/,
      ""
    );

  for (
    let i = 0;
    i < source.length;
    i++
  ) {
    const character =
      source[i];

    const next =
      source[i + 1];

    if (
      character === '"'
    ) {
      if (
        inQuotes &&
        next === '"'
      ) {
        cell += '"';
        i++;
      }

      else {
        inQuotes =
          !inQuotes;
      }
    }

    else if (
      character === "," &&
      !inQuotes
    ) {
      row.push(
        cell.trim()
      );

      cell = "";
    }

    else if (
      (
        character === "\n" ||
        character === "\r"
      ) &&
      !inQuotes
    ) {
      if (
        character === "\r" &&
        next === "\n"
      ) {
        i++;
      }

      row.push(
        cell.trim()
      );

      if (
        row.some(
          (value) =>
            value !== ""
        )
      ) {
        rows.push(row);
      }

      row = [];
      cell = "";
    }

    else {
      cell += character;
    }
  }

  if (inQuotes) {
    throw new Error(
      "The CSV contains an unclosed quoted field."
    );
  }

  row.push(
    cell.trim()
  );

  if (
    row.some(
      (value) =>
        value !== ""
    )
  ) {
    rows.push(row);
  }

  return rows;
}


/* =========================================
   11. CSV MESSAGE HELPERS
========================================= */

function showCSVMessage(
  message,
  type = ""
) {
  const element =
    $("csvMessage");

  if (!element) {
    return;
  }

  element.textContent =
    message;

  element.className =
    `upload-message ${type}`.trim();
}

function showUploadStatus(
  message,
  type = ""
) {
  const element =
    $("csvUploadStatus");

  if (!element) {
    return;
  }

  element.textContent =
    message;

  element.className =
    `upload-message ${type}`.trim();
}


/* =========================================
   12. PREPARE SALES RECORDS
========================================= */

function prepareSalesRecords(rows) {
  if (
    !Array.isArray(rows) ||
    rows.length < 2
  ) {
    throw new Error(
      "The CSV must contain a header row and at least one data row."
    );
  }

  const headers =
    rows[0].map(
      (header) =>
        String(header)
          .trim()
          .toLowerCase()
    );

  const requiredColumns = [
    "date",
    "product",
    "quantity",
    "price"
  ];

  const missingColumns =
    requiredColumns.filter(
      (column) =>
        !headers.includes(column)
    );

  if (
    missingColumns.length > 0
  ) {
    throw new Error(
      `Missing required column(s): ${missingColumns.join(", ")}`
    );
  }

  const dateIndex =
    headers.indexOf("date");

  const productIndex =
    headers.indexOf("product");

  const quantityIndex =
    headers.indexOf("quantity");

  const priceIndex =
    headers.indexOf("price");

  const records = [];

  rows
    .slice(1)
    .forEach(
      (row, index) => {
        const rowNumber =
          index + 2;

        const date =
          String(
            row[dateIndex] ?? ""
          ).trim();

        const product =
          String(
            row[productIndex] ?? ""
          ).trim();

        const quantityText =
          String(
            row[quantityIndex] ?? ""
          ).trim();

        const priceText =
          String(
            row[priceIndex] ?? ""
          ).trim();

        const quantity =
          Number(quantityText);

        const price =
          Number(priceText);

        if (!date) {
          throw new Error(
            `Missing date in row ${rowNumber}.`
          );
        }

        const datePattern =
          /^\d{4}-\d{2}-\d{2}$/;

        if (
          !datePattern.test(date)
        ) {
          throw new Error(
            `Invalid date format in row ${rowNumber}. Use YYYY-MM-DD.`
          );
        }

        if (!product) {
          throw new Error(
            `Missing product name in row ${rowNumber}.`
          );
        }

        if (
          quantityText === "" ||
          !Number.isFinite(quantity) ||
          quantity <= 0
        ) {
          throw new Error(
            `Invalid quantity in row ${rowNumber}.`
          );
        }

        if (
          priceText === "" ||
          !Number.isFinite(price) ||
          price <= 0
        ) {
          throw new Error(
            `Invalid price in row ${rowNumber}.`
          );
        }

        records.push({
          product_name:
            product,

          sale_date:
            date,

          quantity:
            quantity,

          price:
            price
        });
      }
    );

  if (
    records.length === 0
  ) {
    throw new Error(
      "No valid sales records were found."
    );
  }

  return records;
}


/* =========================================
   13. CSV PREVIEW
========================================= */

function renderCSVPreview(rows) {
  const headers =
    rows[0];

  const dataRows =
    rows.slice(1);

  if (
    headers.length === 0 ||
    dataRows.length === 0
  ) {
    throw new Error(
      "CSV must contain headers and at least one data row."
    );
  }

  const head =
    $("csvHead");

  const body =
    $("csvBody");

  if (!head || !body) {
    throw new Error(
      "CSV preview elements were not found in index.html."
    );
  }

  head.replaceChildren();
  body.replaceChildren();

  const headerRow =
    document.createElement(
      "tr"
    );

  headers.forEach(
    (header) => {
      const th =
        document.createElement(
          "th"
        );

      th.textContent =
        header || "(unnamed)";

      headerRow.appendChild(
        th
      );
    }
  );

  head.appendChild(
    headerRow
  );

  /*
    Preview maximum 20 rows.
  */
  dataRows
    .slice(0, 20)
    .forEach(
      (values) => {
        const tr =
          document.createElement(
            "tr"
          );

        headers.forEach(
          (_, index) => {
            const td =
              document.createElement(
                "td"
              );

            td.textContent =
              values[index] ?? "";

            tr.appendChild(
              td
            );
          }
        );

        body.appendChild(tr);
      }
    );

  const summary =
    $("csvSummary");

  if (summary) {
    summary.textContent =
      `${Math.min(
        dataRows.length,
        20
      )} ${t("csvrows")} (${dataRows.length} total)`;
  }

  $("csvPreviewSection")
    ?.classList.remove(
      "hidden"
    );
}


/* =========================================
   14. CSV FILE SELECTION
========================================= */

const csvFileInput =
  $("csvFile");

if (csvFileInput) {
  csvFileInput.addEventListener(
    "change",
    async (event) => {
      const file =
        event.target.files?.[0];

      /*
        Reset previous records.
      */
      parsedSalesRecords = [];

      $("csvPreviewSection")
        ?.classList.add(
          "hidden"
        );

      showCSVMessage("");
      showUploadStatus("");

      const saveButton =
        $("saveCsvBtn");

      if (saveButton) {
        saveButton.disabled =
          true;

        saveButton.textContent =
          "Save Sales Data to Database";
      }

      if (!file) {
        return;
      }

      if (
        !file.name
          .toLowerCase()
          .endsWith(".csv")
      ) {
        showCSVMessage(
          t("csvinvalid"),
          "error"
        );

        event.target.value =
          "";

        return;
      }

      /*
        Maximum CSV size: 2 MB.
      */
      if (
        file.size >
        2 * 1024 * 1024
      ) {
        showCSVMessage(
          t("csvtooLarge"),
          "error"
        );

        event.target.value =
          "";

        return;
      }

      if (
        file.size === 0
      ) {
        showCSVMessage(
          t("csvempty"),
          "error"
        );

        event.target.value =
          "";

        return;
      }

      try {
        const contents =
          await file.text();

        const rows =
          parseCSV(contents);

        if (
          rows.length < 2
        ) {
          throw new Error(
            t("csvmissing")
          );
        }

        /*
          Validate and prepare
          records for FastAPI.
        */
        parsedSalesRecords =
          prepareSalesRecords(
            rows
          );

        renderCSVPreview(
          rows
        );

        if (saveButton) {
          saveButton.disabled =
            false;
        }

        showCSVMessage(
          `${t("csvsuccess")} ${parsedSalesRecords.length} record(s) are ready to save.`,
          "success"
        );
      }

      catch (error) {
        console.error(
          "CSV validation error:",
          error
        );

        parsedSalesRecords = [];

        if (saveButton) {
          saveButton.disabled =
            true;
        }

        showCSVMessage(
          error.message ||
            t("csvinvalid"),
          "error"
        );
      }
    }
  );
}


/* =========================================
   15. SAVE SALES DATA TO DATABASE
========================================= */

const saveCsvButton =
  $("saveCsvBtn");

if (saveCsvButton) {
  saveCsvButton.addEventListener(
    "click",
    async () => {
      if (
        parsedSalesRecords.length ===
        0
      ) {
        showUploadStatus(
          "Please select and validate a CSV file first.",
          "error"
        );

        return;
      }

      const originalText =
        "Save Sales Data to Database";

      saveCsvButton.disabled =
        true;

      saveCsvButton.textContent =
        "Saving...";

      showUploadStatus("");

      try {
        /*
          Send all validated records
          to the FastAPI bulk endpoint.
        */
        const response =
          await fetch(
            `${API_BASE_URL}/api/sales/bulk`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body: JSON.stringify({
                records:
                  parsedSalesRecords
              })
            }
          );

        const result =
          await response
            .json()
            .catch(
              () => ({})
            );

        if (!response.ok) {
          if (
            response.status === 404
          ) {
            throw new Error(
              result.detail ||
              "One or more products in the CSV do not exist in your inventory."
            );
          }

          if (
            response.status === 422
          ) {
            throw new Error(
              result.detail ||
              "Some sales data is invalid. Please check your CSV."
            );
          }

          throw new Error(
            result.detail ||
            "Could not save the sales records."
          );
        }

        const added =
          result.records_added ??
          result.count ??
          parsedSalesRecords.length;

        showUploadStatus(
          `${added} sales record(s) saved successfully to the database!`,
          "success"
        );

        // Pull the saved history into the currently displayed forecast.
        await updateForecast();

        /*
          Clear temporary records to
          prevent accidental duplicates.
        */
        parsedSalesRecords = [];

        saveCsvButton.textContent =
          "Saved Successfully";

        saveCsvButton.disabled =
          true;

      }

      catch (error) {
        console.error(
          "Sales upload error:",
          error
        );

        let message =
          error.message ||
          "Failed to connect to the backend.";

        if (
          error instanceof TypeError
        ) {
          message =
            "Cannot connect to the backend. Make sure FastAPI is running on http://127.0.0.1:8000.";
        }

        showUploadStatus(
          message,
          "error"
        );

        saveCsvButton.disabled =
          false;

        saveCsvButton.textContent =
          originalText;
      }
    }
  );
}


/* =========================================
   16. DOWNLOAD CSV TEMPLATE
========================================= */

function downloadFile(
  content,
  filename,
  mimeType
) {
  const blob =
    new Blob(
      [content],
      {
        type:
          mimeType
      }
    );

  const url =
    URL.createObjectURL(
      blob
    );

  const link =
    document.createElement(
      "a"
    );

  link.href = url;
  link.download =
    filename;

  document.body.appendChild(
    link
  );

  link.click();

  link.remove();

  setTimeout(
    () =>
      URL.revokeObjectURL(
        url
      ),
    1000
  );
}

$("downloadTemplateBtn")
  ?.addEventListener(
    "click",
    () => {
      /*
        Use products that exist
        in your database.
      */
      const template = [
        "date,product,quantity,price",
        "2026-10-20,Rice,8,60",
        "2026-10-21,Rice,10,60",
        "2026-10-20,Milk,12,30",
        "2026-10-21,Milk,11,30",
        "2026-10-22,Cooking Oil,5,150"
      ].join(
        "\r\n"
      );

      downloadFile(
        template,
        "retailai_sales_template.csv",
        "text/csv;charset=utf-8;"
      );
    }
  );


/* =========================================
   17. SIDEBAR NAVIGATION
========================================= */

document
  .querySelectorAll(
    ".nav-link"
  )
  .forEach(
    (link) => {
      link.addEventListener(
        "click",
        () => {
          document
            .querySelectorAll(
              ".nav-link"
            )
            .forEach(
              (item) => {
                item.classList.remove(
                  "active"
                );
              }
            );

          link.classList.add(
            "active"
          );
        }
      );
    }
  );


/* =========================================
   18. LOAD PRODUCTS FROM BACKEND
========================================= */

async function loadProductsFromAPI() {
  try {
    const response =
      await fetch(
        `${API_BASE_URL}/api/products`
      );

    if (!response.ok) {
      throw new Error(
        `Server returned ${response.status}`
      );
    }

    const data =
      await response.json();

    if (
      !Array.isArray(
        data.products
      )
    ) {
      throw new Error(
        "Invalid product data received."
      );
    }

    if (
      data.products.length === 0
    ) {
      console.warn(
        "No products found in database."
      );

      return;
    }

    /*
      Convert backend format to
      frontend product format.
    */
    products =
      data.products
        .filter(
          (item) =>
            item &&
            typeof item.name ===
              "string"
        )
        .map(
          (item) => ({
            id:
              item.id,

            name:
              item.name,

            stock:
              Number(
                item.stock
              ) || 0,

            daily:
              Number(
                item.daily_demand
              ) || 1,

            price:
              Number(
                item.selling_price
              ) || 0,

            cost:
              Number(
                item.unit_cost
              ) || 0
          })
        );

    const forecastSelect = $("forecastProduct");
    if (forecastSelect && products.length) {
      const selected = forecastSelect.value;
      forecastSelect.replaceChildren(...products.map((item) => {
        const option = document.createElement("option");
        option.value = item.name;
        option.textContent = item.name;
        return option;
      }));
      if (products.some((item) => item.name === selected)) forecastSelect.value = selected;
      updateForecast();
    }

    const searchValue =
      $("inventorySearch")
        ?.value || "";

    renderInventory(
      searchValue
    );

    console.log(
      "Products loaded from API:",
      products
    );

  }

  catch (error) {
    /*
      Keep fallback sample data
      if backend is unavailable.
    */
    console.warn(
      "Could not load products from backend. Using current data.",
      error.message
    );
  }
}


/* =========================================
   19. APPLICATION INITIALIZATION
========================================= */

function initializeApp() {
  const todayDate =
    $("todayDate");

  if (todayDate) {
    todayDate.textContent =
      new Date()
        .toLocaleDateString(
          "en-IN",
          {
            day: "numeric",
            month: "short",
            year: "numeric"
          }
        );
  }

  renderInventory();
  renderCharts();
  updateForecast();
  analyzePricing();

  /*
    Load actual products from
    the SQLite database.
  */
  loadProductsFromAPI();
}


/* =========================================
   20. START APPLICATION
========================================= */

document.addEventListener(
  "DOMContentLoaded",
  initializeApp
);

/* =========================================
   LISTEN FOR API DATA
========================================= */

document.addEventListener(
  "retailAIDataLoaded",
  () => {
    console.log("RetailAI API data loaded.");
    const connected = Boolean(window.retailAI?.health?.status === "healthy");
    if ($("backendStatusText")) $("backendStatusText").textContent = connected ? "API connected" : "Local estimate mode";
    if ($("backendStatusDetail")) $("backendStatusDetail").textContent = connected ? "Sales and forecasts are synced" : "Start the API for saved sales data";
    const statusDot = document.querySelector(".status-dot");
    if (statusDot) statusDot.style.background = connected ? "#16845b" : "#e3a34d";

    if (
      window.retailAI &&
      Array.isArray(window.retailAI.products) &&
      window.retailAI.products.length > 0
    ) {
      products = window.retailAI.products.map(
        (item) => ({
          id: item.id,
          name: item.name,
          stock: Number(item.stock) || 0,
          daily: Number(item.daily_demand) || 1,
          price: Number(item.selling_price) || 0,
          cost: Number(item.unit_cost) || 0
        })
      );

      renderInventory();

      console.log(
        "Inventory updated with API data:",
        products
      );
    }
  }
);
