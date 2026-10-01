import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID

from jose import JWTError, jwt

from app.core.config import settings


ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 30


# Tokens issued before roles existed carry no "role"; they are customers.
ROLE_CUSTOMER = "customer"

PASSWORD_HASH_ITERATIONS = 600_000


def create_access_token(subject_id: UUID, role: str = ROLE_CUSTOMER) -> str:
    """`subject_id` is a customer id, or a team user id for other roles."""

    expire = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload = {
        "sub": str(subject_id),
        "role": role,
        "type": "access",
        "exp": expire,
    }

    return jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def decode_access_token(token: str) -> tuple[UUID, str] | None:
    """Returns (subject id, role), or None if the token is not valid."""

    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
    except JWTError:
        return None

    if payload.get("type") != "access":
        return None

    subject = payload.get("sub")

    if subject is None:
        return None

    try:
        subject_id = UUID(subject)
    except ValueError:
        return None

    return subject_id, payload.get("role", ROLE_CUSTOMER)


def hash_password(password: str) -> str:
    """Salted PBKDF2-SHA256, stored as "pbkdf2_sha256$iterations$salt$hash"."""

    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode(), salt.encode(), PASSWORD_HASH_ITERATIONS
    ).hex()

    return f"pbkdf2_sha256${PASSWORD_HASH_ITERATIONS}${salt}${digest}"


def verify_password(password: str, stored: str | None) -> bool:

    if not stored:
        return False

    try:
        algorithm, iterations, salt, digest = stored.split("$")
    except ValueError:
        return False

    if algorithm != "pbkdf2_sha256":
        return False

    candidate = hashlib.pbkdf2_hmac(
        "sha256", password.encode(), salt.encode(), int(iterations)
    ).hex()

    return secrets.compare_digest(candidate, digest)


def generate_refresh_token() -> str:
    return secrets.token_urlsafe(64)


def hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode()).hexdigest()


def generate_otp_code() -> str:
    return f"{secrets.randbelow(1000000):06d}"


def refresh_token_expiry() -> datetime:
    return datetime.now(timezone.utc) + timedelta(
        days=REFRESH_TOKEN_EXPIRE_DAYS
    )


def otp_expiry(minutes: int = 5) -> datetime:
    return datetime.now(timezone.utc) + timedelta(minutes=minutes)