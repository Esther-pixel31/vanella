from datetime import datetime
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
    customer_note: str | None
    created_at: datetime
    updated_at: datetime
    order_items: list[OrderItemResponse]