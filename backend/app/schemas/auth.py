from uuid import UUID

from pydantic import BaseModel, Field


class RequestOtpRequest(BaseModel):
    phone_number: str = Field(
        min_length=10,
        max_length=20,
    )


class RequestOtpResponse(BaseModel):
    message: str


class VerifyOtpRequest(BaseModel):
    phone_number: str = Field(
        min_length=10,
        max_length=20,
    )

    code: str = Field(
        min_length=6,
        max_length=6,
    )

    full_name: str | None = None
    physical_address: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    customer_id: UUID
    is_new_customer: bool


class RefreshTokenRequest(BaseModel):
    refresh_token: str