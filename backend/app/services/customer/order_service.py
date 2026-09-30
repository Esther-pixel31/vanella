from decimal import Decimal, ROUND_HALF_UP
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.loyalty import LoyaltyReward
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.product import Product
from app.schemas.order import OrderCreate
from app.services.customer.loyalty_service import (
    BULK_PRODUCT_TYPES,
    FREE_20L_REWARD,
    HALF_OFF_REWARD,
    accrue_points_for_order,
)


def create_order(
    db: Session,
    customer_id: UUID,
    data: OrderCreate,
) -> Order:

    product_ids = [item.product_id for item in data.items]

    statement = (
        select(Product)
        .where(
            Product.id.in_(product_ids),
            Product.is_active.is_(True),
        )
    )

    products = list(
        db.scalars(statement).all()
    )

    products_by_id = {product.id: product for product in products}

    if len(products_by_id) != len(set(product_ids)):
        raise ValueError("One or more products are invalid or inactive")

    order_items = []
    accrual_items = []
    subtotal = Decimal("0")
    has_bulk_item = False

    for item in data.items:

        product = products_by_id[item.product_id]

        if product.product_type in BULK_PRODUCT_TYPES:
            has_bulk_item = True

        line_total = product.price * item.quantity
        subtotal += line_total

        order_item = OrderItem(
            product_id=product.id,
            quantity=item.quantity,
            unit_price=product.price,
            line_total=line_total,
        )

        order_items.append(order_item)
        accrual_items.append((order_item, product.product_type))

    reward = None

    if data.reward_id is not None:

        reward = db.get(LoyaltyReward, data.reward_id)

        if reward is None or reward.customer_id != customer_id:
            raise ValueError("Reward not found")

        if reward.status != "available":
            raise ValueError("Reward has already been applied or is not available")

        if reward.reward_type == HALF_OFF_REWARD and not has_bulk_item:
            raise ValueError(
                "The 50% off reward can only be applied to orders containing a bulk water purchase"
            )

    if reward is not None and reward.reward_type == FREE_20L_REWARD:

        statement = select(Product).where(
            Product.product_type == "20L",
            Product.is_active.is_(True),
        )

        free_20l_product = db.scalar(statement)

        if free_20l_product is None:
            raise ValueError("20L product is not available to redeem this reward")

        free_order_item = OrderItem(
            product_id=free_20l_product.id,
            quantity=1,
            unit_price=Decimal("0"),
            line_total=Decimal("0"),
        )

        order_items.append(free_order_item)
        # Note: no entry added to accrual_items — the free bottle earns 0 points.

    discount_amount = Decimal("0")

    if reward is not None and reward.reward_type == HALF_OFF_REWARD:

        bulk_total = sum(
            (
                order_item.line_total
                for order_item, product_type in accrual_items
                if product_type in BULK_PRODUCT_TYPES
            ),
            Decimal("0"),
        )

        discount_amount = (bulk_total * Decimal("0.5")).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )

    delivery_fee = Decimal("0")
    total = subtotal - discount_amount + delivery_fee

    # M-Pesa orders earn their points only once the payment succeeds
    # (see payment_service); cash orders earn them straight away.
    pays_by_mpesa = data.payment_method == "mpesa"

    order = Order(
        customer_id=customer_id,
        branch_id=data.branch_id,
        address_id=data.address_id,
        customer_note=data.customer_note,
        payment_method=data.payment_method,
        payment_status="pending" if pays_by_mpesa else "unpaid",
        points_awarded=not pays_by_mpesa,
        subtotal=subtotal,
        delivery_fee=delivery_fee,
        total=total,
        order_items=order_items,
    )

    db.add(order)
    db.flush()

    if reward is not None:
        reward.status = "applied"
        reward.order_id = order.id

    if not pays_by_mpesa:
        accrue_points_for_order(
            db,
            customer_id,
            [order_item for order_item, _ in accrual_items],
            {order_item.product_id: product_type for order_item, product_type in accrual_items},
        )

    db.commit()
    db.refresh(order)

    return order


def get_customer_orders(
    db: Session,
    customer_id: UUID,
) -> list[Order]:

    statement = (
        select(Order)
        .where(
            Order.customer_id == customer_id
        )
        .order_by(
            Order.created_at.desc()
        )
    )

    return list(
        db.scalars(statement).all()
    )


def get_customer_order(
    db: Session,
    customer_id: UUID,
    order_id: UUID,
) -> Order | None:

    statement = (
        select(Order)
        .where(
            Order.id == order_id,
            Order.customer_id == customer_id,
        )
    )

    return db.scalars(statement).first()