
from sqlalchemy import Column, Float, Integer, String, Date, ForeignKey
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