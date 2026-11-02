"""Lightweight, explainable retail demand estimates.

The estimator uses observed product sales when available and falls back to the
product's configured daily demand. Seasonal, recent trend, festival and
optional weather effects are bounded heuristics, not claims of trained ML.
"""
from collections import defaultdict
from datetime import date, timedelta
from math import ceil


FESTIVALS = {
    (1, 14): ("Makar Sankranti", 1.18),
    (3, 14): ("Holi", 1.20),
    (8, 15): ("Independence Day", 1.08),
    (10, 20): ("Diwali season", 1.30),
    (11, 14): ("Children's Day / festive season", 1.12),
    (12, 25): ("Christmas", 1.16),
}


def _festival_effect(day: date):
    for (month, festival_day), (name, uplift) in FESTIVALS.items():
        if month == day.month and abs(day.day - festival_day) <= 7:
            return name, uplift
    return None, 1.0


def _seasonal_context(day: date):
    """Broad India calendar context; the factor stays deliberately modest."""
    if day.month in (3, 4, 5, 6):
        return "Summer", 1.03
    if day.month in (7, 8, 9):
        return "Monsoon", 0.98
    if day.month in (10, 11):
        return "Festive season", 1.04
    return "Winter", 1.0


def build_forecast(product, sales, days=14, temperature_c=None, rain_mm=None):
    today = date.today()
    # A sales record is a transaction, not necessarily a full day's demand.
    # Aggregate transactions by date before calculating daily baselines.
    sales_by_day = defaultdict(int)
    for row in sales:
        sales_by_day[row.sale_date] += max(0, int(row.quantity))
    quantities = [sales_by_day[day] for day in sorted(sales_by_day)]
    reasons = []
    if quantities:
        recent = quantities[-min(14, len(quantities)):]
        baseline = sum(quantities) / len(quantities)
        recent_daily = sum(recent) / min(14, len(recent))
        daily = max(0.1, baseline * 0.55 + recent_daily * 0.45)
        reasons.append(f"Recent sales average {recent_daily:.1f} units/day")
        if len(quantities) < 14:
            reasons.append("Limited sales history; forecast confidence is lower")
    else:
        daily = max(0.1, float(product.daily_demand))
        reasons.append("No recorded sales yet; using the configured daily-demand estimate")

    # Infer monthly pattern only when at least four distinct months are present.
    month_totals = defaultdict(list)
    for sale_day, quantity in sales_by_day.items():
        month_totals[sale_day.month].append(quantity)
    seasonality = 1.0
    if len(month_totals) >= 4:
        current_month_avg = sum(month_totals.get(today.month, [])) / max(1, len(month_totals.get(today.month, [])))
        all_avg = sum(quantities) / max(1, len(quantities))
        if current_month_avg:
            seasonality = min(1.3, max(0.75, current_month_avg / max(all_avg, 0.1)))
            if abs(seasonality - 1) > 0.04:
                reasons.append(f"Historical {today.strftime('%B')} sales suggest a {round((seasonality-1)*100):+d}% seasonal adjustment")

    forecast = []
    festival_names = set()
    seasons = set()
    weather_factor = 1.0
    if temperature_c is not None:
        weather_factor *= 1.08 if temperature_c >= 32 else (0.95 if temperature_c <= 10 else 1.0)
    if rain_mm is not None and rain_mm >= 10:
        weather_factor *= 0.94
    if temperature_c is not None or rain_mm is not None:
        reasons.append("Weather adjustment is a small heuristic from the supplied conditions")

    for offset in range(1, days + 1):
        day = today + timedelta(days=offset)
        festival, factor = _festival_effect(day)
        season, season_factor = _seasonal_context(day)
        seasons.add(season)
        if festival:
            festival_names.add(festival)
        # Forecast uses bounded weekly pattern learned from observed weekday totals.
        weekday_rows = [quantity for sale_day, quantity in sales_by_day.items() if sale_day.weekday() == day.weekday()]
        weekday_factor = 1.0
        if len(weekday_rows) >= 3 and quantities:
            weekday_avg = sum(weekday_rows) / len(weekday_rows)
            weekday_factor = min(1.25, max(0.8, weekday_avg / max(sum(quantities) / len(quantities), 0.1)))
        forecast.append({"date": day.isoformat(), "units": round(daily * seasonality * season_factor * factor * weather_factor * weekday_factor, 2)})

    if festival_names:
        reasons.append("Festival calendar uplift: " + ", ".join(sorted(festival_names)))
    total = sum(point["units"] for point in forecast)
    cover_days = float(product.stock) / max(daily, 0.1)
    lead_time = max(0, int(getattr(product, "supplier_lead_time_days", 3) or 0))
    holding_cost_per_unit_day = max(0.0, float(getattr(product, "holding_cost_per_unit_day", 0) or 0))
    target_stock = ceil(total * 1.1 + daily * lead_time)
    stockout_risk = min(100, max(0, round(100 * (1 - cover_days / max(days + lead_time, 1)))))
    overstock_risk = min(100, max(0, round(100 * (int(product.stock) - target_stock) / max(target_stock, 1))))
    risk_level = "high" if stockout_risk >= 70 else ("medium" if stockout_risk >= 35 else "low")
    recommended_stock = max(0, target_stock - int(product.stock))
    reasons.append(f"Supplier lead time is {lead_time} days; reorder target includes demand during delivery")
    if cover_days < 7:
        risk_reasons = [f"Current stock covers about {cover_days:.1f} days at estimated demand"]
    else:
        risk_reasons = [f"Current stock covers about {cover_days:.1f} days at estimated demand"]

    margin = (product.selling_price - product.unit_cost) / max(product.selling_price, 0.01)
    demand_uplift = (total / days) / max(daily, 0.1)
    price_change = min(0.08, max(-0.05, (demand_uplift - 1) * 0.35))
    suggested_price = round(max(product.unit_cost * 1.05, product.selling_price * (1 + price_change)), 2)
    return {
        "product_id": product.id,
        "product": product.name,
        "horizon_days": days,
        "daily_average": round(total / days, 2),
        "total_demand": round(total, 2),
        "forecast": forecast,
        "festival_events": sorted(festival_names),
        "seasonal_context": sorted(seasons),
        "weather": {"temperature_c": temperature_c, "rain_mm": rain_mm, "adjustment": round(weather_factor, 2)},
        "stock_risk": {"score": stockout_risk, "level": risk_level, "days_of_cover": round(cover_days, 1), "reasons": risk_reasons},
        "overstock_risk": {"score": overstock_risk, "level": "high" if overstock_risk >= 50 else ("medium" if overstock_risk >= 20 else "low"), "excess_units": max(0, int(product.stock) - target_stock)},
        "recommended_replenishment": recommended_stock,
        "supplier_lead_time_days": lead_time,
        "holding_cost": {
            "per_unit_per_day": round(holding_cost_per_unit_day, 2),
            "current_inventory_per_day": round(int(product.stock) * holding_cost_per_unit_day, 2),
            "estimated_excess_cost_over_horizon": round(max(0, int(product.stock) - target_stock) * holding_cost_per_unit_day * days, 2),
            "currency": "INR",
        },
        "pricing": {"current_price": product.selling_price, "suggested_price": suggested_price, "gross_margin": round(margin * 100, 1)},
        "explanation": reasons,
        "confidence": "medium" if len(quantities) >= 30 else ("low" if len(quantities) < 14 else "medium"),
        "method": "bounded seasonal and recent-sales heuristic; not a trained ML model",
    }
