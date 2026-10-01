from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import require_roles
from app.db.session import get_db
from app.models.user import ROLE_ADMIN, ROLE_STAFF, User
from app.routes.staff.scope import branch_for
from app.schemas.staff import StaffSummaryResponse
from app.services.team.order_service import branch_summary


router = APIRouter(
    tags=["Staff Dashboard"],
)


@router.get("/summary", response_model=StaffSummaryResponse)
def summary(
    branch_id: UUID | None = None,
    user: User = Depends(require_roles(ROLE_STAFF, ROLE_ADMIN)),
    db: Session = Depends(get_db),
):
    """Today's numbers for the branch."""

    return branch_summary(db, branch_for(user, branch_id))
