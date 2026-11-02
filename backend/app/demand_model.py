"""Time-aware demand model with seasonal and festival feature engineering.

The model is trained from saved daily sales. It deliberately falls back to the
existing explainable estimate when the store has too little history to validate
a useful model.
"""
from __future__ import annotations

from collections import defaultdict
from datetime import date, timedelta
import math

import numpy as np
from sklearn.ensemble import ExtraTreesRegressor, HistGradientBoostingRegressor, RandomForestRegressor
from sklearn.inspection import permutation_importance
from sklearn.metrics import mean_absolute_error, mean_squared_error

from app.forecasting import FESTIVALS


FEATURES = (
    "product_id", "dow_sin", "dow_cos", "year_sin", "year_cos", "month",
    "is_weekend", "is_festival_window", "festival_uplift", "is_summer",
    "is_monsoon", "is_slow_season", "is_peak_season", "lag_1", "lag_7", "mean_7",
    "mean_28", "mean_56", "lag_14", "lag_28", "median_28",
    "std_28", "trend_7_vs_28", "same_weekday_mean", "weather_max_temp_c",
    "weather_precipitation_mm", "weather_data_available",
)


def _calendar(day: date) -> tuple[bool, float]:
    matches = [uplift for (month, festival_day), (_, uplift) in FESTIVALS.items()
               if month == day.month and abs(day.day - festival_day) <= 7]
    return bool(matches), max(matches, default=1.0)


def _features(product_id: int, day: date, history: list[float], weather_by_date=None) -> list[float]:
    festival, uplift = _calendar(day)
    year_phase = 2 * math.pi * day.timetuple().tm_yday / 365.25
    weekday_phase = 2 * math.pi * day.weekday() / 7
    def mean(n: int) -> float:
        values = history[-n:]
        return float(np.mean(values)) if values else 0.0
    week_day_sales = [history[-lag] for lag in (7, 14, 21, 28) if len(history) >= lag]
    recent = history[-28:]
    return [float(product_id), math.sin(weekday_phase), math.cos(weekday_phase),
            math.sin(year_phase), math.cos(year_phase), float(day.month),
            float(day.weekday() >= 5), float(festival), uplift,
            float(day.month in (3, 4, 5, 6)), float(day.month in (7, 8, 9)),
            float(day.month in (1, 2, 7, 8, 9)), float(day.month in (10, 11, 12)),
            history[-1] if history else 0.0,
            history[-7] if len(history) >= 7 else mean(7),
            mean(7), mean(28), mean(56),
            history[-14] if len(history) >= 14 else mean(14),
            history[-28] if len(history) >= 28 else mean(28),
            float(np.median(recent)) if recent else 0.0,
            float(np.std(recent)) if recent else 0.0,
            mean(7) - mean(28),
            float(np.mean(week_day_sales)) if week_day_sales else mean(28),
            float((weather_by_date or {}).get(day, {}).get("temperature_max_c") or 0),
            float((weather_by_date or {}).get(day, {}).get("precipitation_mm") or 0),
            float(day in (weather_by_date or {}))]


def prepare_training_data(sales, product_ids: dict[str, int], stockouts=(), weather_by_date=None):
    """Aggregate sales into demand days; censor unestimated stockout labels."""
    by_product: dict[str, dict[date, int]] = defaultdict(lambda: defaultdict(int))
    for row in sales:
        by_product[row.product_name][row.sale_date] += max(0, int(row.quantity))
    names_by_id = {product_id: name for name, product_id in product_ids.items()}
    stockout_map = {}
    for event in stockouts:
        name = names_by_id.get(event.product_id)
        if name:
            stockout_map[(name, event.stockout_date)] = event.estimated_lost_units
    stockout_days_by_name: dict[str, list[date]] = defaultdict(list)
    for (name, stockout_day) in stockout_map:
        stockout_days_by_name[name].append(stockout_day)
    rows, targets, dates = [], [], []
    recorded_targets = 0
    for name, daily_sales in by_product.items():
        if name not in product_ids or not daily_sales:
            continue
        timeline = list(daily_sales) + stockout_days_by_name.get(name, [])
        first, last = min(timeline), max(timeline)
        history: list[float] = []
        current = first
        while current <= last:
            feature = _features(product_ids[name], current, history, weather_by_date)
            sales_units = float(daily_sales.get(current, 0))
            key = (name, current)
            if key in stockout_map and stockout_map[key] is None:
                # Don't teach the model that a constrained day was ordinary
                # low demand. Impute only the lag history; omit its target.
                history.append(float(np.mean(history[-7:])) if history else 0.0)
            else:
                lost_units = float(stockout_map[key] or 0) if key in stockout_map else 0.0
                target = sales_units + lost_units
                rows.append(feature)
                targets.append(target)
                dates.append(current)
                recorded_targets += int(sales_units > 0 or (key in stockout_map and lost_units > 0))
                history.append(target)
            current += timedelta(days=1)
    return np.asarray(rows, dtype=float), np.asarray(targets, dtype=float), dates, recorded_targets, len(stockout_map)


def fit_demand_model(sales, products, stockouts=(), weather_by_date=None):
    """Choose the most accurate time-validated shared model or seasonal baseline."""
    ids = {item.name: item.id for item in products}
    weather_by_date = weather_by_date or {}
    weather_join_days = {row.sale_date for row in sales if row.sale_date in weather_by_date}
    weather_enabled = len(weather_join_days) >= 30
    if not weather_enabled:
        weather_by_date = {}
    x, y, dates, recorded_rows, adjusted_stockout_days = prepare_training_data(sales, ids, stockouts, weather_by_date)
    result = {"available": False, "model": "SeasonalMeanBaseline", "training_rows": int(len(y)),
              "evaluation": None, "feature_importance": [], "reason": None,
              "stockout_days_adjusted": adjusted_stockout_days, "fitted_model": None,
              "weather_features_enabled": weather_enabled}
    if len(y) < 60 or recorded_rows < 30 or len(set(dates)) < 14:
        result["reason"] = "At least 30 recorded product-days, 60 usable training rows, and 14 distinct dates are required."
        return result
    unique_dates = sorted(set(dates))
    split_at = max(1, min(len(unique_dates) - 1, int(len(unique_dates) * .8)))
    holdout_start = unique_dates[split_at]
    train_ix = np.asarray([i for i, day in enumerate(dates) if day < holdout_start], dtype=int)
    test_ix = np.asarray([i for i, day in enumerate(dates) if day >= holdout_start], dtype=int)
    if len(test_ix) < 5 or len(train_ix) < 10:
        result["reason"] = "There are too few chronological holdout rows to evaluate the model."
        return result

    def seasonal_baseline(features):
        return np.maximum(0, features[:, FEATURES.index("mean_7")])

    seasonal_pred = seasonal_baseline(x[test_ix])
    seasonal_mae = float(mean_absolute_error(y[test_ix], seasonal_pred))
    mean_pred = np.repeat(float(np.mean(y[train_ix])), len(test_ix))
    mean_mae = float(mean_absolute_error(y[test_ix], mean_pred))
    factories = [
        ("RandomForestRegressor", lambda: RandomForestRegressor(n_estimators=180, min_samples_leaf=2,
            max_features=0.9, random_state=42, n_jobs=1)),
        ("ExtraTreesRegressor", lambda: ExtraTreesRegressor(n_estimators=180, min_samples_leaf=2,
            max_features=0.9, random_state=42, n_jobs=1)),
        ("HistGradientBoostingRegressor", lambda: HistGradientBoostingRegressor(max_iter=140,
            max_leaf_nodes=15, l2_regularization=2.0, learning_rate=0.06, random_state=42)),
    ]
    winner_name = "SevenDaySeasonalBaseline"
    winner_factory = None
    winner_mae = seasonal_mae
    winner_eval_model = None
    for name, factory in factories:
        candidate = factory().fit(x[train_ix], y[train_ix])
        prediction = np.maximum(0, candidate.predict(x[test_ix]))
        candidate_mae = float(mean_absolute_error(y[test_ix], prediction))
        if candidate_mae < winner_mae:
            winner_name, winner_factory, winner_mae = name, factory, candidate_mae
            winner_eval_model = candidate

    predicted = seasonal_pred if winner_factory is None else np.maximum(0, winner_eval_model.predict(x[test_ix]))
    actual = y[test_ix]
    rmse = float(math.sqrt(mean_squared_error(actual, predicted)))
    denom = float(np.sum(np.abs(actual)))
    wape = float(np.sum(np.abs(actual - predicted)) / denom * 100) if denom else None
    if winner_factory is None:
        fitted = None
        importance = []
    else:
        fitted = winner_factory().fit(x, y)
        raw_importance = getattr(fitted, "feature_importances_", None)
        if raw_importance is None:
            perm = permutation_importance(winner_eval_model, x[test_ix], y[test_ix],
                                          n_repeats=3, random_state=42, n_jobs=1,
                                          scoring="neg_mean_absolute_error")
            raw_importance = np.maximum(0, perm.importances_mean)
        importance = sorted(zip(FEATURES, raw_importance), key=lambda pair: pair[1], reverse=True)
    result.update({"available": True, "model": winner_name, "reason": None, "fitted_model": fitted,
        "evaluation": {"method": "strict chronological 80/20 date holdout", "selected_model": winner_name,
            "mae": round(winner_mae, 3), "rmse": round(rmse, 3),
            "wape_percent": round(wape, 2) if wape is not None else None,
            "baseline_mae": round(seasonal_mae, 3), "mean_baseline_mae": round(mean_mae, 3),
            "beats_mean_baseline": winner_mae < mean_mae, "beats_seven_day_baseline": winner_mae < seasonal_mae,
            "holdout_rows": int(len(test_ix)), "holdout_start": holdout_start.isoformat()},
        "feature_importance": [{"feature": key, "importance": round(float(value), 4)} for key, value in importance[:8]]})
    return result


class _SevenDayMeanModel:
    def predict(self, features):
        return np.maximum(0, np.asarray(features)[:, FEATURES.index("mean_7")])


def evaluate_and_forecast(sales, products, product, days: int, stockouts=(),
                          model_bundle=None, first_forecast_day: date | None = None,
                          weather_by_date=None, forecast_weather_by_date=None):
    """Evaluate a shared store model and recursively forecast one product."""
    ids = {item.name: item.id for item in products}
    result = {"available": False, "model": "SeasonalMeanBaseline", "training_rows": 0,
              "evaluation": None, "feature_importance": [], "forecast": [],
              "stockout_days_adjusted": 0, "reason": None}
    weather_by_date = weather_by_date or {}
    forecast_weather_by_date = forecast_weather_by_date or {}
    bundle = model_bundle or fit_demand_model(sales, products, stockouts, weather_by_date)
    result.update({key: value for key, value in bundle.items() if key != "fitted_model"})
    result["forecast"] = []
    if not bundle["available"] or product.name not in ids:
        return result

    product_days: dict[date, int] = defaultdict(int)
    for row in sales:
        if row.product_name == product.name:
            product_days[row.sale_date] += max(0, int(row.quantity))
    if len(product_days) < 14:
        result["available"] = False
        result["reason"] = "This product needs at least 14 recorded sale dates before the trained model can personalize its forecast."
        return result

    events = {(event.stockout_date): event.estimated_lost_units for event in stockouts
              if event.product_id == product.id}
    history = []
    if product_days or events:
        timeline = list(product_days) + list(events)
        history_start, history_end = min(timeline), max(timeline)
        for index in range((history_end - history_start).days + 1):
            current = history_start + timedelta(days=index)
            actual = float(product_days.get(current, 0))
            if current in events and events[current] is None:
                history.append(float(np.mean(history[-7:])) if history else 0.0)
            else:
                history.append(actual + float(events[current] or 0) if current in events else actual)
    first_day = first_forecast_day or (date.today() + timedelta(days=1))
    points = []
    for offset in range(days):
        target_day = first_day + timedelta(days=offset)
        model = bundle["fitted_model"] or _SevenDayMeanModel()
        weather = forecast_weather_by_date if bundle.get("weather_features_enabled") else None
        prediction = max(0.0, float(model.predict(np.asarray([_features(product.id, target_day, history, weather)]))[0]))
        points.append({"date": target_day.isoformat(), "units": round(prediction, 2)})
        history.append(prediction)
    result.update({"available": True, "forecast": points})
    return result
