import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Address(Base):
    __tablename__ = "addresses"

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

    label: Mapped[str] = mapped_column(
        String(50),
        default="Home",
        nullable=False,
    )

    address_line: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    area: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    delivery_instructions: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    is_default: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False,
    )

    customer = relationship(
        "Customer",
        back_populates="addresses",
    )