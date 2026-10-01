from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import require_roles
from app.db.session import get_db
from app.models.user import ROLE_DRIVER, User
from app.schemas.staff import DeliverRequest, DriverLocationRequest, TeamOrderResponse
from app.services.team.order_service import (
    OrderNotFound,
    deliver_with_code,
    list_driver_deliveries,
    load_details,
    record_driver_location,
    to_team_order,
)


router = APIRouter(
    prefix="/deliveries",
    tags=["Driver Deliveries"],
)

driver_only = require_roles(ROLE_DRIVER)


@router.get("", response_model=list[TeamOrderResponse])
def my_deliveries(
    done: bool = False,
    driver: User = Depends(driver_only),
    db: Session = Depends(get_db),
):
    """Deliveries assigned to me: not yet delivered (default), or done today."""

    return [to_team_order(order) for order in list_driver_deliveries(db, driver.id, done)]


@router.get("/{order_id}", response_model=TeamOrderResponse)
def read_delivery(
    order_id: UUID,
    driver: User = Depends(driver_only),
    db: Session = Depends(get_db),
):
    order = load_details(db, order_id)

    if order is None or order.driver_id != driver.id:
        raise HTTPException(status_code=404, detail="Delivery not found")

    return to_team_order(order)


@router.post("/location", status_code=204)
def update_location(
    data: DriverLocationRequest,
    driver: User = Depends(driver_only),
    db: Session = Depends(get_db),
):
    """Called every few seconds by the driver's app while delivering, so
    customers can follow the driver on a map."""

    record_driver_location(db, driver, data.latitude, data.longitude)


@router.post("/{order_id}/deliver", response_model=TeamOrderResponse)
def deliver(
    order_id: UUID,
    data: DeliverRequest,
    driver: User = Depends(driver_only),
    db: Session = Depends(get_db),
):
    """Finishes a delivery with the customer's 4-digit code. For cash
    orders this also records the cash as collected."""

    try:
        return to_team_order(deliver_with_code(db, order_id, driver, data.code))
    except OrderNotFound:
        raise HTTPException(status_code=404, detail="Delivery not found")
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))
