import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Payment(Base):
    """One M-Pesa payment attempt for an order.

    An order can have several attempts (a cancelled prompt, then a retry).
    Cash orders have no Payment rows.
    """

    __tablename__ = "payments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    method: Mapped[str] = mapped_column(
        String(10),
        default="mpesa",
        nullable=False,
    )

    # The amount actually requested from M-Pesa (whole shillings).
    amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )

    # "pending", "success", "failed" or "cancelled"
    status: Mapped[str] = mapped_column(
        String(10),
        default="pending",
        nullable=False,
    )

    phone_number: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    # The PayBill the money was requested to (depends on the branch).
    shortcode: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
    )

    merchant_request_id: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    checkout_request_id: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        unique=True,
        index=True,
    )

    mpesa_receipt: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True,
    )

    result_code: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
    )

    result_desc: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )
