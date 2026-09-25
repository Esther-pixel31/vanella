from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.customer import Customer
from app.schemas.customer import CustomerCreate, CustomerUpdate


def get_customer(
    db: Session,
    customer_id: UUID,
) -> Customer | None:

    return db.get(Customer, customer_id)


def get_customer_by_phone(
    db: Session,
    phone_number: str,
) -> Customer | None:

    statement = select(Customer).where(
        Customer.phone_number == phone_number
    )

    return db.scalar(statement)


def create_customer(
    db: Session,
    data: CustomerCreate,
) -> Customer:

    customer = Customer(
        full_name=data.full_name,
        phone_number=data.phone_number,
        physical_address=data.physical_address,
    )

    db.add(customer)
    db.commit()
    db.refresh(customer)

    return customer


def update_customer(
    db: Session,
    customer: Customer,
    data: CustomerUpdate,
) -> Customer:

    update_data = data.model_dump(
        exclude_unset=True
    )

    for field, value in update_data.items():
        setattr(customer, field, value)

    db.commit()
    db.refresh(customer)

    return customer