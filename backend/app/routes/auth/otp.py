from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.auth import (
    RefreshTokenRequest,
    RequestOtpRequest,
    RequestOtpResponse,
    TokenResponse,
    VerifyOtpRequest,
)
from app.services.auth.otp_service import (
    refresh_access_token,
    request_otp,
    verify_otp,
)


router = APIRouter(
    tags=["Auth"],
)


@router.post(
    "/request-otp",
    response_model=RequestOtpResponse,
)
def send_otp(
    data: RequestOtpRequest,
    db: Session = Depends(get_db),
):

    request_otp(db, data.phone_number)

    return RequestOtpResponse(
        message="OTP sent successfully",
    )


@router.post(
    "/verify-otp",
    response_model=TokenResponse,
    status_code=201,
)
def confirm_otp(
    data: VerifyOtpRequest,
    db: Session = Depends(get_db),
):

    try:
        return verify_otp(db, data)
    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )


@router.post(
    "/refresh",
    response_model=TokenResponse,
)
def refresh_token(
    data: RefreshTokenRequest,
    db: Session = Depends(get_db),
):

    try:
        return refresh_access_token(db, data.refresh_token)
    except ValueError as error:
        raise HTTPException(
            status_code=401,
            detail=str(error),
        )