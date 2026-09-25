from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.models.address import Address
from app.schemas.address import AddressCreate


def get_customer_addresses(
    db: Session,
    customer_id: UUID,
) -> list[Address]:

    statement = (
        select(Address)
        .where(
            Address.customer_id == customer_id
        )
        .order_by(
            Address.is_default.desc(),
            Address.created_at.desc(),
        )
    )

    return list(
        db.scalars(statement).all()
    )


def create_address(
    db: Session,
    customer_id: UUID,
    data: AddressCreate,
) -> Address:

    if data.is_default:

        statement = (
            update(Address)
            .where(
                Address.customer_id == customer_id
            )
            .values(
                is_default=False
            )
        )

        db.execute(statement)


    address = Address(
        customer_id=customer_id,
        label=data.label,
        address_line=data.address_line,
        area=data.area,
        delivery_instructions=data.delivery_instructions,
        is_default=data.is_default,
    )

    db.add(address)
    db.commit()
    db.refresh(address)

    return address