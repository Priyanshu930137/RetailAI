# RetailAI

RetailAI is a local-first sales, inventory, demand, and pricing advisor for neighbourhood retailers. FastAPI serves the dashboard and API from one origin.

## Start

From the project root in PowerShell:

```powershell
python -m pip install -r backend/requirements.txt
cd backend
python -m uvicorn app.main:app --reload
```

Open http://127.0.0.1:8000/. API docs are at http://127.0.0.1:8000/docs. The existing SQLite database is preserved. An empty database is seeded with example products.

## Features

- Persistent inventory: add products, search, edit stock, and protect items with sales history from accidental deletion.
- Stock movement entry: add or remove signed unit quantities for deliveries, returns, damage, or count corrections. Each movement records its reason and resulting balance in a recent activity log; adjustments cannot take stock below zero.
- Quick sale entry, recent sales, and validated CSV import.
- Smart CSV onboarding: product names are matched case-insensitively with whitespace cleanup, missing catalog items are created from the file, import results are shown below the uploader, and identical uploads are fingerprinted to prevent duplicate sales.
- New products created from a sales-only CSV start at zero stock; demand and selling price are estimated from the imported history, and missing unit cost is marked in the import receipt as an 80% selling-price estimate to review.
- All-time sales revenue and product revenue rankings update from saved transactions; the overview chart remains a rolling 14-day view and analytics supports daily/monthly switches.
- Demand forecasts compare Random Forest, Extra Trees, and HistGradientBoosting to a seven-day seasonal baseline using a chronological holdout. The best model is used only when it beats the seasonal baseline; sparse or weaker results fall back to the explainable seasonal estimate. Features include calendar, weekday, festival/season, same-weekday lag, and rolling sales patterns.
- Training data is prepared from transactions aggregated by product and date; missing calendar days between each product's first and last sale are explicit zero-sales observations. Evaluation uses a chronological 80/20 holdout and reports MAE, RMSE, WAPE, and mean-baseline MAE.
- `GET /api/forecast/{product_id}?days=14` returns predictions and model/evaluation metadata. `GET /api/forecasting/evaluation` trains and evaluates available product models and reports feature importance; saved sales rows are read in place and are not modified.
- Supplier lead time and per-unit daily holding cost, with reorder quantities that cover demand during delivery and a holding-cost estimate.
- Upcoming festival insights with approximate uplift and an order-by reminder based on the longest supplier lead time.
- Festival Basket Planner: project the event week for every item, apply a shop's own prior matching calendar-window uplift when enough history exists, subtract expected pre-event sales from stock, then prioritize an order list under the retailer's cash budget and extra storage limit.
- The basket planner checks catalog prices against weighted saved-sale prices; if the catalog cost looks missing or inconsistent, it marks a planning-only 80% cost estimate for review and leaves stored product data unchanged.
- Stockout memory: log the dates a product was unavailable and optionally estimate lost units. Unestimated stockout days are excluded from model target training and imputed only for lag features; estimated lost units are added back to observed sales. Existing sale rows remain unchanged.
- `POST /api/planning/festival` builds a festival or local-event order basket. `POST /api/stockouts` records an availability event; `GET /api/stockouts` shows recent notes.
- Best-selling and lowest-selling product rankings over a 90-day window, including zero-sale products.
- Daily sales trends for the last 30 days and monthly trends for the last 12 months.
- Optional temperature and rainfall adjustments.
- Store-specific weather insights from Open-Meteo (no API key): configure a city or coordinates; view current temperature, humidity, precipitation, conditions, and a seven-day outlook. Responses are cached (30 minutes for forecasts, 24 hours for archived weather); network failures show an unavailable state and leave other dashboard features working.
- Product weather sensitivity categories (hot, rain, cold) generate clearly labeled stock review prompts. Archived daily weather is compared with recorded product sales only when at least 10 matching-weather and 10 comparison days exist; otherwise the recommendation is explicitly a low-confidence rule-based estimate.
- When at least 30 sales dates align with archived local weather, max temperature, precipitation, and weather-data availability join the demand model features. Future weather features are supplied only for dates present in the provider forecast; weather is omitted from training when history is sparse.
- Weather APIs: `GET /api/weather/location`, `PUT /api/weather/location` (`{"city":"Pune"}` or include both `latitude` and `longitude`), and `GET /api/weather`.
- Explainable stockout and overstock scores, reorder suggestions, and cost-aware demand-sensitive pricing.
- Separate inventory risk scores (0–100): stockout risk combines predicted lead-time demand, daily variability, safety stock, and reorder point; overstock risk measures excess units and days of coverage against forecast demand, with holding-cost exposure and velocity context. Sparse sales history is disclosed and uses a conservative variability estimate.
- Risk scores are transparent heuristic indices, not calibrated probabilities. Safety stock uses a 1.65 variability multiplier (approximately a 95% normal-demand service target) when history is sufficient; sparse histories are explicitly marked low confidence.
- Supplier minimum-order quantity and retailer-configured minimum gross margin are saved per product. Reorder quantity covers the forecast window and safety buffer, rounded up to the supplier minimum. Pricing can include an optional competitor price (`GET /api/forecast/{product_id}?competitor_price=...`) but cannot cross the configured margin floor or automatically change saved prices.
- Dashboard recommendation cards show product-level score factors, reorder decisions, seasonal/festival demand context, price/margin comparisons, and forecast-horizon gross profit at unchanged forecast volume. Model importance values are presented as raw importance scores, not invented SHAP contributions.
- Confidence and forecast driver explanations.
- Product forms keep core stock and pricing fields visible and place optional manufacturing/expiry dates and HSN/GST details in a collapsed section. Dates are saved through the API, returned in product records, shown in inventory, and checked so manufacturing is not after expiry.
- Expiry hot list: set the earliest expiry date for the product stock, see units at risk before expiry, and get a suggested markdown that never drops below the stored unit cost. Already-expired products are flagged for removal, not discounting.
- Dead-stock review: find positive stock with no sales for 60 days; older never-sold products are included only when their creation date is known. Carrying-cost estimates help prioritize a clearance review.
- Product tax settings: record the retailer-verified HSN, current GST rate, and whether the displayed selling price includes GST. A rate cannot be entered without an HSN. The app does not guess rates from names or categories: verify classification and current rates through the linked CBIC/GST Portal sources. Tax splits are estimates, not tax invoices or a legal-compliance determination.
- Bundle advisor: only actual bill IDs connect product lines into customer baskets. Pair association rules are filtered by minimum support (2 bills), directional confidence (20%), and lift (1.2); sales without bill IDs are excluded. Supported relationships mark their products as hot sellers and show the count of distinct shared bills; the app never invents a relationship from same-day totals.
- The demand trainer compares Random Forest, Extra Trees, HistGradientBoosting, and a seven-day seasonal baseline using a strict date-based holdout. It uses the best method only when it beats the seasonal baseline; otherwise it forecasts from the baseline. Features include same-weekday lags, 7/14/28/56-day averages, recent median/variance, trend, and calendar/festival/season signals.

Forecasts and markdowns are decision support, not guaranteed results. Holdout scores measure historical performance and do not guarantee future accuracy. Festival dates are approximate; weather conditions depend on the external provider and configured store location, and rule-based estimates are labeled as such. Expiry is currently stored as one earliest-expiry date per product, not multiple inventory lots. Model training requires at least 30 non-zero product-days and 60 calendar product-day rows; an individual product needs 14 recorded sale dates for a personalized ML forecast. The API reports when it falls back. New inventory fields are added to the existing SQLite table in place with defaults; existing product and sales records are retained.

## CSV format

```csv
date,product,quantity,price
2026-11-01,Rice,8,60,BILL-1042
```

Products may already exist or be discovered directly from the CSV. `bill_id` is optional; enter the same ID for all items on one receipt to power association rules. Imports are validated before writing, run as one transaction, and are limited to 5,000 rows. Existing inventory values are retained; auto-created products use a zero-stock starting point.

For a complete dashboard demo, download `frontend/sample_retail_store.csv` from the website using **Download feature demo CSV**. Its `record_type` column supports `product` rows (stock, demand, prices, manufacture/expiry dates, and optional `inventory_since`) and `sale` rows (date, quantity, price, and `bill_id`). The website shifts the sample dates relative to the current day so expiry and dead-stock examples remain useful. Product stock changes are audited, sales/basket insights are rebuilt after import, and re-uploading the exact file is deduplicated. `inventory_since` is only used when creating a new product so an old unsold demo item can immediately appear in dead-stock review.

## Languages

Use the language menu in the dashboard header to switch between English,
Hindi, and Marathi. Your choice is saved in this browser.
