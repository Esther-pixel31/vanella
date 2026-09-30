from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.customer.payment_service import handle_mpesa_callback


router = APIRouter(
    prefix="/api/payments",
    tags=["Payment Callbacks"],
)


@router.post("/mpesa/callback")
async def mpesa_callback(
    request: Request,
    db: Session = Depends(get_db),
):
    """Called by Safaricom, not by the app. Public by necessity, so the
    body is only used as a prompt to check the payment with M-Pesa."""

    try:
        body = await request.json()
    except Exception:
        body = {}

    if isinstance(body, dict):
        try:
            handle_mpesa_callback(db, body)
        except Exception as error:
            # Never fail the callback: the app's status check will
            # pick the payment up instead.
            print(f"[MPESA] Callback handling failed: {error}")

    return {
        "ResultCode": 0,
        "ResultDesc": "Accepted",
    }
