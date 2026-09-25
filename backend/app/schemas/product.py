from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ProductResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: UUID

    name: str
    description: str | None

    price: Decimal

    product_type: str

    image_url: str | None

    is_active: bool