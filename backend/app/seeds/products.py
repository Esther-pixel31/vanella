from decimal import Decimal

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.product import Product


PRODUCTS = [
    {
        "name": "20L Water",
        "description": "20 litre Vanella drinking water",
        "price": Decimal("100.00"),
        "product_type": "20L",
    },
    {
        "name": "6,000L Bulk Water",
        "description": "6,000 litre bulk water delivery",
        "price": Decimal("3500.00"),
        "product_type": "6000L",
    },
    {
        "name": "10,000L Bulk Water",
        "description": "10,000 litre bulk water delivery",
        "price": Decimal("5000.00"),
        "product_type": "10000L",
    },
]


def seed_products():
    db = SessionLocal()

    try:
        for product_data in PRODUCTS:
            existing_product = db.scalar(
                select(Product).where(
                    Product.name == product_data["name"]
                )
            )

            if existing_product:
                continue

            product = Product(
                **product_data,
                is_active=True,
            )

            db.add(product)

        db.commit()

        print("Vanella products seeded successfully.")

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    seed_products()