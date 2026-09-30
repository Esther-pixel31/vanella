from fastapi import APIRouter

from app.routes.auth.otp import router as otp_router


router = APIRouter(
    prefix="/api/auth",
)


router.include_router(otp_router)