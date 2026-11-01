from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.schemas import (
    ProductCreate,
    ProductUpdate,
    ProductResponse,
    SalesRecordCreate,
    SalesRecordResponse,
    SalesBulkUpload
)
from app.database import Base, engine, get_db, SessionLocal
from app.models import Product, SalesRecord


# ==========================================
# DATABASE SETUP
# ==========================================

# Create database tables if they do not already exist.
Base.metadata.create_all(bind=engine)


# ==========================================
# SAMPLE DATA
# ==========================================

# Insert sample products only when the products table is empty.
def seed_products():
    db = SessionLocal()

    try:
        if db.query(Product).count() == 0:
            sample_products = [
                Product(
                    name="Rice",
                    stock=12,
                    daily_demand=8,
                    selling_price=60,
                    unit_cost=45,
                ),
                Product(
                    name="Milk",
                    stock=9,
                    daily_demand=12,
                    selling_price=30,
                    unit_cost=23,
                ),
                Product(
                    name="Cooking Oil",
                    stock=32,
                    daily_demand=5,
                    selling_price=150,
                    unit_cost=125,
                ),
            ]

            db.add_all(sample_products)
            db.commit()
            print("Sample products added to the database.")

    except Exception as error:
        db.rollback()
        print(f"Error while adding sample products: {error}")

    finally:
        db.close()


# ==========================================
# APPLICATION LIFESPAN
# ==========================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    seed_products()
    yield


# ==========================================
# FASTAPI APPLICATION
# ==========================================

app = FastAPI(
    title="RetailAI API",
    description="Backend API for the RetailAI smart retail assistant",
    version="1.0.0",
    lifespan=lifespan,
)


# ==========================================
# CORS CONFIGURATION
# ==========================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://127.0.0.1:5501",
        "http://localhost:5501",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type"],
)


# ==========================================
# BASIC ROUTES
# ==========================================

@app.get("/")
def home():
    return {
        "message": "Welcome to RetailAI API",
        "status": "running",
        "version": "1.0.0",
    }


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "RetailAI Backend",
        "database": "connected",
    }


# ==========================================
# PRODUCT CRUD ROUTES
# ==========================================

# READ ALL PRODUCTS
@app.get("/api/products")
def get_products(db: Session = Depends(get_db)):
    products = db.query(Product).order_by(Product.id).all()

    return {
        "products": [
            {
                "id": product.id,
                "name": product.name,
                "stock": product.stock,
                "daily_demand": product.daily_demand,
                "selling_price": product.selling_price,
                "unit_cost": product.unit_cost,
            }
            for product in products
        ]
    }


# CREATE PRODUCT
@app.post(
    "/api/products",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_product(
    payload: ProductCreate,
    db: Session = Depends(get_db),
):
    product = Product(**payload.model_dump())

    db.add(product)

    try:
        db.commit()
        db.refresh(product)

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="A product with this name already exists.",
        )

    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Could not create product: {str(error)}",
        )

    return product


# UPDATE PRODUCT
@app.put(
    "/api/products/{product_id}",
    response_model=ProductResponse,
)
def update_product(
    product_id: int,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
):
    product = db.query(Product).filter(
        Product.id == product_id
    ).first()

    if product is None:
        raise HTTPException(
            status_code=404,
            detail="Product not found.",
        )

    updates = payload.model_dump(exclude_unset=True)

    if not updates:
        raise HTTPException(
            status_code=400,
            detail="No product data was provided for update.",
        )

    for field, value in updates.items():
        setattr(product, field, value)

    try:
        db.commit()
        db.refresh(product)

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="A product with this name already exists.",
        )

    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Could not update product: {str(error)}",
        )

    return product


# DELETE PRODUCT
@app.delete("/api/products/{product_id}")
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
):
    product = db.query(Product).filter(
        Product.id == product_id
    ).first()

    if product is None:
        raise HTTPException(
            status_code=404,
            detail="Product not found.",
        )

    try:
        product_name = product.name

        db.delete(product)
        db.commit()

        return {
            "message": f"{product_name} deleted successfully.",
            "id": product_id,
        }

    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Could not delete product: {str(error)}",
        )


# ==========================================
# SALES DATA ROUTES
# ==========================================

# CREATE A SALES RECORD
@app.post(
    "/api/sales",
    response_model=SalesRecordResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_sales_record(
    payload: SalesRecordCreate,
    db: Session = Depends(get_db),
):
    # Make sure the product exists before adding sales data.
    product = db.query(Product).filter(
        Product.name == payload.product_name
    ).first()

    if product is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "Product not found. "
                "Add the product before adding sales data."
            ),
        )

    sales_record = SalesRecord(
        product_name=payload.product_name,
        sale_date=payload.sale_date,
        quantity=payload.quantity,
        price=payload.price,
    )

    db.add(sales_record)

    try:
        db.commit()
        db.refresh(sales_record)

    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Could not save sales record: {str(error)}",
        )

    return sales_record


# GET SALES RECORDS
@app.get(
    "/api/sales",
    response_model=list[SalesRecordResponse],
)
def get_sales_records(
    product_name: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(SalesRecord)

    # Filter records when a product name is provided.
    if product_name:
        query = query.filter(
            SalesRecord.product_name == product_name
        )

    return query.order_by(
        SalesRecord.sale_date.desc()
    ).all()

# ==========================================
# BULK SALES UPLOAD
# ==========================================

@app.post(
    "/api/sales/bulk",
    status_code=status.HTTP_201_CREATED,
)
def upload_sales_records(
    payload: SalesBulkUpload,
    db: Session = Depends(get_db),
):
    if not payload.records:
        raise HTTPException(
            status_code=400,
            detail="No sales records were provided.",
        )

    # Limit records to prevent accidental huge uploads.
    if len(payload.records) > 5000:
        raise HTTPException(
            status_code=400,
            detail="A maximum of 5000 records can be uploaded at once.",
        )

    # Check all product names before saving anything.
    product_names = {
        record.product_name.strip()
        for record in payload.records
    }

    existing_products = db.query(Product.name).filter(
        Product.name.in_(product_names)
    ).all()

    existing_names = {
        product[0] for product in existing_products
    }

    missing_products = product_names - existing_names

    if missing_products:
        raise HTTPException(
            status_code=404,
            detail=(
                "These products do not exist: "
                + ", ".join(sorted(missing_products))
            ),
        )

    try:
        sales_records = [
            SalesRecord(
                product_name=record.product_name.strip(),
                sale_date=record.sale_date,
                quantity=record.quantity,
                price=record.price,
            )
            for record in payload.records
        ]

        db.add_all(sales_records)
        db.commit()

        return {
            "message": "Sales records uploaded successfully.",
            "records_added": len(sales_records),
        }

    except Exception as error:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Could not upload sales records: {str(error)}",
        )