from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_customer_id
from app.db.session import get_db
from app.models.payment import Payment
from app.schemas.order import OrderResponse
from app.schemas.payment import MpesaPayRequest, PaymentResponse
from app.services.customer.payment_service import (
    OrderNotFound,
    get_payment_status,
    payment_message,
    start_mpesa_payment,
    switch_to_cash,
)


router = APIRouter(
    prefix="/orders",
    tags=["Customer Payments"],
)


def to_response(payment: Payment) -> PaymentResponse:
    return PaymentResponse(
        id=payment.id,
        order_id=payment.order_id,
        method=payment.method,
        amount=payment.amount,
        status=payment.status,
        phone_number=payment.phone_number,
        mpesa_receipt=payment.mpesa_receipt,
        message=payment_message(payment),
        created_at=payment.created_at,
    )


@router.post(
    "/{order_id}/pay/mpesa",
    response_model=PaymentResponse,
    status_code=201,
)
def pay_with_mpesa(
    order_id: UUID,
    data: MpesaPayRequest,
    customer_id: UUID = Depends(get_current_customer_id),
    db: Session = Depends(get_db),
):

    try:
        payment = start_mpesa_payment(
            db,
            customer_id,
            order_id,
            data.phone_number,
        )
    except OrderNotFound:
        raise HTTPException(
            status_code=404,
            detail="Order not found",
        )
    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    return to_response(payment)


@router.get(
    "/{order_id}/payment",
    response_model=PaymentResponse,
)
def read_payment_status(
    order_id: UUID,
    customer_id: UUID = Depends(get_current_customer_id),
    db: Session = Depends(get_db),
):

    try:
        payment = get_payment_status(
            db,
            customer_id,
            order_id,
        )
    except OrderNotFound:
        raise HTTPException(
            status_code=404,
            detail="Order not found",
        )

    if payment is None:
        raise HTTPException(
            status_code=404,
            detail="No payment has been started for this order",
        )

    return to_response(payment)


@router.post(
    "/{order_id}/pay/cash",
    response_model=OrderResponse,
)
def pay_with_cash(
    order_id: UUID,
    customer_id: UUID = Depends(get_current_customer_id),
    db: Session = Depends(get_db),
):

    try:
        return switch_to_cash(
            db,
            customer_id,
            order_id,
        )
    except OrderNotFound:
        raise HTTPException(
            status_code=404,
            detail="Order not found",
        )
    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )
