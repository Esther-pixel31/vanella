from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_customer_id
from app.db.session import get_db
from app.schemas.order import (
    DeliveryEstimateResponse,
    OrderCreate,
    OrderResponse,
    OrderTrackingResponse,
    TrackingDriver,
)
from app.services.customer.delivery_schedule import plan_delivery
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
    "",
    response_model=OrderResponse,
    status_code=201,
)
def place_order(
    data: OrderCreate,
    customer_id: UUID = Depends(get_current_customer_id),
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
    "",
    response_model=list[OrderResponse],
)
def list_orders(
    customer_id: UUID = Depends(get_current_customer_id),
    db: Session = Depends(get_db),
):
    return get_customer_orders(
        db,
        customer_id,
    )


@router.get(
    "/estimate",
    response_model=DeliveryEstimateResponse,
)
def delivery_estimate(
    has_bulk: bool = False,
    customer_id: UUID = Depends(get_current_customer_id),
):
    """When an order placed now would be delivered, for checkout.

    Declared before /{order_id} so "estimate" is not read as an order id.
    """

    promised_by, is_scheduled = plan_delivery(["10000L"] if has_bulk else ["20L"])

    return DeliveryEstimateResponse(
        promised_by=promised_by,
        is_scheduled=is_scheduled,
    )


@router.get(
    "/{order_id}",
    response_model=OrderResponse,
)
def get_order(
    order_id: UUID,
    customer_id: UUID = Depends(get_current_customer_id),
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


@router.get(
    "/{order_id}/tracking",
    response_model=OrderTrackingResponse,
)
def track_order(
    order_id: UUID,
    customer_id: UUID = Depends(get_current_customer_id),
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

    driver = None

    if order.status == "On the Way" and order.driver is not None:
        driver = TrackingDriver(
            full_name=order.driver.full_name,
            phone_number=order.driver.phone_number,
            latitude=order.driver.last_latitude,
            longitude=order.driver.last_longitude,
            location_updated_at=order.driver.last_location_at,
        )

    return OrderTrackingResponse(
        order_id=order.id,
        status=order.status,
        promised_by=order.promised_by,
        is_scheduled=order.is_scheduled,
        dispatched_at=order.dispatched_at,
        delivered_at=order.delivered_at,
        delivery_code=order.delivery_code,
        destination_latitude=order.address.latitude if order.address else None,
        destination_longitude=order.address.longitude if order.address else None,
        driver=driver,
    )
