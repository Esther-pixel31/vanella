from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.branch import Branch


def get_active_branches(
    db: Session,
) -> list[Branch]:

    statement = (
        select(Branch)
        .where(
            Branch.is_active.is_(True)
        )
        .order_by(Branch.name)
    )

    return list(
        db.scalars(statement).all()
    )