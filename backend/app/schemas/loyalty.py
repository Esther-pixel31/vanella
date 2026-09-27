from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class LoyaltyAccountResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

    customer_id: UUID
    points_balance: int


class LoyaltyRewardResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: UUID
    reward_type: str
    points_cost: int
    discount_percent: int | None
    status: str
    order_id: UUID | None
    created_at: datetime
    applied_at: datetime | None


class LoyaltySummaryResponse(BaseModel):
    points_balance: int
    available_rewards: list[LoyaltyRewardResponse]


class ClaimRewardRequest(BaseModel):
    reward_type: str