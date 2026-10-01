import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


ROLE_ADMIN = "admin"
ROLE_STAFF = "staff"
ROLE_DRIVER = "driver"

TEAM_ROLES = {ROLE_ADMIN, ROLE_STAFF, ROLE_DRIVER}


class User(Base):
    """A Vanella team account: admin, branch staff or driver.

    Customers are a separate table (`customers`) and never log in as a User.
    """

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    full_name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    # Used for the phone + code login.
    phone_number: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        unique=True,
        index=True,
    )

    # Optional username + password login (e.g. a shared counter phone).
    username: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        unique=True,
        index=True,
    )

    password_hash: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    # "admin", "staff" or "driver"
    role: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
    )

    # Staff and drivers belong to one branch; admins to none.
    branch_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("branches.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
    )

    # A driver's last reported position, for live tracking.
    last_latitude: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    last_longitude: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    last_location_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False,
    )

    branch = relationship("Branch")
