from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_customer_id
from app.db.session import get_db
from app.schemas.branch import BranchResponse
from app.schemas.home import HomeSummaryResponse
from app.services.customer.branch_service import get_active_branches
from app.services.customer.home_service import get_home_summary


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


@router.get(
    "/summary",
    response_model=HomeSummaryResponse,
)
def get_summary(
    customer_id: UUID = Depends(get_current_customer_id),
    db: Session = Depends(get_db),
):

    summary = get_home_summary(
        db,
        customer_id,
    )

    if summary is None:
        raise HTTPException(
            status_code=404,
            detail="Customer not found",
        )

    return summary