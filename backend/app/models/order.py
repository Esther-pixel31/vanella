import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("customers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    branch_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("branches.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    address_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("addresses.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        default="Order Received",
        nullable=False,
    )

    subtotal: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )

    delivery_fee: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        default=0,
        nullable=False,
    )

    total: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )

    # "cash" (paid on delivery) or "mpesa" (paid at checkout)
    payment_method: Mapped[str] = mapped_column(
        String(10),
        default="cash",
        nullable=False,
    )

    # "unpaid", "pending", "paid" or "failed"
    payment_status: Mapped[str] = mapped_column(
        String(10),
        default="unpaid",
        nullable=False,
    )

    # Loyalty points are awarded once: at once for cash orders, and only
    # after payment succeeds for M-Pesa orders.
    points_awarded: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    # The driver delivering it (a team user with role "driver").
    driver_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Set when the order is ready and has a driver: it is on its way.
    dispatched_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # The time the customer is promised delivery by (the app's countdown).
    promised_by: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Placed outside delivery hours; goes out from the next opening time.
    is_scheduled: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    # Shown to the customer; the driver must enter it to finish delivery.
    delivery_code: Mapped[str | None] = mapped_column(
        String(4),
        nullable=True,
    )

    delivery_code_attempts: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    ready_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    delivered_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # When, and by which staff member, cash for a cash order was received.
    cash_confirmed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    cash_confirmed_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    customer_note: Mapped[str | None] = mapped_column(
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

    order_items = relationship(
        "OrderItem",
        back_populates="order",
        cascade="all, delete-orphan",
    )

    # Read-only links used by the staff and driver views.
    customer = relationship("Customer", viewonly=True)
    address = relationship("Address", viewonly=True)
    branch = relationship("Branch", viewonly=True)
    driver = relationship("User", foreign_keys=[driver_id], viewonly=True)