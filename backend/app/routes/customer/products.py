from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.product import ProductResponse
from app.services.customer.product_service import get_active_products


router = APIRouter(
    prefix="/products",
    tags=["Customer Products"],
)


@router.get(
    "",
    response_model=list[ProductResponse],
)
def list_products(
    db: Session = Depends(get_db),
):
    return get_active_products(db)