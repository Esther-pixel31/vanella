import re
from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


TeamRole = Literal["admin", "staff", "driver"]

PHONE_PATTERN = r"^254[17]\d{8}$"
USERNAME_PATTERN = r"^[a-z0-9._-]+$"


def _clean_username(value: str | None) -> str | None:
    """Usernames are stored lower-case: letters, digits, '.', '_' or '-'."""

    if value is None:
        return None

    value = value.strip().lower()

    if not re.fullmatch(USERNAME_PATTERN, value):
        raise ValueError("Use only letters, numbers, '.', '_' or '-'")

    return value


class TeamBranch(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str


class TeamUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    full_name: str
    phone_number: str
    username: str | None
    role: str
    branch: TeamBranch | None
    is_active: bool
    created_at: datetime

    # Whether a password is set (the password itself is never returned).
    has_password: bool = False


class TeamTokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: str
    user: TeamUserResponse


# ---------------------------------------------------------------- login

class TeamPasswordLogin(BaseModel):
    username: str = Field(min_length=1, max_length=50)
    password: str = Field(min_length=1, max_length=128)


class TeamOtpRequest(BaseModel):
    phone_number: str = Field(pattern=PHONE_PATTERN)


class TeamOtpVerify(BaseModel):
    phone_number: str = Field(pattern=PHONE_PATTERN)
    code: str = Field(min_length=6, max_length=6)


# ---------------------------------------------------------------- admin

class TeamUserCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    phone_number: str = Field(pattern=PHONE_PATTERN)
    role: TeamRole

    # Required for staff and drivers; must be empty for admins.
    branch_id: UUID | None = None

    # Optional; when given, both are needed.
    username: str | None = Field(default=None, min_length=3, max_length=50)
    password: str | None = Field(default=None, min_length=8, max_length=128)

    @field_validator("username")
    @classmethod
    def clean_username(cls, value: str | None) -> str | None:
        return _clean_username(value)


class TeamUserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=150)
    phone_number: str | None = Field(default=None, pattern=PHONE_PATTERN)
    branch_id: UUID | None = None
    is_active: bool | None = None
    username: str | None = Field(default=None, min_length=3, max_length=50)

    # Setting this resets the password.
    password: str | None = Field(default=None, min_length=8, max_length=128)

    @field_validator("username")
    @classmethod
    def clean_username(cls, value: str | None) -> str | None:
        return _clean_username(value)
