from fastapi import APIRouter

from app.routes.driver.deliveries import router as deliveries_router


router = APIRouter(
    prefix="/api/driver",
)


router.include_router(deliveries_router)
