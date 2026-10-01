from uuid import UUID

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import ROLE_CUSTOMER, decode_access_token
from app.db.session import get_db
from app.models.user import TEAM_ROLES, User


bearer_scheme = HTTPBearer()


def _decode(credentials: HTTPAuthorizationCredentials) -> tuple[UUID, str]:

    decoded = decode_access_token(credentials.credentials)

    if decoded is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired access token",
        )

    return decoded


def get_current_customer_id(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> UUID:

    subject_id, role = _decode(credentials)

    # A team login must not reach customer endpoints.
    if role != ROLE_CUSTOMER:
        raise HTTPException(
            status_code=403,
            detail="This is a customer feature",
        )

    return subject_id


def get_current_team_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """The logged-in admin, staff member or driver."""

    subject_id, role = _decode(credentials)

    if role not in TEAM_ROLES:
        raise HTTPException(
            status_code=403,
            detail="This is a staff feature",
        )

    user = db.get(User, subject_id)

    # Checked on every request, so a deactivated account stops working
    # without waiting for its token to expire.
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=401,
            detail="This account is not active",
        )

    return user


def require_roles(*roles: str):
    """Dependency allowing only team users with one of `roles`."""

    def checker(user: User = Depends(get_current_team_user)) -> User:

        if user.role not in roles:
            raise HTTPException(
                status_code=403,
                detail="You do not have access to this",
            )

        return user

    return checker
