import unittest
from datetime import date
from unittest.mock import patch

from app import weather
from app.fresh_app import weather_dashboard
from app.models import StoreWeatherLocation


class Product:
    def __init__(self, product_id=1, name="Ice cream", sensitivity="hot", daily_demand=4, lead=3, stock=2):
        self.id = product_id
        self.name = name
        self.weather_sensitivity = sensitivity
        self.daily_demand = daily_demand
        self.supplier_lead_time_days = lead
        self.stock = stock


class Sale:
    def __init__(self, day, quantity):
        self.product_name = "Ice cream"
        self.sale_date = day
        self.quantity = quantity


class WeatherTests(unittest.TestCase):
    def setUp(self):
        weather._cache.clear()

    def test_location_not_found(self):
        with patch.object(weather, "_get_json", return_value={"results": []}):
            self.assertIsNone(weather.geocode("No Such Retail City"))

    def test_provider_failure_is_propagated_for_route_fallback(self):
        with patch.object(weather, "_get_json", side_effect=TimeoutError("offline")):
            with self.assertRaises(TimeoutError):
                weather.get_weather(18.5, 73.8)

    def test_weather_api_fallback_keeps_dashboard_available(self):
        class FakeDB:
            def get(self, model, row_id):
                return StoreWeatherLocation(id=1, city="Pune", latitude=18.5, longitude=73.8)
        with patch("app.fresh_app.get_weather", side_effect=TimeoutError("offline")):
            response = weather_dashboard(FakeDB())
        self.assertFalse(response["available"])
        self.assertEqual(response["forecast"], [])
        self.assertIn("unavailable", response["message"])

    def test_unconfigured_location_api_returns_explicit_empty_state(self):
        class FakeDB:
            def get(self, model, row_id):
                return None
        response = weather_dashboard(FakeDB())
        self.assertFalse(response["configured"])
        self.assertIsNone(response["current"])

    def test_weather_response_is_cached(self):
        payload = {"timezone": "Asia/Kolkata", "current": {"time": "2026-11-02T12:00", "temperature_2m": 34,
            "relative_humidity_2m": 55, "precipitation": 0, "rain": 0, "weather_code": 0},
            "daily": {"time": ["2026-11-03"], "weather_code": [0], "temperature_2m_max": [35],
                "temperature_2m_min": [24], "precipitation_sum": [0], "precipitation_probability_max": [0]},
            "hourly": {"time": ["2026-11-03T01:00"], "relative_humidity_2m": [50]}}
        with patch.object(weather, "_get_json", return_value=payload) as request:
            first = weather.get_weather(18.5, 73.8)
            second = weather.get_weather(18.5, 73.8)
        self.assertEqual(request.call_count, 1)
        self.assertFalse(first["cached"])
        self.assertTrue(second["cached"])
        self.assertEqual(second["forecast"][0]["humidity_percent"], 50)

    def test_missing_weather_history_uses_labeled_estimate(self):
        forecast = [{"temperature_max_c": 36, "temperature_min_c": 25, "precipitation_mm": 0}]
        rows = weather.build_weather_insights({"available": True, "forecast": forecast}, [Product()], [])
        self.assertEqual(rows[0]["method"], "rule_based_estimate")
        self.assertEqual(rows[0]["confidence"], "low")
        self.assertIn("estimated", rows[0]["impact"])

    def test_historical_weather_sales_comparison_requires_cohorts(self):
        sales, archive = [], {}
        for offset in range(40):
            day = date(2026, 1, 1).fromordinal(date(2026, 1, 1).toordinal() + offset)
            key = day.isoformat()
            is_hot = offset < 20
            archive[key] = {"temperature_max_c": 35 if is_hot else 25, "precipitation_mm": 0, "temperature_min_c": 20}
            sales.append(Sale(day, 8 if is_hot else 4))
        rows = weather.build_weather_insights({"available": True,
            "forecast": [{"temperature_max_c": 36, "temperature_min_c": 25, "precipitation_mm": 0}]},
            [Product()], sales, archive)
        self.assertEqual(rows[0]["method"], "historical_weather_sales")
        self.assertEqual(rows[0]["impact"], "+100.0% sales on matching-weather days vs other days")


if __name__ == "__main__":
    unittest.main()
