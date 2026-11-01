
from pydantic import BaseModel, Field, ConfigDict
from datetime import date
from pydantic import BaseModel, Field


class ProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    stock: int = Field(ge=0)
    daily_demand: float = Field(gt=0)
    selling_price: float = Field(gt=0)
    unit_cost: float = Field(gt=0)


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    stock: int | None = Field(default=None, ge=0)
    daily_demand: float | None = Field(default=None, gt=0)
    selling_price: float | None = Field(default=None, gt=0)
    unit_cost: float | None = Field(default=None, gt=0)


class ProductResponse(BaseModel):
    id: int
    name: str
    stock: int
    daily_demand: float
    selling_price: float
    unit_cost: float

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
    records: list[SalesRecordCreate]