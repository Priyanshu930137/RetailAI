"""Clean, single-origin RetailAI application entry point."""
from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta
import hashlib
import json
import logging
import math
from collections import Counter, defaultdict
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Query, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import func, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import Base, SessionLocal, engine, get_db
from app.demand_model import evaluate_and_forecast, fit_demand_model
from app.forecasting import FESTIVALS, _festival_effect, build_forecast
from app.models import Product, SalesImport, SalesRecord, StockAdjustment, StockoutEvent, StoreWeatherLocation
from app.schemas import FestivalPlanRequest, ProductCreate, ProductResponse, ProductUpdate, SalesBulkUpload, SalesRecordCreate, SalesRecordResponse, StockAdjustmentCreate, StockoutEventCreate, StoreCsvImport
from app.weather import SOURCE as SOURCE_WEATHER, build_weather_insights, geocode, get_weather, get_weather_history
from app.inventory_risk import assess_inventory
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parents[2]
WEB = ROOT / "frontend"
logger = logging.getLogger("retailai.import")


def _store_festival_uplift(product_name: str, event_date: date, sales):
    """Learn an item-specific festival factor from earlier matching date windows."""
    daily = {}
    for row in sales:
        if row.product_name == product_name:
            daily[row.sale_date] = daily.get(row.sale_date, 0) + int(row.quantity)
    if not daily:
        return None
    first, last = min(daily), max(daily)
    event_dates, reference_dates = [], []
    for year in range(first.year, min(event_date.year, last.year + 1)):
        try:
            anchor = date(year, event_date.month, event_date.day)
        except ValueError:
            anchor = date(year, event_date.month, 28)
        for offset in range(-7, 8):
            day = anchor + timedelta(days=offset)
            if first <= day <= last:
                event_dates.append(day)
        for offset in list(range(-60, -20)) + list(range(21, 61)):
            day = anchor + timedelta(days=offset)
            if first <= day <= last:
                reference_dates.append(day)
    positive_event_days = sum(daily.get(day, 0) > 0 for day in event_dates)
    if len(event_dates) < 7 or len(reference_dates) < 20 or positive_event_days < 3:
        return None
    event_average = sum(daily.get(day, 0) for day in event_dates) / len(event_dates)
    reference_average = sum(daily.get(day, 0) for day in reference_dates) / len(reference_dates)
    if reference_average <= 0:
        return None
    return {"factor": min(1.6, max(0.75, event_average / reference_average)),
            "sample_days": len(event_dates), "years": sorted({day.year for day in event_dates})}


def initialize():
    Base.metadata.create_all(bind=engine)
    # Add new planning columns in place; never recreate or discard existing rows.
    with engine.begin() as connection:
        existing = {row[1] for row in connection.exec_driver_sql("PRAGMA table_info(products)").fetchall()}
        if "supplier_lead_time_days" not in existing:
            connection.exec_driver_sql("ALTER TABLE products ADD COLUMN supplier_lead_time_days INTEGER NOT NULL DEFAULT 3")
        if "supplier_min_order_quantity" not in existing:
            connection.exec_driver_sql("ALTER TABLE products ADD COLUMN supplier_min_order_quantity INTEGER NOT NULL DEFAULT 1")
        if "minimum_gross_margin_percent" not in existing:
            connection.exec_driver_sql("ALTER TABLE products ADD COLUMN minimum_gross_margin_percent FLOAT NOT NULL DEFAULT 5")
        if "holding_cost_per_unit_day" not in existing:
            connection.exec_driver_sql("ALTER TABLE products ADD COLUMN holding_cost_per_unit_day FLOAT NOT NULL DEFAULT 0")
        if "manufacturing_date" not in existing:
            connection.exec_driver_sql("ALTER TABLE products ADD COLUMN manufacturing_date DATE")
        if "expiry_date" not in existing:
            connection.exec_driver_sql("ALTER TABLE products ADD COLUMN expiry_date DATE")
        if "hsn_code" not in existing:
            connection.exec_driver_sql("ALTER TABLE products ADD COLUMN hsn_code VARCHAR(12)")
        if "gst_rate_percent" not in existing:
            connection.exec_driver_sql("ALTER TABLE products ADD COLUMN gst_rate_percent FLOAT")
        if "gst_price_inclusive" not in existing:
            connection.exec_driver_sql("ALTER TABLE products ADD COLUMN gst_price_inclusive BOOLEAN NOT NULL DEFAULT 1")
        if "weather_sensitivity" not in existing:
            connection.exec_driver_sql("ALTER TABLE products ADD COLUMN weather_sensitivity VARCHAR(24) NOT NULL DEFAULT 'none'")
        if "created_at" not in existing:
            connection.exec_driver_sql("ALTER TABLE products ADD COLUMN created_at DATETIME")
        sales_columns = {row[1] for row in connection.exec_driver_sql("PRAGMA table_info(sales_records)").fetchall()}
        if "transaction_id" not in sales_columns:
            connection.exec_driver_sql("ALTER TABLE sales_records ADD COLUMN transaction_id VARCHAR(100)")
    db = SessionLocal()
    try:
        if db.query(Product).count() == 0:
            db.add_all([
                Product(name="Rice", stock=45, daily_demand=8, selling_price=60, unit_cost=45, supplier_lead_time_days=3, holding_cost_per_unit_day=0.08),
                Product(name="Milk", stock=30, daily_demand=12, selling_price=30, unit_cost=23, supplier_lead_time_days=1, holding_cost_per_unit_day=0.15),
                Product(name="Cooking Oil", stock=52, daily_demand=5, selling_price=150, unit_cost=125, supplier_lead_time_days=5, holding_cost_per_unit_day=0.12),
            ])
            db.commit()
    finally:
        db.close()


def _with_inventory_risk(result, product, sales, competitor_price=None):
    daily_sales = defaultdict(int)
    for row in sales:
        if row.product_name == product.name:
            daily_sales[row.sale_date] += int(row.quantity)
    if daily_sales:
        first, last = min(daily_sales), max(daily_sales)
        demand_history = [daily_sales.get(first + timedelta(days=offset), 0)
                          for offset in range((last - first).days + 1)]
    else:
        demand_history = []
    daily = result.get("daily_average", product.daily_demand)
    total = result.get("total_demand", daily * result.get("horizon_days", 14))
    assessment = assess_inventory(product, daily, total, demand_history,
        result.get("horizon_days", 14), result.get("seasonal_context", []),
        result.get("festival_events", []), competitor_price)
    result["stock_risk"] = assessment["stockout_risk"]
    result["overstock_risk"] = assessment["overstock_risk"]
    result["reorder_recommendation"] = assessment["reorder_recommendation"]
    result["recommended_replenishment"] = assessment["reorder_recommendation"]["suggested_quantity"]
    assessment["pricing"]["gross_margin"] = assessment["pricing"]["suggested_gross_margin_percent"]
    result["pricing"] = assessment["pricing"]
    result["explainable_recommendations"] = {
        "stockout": assessment["stockout_risk"]["reasons"],
        "overstock": assessment["overstock_risk"]["reasons"],
        "reorder": [assessment["reorder_recommendation"]["reason"]],
        "pricing": assessment["pricing"]["explanation"],
    }
    result["demand_variability_units_per_day"] = assessment["stockout_risk"]["demand_variability_units_per_day"]
    result["safety_stock_units"] = assessment["stockout_risk"]["safety_stock"]
    return result


@asynccontextmanager
async def lifespan(_app):
    initialize()
    yield


app = FastAPI(title="RetailAI", version="2.0.0", description="Local retailer sales, inventory, demand, and pricing advisor", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type"],
)


class WeatherLocationInput(BaseModel):
    city: str = Field(min_length=2, max_length=120)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)


@app.get("/api/weather/location")
def read_weather_location(db: Session = Depends(get_db)):
    location = db.get(StoreWeatherLocation, 1)
    return {"configured": bool(location), **({"city": location.city, "latitude": location.latitude,
        "longitude": location.longitude, "timezone": location.timezone} if location else {})}


@app.put("/api/weather/location")
def save_weather_location(payload: WeatherLocationInput, db: Session = Depends(get_db)):
    if (payload.latitude is None) != (payload.longitude is None):
        raise HTTPException(422, "Provide both latitude and longitude, or leave both blank to look up the city")
    if payload.latitude is None:
        try:
            resolved = geocode(payload.city)
        except Exception as exc:
            logger.info("Weather geocoding unavailable: %s", exc)
            raise HTTPException(503, "City lookup is unavailable. Retry later or enter coordinates.") from exc
        if not resolved:
            raise HTTPException(422, "City not found. Check the spelling or enter coordinates.")
        city, latitude, longitude, timezone_name = resolved["city"], resolved["latitude"], resolved["longitude"], resolved.get("timezone")
    else:
        city, latitude, longitude, timezone_name = payload.city.strip(), payload.latitude, payload.longitude, None
    location = db.get(StoreWeatherLocation, 1)
    if not location:
        location = StoreWeatherLocation(id=1, city=city, latitude=latitude, longitude=longitude, timezone=timezone_name)
        db.add(location)
    else:
        location.city, location.latitude, location.longitude, location.timezone = city, latitude, longitude, timezone_name
    db.commit()
    return {"configured": True, "city": city, "latitude": latitude, "longitude": longitude, "timezone": timezone_name}


@app.get("/api/weather")
def weather_dashboard(db: Session = Depends(get_db)):
    location = db.get(StoreWeatherLocation, 1)
    if not location:
        return {"configured": False, "available": False, "message": "Set your store city to view local weather insights.",
                "source": None, "current": None, "forecast": [], "insights": []}
    try:
        weather = get_weather(location.latitude, location.longitude)
        weather["city"] = location.city
        products = db.query(Product).order_by(Product.name).all()
        sales = db.query(SalesRecord).all()
        historical = {}
        # Historical matching is optional. A failure must not interrupt live weather or the dashboard.
        try:
            historical = get_weather_history(location.latitude, location.longitude)
        except Exception as exc:
            logger.info("Historical weather unavailable: %s", exc)
        weather["insights"] = build_weather_insights(weather, products, sales, historical)
        weather["history_available"] = bool(historical)
        weather["message"] = None if weather["available"] else "Weather provider returned no current conditions."
        return weather
    except Exception as exc:
        logger.info("Weather provider unavailable: %s", exc)
        return {"configured": True, "available": False, "city": location.city, "source": SOURCE_WEATHER,
                "current": None, "forecast": [], "insights": [],
                "message": "Local weather is temporarily unavailable. Sales, inventory, and forecasts are unaffected."}


@app.get("/", include_in_schema=False)
def home():
    return FileResponse(WEB / "index.html")


@app.get("/api/health")
def health(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "healthy", "database": "connected", "service": "RetailAI"}


@app.get("/api/dashboard")
def dashboard(db: Session = Depends(get_db)):
    products = db.query(Product).order_by(Product.name).all()
    today = date.today()
    start = today - timedelta(days=13)
    rows = db.query(
        SalesRecord.sale_date,
        func.sum(SalesRecord.quantity).label("units"),
        func.sum(SalesRecord.quantity * SalesRecord.price).label("revenue"),
    ).filter(SalesRecord.sale_date >= start, SalesRecord.sale_date <= today).group_by(SalesRecord.sale_date).order_by(SalesRecord.sale_date).all()
    revenue = sum(float(row.revenue or 0) for row in rows)
    units = sum(int(row.units or 0) for row in rows)
    all_time = db.query(
        func.coalesce(func.sum(SalesRecord.quantity), 0).label("units"),
        func.coalesce(func.sum(SalesRecord.quantity * SalesRecord.price), 0).label("revenue"),
    ).one()
    low_stock = sum(1 for item in products if item.stock <= item.daily_demand * 3)
    return {
        "revenue_14d": round(revenue, 2),
        "units_14d": units,
        "total_sales_revenue": round(float(all_time.revenue or 0), 2),
        "total_units_sold": int(all_time.units or 0),
        "product_count": len(products),
        "low_stock_count": low_stock,
        "sales_by_day": [{"date": row.sale_date.isoformat(), "units": int(row.units or 0), "revenue": round(float(row.revenue or 0), 2)} for row in rows],
        "holding_cost_per_day": round(sum(item.stock * item.holding_cost_per_unit_day for item in products), 2),
        "products": [ProductResponse.model_validate(item).model_dump() for item in products],
    }


@app.get("/api/analytics")
def analytics(db: Session = Depends(get_db)):
    today = date.today()
    daily_start = today - timedelta(days=29)
    daily_rows = db.query(
        SalesRecord.sale_date,
        func.sum(SalesRecord.quantity).label("units"),
        func.sum(SalesRecord.quantity * SalesRecord.price).label("revenue"),
    ).filter(SalesRecord.sale_date >= daily_start, SalesRecord.sale_date <= today).group_by(SalesRecord.sale_date).order_by(SalesRecord.sale_date).all()
    month_index = today.year * 12 + today.month - 1 - 11
    month_start = date(month_index // 12, month_index % 12 + 1, 1)
    monthly_rows = db.query(
        func.strftime("%Y-%m", SalesRecord.sale_date).label("month"),
        func.sum(SalesRecord.quantity).label("units"),
        func.sum(SalesRecord.quantity * SalesRecord.price).label("revenue"),
    ).filter(SalesRecord.sale_date >= month_start, SalesRecord.sale_date <= today).group_by("month").order_by("month").all()
    products = db.query(Product).order_by(Product.name).all()
    all_time_rows = db.query(
        SalesRecord.product_name,
        func.sum(SalesRecord.quantity).label("units"),
        func.sum(SalesRecord.quantity * SalesRecord.price).label("revenue"),
    ).group_by(SalesRecord.product_name).all()
    all_time_totals = {row.product_name: {"units": int(row.units or 0),
                          "revenue": round(float(row.revenue or 0), 2)} for row in all_time_rows}
    all_time_ranked = [{"product": item.name, **all_time_totals.get(item.name, {"units": 0, "revenue": 0})}
                       for item in products]
    all_time_ranked.sort(key=lambda row: (-row["revenue"], -row["units"], row["product"].casefold()))
    ranking_rows = db.query(
        SalesRecord.product_name,
        func.sum(SalesRecord.quantity).label("units"),
        func.sum(SalesRecord.quantity * SalesRecord.price).label("revenue"),
    ).filter(SalesRecord.sale_date >= today - timedelta(days=89), SalesRecord.sale_date <= today).group_by(SalesRecord.product_name).all()
    totals = {row.product_name: {"units": int(row.units or 0), "revenue": round(float(row.revenue or 0), 2)} for row in ranking_rows}
    ranked = [{"product": item.name, **totals.get(item.name, {"units": 0, "revenue": 0})} for item in products]
    best = sorted((row for row in ranked if row["units"] > 0), key=lambda row: (-row["units"], -row["revenue"]))[:5]
    lowest = sorted(ranked, key=lambda row: (row["units"], row["revenue"]))[:5]
    return {
        "daily": [{"period": row.sale_date.isoformat(), "units": int(row.units or 0), "revenue": round(float(row.revenue or 0), 2)} for row in daily_rows],
        "monthly": [{"period": row.month, "units": int(row.units or 0), "revenue": round(float(row.revenue or 0), 2)} for row in monthly_rows],
        "best_sellers_90d": best,
        "lowest_sellers_90d": lowest,
        "sales_by_product": [row for row in all_time_ranked if row["units"] > 0],
        "total_sales_revenue": round(sum(row["revenue"] for row in all_time_ranked), 2),
        "total_units_sold": sum(row["units"] for row in all_time_ranked),
        "ranking_window_days": 90,
    }


@app.get("/api/festivals")
def festival_calendar(days: int = Query(default=120, ge=1, le=365), db: Session = Depends(get_db)):
    from app.forecasting import FESTIVALS
    today = date.today()
    end = today + timedelta(days=days)
    events = []
    for year in (today.year, today.year + 1):
        for (month, day), (name, uplift) in FESTIVALS.items():
            try:
                event_day = date(year, month, day)
            except ValueError:
                continue
            if today <= event_day <= end:
                events.append({"name": name, "date": event_day.isoformat(), "days_until": (event_day - today).days, "expected_uplift_percent": round((uplift - 1) * 100), "advice": "Review supplier lead times and raise a purchase order before the festival window."})
    events.sort(key=lambda event: event["date"])
    return {"events": events, "window_days": days, "calendar_note": "Approximate India retail calendar; confirm local festival dates."}


@app.post("/api/planning/festival")
def festival_basket_plan(payload: FestivalPlanRequest, db: Session = Depends(get_db)):
    today = date.today()
    if not payload.festival_name.strip():
        raise HTTPException(422, "Enter a festival or local-event name")
    days_until = (payload.festival_date - today).days
    if days_until < 1 or days_until > 120:
        raise HTTPException(422, "Choose an event date from tomorrow through the next 120 days")
    products = db.query(Product).order_by(Product.name).all()
    if not products:
        raise HTTPException(400, "Add products before building a festival order plan")
    sales = db.query(SalesRecord).order_by(SalesRecord.sale_date).all()
    stockouts = db.query(StockoutEvent).all()
    model = fit_demand_model(sales, products, stockouts)
    horizon = days_until + 6  # Forecast through the seven-day festival window.
    festival_end = payload.festival_date + timedelta(days=6)
    candidates = []
    used_ml = False
    sales_counts = Counter(row.product_name for row in sales)
    sales_quantities = defaultdict(int)
    sales_value = defaultdict(float)
    for sale in sales:
        sales_quantities[sale.product_name] += int(sale.quantity)
        sales_value[sale.product_name] += int(sale.quantity) * float(sale.price)
    product_groups = defaultdict(list)
    for item in products:
        product_groups[" ".join(item.name.split()).casefold()].append(item)
    planning_products = []
    for variants in product_groups.values():
        chosen = max(variants, key=lambda item: (sales_counts[item.name], -item.id))
        planning_products.append((chosen, sum(int(item.stock) for item in variants)))

    for product, combined_stock in planning_products:
        product_sales = [row for row in sales if row.product_name == product.name]
        prediction = evaluate_and_forecast(
            sales, products, product, horizon, stockouts=stockouts,
            model_bundle=model, first_forecast_day=today + timedelta(days=1),
        )
        if prediction["available"]:
            points = prediction["forecast"]
            used_ml = True
        else:
            points = build_forecast(product, product_sales, horizon)["forecast"]
        point_map = {date.fromisoformat(point["date"]): float(point["units"]) for point in points}
        prior_to_event = sum(units for day, units in point_map.items() if day < payload.festival_date)
        window_points = [(day, point_map.get(day, 0.0)) for day in
                         (payload.festival_date + timedelta(days=i) for i in range(7))]
        personal_uplift = _store_festival_uplift(product.name, payload.festival_date, sales)
        if personal_uplift:
            regular_demand = sum(units / _festival_effect(day)[1] for day, units in window_points)
            event_demand = regular_demand * personal_uplift["factor"]
            uplift_source = "Your saved festival-period sales"
            uplift_factor = personal_uplift["factor"]
        else:
            event_demand = sum(units for _, units in window_points)
            uplift_factor = sum(_festival_effect(day)[1] for day, _ in window_points) / 7
            uplift_source = "India festival calendar" if uplift_factor > 1.01 else "Seasonal demand model"

        projected_stock = max(0.0, float(combined_stock) - prior_to_event)
        target_units = math.ceil(event_demand * 1.1)
        requested = max(0, math.ceil(target_units - projected_stock))
        if requested <= 0:
            continue
        catalog_price = max(0.01, float(product.selling_price))
        observed_price = (sales_value[product.name] / sales_quantities[product.name]
                          if sales_quantities[product.name] else catalog_price)
        use_sales_price = bool(sales_quantities[product.name] and
                               abs(observed_price - catalog_price) / max(observed_price, 0.01) > 0.25)
        planning_price = observed_price if use_sales_price else catalog_price
        catalog_cost = float(product.unit_cost)
        estimate_cost = catalog_cost <= 0 or catalog_cost >= planning_price or catalog_cost < planning_price * 0.15
        planning_cost = max(0.01, round(planning_price * 0.8, 2)) if estimate_cost else catalog_cost
        cost_source = "estimated at 80% of observed sell price" if estimate_cost else "inventory cost"
        price_source = "weighted saved-sales price" if use_sales_price else "inventory price"
        cost = planning_cost
        margin = max(0.0, planning_price - planning_cost)
        coverage = projected_stock / max(event_demand, 0.1)
        priority = (margin / cost) * (1.5 if coverage < 0.5 else 1.0)
        lead_days = max(0, int(product.supplier_lead_time_days or 0))
        buy_by = payload.festival_date - timedelta(days=lead_days)
        candidates.append({
            "product_id": product.id, "product": product.name.strip(),
            "event_demand_units": round(event_demand, 1), "projected_stock_at_event": round(projected_stock, 1),
            "requested_units": requested, "order_units": 0, "unfunded_units": requested,
            "unit_cost": round(cost, 2), "order_cost": 0.0, "buy_by": max(today, buy_by).isoformat(),
            "planning_sell_price": round(planning_price, 2), "price_source": price_source,
            "cost_source": cost_source, "unit_margin": round(margin, 2),
            "supplier_lead_time_days": lead_days, "expected_uplift_percent": round((uplift_factor - 1) * 100),
            "uplift_source": uplift_source, "expected_gross_profit": 0.0,
            "priority_score": round(priority, 4), "available_for_ml": bool(prediction["available"]),
        })

    candidates.sort(key=lambda row: (-row["priority_score"], row["buy_by"], row["product"].casefold()))
    budget_left = float(payload.budget_inr)
    storage_left = int(payload.extra_storage_units)
    for row in candidates:
        can_afford = math.floor((budget_left + 1e-8) / row["unit_cost"])
        allocated = min(row["requested_units"], can_afford, storage_left)
        row["order_units"] = allocated
        row["unfunded_units"] = row["requested_units"] - allocated
        row["order_cost"] = round(allocated * row["unit_cost"], 2)
        row["expected_gross_profit"] = round(min(row["event_demand_units"], row["projected_stock_at_event"] + allocated)
                                               * row["unit_margin"], 2)
        budget_left = max(0.0, budget_left - row["order_cost"])
        storage_left -= allocated

    orders = [row for row in candidates if row["order_units"] > 0]
    return {
        "festival_name": payload.festival_name.strip(), "festival_date": payload.festival_date.isoformat(),
        "festival_window_end": festival_end.isoformat(), "days_until": days_until,
        "budget_inr": round(payload.budget_inr, 2),
        "budget_used_inr": round(payload.budget_inr - budget_left, 2), "budget_left_inr": round(budget_left, 2),
        "storage_capacity_units": payload.extra_storage_units,
        "storage_used_units": payload.extra_storage_units - storage_left,
        "model_source": model["model"] if used_ml else "Explainable seasonal estimate",
        "model_evaluation": model["evaluation"] if model["available"] else None,
        "stockout_days_adjusted": model["stockout_days_adjusted"],
        "ordered_product_count": len(orders), "items": orders,
        "unfunded_products": [{"product": row["product"], "units": row["unfunded_units"]}
                              for row in candidates if row["unfunded_units"] > 0],
        "note": "Personal festival uplift is learned only when earlier matching calendar windows have enough saved sales. Stock on hand is projected through demand before the event; items with sparse history use the seasonal fallback.",
    }


def _gst_split(product: Product, price: float):
    rate = product.gst_rate_percent
    if rate is None:
        return None
    rate = max(0.0, float(rate))
    if product.gst_price_inclusive:
        tax = price * rate / (100 + rate) if rate else 0.0
        return {"tax_amount": round(tax, 2), "price_including_gst": round(price, 2),
                "price_before_gst": round(price - tax, 2), "rate_percent": rate,
                "price_basis": "inclusive"}
    tax = price * rate / 100
    return {"tax_amount": round(tax, 2), "price_including_gst": round(price + tax, 2),
            "price_before_gst": round(price, 2), "rate_percent": rate,
            "price_basis": "exclusive"}


@app.get("/api/retail-actions")
def retail_actions(expiry_window_days: int = Query(default=30, ge=1, le=180),
                  dead_stock_days: int = Query(default=60, ge=14, le=730),
                  db: Session = Depends(get_db)):
    """Return expiry clearance actions and products with stale sell-through."""
    today = date.today()
    products = db.query(Product).order_by(Product.name).all()
    sales = db.query(SalesRecord).order_by(SalesRecord.sale_date.desc()).all()
    last_sale = {}
    for sale in sales:
        last_sale.setdefault(sale.product_name, sale.sale_date)
    hot_list, dead_stock = [], []
    for product in products:
        if product.manufacturing_date and product.expiry_date and product.manufacturing_date > product.expiry_date:
            # Ignore invalid legacy date ranges in expiry advice; API writes reject them.
            expiry = None
        else:
            expiry = product.expiry_date
        if product.stock > 0 and expiry:
            days_left = (expiry - today).days
            if days_left < 0:
                hot_list.append({"product_id": product.id, "product": product.name.strip(),
                    "stock": product.stock, "expiry_date": expiry.isoformat(),
                    "days_to_expiry": days_left, "status": "expired", "discount_percent": 0,
                    "suggested_price": None, "gst_rate_percent": product.gst_rate_percent,
                    "action": "Remove from sale. Do not discount or sell expired goods."})
            elif days_left <= expiry_window_days:
                expected_sales = max(0, float(product.daily_demand)) * days_left
                at_risk_units = max(0, int(math.ceil(product.stock - expected_sales)))
                urgency = max(0.0, (expiry_window_days - days_left) / max(expiry_window_days, 1))
                target_pct = min(35, max(5, round(5 + urgency * 30)))
                floor = float(product.unit_cost or 0)
                marked_price = max(floor, float(product.selling_price) * (1 - target_pct / 100))
                actual_discount = max(0, round((1 - marked_price / max(float(product.selling_price), .01)) * 100))
                tax = _gst_split(product, marked_price)
                hot_list.append({"product_id": product.id, "product": product.name.strip(),
                    "stock": product.stock, "at_risk_units": at_risk_units,
                    "expiry_date": expiry.isoformat(), "days_to_expiry": days_left,
                    "status": "near_expiry", "discount_percent": actual_discount,
                    "suggested_price": round(marked_price, 2),
                    "gst_estimate": tax,
                    "estimated_price_including_gst": tax["price_including_gst"] if tax is not None else None,
                    "gst_rate_percent": product.gst_rate_percent,
                    "action": "Prioritize sale before expiry; never sell after the expiry date."})
        last = last_sale.get(product.name)
        if last:
            idle_days = (today - last).days
            last_date = last.isoformat()
            idle_source = "last sale"
        elif product.created_at:
            created = product.created_at.date() if hasattr(product.created_at, "date") else product.created_at
            idle_days = (today - created).days
            last_date = None
            idle_source = "never sold"
        else:
            idle_days = -1
            last_date = None
            idle_source = "unknown"
        if product.stock > 0 and idle_days >= dead_stock_days:
            markdown = max(float(product.unit_cost or 0), float(product.selling_price) * .9)
            dead_stock.append({"product_id": product.id, "product": product.name.strip(),
                "stock": product.stock, "last_sale_date": last_date, "idle_days": idle_days,
                "idle_source": idle_source,
                "estimated_carrying_cost": round(product.stock * float(product.holding_cost_per_unit_day or 0) * idle_days, 2),
                "review_price": round(markdown, 2), "gst_rate_percent": product.gst_rate_percent})
    hot_list.sort(key=lambda row: (row["days_to_expiry"], row["product"].casefold()))
    dead_stock.sort(key=lambda row: (-row["idle_days"], -row["estimated_carrying_cost"]))
    return {"as_of": today.isoformat(), "expiry_window_days": expiry_window_days,
        "dead_stock_days": dead_stock_days, "hot_list": hot_list, "dead_stock": dead_stock,
        "note": "Near-expiry markdowns are suggestions above unit cost. Expired goods must be removed from sale. Tax estimates appear only when a retailer has configured an HSN and GST rate."}


@app.get("/api/bundles")
def bundle_recommendations(limit: int = Query(default=10, ge=1, le=50), db: Session = Depends(get_db)):
    """Mine directional association rules from actual bill-level baskets only."""
    from itertools import combinations
    rows = db.query(SalesRecord).order_by(SalesRecord.sale_date).all()
    baskets = defaultdict(set)
    for row in rows:
        bill_id = (row.transaction_id or "").strip()
        if not bill_id:
            continue
        key = (row.sale_date.isoformat(), bill_id.casefold())
        baskets[key].add(row.product_name)
    basket_count = len(baskets)
    product_baskets, pair_counts = Counter(), Counter()
    for basket in baskets.values():
        product_baskets.update(basket)
        pair_counts.update(combinations(sorted(basket), 2))
    catalog = {item.name: item for item in db.query(Product).all()}
    suggestions = []
    minimum_support_count = max(2, math.ceil(basket_count * 0.005))
    for (name_a, name_b), count in pair_counts.items():
        if count < minimum_support_count or name_a not in catalog or name_b not in catalog:
            continue
        support_a = product_baskets[name_a] / max(basket_count, 1)
        support_b = product_baskets[name_b] / max(basket_count, 1)
        support_pair = count / max(basket_count, 1)
        lift = support_pair / max(support_a * support_b, 1e-9)
        confidence_a_to_b = count / max(product_baskets[name_a], 1)
        confidence_b_to_a = count / max(product_baskets[name_b], 1)
        if lift < 1.2 or max(confidence_a_to_b, confidence_b_to_a) < 0.2:
            continue
        antecedent, consequent, confidence = (name_a, name_b, confidence_a_to_b) if confidence_a_to_b >= confidence_b_to_a else (name_b, name_a, confidence_b_to_a)
        suggestions.append({"products": [name_a, name_b], "antecedent": antecedent,
            "consequent": consequent, "co_purchase_baskets": count,
            "support_percent": round(support_pair * 100, 1),
            "confidence_percent": round(confidence * 100, 1),
            "lift": round(lift, 2),
            "support_count": count,
            "interpretation": f"When {antecedent} is in a recorded bill, {consequent} appeared on the same bill {round(confidence * 100, 1)}% of the time."})
    suggestions.sort(key=lambda row: (-row["lift"], -row["confidence_percent"], -row["co_purchase_baskets"]))
    hot_products, related_products = Counter(), defaultdict(set)
    supported_pairs = {frozenset(row["products"]) for row in suggestions}
    for basket in baskets.values():
        for name in basket:
            related = {other for other in basket if other != name and frozenset((name, other)) in supported_pairs}
            if related:
                hot_products[name] += 1
                related_products[name].update(related)
    hot_selling = [{"product": name, "shared_bills": count,
                    "related_products": sorted(related_products[name])}
                   for name, count in hot_products.most_common(limit)]
    return {"method": "bill-level association rules (support, confidence, lift)",
        "basket_count": basket_count, "recommendations": suggestions[:limit],
        "hot_selling_products": hot_selling,
        "minimum_support_baskets": minimum_support_count,
        "note": "Only actual bill IDs are grouped. Recommendations require at least 2 shared bills, 20% directional confidence, and lift of at least 1.2. No co-purchase relationship or discount is inferred from same-day sales." if basket_count else "Add the same bill or transaction ID to every product line in a sale. Sales without bill IDs are excluded because same-day sales do not prove a shared basket."}


@app.post("/api/products/{product_id}/stock-adjustments", status_code=status.HTTP_201_CREATED)
def adjust_product_stock(product_id: int, payload: StockAdjustmentCreate, db: Session = Depends(get_db)):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(404, "Product not found")
    reason = payload.reason.strip()
    if not reason:
        raise HTTPException(422, "Choose a reason for the stock change")
    new_stock = product.stock + payload.change_units
    if new_stock < 0:
        raise HTTPException(422, f"Stock adjustment would make inventory negative (current stock: {product.stock})")
    movement = StockAdjustment(product_id=product.id, change_units=payload.change_units,
                               stock_after=new_stock, reason=reason)
    product.stock = new_stock
    db.add(movement)
    db.commit()
    db.refresh(movement)
    return {"id": movement.id, "product_id": product.id, "product": product.name,
            "change_units": movement.change_units, "stock_after": movement.stock_after,
            "reason": movement.reason, "created_at": movement.created_at.isoformat(),
            "message": f"Stock updated by {movement.change_units:+d}; new stock is {movement.stock_after}."}


@app.get("/api/stock-adjustments")
def list_stock_adjustments(limit: int = Query(default=12, ge=1, le=100), db: Session = Depends(get_db)):
    rows = db.query(StockAdjustment).order_by(StockAdjustment.created_at.desc(), StockAdjustment.id.desc()).limit(limit).all()
    products = {product.id: product.name for product in db.query(Product).all()}
    return {"adjustments": [{"id": row.id, "product_id": row.product_id,
        "product": products.get(row.product_id, "Removed product"),
        "change_units": row.change_units, "stock_after": row.stock_after,
        "reason": row.reason, "created_at": row.created_at.isoformat()} for row in rows]}


@app.get("/api/stockouts")
def list_stockout_events(limit: int = Query(default=100, ge=1, le=1000), db: Session = Depends(get_db)):
    rows = db.query(StockoutEvent).order_by(StockoutEvent.stockout_date.desc(), StockoutEvent.id.desc()).limit(limit).all()
    products = {item.id: item.name.strip() for item in db.query(Product).all()}
    return {"events": [{"id": row.id, "product_id": row.product_id,
        "product": products.get(row.product_id, "Removed product"),
        "date": row.stockout_date.isoformat(), "estimated_lost_units": row.estimated_lost_units,
        "note": row.note} for row in rows]}


@app.post("/api/stockouts", status_code=201)
def log_stockout(payload: StockoutEventCreate, response: Response, db: Session = Depends(get_db)):
    if payload.stockout_date > date.today():
        raise HTTPException(422, "A stockout can only be recorded for today or an earlier date")
    product = db.get(Product, payload.product_id)
    if not product:
        raise HTTPException(404, "Product not found")
    event = db.query(StockoutEvent).filter(
        StockoutEvent.product_id == product.id,
        StockoutEvent.stockout_date == payload.stockout_date,
    ).first()
    created = event is None
    if event is None:
        event = StockoutEvent(product_id=product.id, stockout_date=payload.stockout_date)
        db.add(event)
    else:
        response.status_code = status.HTTP_200_OK
    event.estimated_lost_units = payload.estimated_lost_units
    event.note = payload.note.strip()
    db.commit()
    db.refresh(event)
    return {"id": event.id, "product_id": product.id, "product": product.name.strip(),
            "date": event.stockout_date.isoformat(), "estimated_lost_units": event.estimated_lost_units,
            "created": created,
            "message": "Recorded. The forecaster will exclude this constrained day unless you provide estimated lost units."}


@app.get("/api/products")
def list_products(db: Session = Depends(get_db)):
    return {"products": [ProductResponse.model_validate(p).model_dump() for p in db.query(Product).order_by(Product.name).all()]}


@app.post("/api/products", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(payload: ProductCreate, db: Session = Depends(get_db)):
    values = payload.model_dump()
    if values["manufacturing_date"] and values["expiry_date"] and values["manufacturing_date"] > values["expiry_date"]:
        raise HTTPException(422, "Manufacturing date must be on or before expiry date")
    if values["gst_rate_percent"] is not None and not values["hsn_code"]:
        raise HTTPException(422, "Add the product's HSN code before setting its GST rate")
    values["name"] = " ".join(values["name"].split())
    key = values["name"].casefold()
    if any(" ".join(item.name.split()).casefold() == key for item in db.query(Product).all()):
        raise HTTPException(409, "A product with this name already exists (ignoring case and spaces)")
    product = Product(**values)
    db.add(product)
    try:
        db.commit()
        db.refresh(product)
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "A product with this name already exists")
    return product


@app.put("/api/products/{product_id}", response_model=ProductResponse)
def update_product(product_id: int, payload: ProductUpdate, db: Session = Depends(get_db)):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(404, "Product not found")
    values = payload.model_dump(exclude_unset=True)
    proposed_mfg = values.get("manufacturing_date", product.manufacturing_date)
    proposed_expiry = values.get("expiry_date", product.expiry_date)
    if proposed_mfg and proposed_expiry and proposed_mfg > proposed_expiry:
        raise HTTPException(422, "Manufacturing date must be on or before expiry date")
    tax_fields_changed = (("gst_rate_percent" in values and values["gst_rate_percent"] != product.gst_rate_percent)
                         or ("hsn_code" in values and values["hsn_code"] != product.hsn_code))
    if tax_fields_changed and values.get("gst_rate_percent", product.gst_rate_percent) is not None and not values.get("hsn_code", product.hsn_code):
        raise HTTPException(422, "Add the product's HSN code before setting its GST rate")
    if "name" in values and values["name"] is not None:
        values["name"] = " ".join(values["name"].split())
        name_key = values["name"].casefold()
        if any(item.id != product.id and " ".join(item.name.split()).casefold() == name_key for item in db.query(Product).all()):
            raise HTTPException(409, "A product with this name already exists (ignoring case and spaces)")
    for key, value in values.items():
        setattr(product, key, value)
    try:
        db.commit()
        db.refresh(product)
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "A product with this name already exists")
    return product


@app.delete("/api/products/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db)):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(404, "Product not found")
    sales_count = db.query(SalesRecord).filter(SalesRecord.product_name == product.name).count()
    stockout_count = db.query(StockoutEvent).filter(StockoutEvent.product_id == product.id).count()
    adjustment_count = db.query(StockAdjustment).filter(StockAdjustment.product_id == product.id).count()
    if sales_count or stockout_count or adjustment_count:
        raise HTTPException(409, "This product has sales, stockout, or stock adjustment history and cannot be deleted")
    db.delete(product)
    db.commit()
    return {"deleted": product_id}


@app.get("/api/sales", response_model=list[SalesRecordResponse])
def list_sales(product_name: str | None = None, limit: int = Query(default=500, ge=1, le=5000), db: Session = Depends(get_db)):
    query = db.query(SalesRecord)
    if product_name:
        query = query.filter(SalesRecord.product_name == product_name)
    return query.order_by(SalesRecord.sale_date.desc(), SalesRecord.id.desc()).limit(limit).all()


@app.post("/api/sales", response_model=SalesRecordResponse, status_code=201)
def create_sale(payload: SalesRecordCreate, db: Session = Depends(get_db)):
    requested_name = payload.product_name.strip()
    normalized_name = " ".join(payload.product_name.split()).casefold()
    products = db.query(Product).order_by(Product.id).all()
    product = next((item for item in products if item.name.strip() == requested_name), None)
    if not product:
        product = next((item for item in products
                        if " ".join(item.name.split()).casefold() == normalized_name), None)
    if not product:
        raise HTTPException(404, "Add this product to inventory before recording sales")
    sale = SalesRecord(**payload.model_dump() | {"product_name": product.name,
                                                   "transaction_id": (payload.transaction_id or "").strip() or None})
    db.add(sale)
    db.commit()
    db.refresh(sale)
    return sale


@app.post("/api/sales/bulk", status_code=201)
def bulk_sales(payload: SalesBulkUpload, response: Response, db: Session = Depends(get_db)):
    if not payload.records or len(payload.records) > 5000:
        raise HTTPException(400, "Upload between 1 and 5000 sales rows")
    def normalize_name(value: str) -> str:
        return " ".join(value.split()).casefold()

    normalized_records = [
        {"sale_date": r.sale_date.isoformat(), "product_name": r.product_name.strip(),
         "quantity": r.quantity, "price": round(float(r.price), 4),
         "transaction_id": (r.transaction_id or "").strip() or None}
        for r in payload.records
    ]
    fingerprint_rows = [{**row, "product_name": normalize_name(row["product_name"])} for row in normalized_records]
    canonical = sorted(fingerprint_rows, key=lambda row: (row["sale_date"], row["product_name"], row["quantity"], row["price"], row["transaction_id"] or ""))
    fingerprint = hashlib.sha256(json.dumps(canonical, ensure_ascii=False, separators=(",", ":")).encode("utf-8")).hexdigest()
    previous = db.query(SalesImport).filter(SalesImport.fingerprint == fingerprint).first()
    if previous:
        response.status_code = status.HTTP_200_OK
        return {"records_added": 0, "products_added": [], "products_matched": 0,
                "already_imported": True, "message": "This exact sales file has already been imported."}

    # Match case/whitespace variants to existing items without rewriting their
    # IDs, inventory, prices, or saved sales history.
    products = db.query(Product).order_by(Product.id).all()
    by_name = {}
    for item in products:
        key = normalize_name(item.name)
        if key:
            by_name.setdefault(key, item.name)
    names_in_file = {normalize_name(row["product_name"]): row["product_name"] for row in normalized_records}
    grouped_missing = {}
    for row in normalized_records:
        key = normalize_name(row["product_name"])
        if not key:
            raise HTTPException(422, "Product names cannot be blank")
        if key not in by_name:
            grouped_missing.setdefault(key, []).append(row)

    created_products = []
    for key, records in grouped_missing.items():
        quantities = sum(row["quantity"] for row in records)
        first_day = min(date.fromisoformat(row["sale_date"]) for row in records)
        last_day = max(date.fromisoformat(row["sale_date"]) for row in records)
        span_days = (last_day - first_day).days + 1
        unit_price = sum(row["quantity"] * row["price"] for row in records) / max(quantities, 1)
        product_name = records[0]["product_name"].strip()
        product = Product(
            name=product_name, stock=0,
            daily_demand=max(0.1, quantities / max(span_days, 1)),
            selling_price=max(0.01, unit_price),
            # The source CSV has no purchase cost. Use a disclosed placeholder
            # that the retailer can edit after import.
            unit_cost=max(0.01, round(unit_price * 0.8, 2)),
            supplier_lead_time_days=3, holding_cost_per_unit_day=0,
        )
        db.add(product)
        by_name[key] = product_name
        created_products.append({"name": product_name, "unit_cost_estimated": True,
                                 "starting_stock": 0, "daily_demand": round(product.daily_demand, 2)})

    try:
        db.flush()
        rows = [
            SalesRecord(product_name=by_name[normalize_name(row["product_name"])],
                        sale_date=date.fromisoformat(row["sale_date"]),
                        quantity=row["quantity"], price=row["price"],
                        transaction_id=(row.get("transaction_id") or "").strip() or None)
            for row in normalized_records
        ]
        db.add_all(rows)
        db.add(SalesImport(fingerprint=fingerprint, records_added=len(rows), products_added=len(created_products)))
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Sales CSV import rolled back")
        raise HTTPException(400, "Sales import failed; no rows were saved")
    return {"records_added": len(rows), "products_added": created_products,
            "products_matched": len(names_in_file) - len(created_products),
            "already_imported": False,
            "message": "New products start at zero stock. Their unit cost is an estimate at 80% of the CSV's weighted average selling price; please review it." if created_products else "CSV products were matched to existing inventory; existing product records were retained."}


@app.post("/api/import/store-csv", status_code=201)
def import_store_csv(payload: StoreCsvImport, response: Response, db: Session = Depends(get_db)):
    """Import product inventory rows and sales rows together from the extended dashboard CSV."""
    if not payload.products and not payload.sales:
        raise HTTPException(400, "The CSV must include at least one product or sale row")

    def normalize_name(value: str) -> str:
        return " ".join(value.split()).casefold()

    product_inputs = []
    seen_product_names = set()
    for item in payload.products:
        name = " ".join(item.name.split())
        key = normalize_name(name)
        if not key or key in seen_product_names:
            raise HTTPException(422, f"Duplicate or blank product row: {name or '(blank)'}")
        seen_product_names.add(key)
        values = item.model_dump(exclude={"name", "inventory_since"}, exclude_none=True)
        if values.get("manufacturing_date") and values.get("expiry_date") and values["manufacturing_date"] > values["expiry_date"]:
            raise HTTPException(422, f"Manufacturing date must be on or before expiry date for {name}")
        if values.get("gst_rate_percent") is not None and not values.get("hsn_code"):
            raise HTTPException(422, f"Add an HSN code before setting the GST rate for {name}")
        product_inputs.append({"name": name, "key": key, "inventory_since": item.inventory_since, "values": values})

    sales_inputs = [{"sale_date": row.sale_date.isoformat(), "product_name": " ".join(row.product_name.split()),
                     "quantity": row.quantity, "price": round(float(row.price), 4),
                     "transaction_id": (row.transaction_id or "").strip() or None}
                    for row in payload.sales]
    canonical_products = [{"name": row["key"], "inventory_since": row["inventory_since"].isoformat() if row["inventory_since"] else None,
                          **{key: value.isoformat() if hasattr(value, "isoformat") else value for key, value in row["values"].items()}}
                         for row in product_inputs]
    canonical = {"products": sorted(canonical_products, key=lambda row: row["name"]),
                 "sales": sorted([{**row, "product_name": normalize_name(row["product_name"])} for row in sales_inputs],
                                 key=lambda row: (row["sale_date"], row["product_name"], row["quantity"], row["price"], row["transaction_id"] or ""))}
    fingerprint = hashlib.sha256(json.dumps(canonical, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")).hexdigest()
    previous = db.query(SalesImport).filter(SalesImport.fingerprint == fingerprint).first()
    if previous:
        response.status_code = status.HTTP_200_OK
        return {"already_imported": True, "records_added": 0, "products_added": [], "products_updated": [],
                "stock_changes": 0, "message": "This exact store CSV has already been imported."}

    products = db.query(Product).order_by(Product.id).all()
    by_name = {normalize_name(product.name): product for product in products}
    created_products, updated_products, stock_changes = [], [], 0
    try:
        # Product rows are explicit inventory updates. Blank columns are ignored,
        # so optional CSV fields never erase saved product details.
        for item in product_inputs:
            product = by_name.get(item["key"])
            values = item["values"]
            if product is None:
                if values.get("selling_price") is None or values.get("unit_cost") is None:
                    raise HTTPException(422, f"New product {item['name']} needs selling_price and unit_cost")
                opening_stock = values.pop("stock", 0)
                product = Product(name=item["name"], stock=0, daily_demand=values.pop("daily_demand", 1),
                                  selling_price=values.pop("selling_price"), unit_cost=values.pop("unit_cost"),
                                  created_at=datetime.combine(item["inventory_since"], datetime.min.time()) if item["inventory_since"] else datetime.utcnow(),
                                  **values)
                db.add(product)
                db.flush()
                by_name[item["key"]] = product
                created_products.append({"name": product.name, "starting_stock": opening_stock})
                if opening_stock:
                    product.stock = opening_stock
                    db.add(StockAdjustment(product_id=product.id, change_units=opening_stock,
                        stock_after=opening_stock, reason="Opening inventory from CSV"))
                    stock_changes += 1
            else:
                proposed_mfg = values.get("manufacturing_date", product.manufacturing_date)
                proposed_expiry = values.get("expiry_date", product.expiry_date)
                if proposed_mfg and proposed_expiry and proposed_mfg > proposed_expiry:
                    raise HTTPException(422, f"Manufacturing date must be on or before expiry date for {item['name']}")
                proposed_hsn = values.get("hsn_code", product.hsn_code)
                proposed_rate = values.get("gst_rate_percent", product.gst_rate_percent)
                tax_changed = (("gst_rate_percent" in values and values["gst_rate_percent"] != product.gst_rate_percent)
                               or ("hsn_code" in values and values["hsn_code"] != product.hsn_code))
                if tax_changed and proposed_rate is not None and not proposed_hsn:
                    raise HTTPException(422, f"Add an HSN code before setting the GST rate for {item['name']}")
                old_stock = product.stock
                for field, value in values.items():
                    setattr(product, field, value)
                delta = product.stock - old_stock if "stock" in values else 0
                if delta:
                    db.add(StockAdjustment(product_id=product.id, change_units=delta,
                        stock_after=product.stock, reason="Stock update from CSV"))
                    stock_changes += 1
                updated_products.append(product.name)

        grouped_missing = {}
        for row in sales_inputs:
            key = normalize_name(row["product_name"])
            if not key:
                raise HTTPException(422, "Sales product names cannot be blank")
            if key not in by_name:
                grouped_missing.setdefault(key, []).append(row)
        for key, records in grouped_missing.items():
            quantities = sum(row["quantity"] for row in records)
            first_day = min(date.fromisoformat(row["sale_date"]) for row in records)
            last_day = max(date.fromisoformat(row["sale_date"]) for row in records)
            span_days = max(1, (last_day - first_day).days + 1)
            average_price = sum(row["quantity"] * row["price"] for row in records) / max(quantities, 1)
            product = Product(name=records[0]["product_name"], stock=0,
                daily_demand=max(0.1, quantities / span_days), selling_price=max(0.01, average_price),
                unit_cost=max(0.01, round(average_price * 0.8, 2)), supplier_lead_time_days=3,
                holding_cost_per_unit_day=0)
            db.add(product)
            by_name[key] = product
            created_products.append({"name": product.name, "starting_stock": 0, "unit_cost_estimated": True})

        db.flush()
        sales_rows = [SalesRecord(product_name=by_name[normalize_name(row["product_name"])].name,
            sale_date=date.fromisoformat(row["sale_date"]), quantity=row["quantity"], price=row["price"],
            transaction_id=row["transaction_id"]) for row in sales_inputs]
        db.add_all(sales_rows)
        db.add(SalesImport(fingerprint=fingerprint, records_added=len(sales_rows), products_added=len(created_products)))
        db.commit()
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        logger.exception("Store CSV import rolled back")
        raise HTTPException(400, "Store CSV import failed; no rows were saved")
    imported_names = {row["key"] for row in product_inputs} | {normalize_name(row["product_name"]) for row in sales_inputs}
    created_keys = {normalize_name(row["name"]) for row in created_products}
    matched_count = len(imported_names - created_keys)
    return {"already_imported": False, "records_added": len(sales_rows),
            "products_added": created_products, "products_updated": updated_products,
            "products_matched": matched_count, "stock_changes": stock_changes,
            "message": "Product inventory, sales, expiry details, and bill references were imported. Dashboard insights have been refreshed."}


@app.get("/api/forecast/{product_id}")
def forecast(product_id: int, days: int = Query(default=14, ge=7, le=30), temperature_c: float | None = Query(default=None, ge=-20, le=60), rain_mm: float | None = Query(default=None, ge=0, le=500), competitor_price: float | None = Query(default=None, gt=0, le=10_000_000), db: Session = Depends(get_db)):
    if days not in (7, 14, 30):
        raise HTTPException(422, "days must be 7, 14, or 30")
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(404, "Product not found")
    products = db.query(Product).order_by(Product.id).all()
    history = db.query(SalesRecord).order_by(SalesRecord.sale_date).all()
    stockouts = db.query(StockoutEvent).all()
    result = build_forecast(product, [row for row in history if row.product_name == product.name], days, temperature_c, rain_mm)
    history_weather, forecast_weather = {}, {}
    location = db.get(StoreWeatherLocation, 1)
    if location:
        try:
            history_weather = {date.fromisoformat(key): value for key, value in get_weather_history(location.latitude, location.longitude).items()}
            weather_now = get_weather(location.latitude, location.longitude)
            forecast_weather = {date.fromisoformat(row["date"]): row for row in weather_now.get("forecast", [])}
        except Exception as exc:
            logger.info("Weather features skipped for forecast: %s", exc)
    ml_bundle = fit_demand_model(history, products, stockouts, history_weather)
    ml = evaluate_and_forecast(history, products, product, days, stockouts=stockouts, model_bundle=ml_bundle,
                               weather_by_date=history_weather, forecast_weather_by_date=forecast_weather)
    if ml["available"]:
        baseline_daily = max(result["daily_average"], 0.1)
        result["forecast"] = ml["forecast"]
        result["total_demand"] = round(sum(point["units"] for point in ml["forecast"]), 2)
        result["daily_average"] = round(result["total_demand"] / days, 2)
        lead = result["supplier_lead_time_days"]
        target = __import__("math").ceil(result["total_demand"] * 1.1 + result["daily_average"] * lead)
        result["recommended_replenishment"] = max(0, target - int(product.stock))
        cover = int(product.stock) / max(result["daily_average"], 0.1)
        stock_score = min(100, max(0, round(100 * (1 - cover / max(days + lead, 1)))))
        excess = max(0, int(product.stock) - target)
        result["stock_risk"].update({"score": stock_score, "level": "high" if stock_score >= 70 else ("medium" if stock_score >= 35 else "low"), "days_of_cover": round(cover, 1)})
        overstock_score = min(100, max(0, round(100 * excess / max(target, 1))))
        result["overstock_risk"].update({"score": overstock_score, "level": "high" if overstock_score >= 50 else ("medium" if overstock_score >= 20 else "low"), "excess_units": excess})
        result["holding_cost"]["estimated_excess_cost_over_horizon"] = round(excess * result["holding_cost"]["per_unit_per_day"] * days, 2)
        price_shift = min(0.08, max(-0.05, (result["daily_average"] / baseline_daily - 1) * 0.35))
        result["pricing"]["suggested_price"] = round(max(product.unit_cost * 1.05, product.selling_price * (1 + price_shift)), 2)
        if ml["stockout_days_adjusted"]:
            result["explanation"].append(f"{ml['stockout_days_adjusted']} reported stockout days were corrected or excluded to avoid learning artificially low demand.")
        result["confidence"] = "medium" if ml["evaluation"]["beats_mean_baseline"] else "low"
        weather_note = "; aligned historical and forecast weather features included" if ml.get("weather_features_enabled") else "; weather excluded because fewer than 30 aligned weather-sales days are available"
        result["method"] = f"{ml['model']} selected by strict chronological holdout against seasonal baselines; calendar, festival, season, weekday, and sales-lag features{weather_note}"
    else:
        result["method"] = "Explainable seasonal baseline; ML activates when sufficient sales history is available"
    _with_inventory_risk(result, product, history, competitor_price)
    result["model"] = {key: value for key, value in ml.items() if key != "forecast"}
    return result


@app.get("/api/forecasting/evaluation")
def forecast_model_evaluation(db: Session = Depends(get_db)):
    """Train/evaluate each product model on a chronological holdout."""
    products = db.query(Product).order_by(Product.id).all()
    sales = db.query(SalesRecord).order_by(SalesRecord.sale_date).all()
    stockouts = db.query(StockoutEvent).all()
    model = fit_demand_model(sales, products, stockouts)
    evaluations = [
        {"product_id": product.id, "product": product.name,
         **{key: value for key, value in evaluate_and_forecast(sales, products, product, 7, stockouts=stockouts, model_bundle=model).items() if key != "forecast"}}
        for product in products
    ]
    available = [row["evaluation"] for row in evaluations if row["available"]]
    return {"model": model["model"], "products": evaluations,
            "trained_products": len(available), "total_products": len(products),
            "note": "Metrics use a chronological holdout. Sparse product histories use the explainable seasonal baseline."}


@app.get("/api/insights")
def insights(db: Session = Depends(get_db)):
    data = []
    all_sales = db.query(SalesRecord).order_by(SalesRecord.sale_date).all()
    for product in db.query(Product).order_by(Product.name):
        sales = [row for row in all_sales if row.product_name == product.name]
        data.append(_with_inventory_risk(build_forecast(product, sales, 14), product, sales))
    return {"insights": data}


app.mount("/static", StaticFiles(directory=WEB), name="static")
