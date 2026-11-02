import unittest

from app.inventory_risk import assess_inventory


class Product:
    def __init__(self, **kwargs):
        self.stock = kwargs.get("stock", 0)
        self.daily_demand = kwargs.get("daily_demand", 10)
        self.selling_price = kwargs.get("selling_price", 20)
        self.unit_cost = kwargs.get("unit_cost", 12)
        self.supplier_lead_time_days = kwargs.get("supplier_lead_time_days", 4)
        self.supplier_min_order_quantity = kwargs.get("supplier_min_order_quantity", 1)
        self.holding_cost_per_unit_day = kwargs.get("holding_cost_per_unit_day", 0.2)
        self.minimum_gross_margin_percent = kwargs.get("minimum_gross_margin_percent", 25)


class InventoryRiskTests(unittest.TestCase):
    def test_zero_stock_is_critical_and_stockout_score_is_bounded(self):
        result = assess_inventory(Product(stock=0), 10, 140)
        self.assertEqual(result["stockout_risk"]["score"], 100)
        self.assertEqual(result["stockout_risk"]["level"], "critical")
        self.assertGreaterEqual(result["overstock_risk"]["score"], 0)
        self.assertLessEqual(result["overstock_risk"]["score"], 100)

    def test_overstock_is_scored_separately_from_stockout(self):
        result = assess_inventory(Product(stock=1000), 10, 140)
        self.assertEqual(result["stockout_risk"]["score"], 0)
        self.assertGreaterEqual(result["overstock_risk"]["score"], 65)
        self.assertGreater(result["overstock_risk"]["excess_units"], 0)

    def test_reorder_point_is_lead_demand_plus_safety_stock(self):
        history = [10] * 20
        result = assess_inventory(Product(stock=1, supplier_lead_time_days=4), 10, 140, history)
        risk = result["stockout_risk"]
        self.assertEqual(risk["safety_stock"], 0)
        self.assertEqual(risk["reorder_point"], risk["lead_time_demand"] + risk["safety_stock"])
        self.assertEqual(risk["lead_time_demand"], 40)
        self.assertTrue(result["reorder_recommendation"]["should_reorder"])

    def test_supplier_minimum_order_quantity_is_respected(self):
        result = assess_inventory(Product(stock=0, supplier_min_order_quantity=75), 10, 10, [10] * 20, horizon_days=1)
        self.assertEqual(result["reorder_recommendation"]["suggested_quantity"], 75)
        self.assertEqual(result["reorder_recommendation"]["supplier_minimum_quantity"], 75)

    def test_sparse_history_is_explicitly_low_confidence(self):
        result = assess_inventory(Product(stock=8), 10, 140, [6, 9, 12])
        self.assertEqual(result["stockout_risk"]["confidence"], "low")
        self.assertIn("limited", " ".join(result["stockout_risk"]["reasons"]).lower())

    def test_pricing_floor_honors_margin_and_competitor_cannot_break_it(self):
        result = assess_inventory(Product(stock=20, minimum_gross_margin_percent=30, selling_price=15, unit_cost=12),
                                  10, 140, [10] * 20, competitor_price=10)
        pricing = result["pricing"]
        self.assertGreaterEqual(pricing["suggested_price"], pricing["minimum_price"])
        self.assertGreaterEqual(pricing["suggested_gross_margin_percent"], 30)
        self.assertFalse(pricing["automatic_price_change"])

    def test_recommendations_explain_only_computed_factors(self):
        result = assess_inventory(Product(stock=15), 12, 180, [5, 8, 12, 15, 9, 10] * 4,
                                  seasonal_context=["Summer"], festival_events=["Diwali"])
        reasons = " ".join(result["stockout_risk"]["reasons"])
        self.assertIn("Diwali", reasons)
        self.assertIn("reorder point", reasons.lower())
        self.assertIn("current_price", result["pricing"])


if __name__ == "__main__":
    unittest.main()
