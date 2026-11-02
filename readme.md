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
- Quick sale entry, recent sales, and validated CSV import.
- Smart CSV onboarding: product names are matched case-insensitively with whitespace cleanup, missing catalog items are created from the file, import results are shown below the uploader, and identical uploads are fingerprinted to prevent duplicate sales.
- New products created from a sales-only CSV start at zero stock; demand and selling price are estimated from the imported history, and missing unit cost is marked in the import receipt as an 80% selling-price estimate to review.
- Sales metrics and a 14-day chart calculated from saved transactions.
- Demand forecasts use a product-level Random Forest when enough saved history is available, with daily demand, calendar, weekday, festival-window, summer/monsoon, slow/peak-season, and lag/rolling-sales features. Sparse datasets use the explainable seasonal baseline until the model has sufficient training examples.
- Training data is prepared from transactions aggregated by product and date; missing calendar days between each product's first and last sale are explicit zero-sales observations. Evaluation uses a chronological 80/20 holdout and reports MAE, RMSE, WAPE, and mean-baseline MAE.
- `GET /api/forecast/{product_id}?days=14` returns predictions and model/evaluation metadata. `GET /api/forecasting/evaluation` trains and evaluates available product models and reports feature importance; saved sales rows are read in place and are not modified.
- Supplier lead time and per-unit daily holding cost, with reorder quantities that cover demand during delivery and a holding-cost estimate.
- Upcoming festival insights with approximate uplift and an order-by reminder based on the longest supplier lead time.
- Festival Basket Planner: project the event week for every item, apply a shop's own prior matching calendar-window uplift when enough history exists, subtract expected pre-event sales from stock, then prioritize an order list under the retailer's cash budget and extra storage limit.
- The basket planner checks catalog prices against weighted saved-sale prices; if the catalog cost looks missing or inconsistent, it marks a planning-only 80% cost estimate for review and leaves stored product data unchanged.
- Stockout memory: log the dates a product was unavailable and optionally estimate lost units. Unestimated stockout days are excluded from Random Forest target training and imputed only for lag features; estimated lost units are added back to observed sales. Existing sale rows remain unchanged.
- `POST /api/planning/festival` builds a festival or local-event order basket. `POST /api/stockouts` records an availability event; `GET /api/stockouts` shows recent notes.
- Best-selling and lowest-selling product rankings over a 90-day window, including zero-sale products.
- Daily sales trends for the last 30 days and monthly trends for the last 12 months.
- Optional temperature and rainfall adjustments.
- Explainable stockout and overstock scores, reorder suggestions, and cost-aware demand-sensitive pricing.
- Confidence and forecast driver explanations.

Forecasts are decision support, not guaranteed results. Festival dates are approximate; weather is manually entered and acts as a forecast adjustment because historical weather is not stored. Model training requires at least 30 non-zero product-days and 60 calendar product-day rows; an individual product needs 14 recorded sale dates for a personalized ML forecast. The API reports when it falls back. New inventory fields are added to the existing SQLite table in place with defaults; existing product and sales records are retained.

## CSV format

```csv
date,product,quantity,price
2026-11-01,Rice,8,60
```

Products may already exist or be discovered directly from the CSV. Imports are validated before writing, run as one transaction, and are limited to 5,000 rows. Existing inventory values are retained; auto-created products use a zero-stock starting point.

## Languages

Use the language menu in the dashboard header to switch between English,
Hindi, and Marathi. Your choice is saved in this browser.
