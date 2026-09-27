from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.loyalty import LoyaltyAccount, LoyaltyReward
from app.models.order_item import OrderItem


POINTS_PER_20L_UNIT = 10
POINTS_PER_BULK_UNIT = 100
BULK_PRODUCT_TYPES = {"6000L", "10000L"}

FREE_20L_REWARD = "free_20l"
HALF_OFF_REWARD = "half_off"

REWARD_COSTS = {
    FREE_20L_REWARD: 50,
    HALF_OFF_REWARD: 500,
}


def get_or_create_account(
    db: Session,
    customer_id: UUID,
) -> LoyaltyAccount:

    statement = select(LoyaltyAccount).where(
        LoyaltyAccount.customer_id == customer_id
    )

    account = db.scalar(statement)

    if account is not None:
        return account

    account = LoyaltyAccount(
        customer_id=customer_id,
        points_balance=0,
    )

    db.add(account)
    db.commit()
    db.refresh(account)

    return account


def accrue_points_for_order(
    db: Session,
    customer_id: UUID,
    order_items: list[OrderItem],
    product_type_by_product_id: dict,
) -> LoyaltyAccount:

    account = get_or_create_account(db, customer_id)

    points_earned = 0

    for item in order_items:

        product_type = product_type_by_product_id[item.product_id]

        if product_type == "20L":
            points_earned += POINTS_PER_20L_UNIT * item.quantity

        elif product_type in BULK_PRODUCT_TYPES:
            points_earned += POINTS_PER_BULK_UNIT * item.quantity

    account.points_balance += points_earned

    db.commit()
    db.refresh(account)

    return account


def get_available_rewards(
    db: Session,
    customer_id: UUID,
) -> list[LoyaltyReward]:

    statement = (
        select(LoyaltyReward)
        .where(
            LoyaltyReward.customer_id == customer_id,
            LoyaltyReward.status == "available",
        )
        .order_by(LoyaltyReward.created_at.desc())
    )

    return list(db.scalars(statement).all())


def claim_reward(
    db: Session,
    customer_id: UUID,
    reward_type: str,
) -> LoyaltyReward:

    if reward_type not in REWARD_COSTS:
        raise ValueError(f"Unknown reward type: {reward_type}")

    account = get_or_create_account(db, customer_id)

    points_cost = REWARD_COSTS[reward_type]

    if account.points_balance < points_cost:
        raise ValueError(
            f"Not enough points to claim this reward. "
            f"Need {points_cost}, have {account.points_balance}."
        )

    account.points_balance -= points_cost

    reward = LoyaltyReward(
        customer_id=customer_id,
        reward_type=reward_type,
        points_cost=points_cost,
        discount_percent=50 if reward_type == HALF_OFF_REWARD else None,
        status="available",
    )

    db.add(reward)
    db.commit()
    db.refresh(reward)
    db.refresh(account)

    return reward