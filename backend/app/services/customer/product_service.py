from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.product import Product


def get_active_products(
    db: Session,
) -> list[Product]:

    statement = (
        select(Product)
        .where(
            Product.is_active.is_(True)
        )
        .order_by(Product.price)
    )

    return list(
        db.scalars(statement).all()
    )