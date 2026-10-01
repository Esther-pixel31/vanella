from fastapi import APIRouter

from app.routes.staff.dashboard import router as dashboard_router
from app.routes.staff.orders import router as orders_router


router = APIRouter(
    prefix="/api/staff",
)


router.include_router(dashboard_router)
router.include_router(orders_router)
