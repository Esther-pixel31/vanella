from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class RecentOrderSummary(BaseModel):
    id: UUID
    product_name: str
    placed_at: datetime
    status: str


class HomeSummaryResponse(BaseModel):
    full_name: str
    points_balance: int
    has_unread_notifications: bool
    recent_order: RecentOrderSummary | None