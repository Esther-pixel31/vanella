from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CustomerCreate(BaseModel):
    full_name: str = Field(
        min_length=2,
        max_length=150,
    )

    phone_number: str = Field(
        min_length=10,
        max_length=20,
    )

    physical_address: str | None = Field(
        default=None,
        max_length=255,
    )


class CustomerUpdate(BaseModel):
    full_name: str | None = Field(
        default=None,
        min_length=2,
        max_length=150,
    )

    physical_address: str | None = Field(
        default=None,
        max_length=255,
    )


class CustomerResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: UUID
    full_name: str
    phone_number: str
    physical_address: str | None

    is_active: bool
    is_corporate: bool
    corporate_credit_approved: bool

    created_at: datetime