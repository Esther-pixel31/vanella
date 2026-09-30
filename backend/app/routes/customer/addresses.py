from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_customer_id
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
    "",
    response_model=list[AddressResponse],
)
def list_addresses(
    customer_id: UUID = Depends(get_current_customer_id),
    db: Session = Depends(get_db),
):
    return get_customer_addresses(
        db,
        customer_id,
    )


@router.post(
    "",
    response_model=AddressResponse,
    status_code=201,
)
def add_address(
    data: AddressCreate,
    customer_id: UUID = Depends(get_current_customer_id),
    db: Session = Depends(get_db),
):
    return create_address(
        db,
        customer_id,
        data,
    )