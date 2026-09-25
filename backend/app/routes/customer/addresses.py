from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.address import (
    AddressCreate,
    AddressResponse,
)
from app.services.customer.address_service import (
    create_address,
    get_customer_addresses,
)


router = APIRouter(
    prefix="/addresses",
    tags=["Customer Addresses"],
)


@router.get(
    "/{customer_id}",
    response_model=list[AddressResponse],
)
def list_addresses(
    customer_id: UUID,
    db: Session = Depends(get_db),
):
    return get_customer_addresses(
        db,
        customer_id,
    )


@router.post(
    "/{customer_id}",
    response_model=AddressResponse,
    status_code=201,
)
def add_address(
    customer_id: UUID,
    data: AddressCreate,
    db: Session = Depends(get_db),
):
    return create_address(
        db,
        customer_id,
        data,
    )