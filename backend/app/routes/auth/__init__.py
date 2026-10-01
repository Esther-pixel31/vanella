from fastapi import APIRouter

from app.routes.auth.login import router as team_login_router
from app.routes.auth.otp import router as otp_router


router = APIRouter(
    prefix="/api/auth",
)


router.include_router(otp_router)
router.include_router(team_login_router)