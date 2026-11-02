
from datetime import datetime
from sqlalchemy import Column, Float, Integer, String, Date, DateTime, ForeignKey, UniqueConstraint
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
    holding_cost_per_unit_day = Column(Float, nullable=False, default=0, server_default="0")


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
