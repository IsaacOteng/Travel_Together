"""
Thin Paystack API client.

Only the pieces Phase 3 needs (collect money + verify): initialize a transaction,
verify a transaction, and validate webhook signatures. Refunds and transfers
(payouts) are added in Phase 4.

All amounts are GHS; Paystack works in the smallest unit (pesewas), so we
multiply by 100 on the way out.
"""

import hashlib
import hmac
from decimal import Decimal

import requests
from django.conf import settings


class PaystackError(Exception):
    """Raised when Paystack returns a non-success response."""


def _headers():
    return {
        "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}",
        "Content-Type": "application/json",
    }


def _to_subunit(amount):
    """GHS → pesewas. Uses Decimal to avoid float rounding errors."""
    return int((Decimal(str(amount)) * 100).to_integral_value())


def initialize_transaction(*, email, amount, reference, currency="GHS",
                           metadata=None, callback_url=None):
    """Start a checkout. Returns Paystack's data dict (authorization_url, reference, …)."""
    payload = {
        "email":     email,
        "amount":    _to_subunit(amount),
        "reference": reference,
        "currency":  currency,
    }
    if metadata:
        payload["metadata"] = metadata
    if callback_url:
        payload["callback_url"] = callback_url

    try:
        resp = requests.post(
            f"{settings.PAYSTACK_BASE_URL}/transaction/initialize",
            json=payload, headers=_headers(), timeout=20,
        )
        data = resp.json()
    except (requests.RequestException, ValueError) as exc:
        raise PaystackError(f"Could not reach Paystack: {exc}")

    if not resp.ok or not data.get("status"):
        raise PaystackError(data.get("message", "Paystack initialize failed"))
    return data["data"]


def verify_transaction(reference):
    """Verify a transaction by reference. Returns Paystack's data dict (status, amount, …)."""
    try:
        resp = requests.get(
            f"{settings.PAYSTACK_BASE_URL}/transaction/verify/{reference}",
            headers=_headers(), timeout=20,
        )
        data = resp.json()
    except (requests.RequestException, ValueError) as exc:
        raise PaystackError(f"Could not reach Paystack: {exc}")

    if not resp.ok or not data.get("status"):
        raise PaystackError(data.get("message", "Paystack verify failed"))
    return data["data"]


def refund_transaction(reference, amount=None):
    """Refund a transaction by reference. amount is GHS (None = full refund)."""
    payload = {"transaction": reference}
    if amount is not None:
        payload["amount"] = _to_subunit(amount)
    try:
        resp = requests.post(
            f"{settings.PAYSTACK_BASE_URL}/refund",
            json=payload, headers=_headers(), timeout=20,
        )
        data = resp.json()
    except (requests.RequestException, ValueError) as exc:
        raise PaystackError(f"Could not reach Paystack: {exc}")

    if not resp.ok or not data.get("status"):
        raise PaystackError(data.get("message", "Paystack refund failed"))
    return data["data"]


def create_transfer_recipient(*, name, account_number, bank_code,
                              recipient_type="mobile_money", currency="GHS"):
    """Tokenise a payout destination → returns a recipient_code we store and reuse."""
    payload = {
        "type":           recipient_type,
        "name":           name or account_number,
        "account_number": account_number,
        "bank_code":      bank_code,
        "currency":       currency,
    }
    try:
        resp = requests.post(
            f"{settings.PAYSTACK_BASE_URL}/transferrecipient",
            json=payload, headers=_headers(), timeout=20,
        )
        data = resp.json()
    except (requests.RequestException, ValueError) as exc:
        raise PaystackError(f"Could not reach Paystack: {exc}")

    if not resp.ok or not data.get("status"):
        raise PaystackError(data.get("message", "Paystack recipient creation failed"))
    return data["data"]["recipient_code"]


def initiate_transfer(*, amount, recipient_code, reason, reference, currency="GHS"):
    """Send a payout to a stored recipient. amount is GHS."""
    payload = {
        "source":    "balance",
        "amount":    _to_subunit(amount),
        "recipient": recipient_code,
        "reason":    reason,
        "reference": reference,
        "currency":  currency,
    }
    try:
        resp = requests.post(
            f"{settings.PAYSTACK_BASE_URL}/transfer",
            json=payload, headers=_headers(), timeout=20,
        )
        data = resp.json()
    except (requests.RequestException, ValueError) as exc:
        raise PaystackError(f"Could not reach Paystack: {exc}")

    if not resp.ok or not data.get("status"):
        raise PaystackError(data.get("message", "Paystack transfer failed"))
    return data["data"]


def verify_webhook_signature(raw_body, signature):
    """Paystack signs the raw request body with HMAC-SHA512 of the secret key."""
    if not signature or not settings.PAYSTACK_SECRET_KEY:
        return False
    computed = hmac.new(
        settings.PAYSTACK_SECRET_KEY.encode(),
        raw_body,
        hashlib.sha512,
    ).hexdigest()
    return hmac.compare_digest(computed, signature)
