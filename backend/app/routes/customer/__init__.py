from fastapi import APIRouter

from app.routes.customer.addresses import router as addresses_router
from app.routes.customer.home import router as home_router
from app.routes.customer.products import router as products_router
from app.routes.customer.profile import router as profile_router


router = APIRouter(
    prefix="/api/customer",
)


router.include_router(home_router)
router.include_router(products_router)
router.include_router(profile_router)
router.include_router(addresses_router)