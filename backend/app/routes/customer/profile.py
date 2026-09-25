from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.customer import CustomerResponse, CustomerUpdate
from app.services.customer.customer_service import (
    get_customer,
    update_customer,
)


router = APIRouter(
    prefix="/profile",
    tags=["Customer Profile"],
)


@router.get(
    "/{customer_id}",
    response_model=CustomerResponse,
)
def read_profile(
    customer_id: UUID,
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
    "/{customer_id}",
    response_model=CustomerResponse,
)
def edit_profile(
    customer_id: UUID,
    data: CustomerUpdate,
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