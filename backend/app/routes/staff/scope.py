"""Which branch a staff request is about."""

from uuid import UUID

from fastapi import HTTPException

from app.models.user import ROLE_ADMIN, User


def branch_for(user: User, branch_id: UUID | None) -> UUID:
    """Staff always work on their own branch. An admin picks one with
    the `branch_id` query parameter."""

    if user.role == ROLE_ADMIN:
        if branch_id is None:
            raise HTTPException(status_code=400, detail="Choose a branch (branch_id)")
        return branch_id

    return user.branch_id


def action_branch(user: User) -> UUID | None:
    """Branch limit for changing an order: staff only their own, admins any."""

    return None if user.role == ROLE_ADMIN else user.branch_id
