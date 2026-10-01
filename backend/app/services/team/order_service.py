"""What staff and drivers can see and do with orders."""

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models.branch import Branch
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.user import ROLE_DRIVER, User
from app.schemas.staff import (
    BranchDriverResponse,
    OrderAddress,
    OrderBranch,
    OrderCustomer,
    OrderPerson,
    StaffSummaryResponse,
    TeamOrderItem,
    TeamOrderResponse,
)
from app.services.customer.loyalty_service import accrue_points_for_saved_order


STATUS_RECEIVED = "Order Received"
STATUS_READY = "Ready to Deliver"
# Set automatically once an order is ready and has a driver; nobody picks it.
STATUS_ON_THE_WAY = "On the Way"
STATUS_DELIVERED = "Delivered"

# Wrong delivery codes allowed before the driver must ask the branch.
MAX_CODE_ATTEMPTS = 5

# Filters for the staff order list.
VIEW_NEW = "new"
VIEW_READY = "ready"
VIEW_ON_THE_WAY = "on_the_way"
VIEW_DELIVERED = "delivered"
VIEW_AWAITING_PAYMENT = "awaiting_payment"
VIEWS = {VIEW_NEW, VIEW_READY, VIEW_ON_THE_WAY, VIEW_DELIVERED, VIEW_AWAITING_PAYMENT}

VIEW_STATUSES = {
    VIEW_NEW: STATUS_RECEIVED,
    VIEW_READY: STATUS_READY,
    VIEW_ON_THE_WAY: STATUS_ON_THE_WAY,
}

# Kenya has no daylight saving, so a fixed offset is exact.
NAIROBI = timezone(timedelta(hours=3))


class OrderNotFound(Exception):
    pass


def _today_start() -> datetime:
    now = datetime.now(NAIROBI)
    return now.replace(hour=0, minute=0, second=0, microsecond=0)


def _awaiting_payment_clause():
    return (Order.payment_method == "mpesa") & (Order.payment_status != "paid")


def is_awaiting_payment(order: Order) -> bool:
    return order.payment_method == "mpesa" and order.payment_status != "paid"


def _with_details(statement):
    return statement.options(
        selectinload(Order.order_items).selectinload(OrderItem.product),
        selectinload(Order.customer),
        selectinload(Order.address),
        selectinload(Order.branch),
        selectinload(Order.driver),
    )


def to_team_order(order: Order) -> TeamOrderResponse:

    driver = order.driver

    return TeamOrderResponse(
        id=order.id,
        status=order.status,
        payment_method=order.payment_method,
        payment_status=order.payment_status,
        awaiting_payment=is_awaiting_payment(order),
        subtotal=order.subtotal,
        delivery_fee=order.delivery_fee,
        total=order.total,
        customer_note=order.customer_note,
        customer=OrderCustomer(
            id=order.customer.id,
            full_name=order.customer.full_name,
            phone_number=order.customer.phone_number,
        ),
        address=OrderAddress(
            label=order.address.label,
            address_line=order.address.address_line,
            latitude=order.address.latitude,
            longitude=order.address.longitude,
        ),
        branch=OrderBranch(id=order.branch.id, name=order.branch.name),
        driver=(
            OrderPerson(id=driver.id, full_name=driver.full_name, phone_number=driver.phone_number)
            if driver is not None
            else None
        ),
        items=[
            TeamOrderItem(
                product_name=item.product.name if item.product else "Water",
                quantity=item.quantity,
                unit_price=item.unit_price,
                line_total=item.line_total,
                is_free=item.line_total == 0,
            )
            for item in order.order_items
        ],
        created_at=order.created_at,
        ready_at=order.ready_at,
        dispatched_at=order.dispatched_at,
        promised_by=order.promised_by,
        is_scheduled=order.is_scheduled,
        delivered_at=order.delivered_at,
        cash_confirmed_at=order.cash_confirmed_at,
    )


# ---------------------------------------------------------------- reading

def list_branch_orders(db: Session, branch_id: UUID, view: str) -> list[Order]:

    statement = _with_details(select(Order).where(Order.branch_id == branch_id))

    if view == VIEW_AWAITING_PAYMENT:
        statement = statement.where(_awaiting_payment_clause()).order_by(Order.created_at.desc())

    elif view == VIEW_DELIVERED:
        statement = statement.where(
            Order.status == STATUS_DELIVERED,
            Order.delivered_at >= _today_start(),
        ).order_by(Order.delivered_at.desc())

    else:
        # Oldest first: the order waiting longest is handled first.
        statement = statement.where(
            Order.status == VIEW_STATUSES[view],
            ~_awaiting_payment_clause(),
        ).order_by(Order.created_at)

    return list(db.scalars(statement).all())


def get_branch_order(
    db: Session,
    order_id: UUID,
    branch_id: UUID | None,
    lock: bool = False,
) -> Order:
    """An order of `branch_id` (any branch when None)."""

    statement = select(Order).where(Order.id == order_id)

    if branch_id is not None:
        statement = statement.where(Order.branch_id == branch_id)

    if lock:
        # Stops two people changing the same order at the same moment.
        statement = statement.with_for_update(of=Order)

    order = db.scalar(statement)

    if order is None:
        raise OrderNotFound()

    return order


def load_details(db: Session, order_id: UUID) -> Order:
    return db.scalar(_with_details(select(Order).where(Order.id == order_id)).execution_options(populate_existing=True))


# ---------------------------------------------------------------- actions

def _check_preparable(order: Order) -> None:
    if is_awaiting_payment(order):
        raise ValueError("This order is waiting for M-Pesa payment")


def _dispatch_if_possible(order: Order) -> None:
    """A ready order with a driver goes on its way by itself."""

    if order.status == STATUS_READY and order.driver_id is not None:
        order.status = STATUS_ON_THE_WAY
        order.dispatched_at = datetime.now(timezone.utc)


def mark_ready(db: Session, order_id: UUID, branch_id: UUID | None) -> Order:

    order = get_branch_order(db, order_id, branch_id, lock=True)
    _check_preparable(order)

    if order.status != STATUS_RECEIVED:
        raise ValueError(f"This order is already {order.status.lower()}")

    order.status = STATUS_READY
    order.ready_at = datetime.now(timezone.utc)
    _dispatch_if_possible(order)
    db.commit()

    return load_details(db, order.id)


def assign_driver(
    db: Session,
    order_id: UUID,
    driver_id: UUID,
    branch_id: UUID | None,
) -> Order:

    order = get_branch_order(db, order_id, branch_id, lock=True)
    _check_preparable(order)

    if order.status == STATUS_DELIVERED:
        raise ValueError("This order has already been delivered")

    driver = db.get(User, driver_id)

    if (
        driver is None
        or driver.role != ROLE_DRIVER
        or not driver.is_active
        or driver.branch_id != order.branch_id
    ):
        raise ValueError("Choose an active driver from this order's branch")

    order.driver_id = driver.id
    _dispatch_if_possible(order)
    db.commit()

    return load_details(db, order.id)


def _check_deliverable(order: Order) -> None:
    _check_preparable(order)

    if order.status == STATUS_DELIVERED:
        raise ValueError("This order has already been delivered")

    if order.status != STATUS_ON_THE_WAY:
        raise ValueError("This order is not on its way yet")


def _finish_delivery(order: Order, by: User | None) -> None:
    now = datetime.now(timezone.utc)

    order.status = STATUS_DELIVERED
    order.delivered_at = now

    # The code proves the driver met the customer, so for cash orders it
    # also confirms the cash was collected. No staff step is needed.
    if by is not None and order.payment_method == "cash" and order.payment_status != "paid":
        order.payment_status = "paid"
        order.cash_confirmed_at = now
        order.cash_confirmed_by_id = by.id


def deliver_with_code(db: Session, order_id: UUID, driver: User, code: str) -> Order:
    """The driver finishes a delivery with the customer's 4-digit code."""

    order = get_branch_order(db, order_id, None, lock=True)

    if order.driver_id != driver.id:
        raise OrderNotFound()

    _check_deliverable(order)

    if order.delivery_code_attempts >= MAX_CODE_ATTEMPTS:
        raise ValueError("Too many wrong codes. Call the branch to finish this delivery.")

    if code.strip() != order.delivery_code:
        order.delivery_code_attempts += 1
        db.commit()

        left = MAX_CODE_ATTEMPTS - order.delivery_code_attempts

        if left <= 0:
            raise ValueError("Too many wrong codes. Call the branch to finish this delivery.")

        raise ValueError(f"Wrong code. Ask the customer for the code in their app ({left} tries left).")

    _finish_delivery(order, driver)
    db.commit()

    return load_details(db, order.id)


def mark_delivered(db: Session, order_id: UUID, branch_id: UUID | None) -> Order:
    """Staff override, for when the code cannot be used (e.g. the
    customer's phone is off). Cash is then confirmed separately."""

    order = get_branch_order(db, order_id, branch_id, lock=True)
    _check_deliverable(order)

    _finish_delivery(order, None)
    db.commit()

    return load_details(db, order.id)


def confirm_cash(
    db: Session,
    order_id: UUID,
    branch_id: UUID | None,
    staff: User,
) -> Order:

    order = get_branch_order(db, order_id, branch_id, lock=True)

    if order.payment_method != "cash":
        raise ValueError("This order is not paid in cash")

    if order.payment_status == "paid":
        raise ValueError("Cash for this order was already confirmed")

    order.payment_status = "paid"
    order.cash_confirmed_at = datetime.now(timezone.utc)
    order.cash_confirmed_by_id = staff.id

    # Cash orders normally earn points when placed; this is a safety net.
    if not order.points_awarded:
        order.points_awarded = True
        accrue_points_for_saved_order(db, order)

    db.commit()

    return load_details(db, order.id)


# ---------------------------------------------------------------- drivers

def list_branch_drivers(db: Session, branch_id: UUID) -> list[BranchDriverResponse]:

    drivers = db.scalars(
        select(User)
        .where(
            User.role == ROLE_DRIVER,
            User.branch_id == branch_id,
            User.is_active.is_(True),
        )
        .order_by(User.full_name)
    ).all()

    counts = dict(
        db.execute(
            select(Order.driver_id, func.count())
            .where(Order.status == STATUS_ON_THE_WAY, Order.driver_id.is_not(None))
            .group_by(Order.driver_id)
        ).all()
    )

    return [
        BranchDriverResponse(
            id=driver.id,
            full_name=driver.full_name,
            phone_number=driver.phone_number,
            active_deliveries=counts.get(driver.id, 0),
        )
        for driver in drivers
    ]


def list_driver_deliveries(db: Session, driver_id: UUID, done: bool) -> list[Order]:

    statement = _with_details(select(Order).where(Order.driver_id == driver_id))

    if done:
        statement = statement.where(
            Order.status == STATUS_DELIVERED,
            Order.delivered_at >= _today_start(),
        ).order_by(Order.delivered_at.desc())
    else:
        # Assigned orders not yet delivered: on the way first, then those
        # still being prepared.
        statement = statement.where(Order.status != STATUS_DELIVERED).order_by(
            Order.dispatched_at.is_(None), Order.dispatched_at, Order.created_at
        )

    return list(db.scalars(statement).all())


# ---------------------------------------------------------------- summary

def branch_summary(db: Session, branch_id: UUID) -> StaffSummaryResponse:

    branch = db.get(Branch, branch_id)
    start = _today_start()
    zero = Decimal("0")

    def count(*conditions) -> int:
        return db.scalar(select(func.count()).select_from(Order).where(Order.branch_id == branch_id, *conditions)) or 0

    def total(*conditions) -> Decimal:
        return db.scalar(select(func.coalesce(func.sum(Order.total), 0)).where(Order.branch_id == branch_id, *conditions)) or zero

    not_awaiting = ~_awaiting_payment_clause()
    cash = Order.payment_method == "cash"
    unpaid = Order.payment_status != "paid"

    return StaffSummaryResponse(
        branch=OrderBranch(id=branch.id, name=branch.name),
        date=start.date().isoformat(),
        orders_today=count(Order.created_at >= start, not_awaiting),
        awaiting_payment=count(_awaiting_payment_clause()),
        new_orders=count(Order.status == STATUS_RECEIVED, not_awaiting),
        ready_orders=count(Order.status == STATUS_READY, not_awaiting),
        on_the_way=count(Order.status == STATUS_ON_THE_WAY),
        delivered_today=count(Order.status == STATUS_DELIVERED, Order.delivered_at >= start),
        mpesa_received=total(
            Order.payment_method == "mpesa",
            Order.payment_status == "paid",
            Order.created_at >= start,
        ),
        cash_collected=total(cash, Order.cash_confirmed_at >= start),
        cash_to_collect=total(cash, unpaid),
        cash_delivered_unconfirmed=total(cash, unpaid, Order.status == STATUS_DELIVERED),
    )


def record_driver_location(db: Session, driver: User, latitude: float, longitude: float) -> None:
    driver.last_latitude = latitude
    driver.last_longitude = longitude
    driver.last_location_at = datetime.now(timezone.utc)
    db.commit()
