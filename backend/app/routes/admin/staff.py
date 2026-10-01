"""The admin's management of branch staff and other admins."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import require_roles
from app.db.session import get_db
from app.models.user import ROLE_ADMIN, ROLE_DRIVER, ROLE_STAFF, User
from app.schemas.team import TeamUserCreate, TeamUserResponse, TeamUserUpdate
from app.services.team.auth_service import to_team_user_response
from app.services.team.user_service import (
    UserNotFound,
    create_team_user,
    get_team_user,
    list_team_users,
    update_team_user,
)


admin_only = require_roles(ROLE_ADMIN)


def build_team_router(prefix: str, tag: str, roles: set[str]) -> APIRouter:
    """List / create / edit team accounts whose role is in `roles`.

    Staff (with admins) and drivers get one router each, sharing this code.
    """

    router = APIRouter(prefix=prefix, tags=[tag])

    def load(db: Session, user_id: UUID) -> User:
        try:
            user = get_team_user(db, user_id)
        except UserNotFound:
            user = None

        if user is None or user.role not in roles:
            raise HTTPException(status_code=404, detail="Account not found")

        return user

    @router.get("", response_model=list[TeamUserResponse])
    def list_accounts(
        branch_id: UUID | None = None,
        db: Session = Depends(get_db),
        admin: User = Depends(admin_only),
    ):
        users = [
            user
            for user in list_team_users(db, branch_id=branch_id)
            if user.role in roles
        ]

        return [to_team_user_response(user) for user in users]

    @router.post("", response_model=TeamUserResponse, status_code=201)
    def create_account(
        data: TeamUserCreate,
        db: Session = Depends(get_db),
        admin: User = Depends(admin_only),
    ):
        if data.role not in roles:
            raise HTTPException(
                status_code=400,
                detail=f"Use a role of: {', '.join(sorted(roles))}",
            )

        try:
            return to_team_user_response(create_team_user(db, data))
        except ValueError as error:
            raise HTTPException(status_code=400, detail=str(error))

    @router.get("/{user_id}", response_model=TeamUserResponse)
    def read_account(
        user_id: UUID,
        db: Session = Depends(get_db),
        admin: User = Depends(admin_only),
    ):
        return to_team_user_response(load(db, user_id))

    @router.patch("/{user_id}", response_model=TeamUserResponse)
    def edit_account(
        user_id: UUID,
        data: TeamUserUpdate,
        db: Session = Depends(get_db),
        admin: User = Depends(admin_only),
    ):
        load(db, user_id)

        try:
            return to_team_user_response(update_team_user(db, user_id, data, admin))
        except ValueError as error:
            raise HTTPException(status_code=400, detail=str(error))

    return router


router = build_team_router("/staff", "Admin · Staff", {ROLE_STAFF, ROLE_ADMIN})
drivers_router = build_team_router("/drivers", "Admin · Drivers", {ROLE_DRIVER})
