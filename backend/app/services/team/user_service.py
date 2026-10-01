"""The admin's management of team accounts."""

from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.branch import Branch
from app.models.refresh_token import RefreshToken
from app.models.user import ROLE_ADMIN, User
from app.schemas.team import TeamUserCreate, TeamUserUpdate


class UserNotFound(Exception):
    pass


def list_team_users(
    db: Session,
    role: str | None = None,
    branch_id: UUID | None = None,
) -> list[User]:

    statement = select(User).order_by(User.role, User.full_name)

    if role is not None:
        statement = statement.where(User.role == role)

    if branch_id is not None:
        statement = statement.where(User.branch_id == branch_id)

    return list(db.scalars(statement).all())


def get_team_user(db: Session, user_id: UUID) -> User:

    user = db.get(User, user_id)

    if user is None:
        raise UserNotFound()

    return user


def _check_branch(db: Session, role: str, branch_id: UUID | None) -> None:

    if role == ROLE_ADMIN:
        if branch_id is not None:
            raise ValueError("Admins are not tied to a branch")
        return

    if branch_id is None:
        raise ValueError("Staff and drivers must belong to a branch")

    branch = db.get(Branch, branch_id)

    if branch is None or not branch.is_active:
        raise ValueError("That branch does not exist")


def _check_unique(
    db: Session,
    phone_number: str | None,
    username: str | None,
    exclude_id: UUID | None = None,
) -> None:

    def taken(column, value) -> bool:
        statement = select(User.id).where(column == value)

        if exclude_id is not None:
            statement = statement.where(User.id != exclude_id)

        return db.scalar(statement) is not None

    if phone_number is not None and taken(User.phone_number, phone_number):
        raise ValueError("Another team member already uses this phone number")

    if username is not None and taken(User.username, username):
        raise ValueError("That username is already taken")


def create_team_user(db: Session, data: TeamUserCreate) -> User:

    _check_branch(db, data.role, data.branch_id)
    _check_unique(db, data.phone_number, data.username)

    if (data.username is None) != (data.password is None):
        raise ValueError("Give both a username and a password, or neither")

    user = User(
        full_name=data.full_name.strip(),
        phone_number=data.phone_number,
        role=data.role,
        branch_id=data.branch_id,
        username=data.username,
        password_hash=hash_password(data.password) if data.password else None,
        is_active=True,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


def _revoke_refresh_tokens(db: Session, user_id: UUID) -> None:
    db.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == user_id)
        .values(is_revoked=True)
    )


def update_team_user(
    db: Session,
    user_id: UUID,
    data: TeamUserUpdate,
    acting_admin: User,
) -> User:

    user = get_team_user(db, user_id)
    changes = data.model_fields_set

    if "is_active" in changes and data.is_active is False and user.id == acting_admin.id:
        raise ValueError("You cannot deactivate your own account")

    if "branch_id" in changes:
        _check_branch(db, user.role, data.branch_id)
        user.branch_id = data.branch_id

    _check_unique(
        db,
        data.phone_number if "phone_number" in changes else None,
        data.username if "username" in changes else None,
        exclude_id=user.id,
    )

    if "full_name" in changes and data.full_name:
        user.full_name = data.full_name.strip()

    if "phone_number" in changes and data.phone_number:
        user.phone_number = data.phone_number

    if "username" in changes:
        if data.username is not None and user.password_hash is None and not data.password:
            raise ValueError("Set a password together with the username")

        user.username = data.username

    if "password" in changes and data.password:
        user.password_hash = hash_password(data.password)
        # A reset password logs the account out everywhere.
        _revoke_refresh_tokens(db, user.id)

    if "is_active" in changes and data.is_active is not None:
        user.is_active = data.is_active

        if not data.is_active:
            _revoke_refresh_tokens(db, user.id)

    db.commit()
    db.refresh(user)

    return user
