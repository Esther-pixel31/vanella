from fastapi import APIRouter

from app.routes.admin.drivers import router as drivers_router
from app.routes.admin.staff import router as staff_router


router = APIRouter(
    prefix="/api/admin",
)


router.include_router(staff_router)
router.include_router(drivers_router)
