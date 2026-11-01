
# RetailAI — Smart Retail Assistant

RetailAI is a prototype dashboard designed to help local retailers understand
sales, estimate product demand, monitor stock, and evaluate pricing decisions.

## Technology Stack

### Frontend
- HTML5
- CSS3
- Vanilla JavaScript
- Chart.js

### Planned Backend
- Python
- FastAPI
- Uvicorn

### Planned Data and Machine Learning
- Pandas
- NumPy
- Scikit-learn

### Planned Database
- SQLite for local development
- PostgreSQL for deployment

## Features in This Prototype

1. Dashboard with sample sales and demand charts.
2. English and Hindi interface.
3. Baseline demand forecast using historical averages.
4. Inventory search and basic stock alerts.
5. Pricing calculator with a minimum gross-margin check.
6. CSV preview within the browser.
7. Downloadable sales CSV template.
8. Responsive layout for desktop and mobile.

## How to Run

1. Open the RetailAI folder in Visual Studio Code.
2. Install the Live Server extension.
3. Open frontend/index.html.
4. Right-click the file.
5. Select "Open with Live Server".

An internet connection is needed to load Chart.js from its CDN and
the optional Google Fonts stylesheet.

## Expected CSV Columns

date,product,quantity,price

Example:

2026-10-01,Rice,8,60
2026-10-01,Milk,12,30

## Important Limitations

- Dashboard values are sample data.
- Forecasting is a simple historical-average demonstration,
  not a trained machine-learning model.
- Festival, weather, promotions, and market trends are not included.
- Inventory values are illustrative and are not synchronized with a database.
- Pricing checks costs and gross margins; it does not estimate demand elasticity.
- CSV files are previewed locally and are not uploaded or saved to a backend.
- No authentication or user account system is implemented yet.

## Planned Development

Stage 2: Build a FastAPI backend and connect the frontend.
Stage 3: Validate and store uploaded sales data.
Stage 4: Implement and evaluate demand forecasting models.
Stage 5: Connect inventory recommendations to forecast results.
Stage 6: Improve pricing recommendations and add business constraints.
Stage 7: Test, secure, and deploy the application.
