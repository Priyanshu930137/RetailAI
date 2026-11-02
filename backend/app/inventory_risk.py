"""Independent, explainable inventory risk and replenishment calculations."""
from __future__ import annotations

from math import ceil, sqrt
from statistics import mean, pstdev


def assess_inventory(product, predicted_daily_demand: float, forecast_units: float,
                     demand_history=(), horizon_days: int = 14,
                     seasonal_context=(), festival_events=(), competitor_price=None) -> dict:
    """Return distinct stockout/overstock scores and an MOQ-aware reorder suggestion.

    Demand history is one value per calendar day; the caller supplies explicit zeros
    between observed dates. With sparse history, configured daily demand is used.
    """
    stock = max(0, int(product.stock))
    lead = max(0, int(getattr(product, "supplier_lead_time_days", 3) or 0))
    minimum_order = max(1, int(getattr(product, "supplier_min_order_quantity", 1) or 1))
    daily = max(0.1, float(predicted_daily_demand or getattr(product, "daily_demand", 1) or 1))
    history = [max(0.0, float(value)) for value in demand_history]
    enough_history = len(history) >= 14
    variability = pstdev(history) if enough_history else daily * 0.35
    # 95% cycle-service approximation for lead-time demand; explicit sparse-history fallback.
    safety_stock = ceil(1.65 * variability * sqrt(max(lead, 1)))
    lead_demand = ceil(daily * lead)
    reorder_point = lead_demand + safety_stock
    cover_days = stock / daily

    shortage = max(0, reorder_point - stock)
    scale = max(reorder_point + safety_stock, daily * max(lead, 1), 1)
    stockout_score = min(100, max(0, round(100 * shortage / scale)))
    if stock == 0 and daily > 0:
        stockout_score = 100
    if stockout_score >= 85:
        stockout_level = "critical"
    elif stockout_score >= 65:
        stockout_level = "high"
    elif stockout_score >= 35:
        stockout_level = "medium"
    else:
        stockout_level = "low"

    forecast_units = max(0.0, float(forecast_units or daily * horizon_days))
    # Holding target is the forecast horizon plus lead-time buffer and safety stock.
    expected_window = max(1, horizon_days + lead)
    expected_window_demand = forecast_units + daily * lead
    overstock_target = ceil(expected_window_demand + safety_stock)
    excess = max(0, stock - overstock_target)
    excess_days = excess / daily
    excess_ratio = excess / max(overstock_target, 1)
    velocity_factor = 1.0 if cover_days > expected_window else 0.55
    cost_per_day = max(0.0, float(getattr(product, "holding_cost_per_unit_day", 0) or 0))
    cost_factor = min(1.25, 1 + (cost_per_day / max(float(getattr(product, "unit_cost", 0) or 0), 1)) * 5)
    overstock_score = min(100, max(0, round(100 * min(1, excess_ratio * 2.5 * velocity_factor * cost_factor))))
    overstock_level = "critical" if overstock_score >= 85 else "high" if overstock_score >= 65 else "medium" if overstock_score >= 35 else "low"

    reorder = stock <= reorder_point
    target_stock = ceil(expected_window_demand + safety_stock)
    quantity = max(0, target_stock - stock) if reorder else 0
    if reorder and quantity:
        quantity = max(minimum_order, quantity)
    reasons = []
    if enough_history:
        if variability > daily * 0.5:
            reasons.append(f"Daily demand varies by about {variability:.1f} units, increasing safety stock.")
        else:
            reasons.append(f"Demand variability is about {variability:.1f} units/day across {len(history)} days.")
    else:
        reasons.append("Sales history is limited; safety stock uses a 35% demand-variability estimate.")
    if stock <= reorder_point:
        reasons.append(f"On-hand stock ({stock}) is at or below the {reorder_point}-unit reorder point ({lead_demand} lead-time demand + {safety_stock} safety stock).")
        if quantity > max(0, target_stock - stock):
            reasons.append(f"Suggested order is rounded up to the supplier minimum of {minimum_order} units.")
    else:
        reasons.append(f"Current stock ({stock}) is above the {reorder_point}-unit reorder point; no reorder is suggested now.")
    if forecast_units > daily * horizon_days * 1.1:
        reasons.append("Forecast demand is above the configured daily-demand baseline.")
    if festival_events:
        reasons.append("A festival window is included in the demand forecast: " + ", ".join(festival_events) + ".")
    if seasonal_context:
        reasons.append("Seasonal forecast context: " + ", ".join(seasonal_context) + ".")

    price = float(product.selling_price)
    unit_cost = float(product.unit_cost)
    min_margin = min(95.0, max(0.0, float(getattr(product, "minimum_gross_margin_percent", 5) or 0)))
    minimum_price = unit_cost / max(1 - min_margin / 100, 0.05)
    baseline_daily = mean(history) if enough_history and mean(history) > 0 else max(0.1, float(getattr(product, "daily_demand", daily) or daily))
    demand_uplift = (forecast_units / max(horizon_days, 1)) / baseline_daily - 1
    inventory_uplift = 0.025 if cover_days <= lead else (-0.025 if cover_days > expected_window else 0)
    context_uplift = max(-0.05, min(0.08, demand_uplift * 0.25 + inventory_uplift))
    suggested_price = max(minimum_price, price * (1 + context_uplift))
    pricing_reasons = [f"Demand context changes the reference price by {context_uplift * 100:+.1f}% before the margin floor."]
    if festival_events:
        pricing_reasons.append("Festival demand is included in forecast context.")
    if seasonal_context:
        pricing_reasons.append("Seasonal demand is included in forecast context.")
    if competitor_price is not None:
        competitor_price = max(0.01, float(competitor_price))
        if competitor_price >= minimum_price:
            suggested_price = min(suggested_price, competitor_price)
            pricing_reasons.append(f"Compared with retailer-entered competitor price ₹{competitor_price:.2f}.")
        else:
            pricing_reasons.append("Competitor price is below the configured minimum-margin price, so the margin floor takes priority.")
    suggested_price = round(suggested_price, 2)
    current_margin = (price - unit_cost) / max(price, 0.01) * 100
    suggested_margin = (suggested_price - unit_cost) / max(suggested_price, 0.01) * 100
    return {
        "stockout_risk": {"score": stockout_score, "level": stockout_level, "days_of_cover": round(cover_days, 1),
            "reorder_point": reorder_point, "safety_stock": safety_stock, "lead_time_demand": lead_demand,
            "demand_variability_units_per_day": round(variability, 2), "confidence": "medium" if enough_history else "low",
            "reasons": reasons[:3]},
        "overstock_risk": {"score": overstock_score, "level": overstock_level, "excess_units": excess,
            "days_of_cover": round(cover_days, 1), "excess_days": round(excess_days, 1),
            "holding_cost_exposure_per_day": round(excess * cost_per_day, 2),
            "reasons": ([f"Stock covers {cover_days:.1f} days against a {expected_window}-day demand window.",
                         f"{excess} units sit above forecast demand plus safety stock; holding exposure is ₹{excess * cost_per_day:.2f}/day."] if excess else ["Current stock does not exceed the forecast demand window plus safety stock."])},
        "reorder_recommendation": {"should_reorder": bool(reorder and quantity), "reorder_point": reorder_point,
            "safety_stock": safety_stock, "suggested_quantity": quantity, "supplier_minimum_quantity": minimum_order,
            "expected_stock_coverage_days": round((stock + quantity) / daily, 1),
            "reason": "Reorder point reached; quantity covers the forecast window and safety buffer, respecting supplier minimums." if reorder and quantity else "Stock remains above the reorder point; review again as sales and forecast change."},
        "pricing": {"current_price": round(price, 2), "suggested_price": suggested_price,
            "minimum_margin_percent": min_margin, "minimum_price": round(minimum_price, 2),
            "current_gross_margin_percent": round(current_margin, 1), "suggested_gross_margin_percent": round(suggested_margin, 1),
            "current_profit_per_unit": round(price - unit_cost, 2), "suggested_profit_per_unit": round(suggested_price - unit_cost, 2),
            "current_horizon_gross_profit": round((price - unit_cost) * forecast_units, 2),
            "suggested_horizon_gross_profit": round((suggested_price - unit_cost) * forecast_units, 2),
            "profit_basis": "Forecast unit demand held constant; no price-elasticity estimate is applied.",
            "competitor_price": competitor_price, "explanation": pricing_reasons,
            "automatic_price_change": False},
    }
