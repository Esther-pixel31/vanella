from datetime import datetime
from typing import Literal
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class OrderItemCreate(BaseModel):
    product_id: UUID
    quantity: int


class OrderItemResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: UUID
    product_id: UUID
    quantity: int
    unit_price: Decimal
    line_total: Decimal


class OrderCreate(BaseModel):
    branch_id: UUID
    address_id: UUID
    customer_note: str | None = None
    items: list[OrderItemCreate]
    reward_id: UUID | None = None
    payment_method: Literal["cash", "mpesa"] = "cash"


class OrderResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: UUID
    customer_id: UUID
    branch_id: UUID
    address_id: UUID
    status: str
    subtotal: Decimal
    delivery_fee: Decimal
    total: Decimal
    payment_method: str
    payment_status: str

    # Delivery: the countdown target, the customer's code for the driver,
    # and whether it waits for the next opening time.
    promised_by: datetime | None
    is_scheduled: bool
    delivery_code: str | None
    dispatched_at: datetime | None
    delivered_at: datetime | None
    customer_note: str | None
    created_at: datetime
    updated_at: datetime
    order_items: list[OrderItemResponse]


class TrackingDriver(BaseModel):
    full_name: str
    phone_number: str
    latitude: float | None
    longitude: float | None
    location_updated_at: datetime | None


class OrderTrackingResponse(BaseModel):
    """What the customer's tracking page needs, refreshed every few seconds."""

    order_id: UUID
    status: str
    promised_by: datetime | None
    is_scheduled: bool
    dispatched_at: datetime | None
    delivered_at: datetime | None
    delivery_code: str | None

    # Where the order is going (None if the address has no map pin).
    destination_latitude: float | None
    destination_longitude: float | None

    # Only while the order is on its way.
    driver: TrackingDriver | None


class DeliveryEstimateResponse(BaseModel):
    promised_by: datetime

    # True when ordering now means delivery from the next opening time.
    is_scheduled: bool
