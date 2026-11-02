
from pydantic import BaseModel, Field, ConfigDict
from datetime import date
from pydantic import BaseModel, Field


class ProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    stock: int = Field(ge=0)
    daily_demand: float = Field(gt=0)
    selling_price: float = Field(gt=0)
    unit_cost: float = Field(gt=0)
    supplier_lead_time_days: int = Field(default=3, ge=0, le=365)
    holding_cost_per_unit_day: float = Field(default=0, ge=0, le=1_000_000)


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    stock: int | None = Field(default=None, ge=0)
    daily_demand: float | None = Field(default=None, gt=0)
    selling_price: float | None = Field(default=None, gt=0)
    unit_cost: float | None = Field(default=None, gt=0)
    supplier_lead_time_days: int | None = Field(default=None, ge=0, le=365)
    holding_cost_per_unit_day: float | None = Field(default=None, ge=0, le=1_000_000)


class ProductResponse(BaseModel):
    id: int
    name: str
    stock: int
    daily_demand: float
    selling_price: float
    unit_cost: float
    supplier_lead_time_days: int = 3
    holding_cost_per_unit_day: float = 0

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


class SalesRecordResponse(SalesRecordCreate):
    id: int

    class Config:
        from_attributes = True

class SalesBulkUpload(BaseModel):
    records: list[SalesRecordCreate] = Field(max_length=5000)


class StockoutEventCreate(BaseModel):
    product_id: int = Field(gt=0)
    stockout_date: date
    estimated_lost_units: int | None = Field(default=None, ge=0, le=1_000_000)
    note: str = Field(default="", max_length=240)


class FestivalPlanRequest(BaseModel):
    festival_name: str = Field(min_length=1, max_length=100)
    festival_date: date
    budget_inr: float = Field(ge=0, le=1_000_000_000, allow_inf_nan=False)
    extra_storage_units: int = Field(ge=0, le=10_000_000)
