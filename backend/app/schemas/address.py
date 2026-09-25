from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AddressCreate(BaseModel):
    label: str = Field(
        default="Home",
        max_length=50,
    )

    address_line: str = Field(
        min_length=2,
        max_length=255,
    )

    area: str | None = Field(
        default=None,
        max_length=100,
    )

    delivery_instructions: str | None = Field(
        default=None,
        max_length=255,
    )

    is_default: bool = False


class AddressUpdate(BaseModel):
    label: str | None = Field(
        default=None,
        max_length=50,
    )

    address_line: str | None = Field(
        default=None,
        max_length=255,
    )

    area: str | None = Field(
        default=None,
        max_length=100,
    )

    delivery_instructions: str | None = Field(
        default=None,
        max_length=255,
    )

    is_default: bool | None = None


class AddressResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: UUID
    customer_id: UUID

    label: str
    address_line: str
    area: str | None
    delivery_instructions: str | None

    is_default: bool
    created_at: datetime