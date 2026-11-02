
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, Field


class ProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    stock: int = Field(ge=0)
    daily_demand: float = Field(gt=0)
    selling_price: float = Field(gt=0)
    unit_cost: float = Field(gt=0)
    supplier_lead_time_days: int = Field(default=3, ge=0, le=365)
    supplier_min_order_quantity: int = Field(default=1, ge=1, le=1_000_000)
    holding_cost_per_unit_day: float = Field(default=0, ge=0, le=1_000_000)
    manufacturing_date: date | None = None
    expiry_date: date | None = None
    hsn_code: str | None = Field(default=None, max_length=12)
    gst_rate_percent: float | None = Field(default=None, ge=0, le=100)
    gst_price_inclusive: bool = True
    weather_sensitivity: str = Field(default="none", pattern="^(none|hot|rain|cold)$")
    minimum_gross_margin_percent: float = Field(default=5, ge=0, le=95)


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    stock: int | None = Field(default=None, ge=0)
    daily_demand: float | None = Field(default=None, gt=0)
    selling_price: float | None = Field(default=None, gt=0)
    unit_cost: float | None = Field(default=None, gt=0)
    supplier_lead_time_days: int | None = Field(default=None, ge=0, le=365)
    supplier_min_order_quantity: int | None = Field(default=None, ge=1, le=1_000_000)
    holding_cost_per_unit_day: float | None = Field(default=None, ge=0, le=1_000_000)
    manufacturing_date: date | None = None
    expiry_date: date | None = None
    hsn_code: str | None = Field(default=None, max_length=12)
    gst_rate_percent: float | None = Field(default=None, ge=0, le=100)
    gst_price_inclusive: bool | None = None
    weather_sensitivity: str | None = Field(default=None, pattern="^(none|hot|rain|cold)$")
    minimum_gross_margin_percent: float | None = Field(default=None, ge=0, le=95)


class ProductResponse(BaseModel):
    id: int
    name: str
    stock: int
    daily_demand: float
    selling_price: float
    unit_cost: float
    supplier_lead_time_days: int = 3
    supplier_min_order_quantity: int = 1
    holding_cost_per_unit_day: float = 0
    manufacturing_date: date | None = None
    expiry_date: date | None = None
    hsn_code: str | None = None
    gst_rate_percent: float | None = None
    gst_price_inclusive: bool = True
    weather_sensitivity: str = "none"
    minimum_gross_margin_percent: float = 5
    created_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)

class SalesRecordCreate(BaseModel):
    product_name: str = Field(
        min_length=1,
        max_length=100
    )

    sale_date: date

    quantity: int = Field(
        gt=0,
        le=1_000_000
    )

    price: float = Field(
        gt=0,
        le=10_000_000
    )
    transaction_id: str | None = Field(default=None, max_length=100)


class SalesRecordResponse(SalesRecordCreate):
    id: int

    class Config:
        from_attributes = True

class SalesBulkUpload(BaseModel):
    records: list[SalesRecordCreate] = Field(max_length=5000)


class StoreCsvProduct(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    stock: int | None = Field(default=None, ge=0)
    daily_demand: float | None = Field(default=None, gt=0)
    selling_price: float | None = Field(default=None, gt=0)
    unit_cost: float | None = Field(default=None, gt=0)
    supplier_lead_time_days: int | None = Field(default=None, ge=0, le=365)
    supplier_min_order_quantity: int | None = Field(default=None, ge=1, le=1_000_000)
    holding_cost_per_unit_day: float | None = Field(default=None, ge=0, le=1_000_000)
    manufacturing_date: date | None = None
    expiry_date: date | None = None
    inventory_since: date | None = None
    hsn_code: str | None = Field(default=None, max_length=12)
    gst_rate_percent: float | None = Field(default=None, ge=0, le=100)
    gst_price_inclusive: bool | None = None
    minimum_gross_margin_percent: float | None = Field(default=None, ge=0, le=95)


class StoreCsvImport(BaseModel):
    products: list[StoreCsvProduct] = Field(default_factory=list, max_length=1000)
    sales: list[SalesRecordCreate] = Field(default_factory=list, max_length=5000)


class StockoutEventCreate(BaseModel):
    product_id: int = Field(gt=0)
    stockout_date: date
    estimated_lost_units: int | None = Field(default=None, ge=0, le=1_000_000)
    note: str = Field(default="", max_length=240)


class StockAdjustmentCreate(BaseModel):
    change_units: int = Field(ne=0, ge=-1_000_000, le=1_000_000)
    reason: str = Field(min_length=1, max_length=100)


class FestivalPlanRequest(BaseModel):
    festival_name: str = Field(min_length=1, max_length=100)
    festival_date: date
    budget_inr: float = Field(ge=0, le=1_000_000_000, allow_inf_nan=False)
    extra_storage_units: int = Field(ge=0, le=10_000_000)
