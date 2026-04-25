"""
Threat & Attack Protection Layer
- Replay attack prevention (nonce registry)
- Rate limiting middleware
- MITM protection (request token signing)
- Consent phishing protection (bank whitelist)
- Abuse detection (IP blocklist)
"""

import hashlib
import hmac
import os
import time
from collections import defaultdict
from functools import wraps

from fastapi import Request, HTTPException


# ─── Request Signing Secret ─────────────────────────
REQUEST_SECRET = os.urandom(32)


# ─── Nonce Registry (replay prevention) ─────────────
_used_nonces: dict[str, float] = {}
NONCE_TTL = 300  # 5 minutes


def register_nonce(nonce: str) -> bool:
    """
    Register a nonce. Returns False if already used (replay detected).
    """
    _cleanup_nonces()

    if nonce in _used_nonces:
        return False

    _used_nonces[nonce] = time.time()
    return True


def _cleanup_nonces():
    """Remove expired nonces."""
    now = time.time()
    expired = [k for k, v in _used_nonces.items() if now - v > NONCE_TTL]
    for k in expired:
        del _used_nonces[k]


# ─── Rate Limiting ──────────────────────────────────
_rate_store: dict[str, list[float]] = defaultdict(list)
RATE_LIMIT = 30          # requests
RATE_WINDOW = 60         # per 60 seconds


def check_rate_limit(client_ip: str) -> bool:
    """
    Returns True if request is allowed, False if rate limited.
    """
    now = time.time()
    window_start = now - RATE_WINDOW

    # Clean old entries
    _rate_store[client_ip] = [
        t for t in _rate_store[client_ip] if t > window_start
    ]

    if len(_rate_store[client_ip]) >= RATE_LIMIT:
        return False

    _rate_store[client_ip].append(now)
    return True


# ─── Abuse Detection (IP blocklist) ─────────────────
_failed_attempts: dict[str, list[float]] = defaultdict(list)
_blocked_ips: dict[str, float] = {}
BLOCK_THRESHOLD = 10
BLOCK_DURATION = 300     # 5 minutes


def record_failed_attempt(client_ip: str):
    """Record a failed attempt from an IP."""
    now = time.time()
    _failed_attempts[client_ip].append(now)

    # Clean old attempts
    _failed_attempts[client_ip] = [
        t for t in _failed_attempts[client_ip]
        if now - t < 60
    ]

    if len(_failed_attempts[client_ip]) >= BLOCK_THRESHOLD:
        _blocked_ips[client_ip] = now
        print(f"[THREAT] IP blocked: {client_ip}")


def is_ip_blocked(client_ip: str) -> bool:
    """Check if an IP is currently blocked."""
    if client_ip not in _blocked_ips:
        return False

    if time.time() - _blocked_ips[client_ip] > BLOCK_DURATION:
        del _blocked_ips[client_ip]
        return False

    return True


# ─── Request Token Signing (MITM Protection) ────────
def generate_request_token(payload: str) -> str:
    """Generate an HMAC token for a request payload."""
    mac = hmac.new(REQUEST_SECRET, payload.encode(), hashlib.sha256)
    return mac.hexdigest()


def verify_request_token(payload: str, token: str) -> bool:
    """Verify an HMAC request token."""
    expected = generate_request_token(payload)
    return hmac.compare_digest(expected, token)


# ─── Bank Whitelist (Consent Phishing Prevention) ───
REGISTERED_BANKS = {
    "ABC Bank",
    "XYZ Bank",
    "State Bank",
    "HDFC Bank",
    "ICICI Bank",
    "Axis Bank",
    "Kotak Bank",
    "Yes Bank",
    "PNB",
    "BOB"
}

ALLOWED_ATTRIBUTES = {
    "age_over_18",
    "address_verified",
    "has_pan",
    "name_verified",
    "identity_verified"
}


def validate_bank(bank_name: str) -> bool:
    """Check if a bank is registered and whitelisted."""
    return bank_name in REGISTERED_BANKS


def validate_attribute_request(attribute: str) -> bool:
    """Check if the requested attribute is in the allowed set."""
    return attribute in ALLOWED_ATTRIBUTES


# ─── Threat Assessment ──────────────────────────────
def assess_request_threat(
    client_ip: str,
    bank: str | None = None,
    attribute: str | None = None,
    nonce: str | None = None
) -> dict:
    """
    Comprehensive threat assessment for an incoming request.
    Returns threat report with pass/fail and reasons.
    """
    threats = []
    blocked = False

    # 1. IP block check
    if is_ip_blocked(client_ip):
        threats.append("IP_BLOCKED")
        blocked = True

    # 2. Rate limit check
    if not check_rate_limit(client_ip):
        threats.append("RATE_LIMITED")
        blocked = True

    # 3. Replay check
    if nonce and not register_nonce(nonce):
        threats.append("REPLAY_DETECTED")
        blocked = True

    # 4. Bank whitelist
    if bank and not validate_bank(bank):
        threats.append("UNREGISTERED_BANK")
        blocked = True

    # 5. Attribute whitelist
    if attribute and not validate_attribute_request(attribute):
        threats.append("UNAUTHORIZED_ATTRIBUTE")
        blocked = True

    return {
        "allowed": not blocked,
        "threats": threats,
        "client_ip": client_ip,
        "timestamp": time.time()
    }


def get_threat_stats() -> dict:
    """Return current threat statistics."""
    return {
        "active_nonces": len(_used_nonces),
        "blocked_ips": list(_blocked_ips.keys()),
        "rate_tracked_ips": len(_rate_store),
        "registered_banks": len(REGISTERED_BANKS),
        "allowed_attributes": list(ALLOWED_ATTRIBUTES)
    }
