"""Login for team accounts (admin, staff, driver).

Customers log in through otp.py instead.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_team_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import RequestOtpResponse
from app.schemas.team import (
    TeamOtpRequest,
    TeamOtpVerify,
    TeamPasswordLogin,
    TeamTokenResponse,
    TeamUserResponse,
)
from app.services.team.auth_service import (
    login_with_password,
    request_team_otp,
    to_team_user_response,
    verify_team_otp,
)


router = APIRouter(
    prefix="/team",
    tags=["Team Auth"],
)


@router.post(
    "/login",
    response_model=TeamTokenResponse,
)
def password_login(
    data: TeamPasswordLogin,
    db: Session = Depends(get_db),
):

    try:
        return login_with_password(db, data.username, data.password)
    except ValueError as error:
        raise HTTPException(
            status_code=401,
            detail=str(error),
        )


@router.post(
    "/request-otp",
    response_model=RequestOtpResponse,
)
def team_request_otp(
    data: TeamOtpRequest,
    db: Session = Depends(get_db),
):

    request_team_otp(db, data.phone_number)

    # Same reply whether or not the number belongs to a team member.
    return RequestOtpResponse(
        message="If this number belongs to a team account, a code has been sent",
    )


@router.post(
    "/verify-otp",
    response_model=TeamTokenResponse,
)
def team_verify_otp(
    data: TeamOtpVerify,
    db: Session = Depends(get_db),
):

    try:
        return verify_team_otp(db, data.phone_number, data.code)
    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )


@router.get(
    "/me",
    response_model=TeamUserResponse,
)
def read_me(
    user: User = Depends(get_current_team_user),
):
    return to_team_user_response(user)
