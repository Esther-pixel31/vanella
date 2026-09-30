import math
import re
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.order import Order
from app.models.payment import Payment
from app.services.customer.customer_service import get_customer
from app.services.customer.loyalty_service import accrue_points_for_saved_order
from app.services.customer.order_service import get_customer_order
from app.services.payments import mpesa_client
from app.services.payments.mpesa_client import MpesaError


PHONE_PATTERN = re.compile(r"^254[17]\d{8}$")

# A PIN prompt expires on the phone after about a minute. If M-Pesa still
# cannot say what happened after this long, the attempt is treated as failed.
PENDING_TIMEOUT = timedelta(minutes=5)

MPESA_SUCCESS = "0"
MPESA_CANCELLED = "1032"

# Customer-facing text for the result codes M-Pesa commonly returns.
RESULT_MESSAGES = {
    "1": "There is not enough money in your M-Pesa account.",
    "1001": "Another M-Pesa request is open on your phone. Wait a minute and try again.",
    "1019": "The M-Pesa request expired before it was completed.",
    "1025": "M-Pesa could not send the request to your phone. Please try again.",
    "1032": "You cancelled the M-Pesa request.",
    "1037": "The M-Pesa request did not reach your phone in time. Check that it is on and try again.",
    "2001": "The M-Pesa PIN was wrong. Please try again.",
}


class OrderNotFound(Exception):
    pass


def payment_message(payment: Payment) -> str:
    if payment.status == "pending":
        return "Check your phone and enter your M-Pesa PIN."

    if payment.status == "success":
        return "Payment received. Thank you."

    return RESULT_MESSAGES.get(
        payment.result_code or "",
        "The M-Pesa payment did not go through. Please try again.",
    )


def _get_order(db: Session, customer_id: UUID, order_id: UUID) -> Order:
    order = get_customer_order(db, customer_id, order_id)

    if order is None:
        raise OrderNotFound()

    return order


def _latest_payment(db: Session, order_id: UUID) -> Payment | None:
    statement = (
        select(Payment)
        .where(Payment.order_id == order_id)
        .order_by(Payment.created_at.desc())
    )

    return db.scalars(statement).first()


def _amount_to_charge(order: Order) -> int:
    # M-Pesa only accepts whole shillings.
    amount = math.ceil(order.total)

    # Sandbox prompts reach real phones, so charge a token amount there.
    if mpesa_client.is_sandbox() and settings.MPESA_SANDBOX_AMOUNT:
        return settings.MPESA_SANDBOX_AMOUNT

    return amount


def start_mpesa_payment(
    db: Session,
    customer_id: UUID,
    order_id: UUID,
    phone_number: str | None,
) -> Payment:

    order = _get_order(db, customer_id, order_id)

    if order.payment_status == "paid":
        raise ValueError("This order has already been paid for")

    if not mpesa_client.is_configured():
        raise ValueError("M-Pesa payments are not set up yet")

    if phone_number is None:
        phone_number = get_customer(db, customer_id).phone_number

    if not PHONE_PATTERN.match(phone_number):
        raise ValueError("Enter a valid Safaricom number, e.g. 254712345678")

    amount = _amount_to_charge(order)

    if amount < 1:
        raise ValueError("This order has nothing to pay")

    reference = str(order.id)[:8].upper()

    try:
        reply = mpesa_client.stk_push(
            phone_number=phone_number,
            amount=amount,
            reference=reference,
            description="Vanella Water",
        )
    except MpesaError as error:
        print(f"[MPESA] STK push failed for order {order.id}: {error}")
        raise ValueError(
            "We could not send the M-Pesa request. Please try again."
        )

    payment = Payment(
        order_id=order.id,
        method="mpesa",
        amount=amount,
        status="pending",
        phone_number=phone_number,
        merchant_request_id=reply.get("MerchantRequestID"),
        checkout_request_id=reply.get("CheckoutRequestID"),
    )

    order.payment_method = "mpesa"
    order.payment_status = "pending"

    db.add(payment)
    db.commit()
    db.refresh(payment)

    return payment


def _apply_result(
    db: Session,
    payment_id: UUID,
    result_code: str,
    result_desc: str | None,
    receipt: str | None = None,
) -> Payment:
    """Records the final outcome of a payment attempt, exactly once.

    The row lock stops the app's status check and M-Pesa's callback from
    both processing the same payment (and awarding points twice).
    """

    payment = db.scalar(
        select(Payment).where(Payment.id == payment_id).with_for_update()
    )

    if payment.status != "pending":
        db.commit()
        return payment

    payment.result_code = result_code
    payment.result_desc = (result_desc or "")[:255] or None

    order = db.get(Order, payment.order_id)

    if result_code == MPESA_SUCCESS:
        payment.status = "success"
        payment.mpesa_receipt = receipt

        order.payment_method = "mpesa"
        order.payment_status = "paid"

        if not order.points_awarded:
            order.points_awarded = True
            accrue_points_for_saved_order(db, order)

    else:
        payment.status = (
            "cancelled" if result_code == MPESA_CANCELLED else "failed"
        )

        # A late failure must not undo a payment that already succeeded,
        # or a switch to cash.
        if order.payment_method == "mpesa" and order.payment_status != "paid":
            order.payment_status = "failed"

    db.commit()
    db.refresh(payment)

    return payment


def _refresh_pending(
    db: Session,
    payment: Payment,
    receipt: str | None = None,
) -> Payment:
    """Asks M-Pesa for the outcome of a pending attempt and records it."""

    if payment.status != "pending" or not payment.checkout_request_id:
        return payment

    try:
        result = mpesa_client.stk_query(payment.checkout_request_id)
    except MpesaError as error:
        print(f"[MPESA] Status query failed for payment {payment.id}: {error}")
        result = None

    if result is not None:
        return _apply_result(
            db,
            payment.id,
            str(result.get("ResultCode")),
            result.get("ResultDesc"),
            receipt,
        )

    created_at = payment.created_at

    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)

    if datetime.now(timezone.utc) - created_at > PENDING_TIMEOUT:
        return _apply_result(
            db,
            payment.id,
            "1037",
            "No result received from M-Pesa",
        )

    return payment


def get_payment_status(
    db: Session,
    customer_id: UUID,
    order_id: UUID,
) -> Payment | None:

    order = _get_order(db, customer_id, order_id)

    payment = _latest_payment(db, order.id)

    if payment is None:
        return None

    return _refresh_pending(db, payment)


def switch_to_cash(
    db: Session,
    customer_id: UUID,
    order_id: UUID,
) -> Order:

    order = _get_order(db, customer_id, order_id)

    if order.payment_status == "paid":
        raise ValueError("This order has already been paid for")

    order.payment_method = "cash"
    order.payment_status = "unpaid"

    if not order.points_awarded:
        order.points_awarded = True
        accrue_points_for_saved_order(db, order)

    db.commit()
    db.refresh(order)

    return order


def _callback_receipt(callback: dict) -> str | None:
    items = (callback.get("CallbackMetadata") or {}).get("Item") or []

    for item in items:
        if item.get("Name") == "MpesaReceiptNumber":
            return str(item.get("Value"))

    return None


def handle_mpesa_callback(db: Session, body: dict) -> None:
    """Handles M-Pesa's "payment finished" notification.

    The callback URL is public, so its contents are NOT trusted: they only
    prompt a status check made directly with M-Pesa. The one thing taken
    from the callback is the receipt number, and only once M-Pesa itself
    confirms the payment succeeded.
    """

    callback = (body.get("Body") or {}).get("stkCallback") or {}
    checkout_request_id = callback.get("CheckoutRequestID")

    if not checkout_request_id:
        return

    payment = db.scalar(
        select(Payment).where(
            Payment.checkout_request_id == checkout_request_id
        )
    )

    if payment is None:
        return

    _refresh_pending(db, payment, receipt=_callback_receipt(callback))
