from uuid import UUID

from sqlalchemy.orm import Session

from app.schemas.home import HomeSummaryResponse, RecentOrderSummary
from app.services.customer.customer_service import get_customer
from app.services.customer.loyalty_service import get_or_create_account
from app.services.customer.order_service import get_customer_orders


STATUS_MAP = {
    "Order Received": "received",
    "Ready to Deliver": "ready",
    "Delivered": "delivered",
}


def get_home_summary(
    db: Session,
    customer_id: UUID,
) -> HomeSummaryResponse | None:

    customer = get_customer(db, customer_id)

    if customer is None:
        return None

    account = get_or_create_account(db, customer_id)

    orders = get_customer_orders(db, customer_id)

    recent_order = None

    if orders:

        latest = orders[0]

        first_item = latest.order_items[0] if latest.order_items else None

        product_name = (
            first_item.product.name
            if first_item is not None and first_item.product is not None
            else "Order"
        )

        recent_order = RecentOrderSummary(
            id=latest.id,
            product_name=product_name,
            placed_at=latest.created_at,
            status=STATUS_MAP.get(latest.status, "received"),
        )

    return HomeSummaryResponse(
        full_name=customer.full_name,
        points_balance=account.points_balance,
        has_unread_notifications=False,
        recent_order=recent_order,
    )