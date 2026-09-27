from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.loyalty import (
    ClaimRewardRequest,
    LoyaltyRewardResponse,
    LoyaltySummaryResponse,
)
from app.services.customer.loyalty_service import (
    claim_reward,
    get_available_rewards,
    get_or_create_account,
)


router = APIRouter(
    prefix="/rewards",
    tags=["Customer Rewards"],
)


@router.get(
    "/{customer_id}",
    response_model=LoyaltySummaryResponse,
)
def get_rewards_summary(
    customer_id: UUID,
    db: Session = Depends(get_db),
):

    account = get_or_create_account(db, customer_id)
    available = get_available_rewards(db, customer_id)

    return LoyaltySummaryResponse(
        points_balance=account.points_balance,
        available_rewards=available,
    )


@router.post(
    "/{customer_id}/claim",
    response_model=LoyaltyRewardResponse,
    status_code=201,
)
def claim(
    customer_id: UUID,
    data: ClaimRewardRequest,
    db: Session = Depends(get_db),
):

    try:
        return claim_reward(
            db,
            customer_id,
            data.reward_type,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )