from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class MpesaPayRequest(BaseModel):
    # Optional: defaults to the customer's registered number.
    phone_number: str | None = Field(
        default=None,
        min_length=12,
        max_length=12,
    )


class PaymentResponse(BaseModel):
    id: UUID
    order_id: UUID
    method: str
    amount: Decimal

    # "pending", "success", "failed" or "cancelled"
    status: str

    phone_number: str
    mpesa_receipt: str | None

    # Ready-to-show text describing the current status.
    message: str

    created_at: datetime
