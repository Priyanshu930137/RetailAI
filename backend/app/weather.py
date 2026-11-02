"""Open-Meteo client and transparent weather-demand estimates."""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from threading import Lock
from time import monotonic
from urllib.parse import urlencode
from urllib.request import Request, urlopen
import json

SOURCE = "Open-Meteo"
WMO = {0: "Clear", 1: "Mostly clear", 2: "Partly cloudy", 3: "Overcast", 45: "Fog", 48: "Rime fog",
       51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle", 61: "Light rain", 63: "Rain", 65: "Heavy rain",
       71: "Light snow", 73: "Snow", 75: "Heavy snow", 80: "Rain showers", 81: "Showers", 82: "Heavy showers",
       95: "Thunderstorm", 96: "Thunderstorm with hail", 99: "Thunderstorm with hail"}
_cache: dict[str, tuple[float, dict]] = {}
_lock = Lock()


def _get_json(url: str) -> dict:
    request = Request(url, headers={"User-Agent": "RetailAI/1.0"})
    with urlopen(request, timeout=7) as response:
        return json.loads(response.read().decode("utf-8"))


def geocode(city: str) -> dict | None:
    key = "geo:" + city.strip().casefold()
    with _lock:
        item = _cache.get(key)
        if item and monotonic() - item[0] < 86400:
            return item[1]
    query = urlencode({"name": city.strip(), "count": 1, "language": "en", "format": "json"})
    data = _get_json("https://geocoding-api.open-meteo.com/v1/search?" + query)
    results = data.get("results") or []
    result = results[0] if results else None
    if result:
        result = {"city": ", ".join(filter(None, [result.get("name"), result.get("admin1"), result.get("country")])),
                  "latitude": float(result["latitude"]), "longitude": float(result["longitude"]),
                  "timezone": result.get("timezone")}
        with _lock:
            _cache[key] = (monotonic(), result)
    return result


def get_weather(latitude: float, longitude: float) -> dict:
    key = f"weather:{latitude:.4f}:{longitude:.4f}"
    with _lock:
        item = _cache.get(key)
        if item and monotonic() - item[0] < 1800:
            cached = dict(item[1])
            cached["cached"] = True
            return cached
    params = urlencode({"latitude": latitude, "longitude": longitude,
        "current": "temperature_2m,relative_humidity_2m,precipitation,rain,weather_code",
        "hourly": "relative_humidity_2m",
        "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max",
        "forecast_days": 7, "timezone": "auto"})
    raw = _get_json("https://api.open-meteo.com/v1/forecast?" + params)
    current = raw.get("current") or {}
    daily = raw.get("daily") or {}
    hourly = raw.get("hourly") or {}
    humidity_by_day: dict[str, list[float]] = {}
    for stamp, value in zip(hourly.get("time") or [], hourly.get("relative_humidity_2m") or []):
        if value is not None:
            humidity_by_day.setdefault(stamp[:10], []).append(float(value))
    dates = daily.get("time") or []
    forecast = []
    for i, day in enumerate(dates):
        code = (daily.get("weather_code") or [None] * len(dates))[i]
        forecast.append({"date": day, "temperature_max_c": (daily.get("temperature_2m_max") or [None] * len(dates))[i],
            "temperature_min_c": (daily.get("temperature_2m_min") or [None] * len(dates))[i],
            "precipitation_mm": (daily.get("precipitation_sum") or [None] * len(dates))[i],
            "precipitation_probability_percent": (daily.get("precipitation_probability_max") or [None] * len(dates))[i],
            "weather_code": code, "conditions": WMO.get(code, "Unknown"),
            "humidity_percent": round(sum(humidity_by_day.get(day, [])) / len(humidity_by_day[day]), 1) if humidity_by_day.get(day) else None})
    result = {"available": bool(current), "source": SOURCE, "fetched_at": datetime.now(timezone.utc).isoformat(),
        "timezone": raw.get("timezone"), "current": {"time": current.get("time"),
        "temperature_c": current.get("temperature_2m"), "humidity_percent": current.get("relative_humidity_2m"),
        "precipitation_mm": current.get("precipitation"), "rain_mm": current.get("rain"),
        "weather_code": current.get("weather_code"), "conditions": WMO.get(current.get("weather_code"), "Unknown")},
        "forecast": forecast, "cached": False}
    with _lock:
        _cache[key] = (monotonic(), result)
    return result


def get_weather_history(latitude: float, longitude: float, days: int = 365) -> dict[str, dict]:
    """Fetch archived daily weather; returns an empty map when the provider has no data."""
    end = date.today() - timedelta(days=6)  # archive publication is delayed
    start = end - timedelta(days=days - 1)
    key = f"history:{latitude:.4f}:{longitude:.4f}:{start}:{end}"
    with _lock:
        item = _cache.get(key)
        if item and monotonic() - item[0] < 86400:
            return item[1]
    params = urlencode({"latitude": latitude, "longitude": longitude, "start_date": start.isoformat(),
        "end_date": end.isoformat(), "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum",
        "timezone": "auto"})
    raw = _get_json("https://archive-api.open-meteo.com/v1/archive?" + params)
    daily = raw.get("daily") or {}
    result = {}
    for i, day in enumerate(daily.get("time") or []):
        result[day] = {"temperature_max_c": (daily.get("temperature_2m_max") or [None])[i],
                       "temperature_min_c": (daily.get("temperature_2m_min") or [None])[i],
                       "precipitation_mm": (daily.get("precipitation_sum") or [None])[i]}
    with _lock:
        _cache[key] = (monotonic(), result)
    return result


def build_weather_insights(weather: dict, products, sales=(), historical_weather=None) -> list[dict]:
    """Estimate weather opportunities; never imply a causal effect without enough history."""
    if not weather.get("available"):
        return []
    forecast = weather.get("forecast", [])
    if not forecast:
        return []
    peaks = {"hot": max((x.get("temperature_max_c") for x in forecast if x.get("temperature_max_c") is not None), default=None),
             "rain": max((x.get("precipitation_mm") for x in forecast if x.get("precipitation_mm") is not None), default=None),
             "cold": min((x.get("temperature_min_c") for x in forecast if x.get("temperature_min_c") is not None), default=None)}
    triggers = {"hot": peaks["hot"] is not None and peaks["hot"] >= 32,
                "rain": peaks["rain"] is not None and peaks["rain"] >= 8,
                "cold": peaks["cold"] is not None and peaks["cold"] <= 18}
    rows = []
    for product in products:
        category = getattr(product, "weather_sensitivity", "none") or "none"
        if category == "none" or not triggers.get(category):
            continue
        matched = [row for row in sales if row.product_name == product.name]
        historical_weather = historical_weather or {}
        daily_sales: dict[str, int] = {}
        for row in matched:
            key = row.sale_date.isoformat()
            daily_sales[key] = daily_sales.get(key, 0) + int(row.quantity)
        pairs = []
        if daily_sales:
            first_day, last_day = min(daily_sales), max(daily_sales)
            for day, weather_day in historical_weather.items():
                if first_day <= day <= last_day:
                    pairs.append((day, weather_day, daily_sales.get(day, 0)))
        condition = (lambda item: item.get("temperature_max_c") is not None and item["temperature_max_c"] >= 32) if category == "hot" else (
                    lambda item: item.get("precipitation_mm") is not None and item["precipitation_mm"] >= 8) if category == "rain" else (
                    lambda item: item.get("temperature_min_c") is not None and item["temperature_min_c"] <= 18)
        exposed = [units for _, day_weather, units in pairs if condition(day_weather)]
        reference = [units for _, day_weather, units in pairs if not condition(day_weather)]
        historical = len(exposed) >= 10 and len(reference) >= 10
        historical_impact = None
        if historical:
            avg_exposed = sum(exposed) / len(exposed)
            avg_reference = sum(reference) / len(reference)
            if avg_reference > 0:
                historical_impact = round((avg_exposed / avg_reference - 1) * 100, 1)
        message = {"hot": f"Forecast highs reach {peaks['hot']:.0f}°C; consider reviewing chilled-drink/ice demand.",
                   "rain": f"Forecast precipitation reaches {peaks['rain']:.1f} mm/day; check rain-related stock coverage.",
                   "cold": f"Forecast lows reach {peaks['cold']:.0f}°C; review hot-drink demand and replenishment."}[category]
        rows.append({"product_id": product.id, "product": product.name, "sensitivity": category,
            "impact": f"{historical_impact:+.1f}% sales on matching-weather days vs other days" if historical_impact is not None else "Potentially higher; estimated from sensitivity rules",
            "method": "historical_weather_sales" if historical else "rule_based_estimate",
            "confidence": "medium" if historical else "low", "explanation": message,
            "suggested_inventory_review": max(0, int(round(product.daily_demand * max(product.supplier_lead_time_days, 1))) - product.stock)})
    return rows
