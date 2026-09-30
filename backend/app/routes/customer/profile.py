from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_customer_id
from app.db.session import get_db
from app.schemas.customer import (
    CustomerCreate,
    CustomerResponse,
    CustomerUpdate,
)
from app.services.customer.customer_service import (
    create_customer,
    get_customer,
    get_customer_by_phone,
    update_customer,
)


router = APIRouter(
    prefix="/profile",
    tags=["Customer Profile"],
)


@router.post(
    "",
    response_model=CustomerResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_customer(
    data: CustomerCreate,
    db: Session = Depends(get_db),
):

    existing = get_customer_by_phone(
        db,
        data.phone_number,
    )

    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A customer with this phone number is already registered",
        )

    return create_customer(
        db,
        data,
    )


@router.get(
    "",
    response_model=CustomerResponse,
)
def read_profile(
    customer_id: UUID = Depends(get_current_customer_id),
    db: Session = Depends(get_db),
):

    customer = get_customer(
        db,
        customer_id,
    )

    if customer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found",
        )

    return customer


@router.patch(
    "",
    response_model=CustomerResponse,
)
def edit_profile(
    data: CustomerUpdate,
    customer_id: UUID = Depends(get_current_customer_id),
    db: Session = Depends(get_db),
):

    customer = get_customer(
        db,
        customer_id,
    )

    if customer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found",
        )

    return update_customer(
        db,
        customer,
        data,
    )