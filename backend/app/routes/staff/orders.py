from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import require_roles
from app.db.session import get_db
from app.models.user import ROLE_ADMIN, ROLE_STAFF, User
from app.routes.staff.scope import action_branch, branch_for
from app.schemas.staff import AssignDriverRequest, BranchDriverResponse, TeamOrderResponse
from app.services.team.order_service import (
    VIEWS,
    OrderNotFound,
    assign_driver,
    confirm_cash,
    get_branch_order,
    list_branch_drivers,
    list_branch_orders,
    load_details,
    mark_delivered,
    mark_ready,
    to_team_order,
)


router = APIRouter(
    tags=["Staff Orders"],
)

staff_or_admin = require_roles(ROLE_STAFF, ROLE_ADMIN)


def run(action):
    """Runs an order action, turning its errors into HTTP replies."""

    try:
        return to_team_order(action())
    except OrderNotFound:
        raise HTTPException(status_code=404, detail="Order not found")
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))


@router.get("/orders", response_model=list[TeamOrderResponse])
def list_orders(
    view: str = "new",
    branch_id: UUID | None = None,
    user: User = Depends(staff_or_admin),
    db: Session = Depends(get_db),
):
    """`view`: new, ready, delivered (today) or awaiting_payment."""

    if view not in VIEWS:
        raise HTTPException(status_code=400, detail=f"view must be one of: {', '.join(sorted(VIEWS))}")

    orders = list_branch_orders(db, branch_for(user, branch_id), view)

    return [to_team_order(order) for order in orders]


@router.get("/orders/{order_id}", response_model=TeamOrderResponse)
def read_order(
    order_id: UUID,
    user: User = Depends(staff_or_admin),
    db: Session = Depends(get_db),
):
    def load():
        get_branch_order(db, order_id, action_branch(user))
        return load_details(db, order_id)

    return run(load)


@router.post("/orders/{order_id}/ready", response_model=TeamOrderResponse)
def ready(
    order_id: UUID,
    user: User = Depends(staff_or_admin),
    db: Session = Depends(get_db),
):
    return run(lambda: mark_ready(db, order_id, action_branch(user)))


@router.post("/orders/{order_id}/assign-driver", response_model=TeamOrderResponse)
def assign(
    order_id: UUID,
    data: AssignDriverRequest,
    user: User = Depends(staff_or_admin),
    db: Session = Depends(get_db),
):
    return run(lambda: assign_driver(db, order_id, data.driver_id, action_branch(user)))


@router.post("/orders/{order_id}/deliver", response_model=TeamOrderResponse)
def deliver(
    order_id: UUID,
    user: User = Depends(staff_or_admin),
    db: Session = Depends(get_db),
):
    return run(lambda: mark_delivered(db, order_id, action_branch(user)))


@router.post("/orders/{order_id}/confirm-cash", response_model=TeamOrderResponse)
def cash(
    order_id: UUID,
    user: User = Depends(staff_or_admin),
    db: Session = Depends(get_db),
):
    return run(lambda: confirm_cash(db, order_id, action_branch(user), user))


@router.get("/drivers", response_model=list[BranchDriverResponse])
def drivers(
    branch_id: UUID | None = None,
    user: User = Depends(staff_or_admin),
    db: Session = Depends(get_db),
):
    """The branch's active drivers, for assigning."""

    return list_branch_drivers(db, branch_for(user, branch_id))
