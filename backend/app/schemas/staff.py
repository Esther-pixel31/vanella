from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class OrderCustomer(BaseModel):
    id: UUID
    full_name: str
    phone_number: str


class OrderAddress(BaseModel):
    label: str
    address_line: str
    latitude: float | None
    longitude: float | None


class OrderPerson(BaseModel):
    id: UUID
    full_name: str
    phone_number: str


class OrderBranch(BaseModel):
    id: UUID
    name: str


class TeamOrderItem(BaseModel):
    product_name: str
    quantity: int
    unit_price: Decimal
    line_total: Decimal

    # A free reward bottle.
    is_free: bool


class TeamOrderResponse(BaseModel):
    """An order as staff and drivers see it, with names filled in."""

    id: UUID
    status: str

    payment_method: str
    payment_status: str

    # An M-Pesa order that has not been paid yet: not to be prepared.
    awaiting_payment: bool

    subtotal: Decimal
    delivery_fee: Decimal
    total: Decimal
    customer_note: str | None

    customer: OrderCustomer
    address: OrderAddress
    branch: OrderBranch
    driver: OrderPerson | None
    items: list[TeamOrderItem]

    created_at: datetime
    ready_at: datetime | None
    dispatched_at: datetime | None
    promised_by: datetime | None

    # Placed outside delivery hours; goes out from the next opening time.
    is_scheduled: bool

    delivered_at: datetime | None
    cash_confirmed_at: datetime | None


class AssignDriverRequest(BaseModel):
    driver_id: UUID


class BranchDriverResponse(BaseModel):
    id: UUID
    full_name: str
    phone_number: str

    # Orders on their way with this driver now.
    active_deliveries: int


class StaffSummaryResponse(BaseModel):
    """Today's numbers for one branch (Kenyan time)."""

    branch: OrderBranch
    date: str

    # Orders placed today, not counting unpaid M-Pesa orders.
    orders_today: int
    awaiting_payment: int

    # Open orders, whatever day they were placed.
    new_orders: int
    ready_orders: int
    on_the_way: int

    delivered_today: int

    mpesa_received: Decimal
    cash_collected: Decimal

    # Cash orders not yet paid, and how much of that is already delivered.
    cash_to_collect: Decimal
    cash_delivered_unconfirmed: Decimal


class DeliverRequest(BaseModel):
    # The 4-digit code the customer reads out from their app.
    code: str = Field(min_length=4, max_length=4, pattern=r"^\d{4}$")


class DriverLocationRequest(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
