"""Thin client for Safaricom's Daraja API (M-Pesa Express / STK push).

Uses only the standard library so no extra package is needed.
"""

import base64
import json
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone

from app.core.config import settings


SANDBOX_BASE_URL = "https://sandbox.safaricom.co.ke"
LIVE_BASE_URL = "https://api.safaricom.co.ke"

REQUEST_TIMEOUT_SECONDS = 30

# Daraja expects timestamps in Kenyan time (UTC+3).
NAIROBI = timezone(timedelta(hours=3))

# Status-query result codes meaning "the customer has not finished yet".
STILL_PROCESSING_CODES = {"4999"}

_token_cache = {"token": None, "expires_at": 0.0}


class MpesaError(Exception):
    """Daraja could not be reached, or rejected the request."""


def is_configured() -> bool:
    return bool(
        settings.MPESA_CONSUMER_KEY
        and settings.MPESA_CONSUMER_SECRET
        and settings.MPESA_CALLBACK_URL
    )


def shortcode_for_branch(branch_name: str) -> str | None:
    """The PayBill a branch's payments go to."""

    return (
        settings.MPESA_BRANCH_SHORTCODES.get(branch_name)
        or settings.MPESA_SHORTCODE
    )


def _passkey_for(shortcode: str) -> str:
    passkey = settings.MPESA_PASSKEYS.get(shortcode)

    if passkey:
        return passkey

    if shortcode == settings.MPESA_SHORTCODE and settings.MPESA_PASSKEY:
        return settings.MPESA_PASSKEY

    raise MpesaError(f"No M-Pesa passkey is set for PayBill {shortcode}")


def is_sandbox() -> bool:
    return settings.MPESA_ENV != "live"


def _base_url() -> str:
    return SANDBOX_BASE_URL if is_sandbox() else LIVE_BASE_URL


def _request(
    method: str,
    path: str,
    headers: dict,
    body: dict | None = None,
) -> tuple[int, dict]:
    """Returns (http_status, parsed_json). Daraja reports some normal
    states (e.g. "still processing") with an error status and a JSON body,
    so error responses are returned rather than raised."""

    data = json.dumps(body).encode("utf-8") if body is not None else None

    request = urllib.request.Request(
        f"{_base_url()}{path}",
        data=data,
        headers=headers,
        method=method,
    )

    try:
        with urllib.request.urlopen(
            request, timeout=REQUEST_TIMEOUT_SECONDS
        ) as response:
            status = response.status
            raw = response.read()

    except urllib.error.HTTPError as error:
        status = error.code
        raw = error.read()

    except (urllib.error.URLError, TimeoutError) as error:
        raise MpesaError(f"Could not reach M-Pesa: {error}") from error

    try:
        return status, json.loads(raw or b"{}")
    except json.JSONDecodeError as error:
        raise MpesaError(
            f"Unexpected reply from M-Pesa (HTTP {status})"
        ) from error


def _access_token() -> str:
    if _token_cache["token"] and time.time() < _token_cache["expires_at"]:
        return _token_cache["token"]

    credentials = (
        f"{settings.MPESA_CONSUMER_KEY}:{settings.MPESA_CONSUMER_SECRET}"
    )
    encoded = base64.b64encode(credentials.encode("utf-8")).decode("utf-8")

    status, data = _request(
        "GET",
        "/oauth/v1/generate?grant_type=client_credentials",
        {"Authorization": f"Basic {encoded}"},
    )

    token = data.get("access_token")

    if status != 200 or not token:
        raise MpesaError(
            "M-Pesa rejected the API keys. Check MPESA_CONSUMER_KEY and "
            "MPESA_CONSUMER_SECRET."
        )

    # Tokens last about an hour; renew a minute early.
    expires_in = int(data.get("expires_in", 3599))
    _token_cache["token"] = token
    _token_cache["expires_at"] = time.time() + expires_in - 60

    return token


def _password_and_timestamp(shortcode: str) -> tuple[str, str]:
    timestamp = datetime.now(NAIROBI).strftime("%Y%m%d%H%M%S")

    raw = f"{shortcode}{_passkey_for(shortcode)}{timestamp}"
    password = base64.b64encode(raw.encode("utf-8")).decode("utf-8")

    return password, timestamp


def _auth_headers() -> dict:
    return {
        "Authorization": f"Bearer {_access_token()}",
        "Content-Type": "application/json",
    }


def stk_push(
    shortcode: str,
    phone_number: str,
    amount: int,
    reference: str,
    description: str,
) -> dict:
    """Sends the M-Pesa PIN prompt to the customer's phone, asking them
    to pay into the PayBill `shortcode`.

    Returns Daraja's reply, which includes MerchantRequestID and
    CheckoutRequestID. Raises MpesaError if the prompt was not accepted.
    """

    password, timestamp = _password_and_timestamp(shortcode)

    status, data = _request(
        "POST",
        "/mpesa/stkpush/v1/processrequest",
        _auth_headers(),
        {
            "BusinessShortCode": shortcode,
            "Password": password,
            "Timestamp": timestamp,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": amount,
            "PartyA": phone_number,
            "PartyB": shortcode,
            "PhoneNumber": phone_number,
            "CallBackURL": settings.MPESA_CALLBACK_URL,
            "AccountReference": reference[:12],
            "TransactionDesc": description[:13],
        },
    )

    if status != 200 or str(data.get("ResponseCode")) != "0":
        reason = (
            data.get("errorMessage")
            or data.get("ResponseDescription")
            or f"HTTP {status}"
        )
        raise MpesaError(f"M-Pesa did not accept the request: {reason}")

    return data


def stk_query(shortcode: str, checkout_request_id: str) -> dict | None:
    """Asks Daraja what happened to a PIN prompt sent for `shortcode`.

    Returns None while the customer has not finished (or Daraja cannot say
    yet); otherwise a dict with ResultCode ("0" means paid) and ResultDesc.
    """

    password, timestamp = _password_and_timestamp(shortcode)

    status, data = _request(
        "POST",
        "/mpesa/stkpushquery/v1/query",
        _auth_headers(),
        {
            "BusinessShortCode": shortcode,
            "Password": password,
            "Timestamp": timestamp,
            "CheckoutRequestID": checkout_request_id,
        },
    )

    if status != 200 or "ResultCode" not in data:
        return None

    # Daraja also answers "still processing" with a normal-looking result
    # code while the prompt is open on the phone. That is not an outcome.
    if str(data["ResultCode"]) in STILL_PROCESSING_CODES:
        return None

    return data
