from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.order import OrderCreate, OrderResponse
from app.services.customer.order_service import (
    create_order,
    get_customer_order,
    get_customer_orders,
)


router = APIRouter(
    prefix="/orders",
    tags=["Customer Orders"],
)


@router.post(
    "/{customer_id}",
    response_model=OrderResponse,
    status_code=201,
)
def place_order(
    customer_id: UUID,
    data: OrderCreate,
    db: Session = Depends(get_db),
):
    try:
        return create_order(
            db,
            customer_id,
            data,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )


@router.get(
    "/{customer_id}",
    response_model=list[OrderResponse],
)
def list_orders(
    customer_id: UUID,
    db: Session = Depends(get_db),
):
    return get_customer_orders(
        db,
        customer_id,
    )


@router.get(
    "/{customer_id}/{order_id}",
    response_model=OrderResponse,
)
def get_order(
    customer_id: UUID,
    order_id: UUID,
    db: Session = Depends(get_db),
):
    order = get_customer_order(
        db,
        customer_id,
        order_id,
    )

    if order is None:
        raise HTTPException(
            status_code=404,
            detail="Order not found",
        )

    return order