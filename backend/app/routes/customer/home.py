from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.branch import BranchResponse
from app.services.customer.branch_service import get_active_branches


router = APIRouter(
    prefix="/home",
    tags=["Customer Home"],
)


@router.get(
    "/branches",
    response_model=list[BranchResponse],
)
def list_branches(
    db: Session = Depends(get_db),
):
    return get_active_branches(db)