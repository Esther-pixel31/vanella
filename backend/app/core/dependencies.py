from uuid import UUID

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import decode_access_token


bearer_scheme = HTTPBearer()


def get_current_customer_id(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> UUID:

    customer_id = decode_access_token(credentials.credentials)

    if customer_id is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired access token",
        )

    return customer_id