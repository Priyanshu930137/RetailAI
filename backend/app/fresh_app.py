"""Clean, single-origin RetailAI application entry point."""
from contextlib import asynccontextmanager
from datetime import date, timedelta
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
from app.models import Product, SalesImport, SalesRecord, StockoutEvent
from app.schemas import FestivalPlanRequest, ProductCreate, ProductResponse, ProductUpdate, SalesBulkUpload, SalesRecordCreate, SalesRecordResponse, StockoutEventCreate

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
        if "holding_cost_per_unit_day" not in existing:
            connection.exec_driver_sql("ALTER TABLE products ADD COLUMN holding_cost_per_unit_day FLOAT NOT NULL DEFAULT 0")
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
    low_stock = sum(1 for item in products if item.stock <= item.daily_demand * 3)
    return {
        "revenue_14d": round(revenue, 2),
        "units_14d": units,
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
        "model_source": "RandomForestRegressor" if used_ml else "Explainable seasonal estimate",
        "model_evaluation": model["evaluation"] if model["available"] else None,
        "stockout_days_adjusted": model["stockout_days_adjusted"],
        "ordered_product_count": len(orders), "items": orders,
        "unfunded_products": [{"product": row["product"], "units": row["unfunded_units"]}
                              for row in candidates if row["unfunded_units"] > 0],
        "note": "Personal festival uplift is learned only when earlier matching calendar windows have enough saved sales. Stock on hand is projected through demand before the event; items with sparse history use the seasonal fallback.",
    }


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
    if sales_count or stockout_count:
        raise HTTPException(409, "This product has sales or stockout history and cannot be deleted")
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
    sale = SalesRecord(**payload.model_dump() | {"product_name": product.name})
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
         "quantity": r.quantity, "price": round(float(r.price), 4)}
        for r in payload.records
    ]
    fingerprint_rows = [{**row, "product_name": normalize_name(row["product_name"])} for row in normalized_records]
    canonical = sorted(fingerprint_rows, key=lambda row: (row["sale_date"], row["product_name"], row["quantity"], row["price"]))
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
                        quantity=row["quantity"], price=row["price"])
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


@app.get("/api/forecast/{product_id}")
def forecast(product_id: int, days: int = Query(default=14, ge=7, le=30), temperature_c: float | None = Query(default=None, ge=-20, le=60), rain_mm: float | None = Query(default=None, ge=0, le=500), db: Session = Depends(get_db)):
    if days not in (7, 14, 30):
        raise HTTPException(422, "days must be 7, 14, or 30")
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(404, "Product not found")
    products = db.query(Product).order_by(Product.id).all()
    history = db.query(SalesRecord).order_by(SalesRecord.sale_date).all()
    stockouts = db.query(StockoutEvent).all()
    result = build_forecast(product, [row for row in history if row.product_name == product.name], days, temperature_c, rain_mm)
    ml = evaluate_and_forecast(history, products, product, days, stockouts=stockouts)
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
        result["explanation"].append(f"Trained random forest used {ml['training_rows']} product-day observations; chronological holdout MAE {ml['evaluation']['mae']} units/day versus {ml['evaluation']['baseline_mae']} for the mean baseline.")
        if ml["stockout_days_adjusted"]:
            result["explanation"].append(f"{ml['stockout_days_adjusted']} reported stockout days were corrected or excluded to avoid learning artificially low demand.")
        result["confidence"] = "medium" if ml["evaluation"]["beats_mean_baseline"] else "low"
        result["method"] = "RandomForestRegressor with calendar, festival, season, weekday, and lag-demand features; chronological holdout evaluation"
    else:
        result["method"] = "Explainable seasonal baseline; ML activates when sufficient sales history is available"
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
    return {"model": "RandomForestRegressor", "products": evaluations,
            "trained_products": len(available), "total_products": len(products),
            "note": "Metrics use a chronological holdout. Sparse product histories use the explainable seasonal baseline."}


@app.get("/api/insights")
def insights(db: Session = Depends(get_db)):
    data = []
    for product in db.query(Product).order_by(Product.name):
        sales = db.query(SalesRecord).filter(SalesRecord.product_name == product.name).order_by(SalesRecord.sale_date).all()
        data.append(build_forecast(product, sales, 14))
    return {"insights": data}


app.mount("/static", StaticFiles(directory=WEB), name="static")
