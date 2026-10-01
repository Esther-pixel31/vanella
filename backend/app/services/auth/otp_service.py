from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import (
    create_access_token,
    generate_otp_code,
    generate_refresh_token,
    hash_token,
    otp_expiry,
    refresh_token_expiry,
)
from app.models.customer import Customer
from app.models.otp import OtpRequest
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.schemas.auth import TokenResponse, VerifyOtpRequest


MAX_OTP_ATTEMPTS = 5


def request_otp(
    db: Session,
    phone_number: str,
) -> None:

    code = generate_otp_code()

    otp_request = OtpRequest(
        phone_number=phone_number,
        code=code,
        attempts=0,
        is_used=False,
        expires_at=otp_expiry(),
    )

    db.add(otp_request)
    db.commit()

    # STUB: real SMS sending will replace this once Africa's Talking
    # credentials are configured. For now, the code is logged so the
    # developer can read it from `docker compose logs backend`.
    print(f"[OTP STUB] Sending code {code} to {phone_number}")


def consume_otp(
    db: Session,
    phone_number: str,
    code: str,
) -> None:
    """Checks a code against the latest pending OTP for the number and
    marks it used. Raises ValueError with a customer-facing message."""

    statement = (
        select(OtpRequest)
        .where(
            OtpRequest.phone_number == phone_number,
            OtpRequest.is_used.is_(False),
        )
        .order_by(OtpRequest.created_at.desc())
    )

    otp_request = db.scalar(statement)

    if otp_request is None:
        raise ValueError("No pending OTP request for this phone number")

    if otp_request.expires_at < datetime.now(timezone.utc):
        raise ValueError("OTP code has expired. Please request a new one.")

    if otp_request.attempts >= MAX_OTP_ATTEMPTS:
        raise ValueError("Too many incorrect attempts. Please request a new OTP.")

    if otp_request.code != code:
        otp_request.attempts += 1
        db.commit()
        raise ValueError("Incorrect OTP code")

    otp_request.is_used = True
    db.commit()


def verify_otp(
    db: Session,
    data: VerifyOtpRequest,
) -> TokenResponse:

    consume_otp(db, data.phone_number, data.code)

    customer = db.scalar(
        select(Customer).where(
            Customer.phone_number == data.phone_number
        )
    )

    is_new_customer = customer is None

    if customer is None:

        if not data.full_name:
            raise ValueError("full_name is required to complete registration")

        customer = Customer(
            full_name=data.full_name,
            phone_number=data.phone_number,
            physical_address=data.physical_address,
        )

        db.add(customer)
        db.commit()
        db.refresh(customer)

    access_token = create_access_token(customer.id)

    raw_refresh_token = generate_refresh_token()

    refresh_token = RefreshToken(
        customer_id=customer.id,
        token_hash=hash_token(raw_refresh_token),
        is_revoked=False,
        expires_at=refresh_token_expiry(),
    )

    db.add(refresh_token)
    db.commit()

    return TokenResponse(
        access_token=access_token,
        refresh_token=raw_refresh_token,
        customer_id=customer.id,
        is_new_customer=is_new_customer,
    )


def refresh_access_token(
    db: Session,
    raw_refresh_token: str,
) -> TokenResponse:

    token_hash = hash_token(raw_refresh_token)

    statement = select(RefreshToken).where(
        RefreshToken.token_hash == token_hash,
        RefreshToken.is_revoked.is_(False),
    )

    refresh_token = db.scalar(statement)

    if refresh_token is None:
        raise ValueError("Invalid refresh token")

    if refresh_token.expires_at < datetime.now(timezone.utc):
        raise ValueError("Refresh token has expired. Please log in again.")

    if refresh_token.user_id is not None:
        user = db.get(User, refresh_token.user_id)

        if user is None or not user.is_active:
            raise ValueError("This account is not active")

        return TokenResponse(
            access_token=create_access_token(user.id, user.role),
            refresh_token=raw_refresh_token,
            user_id=user.id,
            role=user.role,
        )

    access_token = create_access_token(refresh_token.customer_id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=raw_refresh_token,
        customer_id=refresh_token.customer_id,
        is_new_customer=False,
    )