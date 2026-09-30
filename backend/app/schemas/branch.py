from uuid import UUID

from pydantic import BaseModel, ConfigDict


class BranchResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: UUID
    name: str
    location: str | None
    latitude: float | None
    longitude: float | None
    is_active: bool