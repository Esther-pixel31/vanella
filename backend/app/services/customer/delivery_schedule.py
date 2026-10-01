"""When an order will be delivered: opening hours and delivery targets."""

import secrets
from datetime import datetime, time, timedelta, timezone


# Kenya has no daylight saving, so a fixed offset is exact.
NAIROBI = timezone(timedelta(hours=3))

# Deliveries go out between these hours. Orders placed outside them are
# delivered from the next opening time.
OPENING_TIME = time(8, 0)
CLOSING_TIME = time(20, 0)

# Promised delivery time, counted from when the order can start.
TARGET_20L = timedelta(minutes=45)
TARGET_BULK = timedelta(hours=3)

BULK_PRODUCT_TYPES = {"6000L", "10000L"}


def plan_delivery(
    product_types: list[str],
    now: datetime | None = None,
) -> tuple[datetime, bool]:
    """Returns (promised_by, is_scheduled).

    `is_scheduled` is True when the order was placed outside delivery hours
    and waits for the next opening time.
    """

    now = (now or datetime.now(timezone.utc)).astimezone(NAIROBI)
    today = now.date()

    if now.time() < OPENING_TIME:
        start = datetime.combine(today, OPENING_TIME, NAIROBI)
        is_scheduled = True
    elif now.time() >= CLOSING_TIME:
        start = datetime.combine(today + timedelta(days=1), OPENING_TIME, NAIROBI)
        is_scheduled = True
    else:
        start = now
        is_scheduled = False

    has_bulk = any(product_type in BULK_PRODUCT_TYPES for product_type in product_types)
    target = TARGET_BULK if has_bulk else TARGET_20L

    return (start + target).astimezone(timezone.utc), is_scheduled


def new_delivery_code() -> str:
    """The 4-digit code the customer gives the driver at the door."""

    return f"{secrets.randbelow(10000):04d}"
