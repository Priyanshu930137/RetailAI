
from datetime import datetime
from sqlalchemy import Boolean, Column, Float, Integer, String, Date, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    stock = Column(Integer, nullable=False, default=0)
    daily_demand = Column(Float, nullable=False, default=1)
    selling_price = Column(Float, nullable=False, default=0)
    unit_cost = Column(Float, nullable=False, default=0)
    supplier_lead_time_days = Column(Integer, nullable=False, default=3, server_default="3")
    supplier_min_order_quantity = Column(Integer, nullable=False, default=1, server_default="1")
    holding_cost_per_unit_day = Column(Float, nullable=False, default=0, server_default="0")
    manufacturing_date = Column(Date, nullable=True)
    expiry_date = Column(Date, nullable=True)
    hsn_code = Column(String(12), nullable=True)
    gst_rate_percent = Column(Float, nullable=True)
    gst_price_inclusive = Column(Boolean, nullable=False, default=True, server_default="1")
    weather_sensitivity = Column(String(24), nullable=False, default="none", server_default="none")
    minimum_gross_margin_percent = Column(Float, nullable=False, default=5, server_default="5")
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class StoreWeatherLocation(Base):
    __tablename__ = "store_weather_location"
    id = Column(Integer, primary_key=True, default=1)
    city = Column(String(120), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    timezone = Column(String(80), nullable=True)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class SalesRecord(Base):
    __tablename__ = "sales_records"

    id = Column(Integer, primary_key=True, index=True)

    # Product name is stored for simple prototype-level reporting.
    product_name = Column(
        String,
        ForeignKey("products.name"),
        nullable=False,
        index=True
    )

    sale_date = Column(Date, nullable=False, index=True)

    quantity = Column(Integer, nullable=False)

    price = Column(Float, nullable=False)
    transaction_id = Column(String(100), nullable=True, index=True)


class SalesImport(Base):
    """Fingerprint ledger so retrying an identical CSV cannot duplicate sales."""
    __tablename__ = "sales_imports"

    id = Column(Integer, primary_key=True, index=True)
    fingerprint = Column(String(64), unique=True, nullable=False, index=True)
    records_added = Column(Integer, nullable=False)
    products_added = Column(Integer, nullable=False)
    imported_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class StockoutEvent(Base):
    """A day with constrained availability, used to correct censored demand."""
    __tablename__ = "stockout_events"
    __table_args__ = (UniqueConstraint("product_id", "stockout_date", name="uq_stockout_product_day"),)

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    stockout_date = Column(Date, nullable=False, index=True)
    estimated_lost_units = Column(Integer, nullable=True)
    note = Column(String(240), nullable=False, default="")
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class StockAdjustment(Base):
    """Auditable inventory movement applied as a signed unit change."""
    __tablename__ = "stock_adjustments"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    change_units = Column(Integer, nullable=False)
    stock_after = Column(Integer, nullable=False)
    reason = Column(String(100), nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
