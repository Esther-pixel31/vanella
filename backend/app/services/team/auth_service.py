"""Logging in team users (admin, staff, driver)."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import (
    create_access_token,
    generate_refresh_token,
    hash_password,
    hash_token,
    refresh_token_expiry,
    verify_password,
)
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.schemas.team import TeamTokenResponse, TeamUserResponse
from app.services.auth.otp_service import consume_otp, request_otp


WRONG_LOGIN = "Wrong username or password"

# Compared against when a username does not exist, so a wrong username takes
# as long to reject as a wrong password.
_DUMMY_HASH = hash_password("not-a-real-password")


def to_team_user_response(user: User) -> TeamUserResponse:
    response = TeamUserResponse.model_validate(user)
    response.has_password = user.password_hash is not None
    return response


def issue_team_tokens(db: Session, user: User) -> TeamTokenResponse:

    raw_refresh_token = generate_refresh_token()

    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=hash_token(raw_refresh_token),
            is_revoked=False,
            expires_at=refresh_token_expiry(),
        )
    )
    db.commit()

    return TeamTokenResponse(
        access_token=create_access_token(user.id, user.role),
        refresh_token=raw_refresh_token,
        role=user.role,
        user=to_team_user_response(user),
    )


def login_with_password(
    db: Session,
    username: str,
    password: str,
) -> TeamTokenResponse:

    user = db.scalar(
        select(User).where(User.username == username.strip().lower())
    )

    if user is None:
        verify_password(password, _DUMMY_HASH)
        raise ValueError(WRONG_LOGIN)

    if not verify_password(password, user.password_hash):
        raise ValueError(WRONG_LOGIN)

    if not user.is_active:
        raise ValueError("This account has been deactivated. Ask your admin.")

    return issue_team_tokens(db, user)


def _active_user_by_phone(db: Session, phone_number: str) -> User | None:
    return db.scalar(
        select(User).where(
            User.phone_number == phone_number,
            User.is_active.is_(True),
        )
    )


def request_team_otp(db: Session, phone_number: str) -> None:
    """Sends a code only to numbers that belong to an active team account.

    The caller always gets the same reply, so this cannot be used to find
    out which numbers are staff.
    """

    if _active_user_by_phone(db, phone_number) is not None:
        request_otp(db, phone_number)


def verify_team_otp(
    db: Session,
    phone_number: str,
    code: str,
) -> TeamTokenResponse:

    user = _active_user_by_phone(db, phone_number)

    if user is None:
        raise ValueError("There is no active staff account with this number")

    consume_otp(db, phone_number, code)

    return issue_team_tokens(db, user)
